import { useState, useRef, useEffect } from "react";
import { faceService } from "./faceService";
import {
    generateThumbnail,
    saveFile,
    saveGroup,
    loadAll,
    updateFileEmbeddings,
    updateFileAnalysis,
    deleteGroupFromDB,
    deleteFileFromDB,
    clearAllDB,
    type StoredFile,
} from "./storage";
import { computeBlurScore, BLUR_THRESHOLD } from "./imageAnalysis";
import { checkEyes, preloadEyeModel } from "./eyeService";
import { chineseWhispers } from "./clusterService";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FileKind = "image" | "pdf" | "archive" | "video" | "audio" | "document" | "other";

export type GroupFile = {
    key: string;
    url: string;
    thumbUrl: string;
    name: string;
    kind: FileKind;
    size: number;
    embeddings?: number[][];
    blurScore?: number;
    hasFace?: boolean;
    eyesClosed?: boolean;
};

export type Group = {
    id: number;
    name: string;
    files: GroupFile[];
    date: string;
};

export type ProcessingStage =
    | { step: "idle" }
    | { step: "saving"; current: number; total: number; fileName: string }
    | { step: "blur"; current: number; total: number; fileName: string; blurryCount: number }
    | { step: "faces"; current: number; total: number; fileName: string; faceCount: number; noFaceCount: number }
    | { step: "eyes"; current: number; total: number; fileName: string; closedCount: number }
    | { step: "clustering"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ARCHIVE_EXTS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "zst"]);
const DOCUMENT_EXTS = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "txt", "csv", "md"]);

function getExt(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() ?? "";
}

function classifyFile(file: File): FileKind {
    const { type, name } = file;
    const ext = getExt(name);
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "pdf";
    if (type.startsWith("video/")) return "video";
    if (type.startsWith("audio/")) return "audio";
    if (ARCHIVE_EXTS.has(ext)) return "archive";
    if (DOCUMENT_EXTS.has(ext)) return "document";
    return "other";
}

function revokeGroupFile(f: GroupFile) {
    if (f.url) URL.revokeObjectURL(f.url);
    if (f.thumbUrl && f.thumbUrl !== f.url) URL.revokeObjectURL(f.thumbUrl);
}

// ─── Safe wrappers ────────────────────────────────────────────────────────────
// Each wrapper catches any error and returns a safe fallback so the pipeline
// always advances rather than crashing and leaving the overlay stuck.

async function safeComputeBlur(url: string, name: string): Promise<number> {
    try {
        return await computeBlurScore(url);
    } catch (err) {
        console.warn(`[Stage 2] Blur check failed for ${name}:`, err);
        return BLUR_THRESHOLD; // treat as sharp — don't silently drop the file
    }
}
const MIN_FACE_QUALITY = 0.28; // ~20px IOD in original image

async function safeFaceDetect(url: string, name: string) {
    try {
        return await faceService.processImage(url);
    } catch (err) {
        console.warn(`[Stage 3] Face detection failed for ${name}:`, err);
        return []; // empty → treated as no-face, continues pipeline
    }
}

async function safeEyeCheck(url: string, name: string): Promise<boolean> {
    try {
        const { eyesClosed } = await checkEyes(url);
        return eyesClosed;
    } catch (err) {
        console.warn(`[Stage 4] Eye check failed for ${name}:`, err);
        return false; // permissive — include in clustering
    }
}

async function safeUpdateAnalysis(
    key: string,
    data: { blurScore: number; hasFace: boolean; eyesClosed: boolean }
): Promise<void> {
    try {
        await updateFileAnalysis(key, data);
    } catch (err) {
        console.warn(`[DB] updateFileAnalysis failed for ${key}:`, err);
    }
}

async function safeUpdateEmbeddings(key: string, embs: number[][]): Promise<void> {
    try {
        await updateFileEmbeddings(key, embs);
    } catch (err) {
        console.warn(`[DB] updateFileEmbeddings failed for ${key}:`, err);
    }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePhotos() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [activeGroup, setActiveGroup] = useState<number | null>(null);
    const [newGroupName, setNewGroupName] = useState("");
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [processingStage, setProcessingStage] = useState<ProcessingStage>({ step: "idle" });

    const fileRef = useRef<HTMLInputElement>(null);
    const folderRef = useRef<HTMLInputElement>(null);

    const totalFiles = groups.reduce((a, g: Group) => a + g.files.length, 0);
    const activeGroupData = groups.find((g) => g.id === activeGroup);

    // ── Load from IndexedDB on mount ─────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const { groups: storedGroups, files: storedFiles } = await loadAll();
                const fileMap = new Map<string, StoredFile>(storedFiles.map((f) => [f.key, f]));

                const hydratedGroups: Group[] = storedGroups.map((sg) => ({
                    id: sg.id,
                    name: sg.name,
                    date: sg.date,
                    files: sg.fileKeys
                        .map((k) => {
                            const sf = fileMap.get(k);
                            if (!sf) return null;
                            return {
                                key: sf.key,
                                url: URL.createObjectURL(sf.original),
                                thumbUrl: URL.createObjectURL(sf.thumb),
                                name: sf.name,
                                kind: sf.kind as FileKind,
                                size: sf.size,
                                embeddings: sf.embeddings,
                                blurScore: sf.blurScore,
                                hasFace: sf.hasFace,
                                eyesClosed: sf.eyesClosed,
                            } satisfies GroupFile;
                        })
                        .filter(Boolean) as GroupFile[],
                }));

                setGroups(hydratedGroups);
            } catch (err) {
                console.warn("[Folios] Could not load from IndexedDB:", err);
            } finally {
                setHydrated(true);
            }
        })();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Pipeline — 5 stages, each fully isolated.
    //
    // Every stage has two layers of error handling:
    //   1. Per-file: safe wrappers return fallback values, file continues
    //   2. Per-stage: outer try/catch skips the whole stage and carries
    //      whatever partial results were collected into the next stage
    //
    // The overlay will ALWAYS reach idle — no more stuck spinners.
    // ─────────────────────────────────────────────────────────────────────────

    type FaceFile = GroupFile & {
        embs: number[][];
        quality: number; // face quality score from processImage()
    };

    const runPipeline = async (incoming: GroupFile[], groupId: number) => {
        const imageFiles = incoming.filter((f) => f.kind === "image");

        if (imageFiles.length === 0) {
            setProcessingStage({ step: "idle" });
            return;
        }

        // ── SPEED: Kick off model preloads NOW, in parallel with blur ─────────
        // The recognition model is 166MB and takes 10-30s to load.
        // Starting it here means it's ready by Stage 3, hiding the wait time.
        const modelPreloadPromise = Promise.all([
            faceService.preload().catch((e) =>
                console.warn("[Preload] Face models failed — will retry per-file:", e)
            ),
            preloadEyeModel().catch((e) =>
                console.warn("[Preload] Eye model failed — will retry per-file:", e)
            ),
        ]);
        void modelPreloadPromise; // fire-and-forget; awaited implicitly before Stage 3

        // ── STAGE 2: Blur (batched) ───────────────────────────────────────────
        // SPEED: Process BLUR_CONCURRENCY images at once — blur is pure canvas
        // CPU work with no ONNX shared-state, so batching is safe and ~4x faster.
        const BLUR_CONCURRENCY = 4;
        let nonBlurry: GroupFile[] = [];

        try {
            let blurryCount = 0;
            let completed = 0;

            for (let i = 0; i < imageFiles.length; i += BLUR_CONCURRENCY) {
                const batch = imageFiles.slice(i, i + BLUR_CONCURRENCY);

                setProcessingStage({
                    step: "blur",
                    current: i + 1,
                    total: imageFiles.length,
                    fileName: batch[0].name,
                    blurryCount,
                });

                // Run this batch concurrently
                const batchResults = await Promise.all(
                    batch.map((gf) =>
                        safeComputeBlur(gf.url, gf.name).then((score) => ({ gf, score }))
                    )
                );

                for (const { gf, score: blurScore } of batchResults) {
                    const isBlurry = blurScore < BLUR_THRESHOLD;
                    if (isBlurry) blurryCount++;
                    completed++;

                    await safeUpdateAnalysis(gf.key, { blurScore, hasFace: false, eyesClosed: false });

                    setGroups((prev) =>
                        prev.map((g) =>
                            g.id !== groupId ? g : {
                                ...g,
                                files: g.files.map((f) =>
                                    f.key === gf.key ? { ...f, blurScore } : f
                                ),
                            }
                        )
                    );

                    if (!isBlurry) nonBlurry.push({ ...gf, blurScore });
                }
            }

            setProcessingStage({
                step: "blur",
                current: imageFiles.length,
                total: imageFiles.length,
                fileName: "Done",
                blurryCount,
            });

        } catch (err) {
            console.error("[Stage 2] Blur stage crashed — passing all images through as sharp:", err);
            nonBlurry = [...imageFiles];
        }

        if (nonBlurry.length === 0) {
            await new Promise((r) => setTimeout(r, 500));
            setProcessingStage({ step: "idle" });
            return;
        }

        // ── STAGE 3: Face detection ───────────────────────────────────────────
        // Per-file failure → safeFaceDetect returns [] → counted as no-face
        // Preload failure  → non-fatal, per-file lazy-load may still succeed
        // Stage failure    → skip to Stage 4 with empty withFaces
        let withFaces: FaceFile[] = [];

        try {
            let faceCount = 0;
            let noFaceCount = 0;

            // SPEED: models are already loading from the background preload.
            // Await here so we don't start detection before they're ready.
            await modelPreloadPromise;

            setProcessingStage({
                step: "faces",
                current: 0,
                total: nonBlurry.length,
                fileName: "Detecting faces…",
                faceCount: 0,
                noFaceCount: 0,
            });

            for (let i = 0; i < nonBlurry.length; i++) {
                const gf = nonBlurry[i];

                setProcessingStage({
                    step: "faces",
                    current: i + 1,
                    total: nonBlurry.length,
                    fileName: gf.name,
                    faceCount,
                    noFaceCount,
                });

                const results = await safeFaceDetect(gf.url, gf.name);
                const validResults = results.filter(
                    (r) => r.confidence >= 0.5
                        && r.quality >= MIN_FACE_QUALITY // FIX: gate on face size
                );
                validResults.sort((a, b) => b.confidence - a.confidence);
                const bestFace = validResults[0];
                const embs: number[][] = bestFace ? [bestFace.embedding] : [];
                const hasFace = embs.length > 0;

                if (hasFace) {
                    faceCount++;
                    void safeUpdateEmbeddings(gf.key, embs);
                    withFaces.push({ ...gf, embs, hasFace: true, quality: bestFace!.quality });
                } else {
                    noFaceCount++;
                }

                // SPEED: fire-and-forget — DB write outcome doesn't block detection
                void safeUpdateAnalysis(gf.key, {
                    blurScore: gf.blurScore ?? BLUR_THRESHOLD,
                    hasFace,
                    eyesClosed: false,
                });

                setGroups((prev) =>
                    prev.map((g) =>
                        g.id !== groupId ? g : {
                            ...g,
                            files: g.files.map((f) =>
                                f.key === gf.key
                                    ? { ...f, embeddings: hasFace ? embs : undefined, hasFace }
                                    : f
                            ),
                        }
                    )
                );
            }

        } catch (err) {
            console.error("[Stage 3] Face stage crashed — skipping to eyes check:", err);
        }

        if (withFaces.length === 0) {
            await new Promise((r) => setTimeout(r, 500));
            setProcessingStage({ step: "idle" });
            return;
        }

        // ── STAGE 4: Eyes-closed check ────────────────────────────────────────
        // Per-file failure → safeEyeCheck returns false → file goes to clustering
        // Preload failure  → non-fatal
        // Stage failure    → all faces from Stage 3 passed into clustering
        let validForClustering: FaceFile[] = [];

        try {
            let closedCount = 0;
            // SPEED: batch eye checks in parallel — matches blur stage pattern.
            // Image loading is async I/O so batching gives real concurrency.
            // MediaPipe .detect() is synchronous so WASM serializes automatically.
            const EYE_CONCURRENCY = 4;

            setProcessingStage({
                step: "eyes",
                current: 0,
                total: withFaces.length,
                fileName: "Checking eyes…",
                closedCount: 0,
            });

            // SPEED: Eye model was already preloaded in the background at start.
            // No need to await again — it resolved with modelPreloadPromise above.

            for (let i = 0; i < withFaces.length; i += EYE_CONCURRENCY) {
                const batch = withFaces.slice(i, i + EYE_CONCURRENCY);

                setProcessingStage({
                    step: "eyes",
                    current: i + 1,
                    total: withFaces.length,
                    fileName: batch[0].name,
                    closedCount,
                });

                const batchResults = await Promise.all(
                    batch.map((gf) =>
                        safeEyeCheck(gf.url, gf.name).then((eyesClosed) => ({ gf, eyesClosed }))
                    )
                );

                for (const { gf, eyesClosed } of batchResults) {
                    if (eyesClosed) closedCount++;

                    // SPEED: fire-and-forget DB write
                    void safeUpdateAnalysis(gf.key, {
                        blurScore: gf.blurScore ?? BLUR_THRESHOLD,
                        hasFace: true,
                        eyesClosed,
                    });

                    setGroups((prev) =>
                        prev.map((g) =>
                            g.id !== groupId ? g : {
                                ...g,
                                files: g.files.map((f) =>
                                    f.key === gf.key ? { ...f, eyesClosed } : f
                                ),
                            }
                        )
                    );

                    if (!eyesClosed) validForClustering.push(gf);
                }
            }

        } catch (err) {
            console.error("[Stage 4] Eyes stage crashed — passing all faces to clustering:", err);
            validForClustering = [...withFaces];
        }

        // ── STAGE 5: Clustering ───────────────────────────────────────────────
        // Stage failure → files are already saved and tagged — just skip groups
        try {
            const clusterPairs = validForClustering
                .map((gf) => ({ gf, emb: gf.embs?.[0] }))
                .filter((p): p is { gf: FaceFile; emb: number[] } =>
                    Array.isArray(p.emb) && p.emb.length > 0
                );

            if (clusterPairs.length < 2) {
                setProcessingStage({
                    step: "clustering",
                    message: clusterPairs.length === 1
                        ? "Only 1 valid face — skipping clustering"
                        : "No valid faces — skipping clustering",
                });
                await new Promise((r) => setTimeout(r, 800));
                setProcessingStage({ step: "idle" });
                return;
            }

            setProcessingStage({ step: "clustering", message: "Running Chinese Whispers…" });

            const labels = chineseWhispers(clusterPairs.map((p) => p.emb));
            const uniqueLabels = [...new Set(labels)];

            setProcessingStage({
                step: "clustering",
                message: `Found ${uniqueLabels.length} ${uniqueLabels.length === 1 ? "person" : "people"} — creating groups…`,
            });

            const personGroups = new Map<number, GroupFile[]>();
            for (let i = 0; i < labels.length; i++) {
                const label = labels[i];
                if (!personGroups.has(label)) personGroups.set(label, []);
                personGroups.get(label)!.push(clusterPairs[i].gf);
            }

            let parentGroupName = "Upload";
            setGroups((prev) => {
                const g = prev.find((g) => g.id === groupId);
                if (g) parentGroupName = g.name;
                return prev;
            });

            const newGroups: Group[] = [];
            let personIdx = 0;
            for (const [, files] of personGroups) {
                personIdx++;
                const id = Date.now() + personIdx;
                const name = `Person ${personIdx} (${parentGroupName})`;
                const date = new Date().toLocaleDateString();
                try {
                    await saveGroup({ id, name, date, fileKeys: files.map((f) => f.key) });
                    newGroups.push({ id, name, files, date });
                } catch (err) {
                    console.warn(`[Stage 5] Failed to save group "${name}":`, err);
                }
            }

            if (newGroups.length > 0) {
                setGroups((prev) => [...prev, ...newGroups]);
            }

        } catch (err) {
            console.error("[Stage 5] Clustering crashed — files saved without person groups:", err);
            setProcessingStage({ step: "clustering", message: "Clustering failed — files are saved" });
            await new Promise((r) => setTimeout(r, 1200));
        }

        await new Promise((r) => setTimeout(r, 800));
        setProcessingStage({ step: "idle" });
    };

    // ── Upload handler ────────────────────────────────────────────────────────
    const handleFiles = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;

        const rawFiles = Array.from(fileList);
        let groupId: number;
        let isNew = false;

        if (activeGroup !== null) {
            groupId = activeGroup;
        } else {
            groupId = Date.now();
            isNew = true;
        }

        const incoming: GroupFile[] = [];
        const total = rawFiles.length;

        setProcessingStage({ step: "saving", current: 0, total, fileName: "Preparing…" });

        for (let i = 0; i < rawFiles.length; i++) {
            const file = rawFiles[i];
            setProcessingStage({ step: "saving", current: i + 1, total, fileName: file.name });

            const kind = classifyFile(file);
            const key = `${groupId}-${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            let thumbBlob: Blob = file;
            if (kind === "image") {
                try { thumbBlob = await generateThumbnail(file, 360); } catch { thumbBlob = file; }
            }

            try {
                await saveFile({ key, name: file.name, kind, size: file.size, original: file, thumb: thumbBlob });
            } catch (err) {
                console.warn(`[Stage 1] Failed to save ${file.name}:`, err);
            }

            incoming.push({
                key,
                url: URL.createObjectURL(file),
                thumbUrl: URL.createObjectURL(thumbBlob),
                name: file.name,
                kind,
                size: file.size,
            });
        }

        setGroups((prev) => {
            if (isNew) {
                const newGroup: Group = {
                    id: groupId, name: `Group ${prev.length + 1}`,
                    files: incoming, date: new Date().toLocaleDateString(),
                };
                saveGroup({ id: groupId, name: newGroup.name, date: newGroup.date, fileKeys: incoming.map((f) => f.key) })
                    .catch((err) => console.warn("[Stage 1] saveGroup failed:", err));
                return [...prev, newGroup];
            }
            return prev.map((g) => {
                if (g.id !== groupId) return g;
                const updated = { ...g, files: [...g.files, ...incoming] };
                saveGroup({ id: g.id, name: g.name, date: g.date, fileKeys: updated.files.map((f) => f.key) })
                    .catch((err) => console.warn("[Stage 1] saveGroup update failed:", err));
                return updated;
            });
        });

        await runPipeline(incoming, groupId);
    };

    // ── Folder upload ─────────────────────────────────────────────────────────
    const handleFolder = async (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;

        const folderName =
            (fileList[0] as any).webkitRelativePath?.split("/")[0] ||
            `Folder ${groups.length + 1}`;

        const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const groupId = Date.now();
        const date = new Date().toLocaleDateString();
        const incoming: GroupFile[] = [];

        setProcessingStage({ step: "saving", current: 0, total: imageFiles.length, fileName: "Preparing…" });

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];

            setProcessingStage({ step: "saving", current: i + 1, total: imageFiles.length, fileName: file.name });

            const key = `${groupId}-${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            let thumbBlob: Blob = file;
            try { thumbBlob = await generateThumbnail(file, 360); } catch { thumbBlob = file; }

            try {
                await saveFile({ key, name: file.name, kind: "image", size: file.size, original: file, thumb: thumbBlob });
            } catch (err) {
                console.warn(`[Stage 1] Failed to save ${file.name}:`, err);
            }

            incoming.push({
                key,
                url: URL.createObjectURL(file),
                thumbUrl: URL.createObjectURL(thumbBlob),
                name: file.name,
                kind: "image",
                size: file.size,
            });
        }

        try {
            await saveGroup({ id: groupId, name: folderName, date, fileKeys: incoming.map((f) => f.key) });
        } catch (err) {
            console.warn("[Stage 1] saveGroup failed for folder:", err);
        }

        setGroups((prev) => [...prev, { id: groupId, name: folderName, files: incoming, date }]);

        await runPipeline(incoming, groupId);
    };

    // ── Create empty group ────────────────────────────────────────────────────
    const createGroup = async () => {
        const name = newGroupName.trim() || `Group ${groups.length + 1}`;
        const id = Date.now();
        const date = new Date().toLocaleDateString();
        try { await saveGroup({ id, name, date, fileKeys: [] }); }
        catch (err) { console.warn("[createGroup] saveGroup failed:", err); }
        setGroups((prev) => [...prev, { id, name, files: [], date }]);
        setNewGroupName("");
        setShowNewGroup(false);
        setActiveGroup(id);
    };

    // ── Delete group ──────────────────────────────────────────────────────────
    const deleteGroup = async (id: number) => {
        const group = groups.find((g) => g.id === id);
        if (!group) return;
        group.files.forEach(revokeGroupFile);
        try { await deleteGroupFromDB(id, group.files.map((f) => f.key)); }
        catch (err) { console.warn("[deleteGroup] DB delete failed:", err); }
        setGroups((prev) => prev.filter((g) => g.id !== id));
        if (activeGroup === id) setActiveGroup(null);
    };

    // ── Delete all ────────────────────────────────────────────────────────────
    const deleteAll = async () => {
        if (!confirm("Are you sure you want to delete all photos and groups? This cannot be undone.")) return;
        groups.forEach((g) => g.files.forEach(revokeGroupFile));
        try { await clearAllDB(); }
        catch (err) { console.warn("[deleteAll] DB clear failed:", err); }
        setGroups([]);
        setActiveGroup(null);
    };

    const triggerFileInput = () => fileRef.current?.click();
    const triggerFolderInput = () => folderRef.current?.click();
    const groupByFace = () => { };

    return {
        groups, activeGroup, activeGroupData, newGroupName, showNewGroup,
        lightbox, totalFiles, fileRef, folderRef, hydrated, processingStage,
        setActiveGroup, setNewGroupName, setShowNewGroup, setLightbox,
        handleFiles, handleFolder, createGroup, deleteGroup, deleteAll,
        triggerFileInput, triggerFolderInput, groupByFace,
    };
}
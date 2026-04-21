'use client';

if (typeof window === "undefined") {
    console.warn("[faceService] Server-side import detected. Skipping execution to allow Next.js SSR.");
}

// Import the "all" bundle — the default ORT import in v1.20 only includes WASM.
// "onnxruntime-web/all" includes WebGPU, WebGL, WebNN and WASM EPs.
import * as ort from "onnxruntime-web";

if (typeof window !== "undefined") {
    // Serve WASM files from /public — must be copied from node_modules/onnxruntime-web/dist/
    // Run: cp node_modules/onnxruntime-web/dist/ort-wasm* public/
    ort.env.wasm.wasmPaths = "/";
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaceResult = {
    box: { xmin: number; ymin: number; xmax: number; ymax: number };
    embedding: number[];
    confidence: number;
    keypoints: [number, number][];
    quality: number;
};

export type FaceGroup = {
    groupId: number;
    imageUrls: string[];
    representative: FaceResult;
};

export type EPInfo = {
    name: "webnn" | "webgpu" | "webgl" | "wasm";
    deviceType?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DET_SIZE = 640;
const MAX_RESIZE = 640;
const DET_SCORE_THRESHOLD = 0.5;
const NMS_THRESHOLD = 0.4;
const STRIDES = [8, 16, 32];
const NUM_ANCHORS = 2;

const ARCFACE_REF = [
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041],
];

// ─── EP Detection ─────────────────────────────────────────────────────────────

// Minimal single-node ONNX model (Identity op: float32 [1] → float32 [1]).
// Used to verify ORT's EP is actually functional at the ORT level.
const CANARY_ONNX = new Uint8Array([
    8, 7, 18, 4, 116, 101, 115, 116, 40, 0, 58, 21, 10, 7, 10, 1, 120, 18, 1, 121, 34, 8,
    73, 100, 101, 110, 116, 105, 116, 121, 90, 19, 10, 1, 120, 18, 14, 10, 12, 8, 1, 18,
    8, 10, 2, 8, 1, 10, 2, 8, 1, 98, 19, 10, 1, 121, 18, 14, 10, 12, 8, 1, 18, 8, 10, 2, 8,
    1, 10, 2, 8, 1, 66, 2, 8, 7,
]);

async function probeWebNN(): Promise<false | { deviceType: string }> {
    try {
        if (typeof navigator === "undefined" || !("ml" in navigator)) return false;
        const ml = (navigator as any).ml;
        if (typeof ml?.createContext !== "function") return false;
    } catch {
        return false;
    }

    for (const deviceType of ["gpu", "npu", "cpu"] as const) {
        let session: ort.InferenceSession | null = null;
        try {
            session = await ort.InferenceSession.create(CANARY_ONNX.buffer, {
                executionProviders: [{ name: "webnn", deviceType }],
            });
            const input = new ort.Tensor("float32", [1.0], [1, 1]);
            await session.run({ x: input });
            await (session as any).release();
            console.log(`[FaceService] WebNN canary passed on deviceType: ${deviceType}`);
            return { deviceType };
        } catch {
            try { await (session as any)?.release(); } catch { /* ignore */ }
            // device type not supported by ORT's WebNN EP in this build
        }
    }

    console.warn("[FaceService] navigator.ml exists but ORT WebNN EP failed canary on all device types — falling back.");
    return false;
}

async function probeWebGPU(): Promise<boolean> {
    let session: ort.InferenceSession | null = null;
    try {
        if (typeof navigator === "undefined" || !("gpu" in navigator)) return false;
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) return false;
        session = await ort.InferenceSession.create(CANARY_ONNX.buffer, {
            executionProviders: ["webgpu"],
        });
        const input = new ort.Tensor("float32", [1.0], [1, 1]);
        await session.run({ x: input });
        // ✅ Always release canary before real models load — leaving it alive
        // competes for GPU buffer space when loading the 85MB SCRFD model.
        await (session as any).release();
        console.log("[FaceService] WebGPU canary passed");
        return true;
    } catch {
        try { await (session as any)?.release(); } catch { /* ignore */ }
        return false;
    }
}

// WebGL EP — GPU-accelerated via OpenGL/WebGL. Available in ORT v1.14+.
// Not as fast as WebGPU but provides real GPU acceleration in all browsers.
async function probeWebGL(): Promise<boolean> {
    let session: ort.InferenceSession | null = null;
    try {
        const canvas = document.createElement("canvas");
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        if (!gl) return false;
        session = await ort.InferenceSession.create(CANARY_ONNX.buffer, {
            executionProviders: ["webgl"],
        });
        const input = new ort.Tensor("float32", [1.0], [1, 1]);
        await session.run({ x: input });
        await (session as any).release();
        console.log("[FaceService] WebGL canary passed — GPU acceleration via WebGL ACTIVE");
        return true;
    } catch {
        try { await (session as any)?.release(); } catch { /* ignore */ }
        return false;
    }
}

type EPCache = { webnn: false | { deviceType: string }; webgpu: boolean; webgl: boolean };
let _epCache: EPCache | null = null;
// Store the promise so parallel callers share the same probes instead of racing.
let _epCachePromise: Promise<EPCache> | null = null;

async function getEPCapabilities(): Promise<EPCache> {
    if (_epCache) return _epCache;
    if (!_epCachePromise) {
        _epCachePromise = (async () => {
            const [webnn, webgpu, webgl] = await Promise.all([probeWebNN(), probeWebGPU(), probeWebGL()]);
            _epCache = { webnn, webgpu, webgl };
            console.log("[FaceService] EP probe →", {
                webnn: webnn ? `available (${(webnn as { deviceType: string }).deviceType})` : "unavailable",
                webgpu: webgpu ? "available" : "unavailable",
                webgl: webgl ? "available" : "unavailable",
            });
            return _epCache;
        })();
    }
    return _epCachePromise!;
}

// WebNN EP candidates tried in order — gpu/npu for speed, cpu for op coverage.
const WEBNN_DEVICE_TYPES = ["gpu", "npu", "cpu"] as const;

// ─── Singleton model cache ─────────────────────────────────────────────────────

let detSession: ort.InferenceSession | null = null;
let recSession: ort.InferenceSession | null = null;
let detLoadPromise: Promise<ort.InferenceSession> | null = null;
let recLoadPromise: Promise<ort.InferenceSession> | null = null;
let detEPInfo: EPInfo | null = null;
let recEPInfo: EPInfo | null = null;

async function getModelBuffer(modelPath: string): Promise<ArrayBuffer | string> {
    if (typeof window === 'undefined') return modelPath;
    
    // modelPath is usually something like "/models/det_10g.onnx"
    const fileName = modelPath.split('/').pop() || "";
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_BLOB_MODELS_URL?.replace(/\/+$/, "") || "";
    const fullUrl = baseUrl ? `${baseUrl}/${fileName}` : modelPath;
    
    try {
        if ('caches' in window) {
            const cache = await caches.open('my-app-models');
            
            // Try matching by the file name so it works regardless of baseUrl changes
            const cacheKeys = await cache.keys();
            const cachedRequest = cacheKeys.find(req => req.url.endsWith(`/${fileName}`));
            
            if (cachedRequest) {
                const cachedResponse = await cache.match(cachedRequest);
                if (cachedResponse) {
                    console.log(`[FaceService] Loaded ${fileName} from Cache API`);
                    return await cachedResponse.arrayBuffer();
                }
            }

            // Not in cache, fetch and store
            console.log(`[FaceService] Downloading ${fileName} from ${fullUrl}...`);
            const response = await fetch(fullUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const clonedResponse = response.clone();
            await cache.put(fullUrl, clonedResponse);
            return await response.arrayBuffer();
        }
    } catch (err) {
        console.warn("[FaceService] Cache API failed or fetch failed, falling back to URL.", err);
    }
    
    return fullUrl;
}

async function createSession(
    modelPath: string,
    options: { allowWebNN?: boolean; allowWebGPU?: boolean } = {},
): Promise<{ session: ort.InferenceSession; epInfo: EPInfo }> {
    const { allowWebNN = true, allowWebGPU = true } = options;
    const caps = await getEPCapabilities();
    const modelSource = await getModelBuffer(modelPath);

    const tryCreate = async (
        ep: ort.InferenceSession.ExecutionProviderConfig,
    ): Promise<ort.InferenceSession> => {
        const epName = typeof ep === "string" ? ep : (ep as any).name;
        return ort.InferenceSession.create(modelSource as any, {
            executionProviders: [ep],
            // "all" can fuse ops into kernels that have no WebGPU/WebNN shader —
            // the Identity canary passes but real Conv/Resize graphs fail silently.
            // Use "basic" for GPU EPs; keep "all" only for the WASM CPU path.
            graphOptimizationLevel: epName === "wasm" ? "all" : "basic",
        });
    };

    // ── WebNN: walk gpu → npu → cpu ──
    if (allowWebNN && caps.webnn) {
        for (const deviceType of WEBNN_DEVICE_TYPES) {
            const ep = { name: "webnn" as const, deviceType, powerPreference: "high-performance" };
            try {
                const session = await tryCreate(ep);
                const info: EPInfo = { name: "webnn", deviceType };
                console.log(
                    `%c[FaceService] ✅ ${modelPath} loaded via webnn (${deviceType}) — hardware acceleration ACTIVE`,
                    "color: #00c853; font-weight: bold;",
                );
                return { session, epInfo: info };
            } catch (err: any) {
                console.warn(
                    `[FaceService] webnn/${deviceType} failed for ${modelPath}${deviceType !== "cpu" ? ", trying next..." : ", giving up on WebNN."}`,
                    err?.message ?? err,
                );
            }
        }
    }

    // ── WebGPU ──
    // ResNet50 ops (Conv, BN, ReLU, GlobalAvgPool) are all supported by ORT's
    // WebGPU backend — only WebNN has op-coverage gaps with this model.
    if (allowWebGPU && caps.webgpu) {
        try {
            const session = await tryCreate("webgpu");
            console.log(
                `%c[FaceService] ✅ ${modelPath} loaded via WebGPU — GPU acceleration ACTIVE`,
                "color: #00b0ff; font-weight: bold;",
            );
            return { session, epInfo: { name: "webgpu" } };
        } catch (err: any) {
            // Surface full error so op-coverage / shader failures are visible.
            console.error(
                `[FaceService] WebGPU session creation FAILED for ${modelPath}`,
                "\nMessage:", err?.message,
                "\nFull error:", err,
            );
            console.warn(`[FaceService] WebGPU failed for ${modelPath} — trying WebGL.`);
        }
    }

    // ── WebGL ── GPU-accelerated via OpenGL. Available in ORT v1.14+.
    // Broader browser support than WebGPU; uses GPU shaders for compute.
    if (caps.webgl) {
        try {
            const session = await tryCreate("webgl");
            console.log(
                `%c[FaceService] ✅ ${modelPath} loaded via WebGL — GPU acceleration ACTIVE`,
                "color: #ffab00; font-weight: bold;",
            );
            return { session, epInfo: { name: "webgl" } };
        } catch (err: any) {
            console.warn(
                `[FaceService] WebGL failed for ${modelPath} — falling back to WASM.`,
                err?.message ?? err,
            );
        }
    }

    // ── WASM fallback ──
    const session = await tryCreate("wasm");
    console.log(`[FaceService] ✅ ${modelPath} loaded via WASM (CPU)`);
    return { session, epInfo: { name: "wasm" } };
}

async function getDetector(): Promise<ort.InferenceSession> {
    if (detSession) return detSession;
    if (!detLoadPromise) {
        detLoadPromise = createSession("/models/det_10g.onnx").then(
            ({ session, epInfo }) => { detSession = session; detEPInfo = epInfo; return session; },
        );
    }
    return detLoadPromise;
}

async function getRecognizer(): Promise<ort.InferenceSession> {
    if (recSession) return recSession;
    if (!recLoadPromise) {
        // allowWebNN=false — ResNet50 has ops incompatible with the WebNN API spec.
        // WebGPU is fine and will be tried before falling back to WASM.
        recLoadPromise = createSession("/models/w600k_r50.onnx", { allowWebNN: false }).then(
            ({ session, epInfo }) => { recSession = session; recEPInfo = epInfo; return session; },
        );
    }
    return recLoadPromise;
}

// ─── Canvas utilities ─────────────────────────────────────────────────────────

function stepwiseResize(
    source: HTMLCanvasElement | HTMLImageElement | ImageBitmap,
    targetW: number,
    targetH: number,
): HTMLCanvasElement {
    const srcW = (source as any).naturalWidth ?? (source as any).width;
    const srcH = (source as any).naturalHeight ?? (source as any).height;

    if (srcW <= targetW * 2 && srcH <= targetH * 2) {
        const out = document.createElement("canvas");
        out.width = targetW; out.height = targetH;
        const ctx = out.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source as CanvasImageSource, 0, 0, targetW, targetH);
        return out;
    }

    let current: CanvasImageSource = source as CanvasImageSource;
    let curW = srcW, curH = srcH;

    while (curW > targetW * 2 || curH > targetH * 2) {
        const nextW = Math.max(Math.trunc(curW / 2), targetW);
        const nextH = Math.max(Math.trunc(curH / 2), targetH);
        const tmp = document.createElement("canvas");
        tmp.width = nextW; tmp.height = nextH;
        const ctx = tmp.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(current, 0, 0, nextW, nextH);
        current = tmp; curW = nextW; curH = nextH;
    }

    const out = document.createElement("canvas");
    out.width = targetW; out.height = targetH;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, targetW, targetH);
    return out;
}

// ─── Image preprocessing helpers ──────────────────────────────────────────────

async function loadImageToCanvas(
    url: string,
    maxDim?: number,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number; origW: number; origH: number }> {
    let origW!: number, origH!: number;
    let bitmap: ImageBitmap | null = null;

    if (typeof createImageBitmap !== "undefined") {
        try {
            const resp = await fetch(url, { credentials: "same-origin" });
            const blob = await resp.blob();
            bitmap = await createImageBitmap(blob, { colorSpaceConversion: "none" });
            origW = bitmap.width; origH = bitmap.height;
        } catch { bitmap = null; }
    }

    const getScaledDims = (oW: number, oH: number) => {
        if (!maxDim || Math.max(oW, oH) <= maxDim) return { w: oW, h: oH, scale: 1 };
        const scale = maxDim / Math.max(oW, oH);
        return { w: Math.trunc(oW * scale), h: Math.trunc(oH * scale), scale };
    };

    if (!bitmap) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const oW = img.naturalWidth, oH = img.naturalHeight;
                const { w, h, scale } = getScaledDims(oW, oH);
                const canvas = stepwiseResize(img, w, h);
                const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
                resolve({ canvas, ctx, scale, origW: oW, origH: oH });
            };
            img.onerror = () => reject(new Error(`Image load failed: ${url}`));
            img.src = url;
        });
    }

    const { w, h, scale } = getScaledDims(origW, origH);
    const canvas = stepwiseResize(bitmap, w, h);
    bitmap.close();
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    return { canvas, ctx, scale, origW, origH };
}

function prepareDetInput(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const detScale = DET_SIZE / Math.max(w, h);
    const newW = Math.trunc(w * detScale);
    const newH = Math.trunc(h * detScale);

    const padCanvas = document.createElement("canvas");
    padCanvas.width = DET_SIZE; padCanvas.height = DET_SIZE;
    const padCtx = padCanvas.getContext("2d", { willReadFrequently: true })!;
    padCtx.fillStyle = "#000000";
    padCtx.fillRect(0, 0, DET_SIZE, DET_SIZE);
    padCtx.drawImage(stepwiseResize(ctx.canvas, newW, newH), 0, 0);

    const imageData = padCtx.getImageData(0, 0, DET_SIZE, DET_SIZE);
    const data = imageData.data;
    const float32 = new Float32Array(3 * DET_SIZE * DET_SIZE);
    const pixelCount = DET_SIZE * DET_SIZE;

    for (let i = 0; i < data.length; i += 4) {
        const pi = i / 4;
        float32[pi] = (data[i + 2] - 127.5) / 128.0; // B
        float32[pi + pixelCount] = (data[i + 1] - 127.5) / 128.0; // G
        float32[pi + 2 * pixelCount] = (data[i] - 127.5) / 128.0; // R
    }

    return {
        tensor: new ort.Tensor("float32", float32, [1, 3, DET_SIZE, DET_SIZE]),
        detScale, offsetX: 0, offsetY: 0,
    };
}

// ─── SCRFD output parsing ──────────────────────────────────────────────────────

type RawDetection = {
    x1: number; y1: number; x2: number; y2: number;
    score: number;
    kps: [number, number][];
};

function matchOutputsByName(outputs: ort.InferenceSession.OnnxValueMapType) {
    const names = Object.keys(outputs);

    const sorted = (keyword: string) =>
        names
            .filter((n) => n.toLowerCase().includes(keyword))
            .sort((a, b) => (parseInt(a.replace(/\D/g, ""), 10) || 0) - (parseInt(b.replace(/\D/g, ""), 10) || 0))
            .map((n) => outputs[n].data as Float32Array);

    const scoreOutputs = sorted("score");
    const bboxOutputs = sorted("bbox").length > 0 ? sorted("bbox") : sorted("box");
    const kpsOutputs = sorted("kps").length > 0 ? sorted("kps") : sorted("landmark");

    if (scoreOutputs.length > 0) {
        return { scoreOutputs, bboxOutputs, kpsOutputs };
    }

    // All-numeric names (e.g. SCRFD exported without semantic output names) —
    // this is expected for many off-the-shelf exports, not an error.
    const allNumeric = names.every((n) => /^\d+$/.test(n));
    if (!allNumeric) {
        console.warn(
            "[FaceService] Output names don't contain expected keywords. Falling back to last-dim grouping. Names: " +
            names.join(", "),
        );
    } else {
        console.debug(
            "[FaceService] Numeric output names — using last-dim grouping. Names: " + names.join(", "),
        );
    }

    return fallbackGroupByLastDim(outputs);
}

function fallbackGroupByLastDim(outputs: ort.InferenceSession.OnnxValueMapType) {
    const byDim = new Map<number, { data: Float32Array; size: number }[]>();
    for (const name of Object.keys(outputs)) {
        const t = outputs[name];
        const lastDim = t.dims[t.dims.length - 1];
        if (!byDim.has(lastDim)) byDim.set(lastDim, []);
        byDim.get(lastDim)!.push({ data: t.data as Float32Array, size: (t.data as Float32Array).length });
    }

    // Sort descending by size so stride-8 (largest feature map) comes first,
    // matching STRIDES = [8, 16, 32].
    const sortDesc = (a: { size: number }, b: { size: number }) => b.size - a.size;

    const scoreOutputs = (byDim.get(1) || []).sort(sortDesc).map((x) => x.data);
    const bboxOutputs = (byDim.get(4) || []).sort(sortDesc).map((x) => x.data);
    const kpsOutputs = (byDim.get(10) || []).sort(sortDesc).map((x) => x.data);

    if (scoreOutputs.length === 0) {
        console.error(
            "[FaceService] fallbackGroupByLastDim: could not find score outputs (dim=1). Output dims:",
            Object.fromEntries(Object.entries(outputs).map(([k, v]) => [k, v.dims])),
        );
    }

    return { scoreOutputs, bboxOutputs, kpsOutputs };
}

function parseSCRFDOutputs(
    outputs: ort.InferenceSession.OnnxValueMapType,
    detScale: number, offsetX: number, offsetY: number,
): RawDetection[] {
    const { scoreOutputs, bboxOutputs, kpsOutputs } = matchOutputsByName(outputs);
    const detections: RawDetection[] = [];

    for (let si = 0; si < STRIDES.length && si < scoreOutputs.length; si++) {
        const stride = STRIDES[si];
        const scores = scoreOutputs[si];
        const bboxes = bboxOutputs[si];
        const kps = kpsOutputs[si];
        const fmW = Math.floor(DET_SIZE / stride);
        const fmH = Math.floor(DET_SIZE / stride);

        for (let ay = 0; ay < fmH; ay++) {
            for (let ax = 0; ax < fmW; ax++) {
                for (let an = 0; an < NUM_ANCHORS; an++) {
                    const idx = (ay * fmW + ax) * NUM_ANCHORS + an;
                    const score = scores[idx];
                    if (score < DET_SCORE_THRESHOLD) continue;

                    const anchorCX = (ax + 0.5) * stride;
                    const anchorCY = (ay + 0.5) * stride;
                    const bIdx = idx * 4;

                    const x1 = (anchorCX - bboxes[bIdx + 0] * stride - offsetX) / detScale;
                    const y1 = (anchorCY - bboxes[bIdx + 1] * stride - offsetY) / detScale;
                    const x2 = (anchorCX + bboxes[bIdx + 2] * stride - offsetX) / detScale;
                    const y2 = (anchorCY + bboxes[bIdx + 3] * stride - offsetY) / detScale;

                    const keypoints: [number, number][] = [];
                    if (kps) {
                        const kIdx = idx * 10;
                        for (let k = 0; k < 5; k++) {
                            keypoints.push([
                                (anchorCX + kps[kIdx + k * 2] * stride - offsetX) / detScale,
                                (anchorCY + kps[kIdx + k * 2 + 1] * stride - offsetY) / detScale,
                            ]);
                        }
                    }
                    detections.push({ x1, y1, x2, y2, score, kps: keypoints });
                }
            }
        }
    }
    return nms(detections, NMS_THRESHOLD);
}

function nms(dets: RawDetection[], iouThreshold: number): RawDetection[] {
    if (dets.length === 0) return [];
    dets.sort((a, b) => b.score - a.score);
    const kept: RawDetection[] = [];
    const suppressed = new Set<number>();
    for (let i = 0; i < dets.length; i++) {
        if (suppressed.has(i)) continue;
        kept.push(dets[i]);
        for (let j = i + 1; j < dets.length; j++) {
            if (!suppressed.has(j) && iou(dets[i], dets[j]) > iouThreshold) suppressed.add(j);
        }
    }
    return kept;
}

function iou(a: RawDetection, b: RawDetection): number {
    const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
    const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    return inter / (areaA + areaB - inter + 1e-6);
}

// ─── ArcFace alignment ─────────────────────────────────────────────────────────

function estimateSimilarityTransform(
    src: [number, number][],
    dst: number[][],
): [number, number, number, number, number, number] {
    const n = Math.min(src.length, dst.length);
    const A: number[][] = [];
    const B: number[] = [];

    for (let i = 0; i < n; i++) {
        const [sx, sy] = src[i];
        const [dx, dy] = dst[i];
        A.push([sx, -sy, 1, 0]);
        A.push([sy, sx, 0, 1]);
        B.push(dx); B.push(dy);
    }

    const ATA = Array.from({ length: 4 }, () => new Float64Array(4));
    const ATb = new Float64Array(4);

    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < 4; j++) {
            ATb[j] += A[i][j] * B[i];
            for (let k = 0; k < 4; k++) ATA[j][k] += A[i][j] * A[i][k];
        }
    }

    const aug = ATA.map((row, i) => [...row, ATb[i]]);
    for (let col = 0; col < 4; col++) {
        let maxRow = col;
        for (let row = col + 1; row < 4; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
        const pivot = aug[col][col];
        if (Math.abs(pivot) < 1e-10) continue;
        for (let j = col; j <= 4; j++) aug[col][j] /= pivot;
        for (let row = 0; row < 4; row++) {
            if (row === col) continue;
            const factor = aug[row][col];
            for (let j = col; j <= 4; j++) aug[row][j] -= factor * aug[col][j];
        }
    }

    const [a, b, tx2, ty] = aug.map((row) => row[4]);
    return [a, -b, tx2, b, a, ty];
}

function simpleAlignToFloat32(srcCanvas: HTMLCanvasElement, keypoints: [number, number][]): Float32Array {
    const tmp = document.createElement("canvas");
    tmp.width = 112; tmp.height = 112;
    const ctx = tmp.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if (keypoints.length >= 2) {
        const xs = keypoints.map(([x]) => x);
        const ys = keypoints.map(([, y]) => y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.5;
        ctx.drawImage(srcCanvas, cx - size / 2, cy - size / 2, size, size, 0, 0, 112, 112);
    } else {
        ctx.drawImage(srcCanvas, 0, 0, 112, 112);
    }

    const data = ctx.getImageData(0, 0, 112, 112).data;
    const float32 = new Float32Array(3 * 112 * 112);
    const n = 112 * 112;
    for (let i = 0; i < data.length; i += 4) {
        const pi = i / 4;
        float32[pi] = (data[i + 2] - 127.5) / 127.5; // B
        float32[pi + n] = (data[i + 1] - 127.5) / 127.5; // G
        float32[pi + 2 * n] = (data[i] - 127.5) / 127.5; // R
    }
    return float32;
}

function alignFaceToFloat32(srcCanvas: HTMLCanvasElement, keypoints: [number, number][]): Float32Array {
    if (keypoints.length < 5) return simpleAlignToFloat32(srcCanvas, keypoints);

    const [a, b, tx, c, d, ty] = estimateSimilarityTransform(keypoints, ARCFACE_REF);
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-10) return simpleAlignToFloat32(srcCanvas, keypoints);

    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;

    const kxs = keypoints.map(([x]) => x);
    const kys = keypoints.map(([, y]) => y);
    const faceSpan = Math.max(Math.max(...kxs) - Math.min(...kxs), Math.max(...kys) - Math.min(...kys));
    const pad = faceSpan * 0.8;

    const rx = Math.max(0, Math.floor(Math.min(...kxs) - pad));
    const ry = Math.max(0, Math.floor(Math.min(...kys) - pad));
    const rx2 = Math.min(srcW, Math.ceil(Math.max(...kxs) + pad));
    const ry2 = Math.min(srcH, Math.ceil(Math.max(...kys) + pad));
    const rw = rx2 - rx;
    const rh = ry2 - ry;

    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
    const srcPixels = srcCtx.getImageData(rx, ry, rw, rh).data;

    const ia = d / det, ib = -b / det;
    const ic = -c / det, id2 = a / det;
    const itx = -(ia * tx + ib * ty);
    const ity = -(ic * tx + id2 * ty);

    const float32 = new Float32Array(3 * 112 * 112);
    const n = 112 * 112;

    for (let oy = 0; oy < 112; oy++) {
        for (let ox = 0; ox < 112; ox++) {
            const sx = ia * ox + ib * oy + itx;
            const sy = ic * ox + id2 * oy + ity;
            const lx = sx - rx, ly = sy - ry;

            const x0 = Math.floor(lx), y0 = Math.floor(ly);
            const x1 = x0 + 1, y1 = y0 + 1;
            const fx = lx - x0, fy = ly - y0;
            const fx1 = 1 - fx, fy1 = 1 - fy;

            const w00 = fx1 * fy1, w10 = fx * fy1, w01 = fx1 * fy, w11 = fx * fy;

            const cx0 = Math.max(0, Math.min(rw - 1, x0));
            const cy0 = Math.max(0, Math.min(rh - 1, y0));
            const cx1 = Math.max(0, Math.min(rw - 1, x1));
            const cy1 = Math.max(0, Math.min(rh - 1, y1));

            const i00 = (cy0 * rw + cx0) * 4;
            const i10 = (cy0 * rw + cx1) * 4;
            const i01 = (cy1 * rw + cx0) * 4;
            const i11 = (cy1 * rw + cx1) * 4;

            const r = srcPixels[i00] * w00 + srcPixels[i10] * w10 + srcPixels[i01] * w01 + srcPixels[i11] * w11;
            const g = srcPixels[i00 + 1] * w00 + srcPixels[i10 + 1] * w10 + srcPixels[i01 + 1] * w01 + srcPixels[i11 + 1] * w11;
            const bv = srcPixels[i00 + 2] * w00 + srcPixels[i10 + 2] * w10 + srcPixels[i01 + 2] * w01 + srcPixels[i11 + 2] * w11;

            const pi = oy * 112 + ox;
            float32[pi] = (bv - 127.5) / 127.5; // B
            float32[pi + n] = (g - 127.5) / 127.5; // G
            float32[pi + 2 * n] = (r - 127.5) / 127.5; // R
        }
    }
    return float32;
}

// ─── ArcFace embedding extraction ─────────────────────────────────────────────

async function extractEmbeddingFromFloat32(session: ort.InferenceSession, float32: Float32Array): Promise<number[]> {
    const inputTensor = new ort.Tensor("float32", float32, [1, 3, 112, 112]);
    const inputName = session.inputNames[0];
    const result = await session.run({ [inputName]: inputTensor });
    const outputName = session.outputNames[0];
    const raw = Array.from(result[outputName].data as Float32Array);
    let norm = 0;
    for (let i = 0; i < raw.length; i++) norm += raw[i] * raw[i];
    norm = Math.sqrt(norm) || 1e-10;
    return raw.map((v) => v / norm);
}

// ─── Face quality score ────────────────────────────────────────────────────────

function computeFaceQuality(keypoints: [number, number][], boxW: number): number {
    if (keypoints.length >= 2) {
        const [lx, ly] = keypoints[0];
        const [rx, ry] = keypoints[1];
        const iod = Math.sqrt((rx - lx) ** 2 + (ry - ly) ** 2);
        return Math.min(1, iod / 70);
    }
    return Math.min(1, boxW / 150);
}

// ─── FaceService class ─────────────────────────────────────────────────────────

class FaceService {
    get detEP(): EPInfo | null { return detEPInfo; }
    get recEP(): EPInfo | null { return recEPInfo; }
    get usingGPU(): boolean {
        return detEPInfo?.name === "webnn" || detEPInfo?.name === "webgpu" || detEPInfo?.name === "webgl";
    }

    async preload(): Promise<void> {
        await Promise.all([getDetector(), getRecognizer()]);
        const epSummary = (ep: EPInfo | null) =>
            ep ? `${ep.name}${ep.deviceType ? ` (${ep.deviceType})` : ""}` : "not loaded";
        const detEP = detEPInfo?.name;
        if (detEP === "webnn") {
            console.log(
                "%c[FaceService] 🚀 Detector running via WebNN — hardware acceleration ACTIVE",
                "color: #00c853; font-weight: bold; font-size: 13px;",
            );
        } else if (detEP === "webgpu") {
            console.log(
                "%c[FaceService] 🚀 Detector running via WebGPU — GPU acceleration ACTIVE",
                "color: #00b0ff; font-weight: bold; font-size: 13px;",
            );
        } else if (detEP === "webgl") {
            console.log(
                "%c[FaceService] 🚀 Detector running via WebGL — GPU acceleration ACTIVE",
                "color: #ffab00; font-weight: bold; font-size: 13px;",
            );
        } else {
            console.warn("[FaceService] ⚠️ No GPU acceleration available for detector — running on WASM (CPU).");
        }
        console.log(
            `[FaceService] det EP: ${epSummary(detEPInfo)} | rec EP: ${epSummary(recEPInfo)}`,
        );
    }

    async processImage(url: string): Promise<FaceResult[]> {
        const det = await getDetector();
        const rec = await getRecognizer();

        const { canvas: origCanvas } = await loadImageToCanvas(url);
        const { canvas, ctx, scale } = await loadImageToCanvas(url, MAX_RESIZE);
        const { tensor: inputTensor, detScale, offsetX, offsetY } = prepareDetInput(ctx, canvas.width, canvas.height);

        const inputName = det.inputNames[0];
        const detOutputs = await det.run({ [inputName]: inputTensor });
        const rawDets = parseSCRFDOutputs(detOutputs, detScale, offsetX, offsetY);
        if (rawDets.length === 0) return [];

        const coordScale = 1 / scale;
        const validDets = rawDets.filter((d) => d.score >= DET_SCORE_THRESHOLD);

        // ⚠️ ORT v1.20 WASM sessions are NOT re-entrant — do NOT call session.run()
        // concurrently on the same session instance. Process faces sequentially.
        const results: FaceResult[] = [];
        for (const d of validDets) {
            const kpsOrig: [number, number][] = d.kps.map(
                ([x, y]): [number, number] => [x * coordScale, y * coordScale],
            );
            const float32 = alignFaceToFloat32(origCanvas, kpsOrig);
            const embedding = await extractEmbeddingFromFloat32(rec, float32);
            results.push({
                box: {
                    xmin: d.x1 * coordScale, ymin: d.y1 * coordScale,
                    xmax: d.x2 * coordScale, ymax: d.y2 * coordScale,
                },
                embedding,
                confidence: d.score,
                keypoints: kpsOrig,
                quality: computeFaceQuality(kpsOrig, (d.x2 - d.x1) * coordScale),
            } satisfies FaceResult);
        }

        return results;
    }

    similarity(a: number[], b: number[]): number {
        let dot = 0, mA = 0, mB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            mA += a[i] * a[i];
            mB += b[i] * b[i];
        }
        return dot / (Math.sqrt(mA) * Math.sqrt(mB) + 1e-10);
    }
}

export const faceService = new FaceService();
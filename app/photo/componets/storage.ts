/**
 * storage.ts
 * IndexedDB-backed persistence for the Folios photo page.
 *
 * Schema (DB: "folios-db", version 1)
 * ─────────────────────────────────────
 * Store "groups"  → key: id (number)
 *   { id, name, date, fileKeys: string[] }
 *
 * Store "files"   → key: fileKey (string)
 *   { key, name, kind, size, original: Blob, thumb: Blob, embeddings?: number[][] }
 */

const DB_NAME = "folios-db";
const DB_VERSION = 1;

// ─── open ────────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains("groups")) {
                db.createObjectStore("groups", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("files")) {
                db.createObjectStore("files", { keyPath: "key" });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function tx(
    db: IDBDatabase,
    stores: string | string[],
    mode: IDBTransactionMode = "readonly"
): IDBTransaction {
    return db.transaction(stores, mode);
}

function get<T>(store: IDBObjectStore, key: IDBValidKey): Promise<T | undefined> {
    return new Promise((res, rej) => {
        const req = store.get(key);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

function getAll<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
}

function put(store: IDBObjectStore, value: unknown): Promise<void> {
    return new Promise((res, rej) => {
        const req = store.put(value);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

function del(store: IDBObjectStore, key: IDBValidKey): Promise<void> {
    return new Promise((res, rej) => {
        const req = store.delete(key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
}

// ─── thumbnail generator ─────────────────────────────────────────────────────

/** Resize to max `size` px, encode as WebP at 0.75 quality. */
export function generateThumbnail(blob: Blob, size = 360): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const scale = Math.min(size / img.width, size / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("No 2D context"));
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("Thumbnail blob failed"))),
                "image/webp",
                0.75
            );
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
        img.src = objectUrl;
    });
}

// ─── public API ──────────────────────────────────────────────────────────────

export type StoredGroup = {
    id: number;
    name: string;
    date: string;
    fileKeys: string[];
};

export type StoredFile = {
    key: string;
    name: string;
    kind: string;
    size: number;
    original: Blob;
    thumb: Blob;
    embeddings?: number[][];
    blurScore?: number;
    hasFace?: boolean;
    eyesClosed?: boolean;
};

/** Save a file blob + its thumbnail to IndexedDB. */
export async function saveFile(file: StoredFile): Promise<void> {
    const db = await openDB();
    const t = tx(db, "files", "readwrite");
    await put(t.objectStore("files"), file);
}

/** Update embeddings for an existing file record. */
export async function updateFileEmbeddings(key: string, embeddings: number[][]): Promise<void> {
    const db = await openDB();
    const t = tx(db, "files", "readwrite");
    const store = t.objectStore("files");
    const existing = await get<StoredFile>(store, key);
    if (existing) await put(store, { ...existing, embeddings });
}

/** Update analysis results (blur/face/eyes) for an existing file record. */
export async function updateFileAnalysis(
    key: string,
    analysis: { blurScore: number; hasFace: boolean; eyesClosed: boolean }
): Promise<void> {
    const db = await openDB();
    const t = tx(db, "files", "readwrite");
    const store = t.objectStore("files");
    const existing = await get<StoredFile>(store, key);
    if (existing) await put(store, { ...existing, ...analysis });
}

/** Save / overwrite a group record. */
export async function saveGroup(group: StoredGroup): Promise<void> {
    const db = await openDB();
    const t = tx(db, "groups", "readwrite");
    await put(t.objectStore("groups"), group);
}

/** Load everything from IndexedDB and return { groups, files }. */
export async function loadAll(): Promise<{ groups: StoredGroup[]; files: StoredFile[] }> {
    const db = await openDB();
    const t = tx(db, ["groups", "files"], "readonly");
    const [groups, files] = await Promise.all([
        getAll<StoredGroup>(t.objectStore("groups")),
        getAll<StoredFile>(t.objectStore("files")),
    ]);
    return { groups, files };
}

/** Delete a group and all its files. */
export async function deleteGroupFromDB(id: number, fileKeys: string[]): Promise<void> {
    const db = await openDB();
    const t = tx(db, ["groups", "files"], "readwrite");
    const groupStore = t.objectStore("groups");
    const fileStore = t.objectStore("files");
    await del(groupStore, id);
    await Promise.all(fileKeys.map((k) => del(fileStore, k)));
}

/** Delete a single file record. */
export async function deleteFileFromDB(key: string): Promise<void> {
    const db = await openDB();
    const t = tx(db, "files", "readwrite");
    await del(t.objectStore("files"), key);
}

/** Wipe the entire database. */
export async function clearAllDB(): Promise<void> {
    const db = await openDB();
    const t = tx(db, ["groups", "files"], "readwrite");
    t.objectStore("groups").clear();
    t.objectStore("files").clear();
    return new Promise((resolve, reject) => {
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
    });
}

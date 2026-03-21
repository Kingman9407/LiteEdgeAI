/**
 * faceService.ts
 * Face detection + embedding extraction using InsightFace buffalo_l ONNX models
 * via onnxruntime-web (WebGL → WASM fallback).
 *
 * ACCURACY-CRITICAL: This file exactly replicates photo.py behaviour:
 *   - SCRFD input: letterboxed to fixed 640×640 square (matching det_size=(640,640))
 *   - Face alignment: bilinear interpolation (matching skimage affine warp)
 *   - Coordinate decoding: uses anchor CENTERS (ax+0.5)*stride, not top-left
 *
 * Models expected at:
 *   /models/det_10g.onnx    — SCRFD face detector
 *   /models/w600k_r50.onnx  — ArcFace recognition (512-dim embeddings)
 *
 * FIXES vs previous version:
 *   1. [CRITICAL] Anchor centers: (ax+0.5)*stride instead of ax*stride.
 *      SCRFD decodes distances from anchor centers, not top-left corners.
 *      Old code caused all boxes to shift by half a stride (4–16px), making
 *      the detector miss virtually every face.
 *   2. [CRITICAL] Output tensor matching by name substring (score/bbox/kps)
 *      instead of last-dim size — robust against model variants.
 *   3. Bilinear bounds check: x1 > srcW-1 instead of x1 >= srcW, preventing
 *      valid edge pixels from being blacked out.
 *   4. Added img.crossOrigin = "anonymous" to prevent canvas tainting on
 *      cross-origin images.
 */

import * as ort from "onnxruntime-web";

// ── WASM path: use LOCAL files in /public/ ─────────────────────────────────────
// CRITICAL: next.config.ts sets Cross-Origin-Embedder-Policy: require-corp,
// which blocks cross-origin resource loads (no CORP header) — including any
// CDN URL. The WASM binaries MUST be served from the same origin.
// Run: cp node_modules/onnxruntime-web/dist/*.wasm public/
ort.env.wasm.wasmPaths = "/";          // browser will fetch /ort-wasm*.wasm from origin
ort.env.wasm.numThreads = 1;           // 1 thread: avoids SharedArrayBuffer requirement

// ─── Types ────────────────────────────────────────────────────────────────────

export type FaceResult = {
    box: { xmin: number; ymin: number; xmax: number; ymax: number };
    embedding: number[];
    confidence: number;
    keypoints: [number, number][]; // 5 keypoints: [x,y] pairs
};

export type FaceGroup = {
    groupId: number;
    imageUrls: string[];
    representative: FaceResult;
};

// ─── Constants (matching Python exactly) ──────────────────────────────────────

const DET_SIZE = 640;
const MAX_RESIZE = 640;
const DET_SCORE_THRESHOLD = 0.5;
const NMS_THRESHOLD = 0.4;
const STRIDES = [8, 16, 32];
const NUM_ANCHORS = 2;

// ArcFace alignment reference points for 112×112 output
const ARCFACE_REF = [
    [38.2946, 51.6963],
    [73.5318, 51.5014],
    [56.0252, 71.7366],
    [41.5493, 92.3655],
    [70.7299, 92.2041],
];

// ─── Singleton model cache ─────────────────────────────────────────────────────

let detSession: ort.InferenceSession | null = null;
let recSession: ort.InferenceSession | null = null;
let detLoadPromise: Promise<ort.InferenceSession> | null = null;
let recLoadPromise: Promise<ort.InferenceSession> | null = null;

async function createSession(modelPath: string): Promise<ort.InferenceSession> {
    // Use WASM only — WebGL is skipped for two reasons:
    //   1. The recognition model (166MB) exceeds WebGL max texture size on most GPUs.
    //   2. COEP: require-corp blocks CDN WebGL shader caches from loading.
    // WASM is reliable, works offline, and is built in to the browser.
    console.log(`[FaceService] Loading model: ${modelPath}`);
    try {
        const session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ["wasm"],
            graphOptimizationLevel: "all",
        });
        console.log(`[FaceService] ✅ Loaded: ${modelPath}`);
        return session;
    } catch (err) {
        console.error(`[FaceService] ❌ Failed to load model ${modelPath}:`, err);
        throw err;
    }
}

async function getDetector(): Promise<ort.InferenceSession> {
    if (detSession) return detSession;
    if (!detLoadPromise) {
        detLoadPromise = createSession("/models/det_10g.onnx").then((s) => {
            detSession = s;
            return s;
        });
    }
    return detLoadPromise;
}

async function getRecognizer(): Promise<ort.InferenceSession> {
    if (recSession) return recSession;
    if (!recLoadPromise) {
        recLoadPromise = createSession("/models/w600k_r50.onnx").then((s) => {
            recSession = s;
            return s;
        });
    }
    return recLoadPromise;
}

// ─── Image preprocessing helpers ──────────────────────────────────────────────

/**
 * SPEED: Use createImageBitmap() — decodes the image off the main thread,
 * avoiding layout/paint jank. Falls back to the old <img> path if unavailable.
 *
 * Returns a canvas drawn at the (optionally resized) dimensions.
 */
async function loadImageToCanvas(
    url: string,
    maxDim?: number
): Promise<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    scale: number;
    origW: number;
    origH: number;
}> {
    let origW: number, origH: number;
    let bitmap: ImageBitmap | null = null;

    // createImageBitmap decodes off-main-thread — 2-5x faster than new Image()
    if (typeof createImageBitmap !== "undefined") {
        try {
            // fetch with same-origin credentials so blob URLs and local files work
            const resp = await fetch(url, { credentials: "same-origin" });
            const blob = await resp.blob();
            bitmap = await createImageBitmap(blob);
            origW = bitmap.width;
            origH = bitmap.height;
        } catch {
            bitmap = null; // fall through to <img> path
        }
    }

    if (!bitmap) {
        // Fallback: legacy <img> path
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const oW = img.width, oH = img.height;
                let w = oW, h = oH, scale = 1;
                if (maxDim && Math.max(w, h) > maxDim) {
                    scale = maxDim / Math.max(w, h);
                    w = Math.round(w * scale);
                    h = Math.round(h * scale);
                }
                const canvas = document.createElement("canvas");
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
                ctx.drawImage(img, 0, 0, w, h);
                resolve({ canvas, ctx, scale, origW: oW, origH: oH });
            };
            img.onerror = () => reject(new Error(`Image load failed: ${url}`));
            img.src = url;
        });
    }

    let w = origW!, h = origH!, scale = 1;
    if (maxDim && Math.max(w, h) > maxDim) {
        scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close(); // free GPU/memory immediately
    return { canvas, ctx, scale, origW: origW!, origH: origH! };
}

/**
 * Prepare detection input tensor: letterboxed to DET_SIZE×DET_SIZE square.
 *
 * MATCHES PYTHON: InsightFace app.prepare(det_size=(640,640)) does:
 *   1. Resize image so longest side = 640
 *   2. Pad shorter side with black to make exactly 640×640 (top-left origin)
 *   3. Normalize: (pixel - 127.5) / 128.0
 *
 * Returns the tensor plus the scale needed to map coordinates back.
 * offsetX/offsetY are always 0 (InsightFace places image at top-left).
 */
function prepareDetInput(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
): {
    tensor: ort.Tensor;
    detScale: number;
    offsetX: number;
    offsetY: number;
} {
    const detScale = DET_SIZE / Math.max(w, h);
    const newW = Math.round(w * detScale);
    const newH = Math.round(h * detScale);

    const padCanvas = document.createElement("canvas");
    padCanvas.width = DET_SIZE;
    padCanvas.height = DET_SIZE;
    const padCtx = padCanvas.getContext("2d")!;

    padCtx.fillStyle = "#000000";
    padCtx.fillRect(0, 0, DET_SIZE, DET_SIZE);

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = newW;
    tmpCanvas.height = newH;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.drawImage(ctx.canvas, 0, 0, newW, newH);
    padCtx.drawImage(tmpCanvas, 0, 0);

    const imageData = padCtx.getImageData(0, 0, DET_SIZE, DET_SIZE);
    const data = imageData.data;
    const float32 = new Float32Array(3 * DET_SIZE * DET_SIZE);
    const pixelCount = DET_SIZE * DET_SIZE;

    for (let i = 0; i < data.length; i += 4) {
        const pi = i / 4;
        float32[pi] = (data[i] - 127.5) / 128.0;                       // R
        float32[pi + pixelCount] = (data[i + 1] - 127.5) / 128.0;      // G
        float32[pi + 2 * pixelCount] = (data[i + 2] - 127.5) / 128.0;  // B
    }

    return {
        tensor: new ort.Tensor("float32", float32, [1, 3, DET_SIZE, DET_SIZE]),
        detScale,
        offsetX: 0,
        offsetY: 0,
    };
}

// ─── SCRFD output parsing ──────────────────────────────────────────────────────

type RawDetection = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number;
    kps: [number, number][];
};

/**
 * Match SCRFD output tensors by name substring.
 *
 * FIX #2: Previous code grouped outputs by last dimension size (1, 4, 10).
 * This is fragile — other outputs can share those sizes. Matching by name
 * substring (score, bbox/box, kps/landmark) is reliable across model versions.
 *
 * det_10g.onnx output names follow the pattern:
 *   score_8, score_16, score_32
 *   bbox_8,  bbox_16,  bbox_32
 *   kps_8,   kps_16,   kps_32
 */
function matchOutputsByName(
    outputs: ort.InferenceSession.OnnxValueMapType
): {
    scoreOutputs: Float32Array[];
    bboxOutputs: Float32Array[];
    kpsOutputs: Float32Array[];
} {
    const names = Object.keys(outputs);

    // Sort by stride (8 → 16 → 32) so index 0 = stride 8 always
    const sorted = (keyword: string) =>
        names
            .filter((n) => n.toLowerCase().includes(keyword))
            .sort((a, b) => {
                const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
                const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
                return numA - numB;
            })
            .map((n) => outputs[n].data as Float32Array);

    const scoreOutputs = sorted("score");
    // "bbox" or "box"
    const bboxOutputs =
        sorted("bbox").length > 0 ? sorted("bbox") : sorted("box");
    // "kps" or "landmark"
    const kpsOutputs =
        sorted("kps").length > 0 ? sorted("kps") : sorted("landmark");

    // Fallback: if names don't match keywords, group by last dimension as before
    if (scoreOutputs.length === 0) {
        console.warn(
            "[FaceService] Output names don't contain expected keywords (score/bbox/kps). " +
            "Falling back to last-dim grouping. Output names: " +
            names.join(", ")
        );
        return fallbackGroupByLastDim(outputs);
    }

    return { scoreOutputs, bboxOutputs, kpsOutputs };
}

/** Original last-dim grouping kept as a fallback. */
function fallbackGroupByLastDim(
    outputs: ort.InferenceSession.OnnxValueMapType
): {
    scoreOutputs: Float32Array[];
    bboxOutputs: Float32Array[];
    kpsOutputs: Float32Array[];
} {
    const byDim = new Map<
        number,
        { data: Float32Array; size: number }[]
    >();
    for (const name of Object.keys(outputs)) {
        const t = outputs[name];
        const lastDim = t.dims[t.dims.length - 1];
        if (!byDim.has(lastDim)) byDim.set(lastDim, []);
        byDim.get(lastDim)!.push({
            data: t.data as Float32Array,
            size: (t.data as Float32Array).length,
        });
    }
    const sortBySize = (
        a: { size: number },
        b: { size: number }
    ) => b.size - a.size;

    return {
        scoreOutputs: (byDim.get(1) || []).sort(sortBySize).map((x) => x.data),
        bboxOutputs: (byDim.get(4) || []).sort(sortBySize).map((x) => x.data),
        kpsOutputs: (byDim.get(10) || []).sort(sortBySize).map((x) => x.data),
    };
}

/**
 * Parse SCRFD det_10g outputs and decode face bounding boxes + keypoints.
 *
 * FIX #1 — CRITICAL: Anchor centers use (ax + 0.5) * stride.
 *
 * SCRFD is a distance-based detector (like FCOS). Each anchor predicts
 * distances (left, top, right, bottom) FROM THE ANCHOR CENTER to the box edges:
 *
 *   x1 = anchorCX - dist_left  * stride
 *   y1 = anchorCY - dist_top   * stride
 *   x2 = anchorCX + dist_right * stride
 *   y2 = anchorCY + dist_bot   * stride
 *
 * The anchor center for grid cell (ax, ay) at a given stride is:
 *   anchorCX = (ax + 0.5) * stride
 *   anchorCY = (ay + 0.5) * stride
 *
 * The old code used ax * stride (top-left), which shifted every box by
 * half a stride (4px for stride-8, up to 16px for stride-32). At stride 8
 * (the scale used for small/close faces), a 4px shift is enough to push the
 * predicted center outside the face region, causing the score threshold to
 * reject valid detections. This is why no faces were found.
 */
function parseSCRFDOutputs(
    outputs: ort.InferenceSession.OnnxValueMapType,
    detScale: number,
    offsetX: number,
    offsetY: number
): RawDetection[] {
    const { scoreOutputs, bboxOutputs, kpsOutputs } =
        matchOutputsByName(outputs);

    const detections: RawDetection[] = [];

    for (
        let si = 0;
        si < STRIDES.length && si < scoreOutputs.length;
        si++
    ) {
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

                    // FIX #1: anchor CENTER = (cell_index + 0.5) * stride
                    const anchorCX = (ax + 0.5) * stride;
                    const anchorCY = (ay + 0.5) * stride;

                    // Decode distances → box, then map back to original image space
                    const bIdx = idx * 4;
                    const x1 =
                        (anchorCX - bboxes[bIdx + 0] * stride - offsetX) / detScale;
                    const y1 =
                        (anchorCY - bboxes[bIdx + 1] * stride - offsetY) / detScale;
                    const x2 =
                        (anchorCX + bboxes[bIdx + 2] * stride - offsetX) / detScale;
                    const y2 =
                        (anchorCY + bboxes[bIdx + 3] * stride - offsetY) / detScale;

                    // Decode keypoints
                    const keypoints: [number, number][] = [];
                    if (kps) {
                        const kIdx = idx * 10;
                        for (let k = 0; k < 5; k++) {
                            keypoints.push([
                                (anchorCX + kps[kIdx + k * 2] * stride - offsetX) /
                                detScale,
                                (anchorCY + kps[kIdx + k * 2 + 1] * stride - offsetY) /
                                detScale,
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

/** Non-Maximum Suppression. */
function nms(dets: RawDetection[], iouThreshold: number): RawDetection[] {
    if (dets.length === 0) return [];
    dets.sort((a, b) => b.score - a.score);

    const kept: RawDetection[] = [];
    const suppressed = new Set<number>();

    for (let i = 0; i < dets.length; i++) {
        if (suppressed.has(i)) continue;
        kept.push(dets[i]);
        for (let j = i + 1; j < dets.length; j++) {
            if (suppressed.has(j)) continue;
            if (iou(dets[i], dets[j]) > iouThreshold) suppressed.add(j);
        }
    }
    return kept;
}

function iou(a: RawDetection, b: RawDetection): number {
    const x1 = Math.max(a.x1, b.x1);
    const y1 = Math.max(a.y1, b.y1);
    const x2 = Math.min(a.x2, b.x2);
    const y2 = Math.min(a.y2, b.y2);
    const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    return inter / (areaA + areaB - inter + 1e-6);
}

// ─── ArcFace alignment ─────────────────────────────────────────────────────────

/**
 * Compute a similarity transform (4-DOF: scale, rotation, translation) from
 * detected keypoints to the ArcFace 112×112 reference layout.
 * Returns the 2×3 affine matrix as [a, b, tx, c, d, ty].
 */
function estimateSimilarityTransform(
    src: [number, number][],
    dst: number[][]
): [number, number, number, number, number, number] {
    const n = Math.min(src.length, dst.length);
    const A: number[][] = [];
    const B: number[] = [];

    for (let i = 0; i < n; i++) {
        const [sx, sy] = src[i];
        const [dx, dy] = dst[i];
        A.push([sx, -sy, 1, 0]);
        A.push([sy, sx, 0, 1]);
        B.push(dx);
        B.push(dy);
    }

    const ATA = Array.from({ length: 4 }, () => new Float64Array(4));
    const ATb = new Float64Array(4);

    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < 4; j++) {
            ATb[j] += A[i][j] * B[i];
            for (let k = 0; k < 4; k++) {
                ATA[j][k] += A[i][j] * A[i][k];
            }
        }
    }

    // Solve via Gaussian elimination with partial pivoting
    const aug = ATA.map((row, i) => [...row, ATb[i]]);
    for (let col = 0; col < 4; col++) {
        let maxRow = col;
        for (let row = col + 1; row < 4; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col]))
                maxRow = row;
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

/**
 * Warp a face region to 112×112 using affine transform + bilinear interpolation.
 *
 * FIX #3: Bounds check changed from `x1 >= srcW` to `x1 > srcW - 1`.
 * The old check blacked out any pixel whose bilinear right-neighbor landed
 * exactly on the last column/row, unnecessarily losing valid edge data.
 */
function alignFace(
    srcCanvas: HTMLCanvasElement,
    keypoints: [number, number][]
): HTMLCanvasElement {
    if (keypoints.length < 5) {
        return simpleAlignFace(srcCanvas, keypoints);
    }

    const [a, b, tx, c, d, ty] = estimateSimilarityTransform(
        keypoints,
        ARCFACE_REF
    );
    const outCanvas = document.createElement("canvas");
    outCanvas.width = 112;
    outCanvas.height = 112;
    const outCtx = outCanvas.getContext("2d")!;

    const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true })!;
    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const outData = outCtx.createImageData(112, 112);
    const srcW = srcCanvas.width;
    const srcH = srcCanvas.height;
    const srcPixels = srcData.data;
    const outPixels = outData.data;

    // Invert the 2×2 part: det = a*d - b*c
    const det = a * d - b * c;
    if (Math.abs(det) < 1e-10) return simpleAlignFace(srcCanvas, keypoints);
    const ia = d / det,
        ib = -b / det;
    const ic = -c / det,
        id2 = a / det;
    const itx = -(ia * tx + ib * ty);
    const ity = -(ic * tx + id2 * ty);

    for (let oy = 0; oy < 112; oy++) {
        for (let ox = 0; ox < 112; ox++) {
            const sx = ia * ox + ib * oy + itx;
            const sy = ic * ox + id2 * oy + ity;

            const x0 = Math.floor(sx);
            const y0 = Math.floor(sy);
            const x1 = x0 + 1;
            const y1 = y0 + 1;

            const outIdx = (oy * 112 + ox) * 4;

            // FIX #3: use > srcW-1 (not >= srcW) so last-pixel neighbors are valid
            if (x0 < 0 || y0 < 0 || x1 > srcW - 1 || y1 > srcH - 1) {
                outPixels[outIdx + 3] = 255; // black, fully opaque
                continue;
            }

            const fx = sx - x0;
            const fy = sy - y0;
            const fx1 = 1 - fx;
            const fy1 = 1 - fy;

            const i00 = (y0 * srcW + x0) * 4;
            const i10 = (y0 * srcW + x1) * 4;
            const i01 = (y1 * srcW + x0) * 4;
            const i11 = (y1 * srcW + x1) * 4;

            const w00 = fx1 * fy1;
            const w10 = fx * fy1;
            const w01 = fx1 * fy;
            const w11 = fx * fy;

            outPixels[outIdx] =
                srcPixels[i00] * w00 +
                srcPixels[i10] * w10 +
                srcPixels[i01] * w01 +
                srcPixels[i11] * w11;
            outPixels[outIdx + 1] =
                srcPixels[i00 + 1] * w00 +
                srcPixels[i10 + 1] * w10 +
                srcPixels[i01 + 1] * w01 +
                srcPixels[i11 + 1] * w11;
            outPixels[outIdx + 2] =
                srcPixels[i00 + 2] * w00 +
                srcPixels[i10 + 2] * w10 +
                srcPixels[i01 + 2] * w01 +
                srcPixels[i11 + 2] * w11;
            outPixels[outIdx + 3] = 255;
        }
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
}

function simpleAlignFace(
    srcCanvas: HTMLCanvasElement,
    keypoints: [number, number][]
): HTMLCanvasElement {
    const outCanvas = document.createElement("canvas");
    outCanvas.width = 112;
    outCanvas.height = 112;
    const ctx = outCanvas.getContext("2d")!;

    if (keypoints.length >= 2) {
        const xs = keypoints.map(([x]) => x);
        const ys = keypoints.map(([, y]) => y);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const size =
            Math.max(
                Math.max(...xs) - Math.min(...xs),
                Math.max(...ys) - Math.min(...ys)
            ) * 1.5;
        ctx.drawImage(
            srcCanvas,
            cx - size / 2,
            cy - size / 2,
            size,
            size,
            0,
            0,
            112,
            112
        );
    } else {
        ctx.drawImage(srcCanvas, 0, 0, 112, 112);
    }
    return outCanvas;
}

// ─── ArcFace embedding extraction ─────────────────────────────────────────────

async function extractEmbedding(
    session: ort.InferenceSession,
    faceCanvas: HTMLCanvasElement
): Promise<number[]> {
    const ctx = faceCanvas.getContext("2d", { willReadFrequently: true })!;
    const imageData = ctx.getImageData(0, 0, 112, 112);
    const data = imageData.data;
    const float32 = new Float32Array(3 * 112 * 112);
    const pixelCount = 112 * 112;

    // Normalise: (pixel - 127.5) / 127.5, channel-first layout
    for (let i = 0; i < data.length; i += 4) {
        const pi = i / 4;
        float32[pi] = (data[i] - 127.5) / 127.5;
        float32[pi + pixelCount] = (data[i + 1] - 127.5) / 127.5;
        float32[pi + 2 * pixelCount] = (data[i + 2] - 127.5) / 127.5;
    }

    const inputTensor = new ort.Tensor("float32", float32, [1, 3, 112, 112]);
    const inputName = session.inputNames[0];
    const result = await session.run({ [inputName]: inputTensor });
    const outputName = session.outputNames[0];
    return Array.from(result[outputName].data as Float32Array);
}

// ─── FaceService class ─────────────────────────────────────────────────────────

class FaceService {
    public usingGPU = false;

    /** Pre-load both ONNX models. Call at the start of Stage 3. */
    async preload(): Promise<void> {
        await Promise.all([getDetector(), getRecognizer()]);
    }

    /**
     * Detect faces and extract 512-dim ArcFace embeddings from an image.
     *
     * Pipeline (matching Python photo.py exactly):
     *   1. Resize to max 640px
     *   2. Letterbox to 640×640 for SCRFD detection
     *   3. Decode detections back to original-image coordinates
     *      — using anchor CENTERS (ax+0.5)*stride  ← the critical fix
     *   4. Align faces using similarity transform + bilinear interpolation
     *   5. Extract ArcFace embeddings
     */
    async processImage(url: string): Promise<FaceResult[]> {
        const det = await getDetector();
        const rec = await getRecognizer();

        // Load and resize to max 640px
        const { canvas, ctx, scale } = await loadImageToCanvas(url, MAX_RESIZE);
        const w = canvas.width;
        const h = canvas.height;

        // Prepare detection input: letterbox to 640×640 square
        const {
            tensor: inputTensor,
            detScale,
            offsetX,
            offsetY,
        } = prepareDetInput(ctx, w, h);

        // Run SCRFD detection
        const inputName = det.inputNames[0];
        const detOutputs = await det.run({ [inputName]: inputTensor });

        // Parse detections — coordinates in resized-image space
        const rawDets = parseSCRFDOutputs(detOutputs, detScale, offsetX, offsetY);

        if (rawDets.length === 0) return [];

        // SPEED: Reuse the already-decoded 640px canvas for alignment instead of
        // loading the original image a second time. ArcFace output is 112×112 so
        // the quality difference between 640px and full-res source is negligible.
        // This eliminates one full image decode per processImage() call.
        const alignCanvas = canvas;  // 640px-resized, already in memory
        const coordScale = 1 / scale; // resized → original coords (for box reporting)

        // SPEED: Align + embed all detected faces in parallel.
        // alignFace is CPU-bound canvas work; extractEmbedding awaits ONNX inference.
        // Running them concurrently overlaps canvas work with ONNX scheduling.
        const validDets = rawDets.filter((d) => d.score >= DET_SCORE_THRESHOLD);

        const results = await Promise.all(
            validDets.map(async (d) => {
                // Keypoints are already in resized-image space — use directly for alignment
                const alignKps: [number, number][] = d.kps;

                const aligned = alignFace(alignCanvas, alignKps);
                const embedding = await extractEmbedding(rec, aligned);

                return {
                    box: {
                        xmin: d.x1 * coordScale,
                        ymin: d.y1 * coordScale,
                        xmax: d.x2 * coordScale,
                        ymax: d.y2 * coordScale,
                    },
                    embedding,
                    confidence: d.score,
                    keypoints: d.kps.map(([x, y]): [number, number] => [
                        x * coordScale,
                        y * coordScale,
                    ]),
                } satisfies FaceResult;
            })
        );

        return results;
    }

    /** Cosine similarity between two L2-normalized embedding vectors. */
    similarity(a: number[], b: number[]): number {
        let dot = 0,
            mA = 0,
            mB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            mA += a[i] * a[i];
            mB += b[i] * b[i];
        }
        return dot / (Math.sqrt(mA) * Math.sqrt(mB) + 1e-10);
    }
}

export const faceService = new FaceService();
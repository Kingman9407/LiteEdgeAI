import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

if (typeof window === "undefined") {
    throw new Error(
        "[eyeService] This module must only be imported on the client side. " +
        "Use next/dynamic with { ssr: false } or a 'use client' dynamic import."
    );
}

const _origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
    if (
        typeof args[0] === "string" &&
        (args[0].includes("TensorFlow Lite XNNPACK delegate") ||
            (args[0].includes("INFO:") && args[0].includes("TensorFlow")))
    ) return;
    _origConsoleError(...args);
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EAR_THRESHOLD = 0.2;
const MAX_RESIZE = 640;

const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const WASM_PATH = "/mediapipe-wasm";
const MODEL_PATH = "/models/face_landmarker.task";

// ─── Singleton model cache ────────────────────────────────────────────────────

let landmarkerInstance: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
    if (landmarkerInstance) return landmarkerInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        let landmarker: FaceLandmarker;
        try {
            landmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
                runningMode: "IMAGE",
                numFaces: 1,
                outputFacialTransformationMatrixes: false,
                outputFaceBlendshapes: false,
            });
            console.log("[eyeService] ✅ FaceLandmarker loaded (GPU delegate)");
        } catch (gpuErr) {
            console.warn("[eyeService] GPU delegate failed, retrying with CPU.", gpuErr);
            landmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
                runningMode: "IMAGE",
                numFaces: 1,
                outputFacialTransformationMatrixes: false,
                outputFaceBlendshapes: false,
            });
            console.log("[eyeService] ✅ FaceLandmarker loaded (CPU delegate)");
        }
        landmarkerInstance = landmarker;
        return landmarker;
    })();

    return loadingPromise;
}

// ─── EAR computation ──────────────────────────────────────────────────────────

function dist(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

function computeEAR(
    landmarks: { x: number; y: number }[],
    indices: number[],
    imgW: number,
    imgH: number,
): number {
    const pts = indices.map((i) => ({
        px: landmarks[i].x * imgW,
        py: landmarks[i].y * imgH,
    }));
    const [p1, p2, p3, p4, p5, p6] = pts;
    const A = dist(p2.px, p2.py, p6.px, p6.py);
    const B = dist(p3.px, p3.py, p5.px, p5.py);
    const C = dist(p1.px, p1.py, p4.px, p4.py);
    if (C === 0) return 0;
    return (A + B) / (2 * C);
}

// ─── Canvas utilities ─────────────────────────────────────────────────────────

/**
 * Stepwise halving resize — same as faceService.ts.
 * Avoids aliasing when downscaling > 2× (e.g. 4K → 640px).
 */
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
        current = tmp;
        curW = nextW; curH = nextH;
    }

    const out = document.createElement("canvas");
    out.width = targetW; out.height = targetH;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, targetW, targetH);
    return out;
}

/**
 * Load image and produce a canvas ready for MediaPipe.
 *
 * FIX 1: colorSpaceConversion:"none" — raw pixels, matches cv2.imread.
 * FIX 2: Math.trunc — matches Python int() truncation.
 * FIX 3: stepwiseResize — no alias noise from large downscales.
 * FIX 4: optional faceCrop — zooms to the detected face region before
 *         passing to MediaPipe so small faces get reliable landmark coords,
 *         and the correct face is always checked in group shots.
 */
async function loadFaceCanvas(
    imageUrl: string,
    faceCrop?: { xmin: number; ymin: number; xmax: number; ymax: number },
): Promise<HTMLCanvasElement> {
    let bitmap: ImageBitmap | null = null;

    if (typeof createImageBitmap !== "undefined") {
        try {
            const resp = await fetch(imageUrl, { credentials: "same-origin" });
            const blob = await resp.blob();
            bitmap = await createImageBitmap(blob, {
                colorSpaceConversion: "none", // FIX 1: raw pixels
            });
        } catch {
            bitmap = null;
        }
    }

    // Fallback path — <img> element, no color management control
    if (!bitmap) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = buildFaceCanvas(img, faceCrop);
                resolve(canvas);
            };
            img.onerror = () => reject(new Error(`Image load failed: ${imageUrl}`));
            img.src = imageUrl;
        });
    }

    const canvas = buildFaceCanvas(bitmap, faceCrop);
    bitmap.close();
    return canvas;
}

function buildFaceCanvas(
    source: HTMLImageElement | ImageBitmap,
    faceCrop?: { xmin: number; ymin: number; xmax: number; ymax: number },
): HTMLCanvasElement {
    const srcW = (source as any).naturalWidth ?? (source as any).width;
    const srcH = (source as any).naturalHeight ?? (source as any).height;

    if (!faceCrop) {
        // No crop — resize full image to max 640px
        const scale = Math.min(1, MAX_RESIZE / Math.max(srcW, srcH));
        const w = Math.trunc(srcW * scale); // FIX 2: truncate
        const h = Math.trunc(srcH * scale);
        return stepwiseResize(source, w, h); // FIX 3: stepwise
    }

    // FIX 4: crop to face bounding box first, then resize to 640px.
    // This guarantees:
    //   a) The correct face is passed to MediaPipe (not just the largest one).
    //   b) Small faces in zoomed-out shots are scaled up to fill the canvas —
    //      eye region becomes large enough for reliable landmark detection.
    //   c) Background behind other faces is excluded entirely.
    const cropX = Math.max(0, Math.floor(faceCrop.xmin));
    const cropY = Math.max(0, Math.floor(faceCrop.ymin));
    const cropW = Math.min(srcW - cropX, Math.ceil(faceCrop.xmax - faceCrop.xmin));
    const cropH = Math.min(srcH - cropY, Math.ceil(faceCrop.ymax - faceCrop.ymin));

    // Add 40% margin on each side so MediaPipe sees enough context for mesh fitting
    const margin = Math.max(cropW, cropH) * 0.4;
    const padX = Math.max(0, Math.floor(cropX - margin));
    const padY = Math.max(0, Math.floor(cropY - margin));
    const padX2 = Math.min(srcW, Math.ceil(cropX + cropW + margin));
    const padY2 = Math.min(srcH, Math.ceil(cropY + cropH + margin));
    const padW = padX2 - padX;
    const padH = padY2 - padY;

    // Extract crop
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = padW;
    cropCanvas.height = padH;
    cropCanvas.getContext("2d")!.drawImage(
        source as CanvasImageSource,
        padX, padY, padW, padH,
        0, 0, padW, padH,
    );

    // Resize crop to max 640px
    const scale = Math.min(1, MAX_RESIZE / Math.max(padW, padH));
    const w = Math.trunc(padW * scale); // FIX 2
    const h = Math.trunc(padH * scale);
    return stepwiseResize(cropCanvas, w, h); // FIX 3
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type EyeCheckResult = {
    eyesClosed: boolean;
    ear: number;
};

/**
 * Check if eyes are closed using MediaPipe FaceLandmarker + EAR.
 *
 * @param imageUrl  Object URL or data URL of the image.
 * @param faceCrop  Optional bounding box from faceService — when provided the
 *                  eye check runs on the correct face rather than MediaPipe's
 *                  largest-face heuristic. Required for group shots and
 *                  zoomed-out images where face size < ~80px.
 */
export async function checkEyes(
    imageUrl: string,
    faceCrop?: { xmin: number; ymin: number; xmax: number; ymax: number },
): Promise<EyeCheckResult> {
    const landmarker = await getLandmarker();
    const canvas = await loadFaceCanvas(imageUrl, faceCrop);
    const imgW = canvas.width;
    const imgH = canvas.height;

    const result = landmarker.detect(canvas);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        return { eyesClosed: false, ear: 1.0 };
    }

    const landmarks = result.faceLandmarks[0];
    const leftEAR = computeEAR(landmarks, LEFT_EYE, imgW, imgH);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE, imgW, imgH);
    const avgEAR = (leftEAR + rightEAR) / 2;

    return {
        eyesClosed: avgEAR < EAR_THRESHOLD,
        ear: avgEAR,
    };
}

export async function preloadEyeModel(): Promise<void> {
    await getLandmarker();
}
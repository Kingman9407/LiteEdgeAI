/**
 * eyeService.ts
 * Eyes-closed detection using MediaPipe FaceLandmarker + Eye Aspect Ratio.
 *
 * MATCHES PYTHON photo.py EXACTLY:
 *   - Same landmark indices: LEFT_EYE=[362,385,387,263,373,380], RIGHT_EYE=[33,160,158,133,153,144]
 *   - Same EAR formula: (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 *   - Same EAR_THRESHOLD = 0.2
 *   - Processes RESIZED image (max 640px), matching Python's `eyes_open_check(resized)`
 *   - Permissive on no-face (returns eyesClosed=false), matching Python
 */

import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// ─── Constants (matching Python exactly) ─────────────────────────────────────

const EAR_THRESHOLD = 0.2;
const MAX_RESIZE = 640;

// MediaPipe 478-point model landmark indices for EAR computation
const LEFT_EYE  = [362, 385, 387, 263, 373, 380]; // [p1,p2,p3,p4,p5,p6]
const RIGHT_EYE = [33,  160, 158, 133, 153, 144]; // [p1,p2,p3,p4,p5,p6]

// ─── Singleton model cache ───────────────────────────────────────────────────

let landmarkerInstance: FaceLandmarker | null = null;
let loadingPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
    if (landmarkerInstance) return landmarkerInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU",
            },
            runningMode: "IMAGE",
            numFaces: 1,
            outputFacialTransformationMatrixes: false,
            outputFaceBlendshapes: false,
        });

        landmarkerInstance = landmarker;
        return landmarker;
    })();

    return loadingPromise;
}

// ─── EAR computation ─────────────────────────────────────────────────────────

/**
 * Euclidean distance between two PIXEL-space points.
 * IMPORTANT: MediaPipe Tasks Vision returns normalized [0,1] landmarks.
 * They must be scaled to pixel space BEFORE calling this, otherwise EAR
 * is wrong on non-square images because X and Y cover different pixel ranges.
 * Python: pts.append(np.array([lm.x * img_w, lm.y * img_h]))
 */
function dist(ax: number, ay: number, bx: number, by: number): number {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Eye Aspect Ratio for 6 landmark points — computed in PIXEL SPACE.
 *
 *     p2  p3
 *    /      \
 *   p1      p4
 *    \      /
 *     p6  p5
 *
 * EAR = (||p2−p6|| + ||p3−p5||) / (2 × ||p1−p4||)
 *
 * Matches Python eye_aspect_ratio() which scales landmarks to pixel coords.
 */
function computeEAR(
    landmarks: { x: number; y: number }[],
    indices: number[],
    imgW: number,
    imgH: number
): number {
    // Scale normalized [0,1] landmarks to pixel coordinates — matching Python:
    //   pts.append(np.array([lm.x * img_w, lm.y * img_h]))
    const pts = indices.map((i) => ({
        px: landmarks[i].x * imgW,
        py: landmarks[i].y * imgH,
    }));
    const [p1, p2, p3, p4, p5, p6] = pts;
    const A = dist(p2.px, p2.py, p6.px, p6.py); // vertical 1
    const B = dist(p3.px, p3.py, p5.px, p5.py); // vertical 2
    const C = dist(p1.px, p1.py, p4.px, p4.py); // horizontal
    if (C === 0) return 0;
    return (A + B) / (2 * C);
}

// ─── Image resize helper (matching Python MAX_RESIZE) ────────────────────────

/**
 * Load image and resize to max MAX_RESIZE px, matching Python's
 * `resize_image(image, max_dim=MAX_RESIZE)` before `eyes_open_check(resized)`.
 */
function loadAndResizeImage(imageUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const origW = img.width;
            const origH = img.height;

            // If already within MAX_RESIZE, use as-is
            if (Math.max(origW, origH) <= MAX_RESIZE) {
                resolve(img);
                return;
            }

            // Resize to max 640px via canvas, then create a new image
            const scale = MAX_RESIZE / Math.max(origW, origH);
            const w = Math.round(origW * scale);
            const h = Math.round(origH * scale);

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, w, h);

            const resizedImg = new Image();
            resizedImg.onload = () => resolve(resizedImg);
            resizedImg.onerror = () => reject(new Error("Resized image load failed"));
            resizedImg.src = canvas.toDataURL("image/png");
        };
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = imageUrl;
    });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type EyeCheckResult = {
    eyesClosed: boolean;
    ear: number;
};

/**
 * Check if eyes are closed in an image using MediaPipe FaceLandmarker + EAR.
 *
 * Matches Python exactly:
 *   1. Resize to max 640px
 *   2. Run MediaPipe face mesh
 *   3. Compute EAR for both eyes
 *   4. Return closed if avgEAR < 0.2
 *
 * @param imageUrl - Object URL or data URL of the image
 * @returns { eyesClosed, ear } — ear < 0.2 means eyes closed
 */
export async function checkEyes(imageUrl: string): Promise<EyeCheckResult> {
    const landmarker = await getLandmarker();

    // Load and RESIZE to max 640px (matching Python: eyes_open_check(resized))
    const img = await loadAndResizeImage(imageUrl);

    // Pixel dimensions of the resized image — needed to un-normalize landmarks.
    // MediaPipe Tasks Vision returns normalized [0,1] coords; EAR must be
    // computed in pixel space to handle non-square images correctly.
    const imgW = img.width;
    const imgH = img.height;

    // Run face landmark detection
    const result = landmarker.detect(img);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
        // No face found by MediaPipe — be permissive (match Python behavior)
        return { eyesClosed: false, ear: 1.0 };
    }

    const landmarks = result.faceLandmarks[0];

    // Pass imgW/imgH so computeEAR scales to pixel space — matches Python:
    //   h, w = image.shape[:2]
    //   pts.append(np.array([lm.x * img_w, lm.y * img_h]))
    const leftEAR  = computeEAR(landmarks, LEFT_EYE,  imgW, imgH);
    const rightEAR = computeEAR(landmarks, RIGHT_EYE, imgW, imgH);
    const avgEAR = (leftEAR + rightEAR) / 2;

    // Python: return avg_ear >= EAR_THRESHOLD  (open if >= 0.2)
    // So eyes are CLOSED when avg_ear < EAR_THRESHOLD
    return {
        eyesClosed: avgEAR < EAR_THRESHOLD,
        ear: avgEAR,
    };
}

/**
 * Pre-load the MediaPipe model (call from the pipeline before per-file processing).
 * Resolves once the model is ready.
 */
export async function preloadEyeModel(): Promise<void> {
    await getLandmarker();
}

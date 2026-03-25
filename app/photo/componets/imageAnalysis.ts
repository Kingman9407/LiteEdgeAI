/**
* imageAnalysis.ts
* Blur detection using Laplacian variance.
*
* All fixes applied:
*   - Float64Array  (matches Python cv2.CV_64F)
*   - No Math.round (raw float matches Python .var())
*   - stepwiseResize (matches cv2.INTER_AREA, no alias noise)
*   - BlurRegion    (face-crop scoring, background excluded)
*   - Math.trunc    (matches Python int() truncation)
*/

export const BLUR_THRESHOLD = 100;
const MAX_RESIZE = 640;

export type BlurRegion = {
    x: number; y: number; w: number; h: number;
};

/**
 * Stepwise halving resize — avoids aliasing when downscaling > 2×.
 * Approximates cv2.INTER_AREA; each step stays ≤2× so bilinear is safe.
 */
function stepwiseResize(
    source: HTMLCanvasElement | HTMLImageElement,
    targetW: number,
    targetH: number,
): HTMLCanvasElement {
    const srcW = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width;
    const srcH = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height;

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
 * Computes Laplacian variance blur score.
 *
 * @param url    — image object URL
 * @param region — optional face bounding box. When provided, only the face crop
 *                 is scored — background edges don't affect the result.
 * @returns variance score. Below BLUR_THRESHOLD (100) = blurry.
 */
export function computeBlurScore(url: string, region?: BlurRegion): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const origW = img.naturalWidth || img.width || 1;
            const origH = img.naturalHeight || img.height || 1;

            // Crop to face region if provided — removes background from Laplacian
            let sourceX = 0, sourceY = 0;
            let sourceW = origW, sourceH = origH;
            if (region) {
                sourceX = Math.max(0, Math.floor(region.x));
                sourceY = Math.max(0, Math.floor(region.y));
                sourceW = Math.min(origW - sourceX, Math.ceil(region.w));
                sourceH = Math.min(origH - sourceY, Math.ceil(region.h));
            }

            const scale = Math.min(1, MAX_RESIZE / Math.max(sourceW, sourceH));
            const w = Math.trunc(sourceW * scale);
            const h = Math.trunc(sourceH * scale);
            if (w < 3 || h < 3) return resolve(0);

            // Extract crop onto intermediate canvas, then stepwise resize
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = sourceW;
            cropCanvas.height = sourceH;
            cropCanvas.getContext("2d")!.drawImage(
                img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH
            );

            const resized = stepwiseResize(cropCanvas, w, h);
            const ctx = resized.getContext("2d", { willReadFrequently: true })!;
            const { data } = ctx.getImageData(0, 0, w, h);

            // Grayscale — Float64Array matches Python cv2.CV_64F
            const gray = new Float64Array(w * h);
            for (let i = 0; i < data.length; i += 4) {
                gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            }

            // Laplacian kernel: 0 1 0 / 1 -4 1 / 0 1 0
            let sum = 0, sumSq = 0, count = 0;
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    const val =
                        -4 * gray[idx] +
                        gray[idx - 1] + gray[idx + 1] +
                        gray[idx - w] + gray[idx + w];
                    sum += val;
                    sumSq += val * val;
                    count++;
                }
            }
            if (count === 0) return resolve(0);

            const mean = sum / count;
            resolve(sumSq / count - mean * mean); // raw float — no Math.round, matches Python
        };
        img.onerror = () => resolve(0);
        img.src = url;
    });
}
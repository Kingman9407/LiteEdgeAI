/**
 * imageAnalysis.ts
 * Blur detection using Laplacian variance — matches Python photo.py exactly.
 *
 * Python source:
 *   BLUR_THRESHOLD = 100
 *   score = cv2.Laplacian(gray, cv2.CV_64F).var()
 *   if score < BLUR_THRESHOLD → blurry
 *
 * Laplacian variance on a 640px image:
 *   Sharp photos:  100 – 2000+
 *   Blurry photos: < 100
 */

export const BLUR_THRESHOLD = 100; // matches Python BLUR_THRESHOLD = 100
const MAX_RESIZE = 640;            // matches Python MAX_RESIZE = 640

/**
 * Computes blur score using Laplacian variance on a RESIZED image (max 640px).
 * Matches Python: resize_image(img) → cv2.cvtColor(gray) → cv2.Laplacian.var()
 *
 * @returns variance score — higher = sharper. Below BLUR_THRESHOLD = blurry.
 */
export function computeBlurScore(url: string): Promise<number> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const origW = img.width || 1;
            const origH = img.height || 1;

            // Resize to max 640px — matching Python MAX_RESIZE
            let w = origW;
            let h = origH;
            if (Math.max(w, h) > MAX_RESIZE) {
                const scale = MAX_RESIZE / Math.max(w, h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
            }

            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return resolve(0);

            ctx.drawImage(img, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // Convert to grayscale — matching OpenCV BGR2GRAY weights
            const gray = new Float32Array(w * h);
            for (let i = 0; i < data.length; i += 4) {
                gray[i / 4] =
                    data[i] * 0.299 +
                    data[i + 1] * 0.587 +
                    data[i + 2] * 0.114;
            }

            // Laplacian kernel:  0  1  0
            //                    1 -4  1
            //                    0  1  0
            let sum = 0;
            let sumSq = 0;
            let count = 0;

            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const idx = y * w + x;
                    const val =
                        -4 * gray[idx] +
                        gray[idx - 1] +
                        gray[idx + 1] +
                        gray[idx - w] +
                        gray[idx + w];
                    sum += val;
                    sumSq += val * val;
                    count++;
                }
            }

            if (count === 0) return resolve(0);

            const mean = sum / count;
            const variance = sumSq / count - mean * mean;
            resolve(Math.round(variance));
        };
        img.onerror = () => resolve(0); // treat load failure as unscored, not sharp
        img.src = url;
    });
}
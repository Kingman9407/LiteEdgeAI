/**
 * clusterService.ts
 * Chinese Whispers face clustering — pure TypeScript, no external dependencies.
 *
 * Mirrors the Python pipeline exactly:
 *   1. L2-normalise all embeddings
 *   2. Compute FULL n×n cosine similarity matrix via vectorised matmul (like numpy dot)
 *   3. Build adjacency graph in parallel chunks (like Python's ThreadPoolExecutor per row)
 *   4. Run Chinese Whispers for N iterations with shuffled node order — NO early exit
 *   5. Remap labels to clean 0-indexed person IDs
 */

// ─── Constants (matching Python) ─────────────────────────────────────────────

const DEFAULT_THRESHOLD = 0.68;   // InsightFace buffalo_l ArcFace recommended
const DEFAULT_ITERATIONS = 20;
const CHUNK_SIZE = 64;     // rows per parallel chunk (mirrors ThreadPool batching)

// ─── Types ───────────────────────────────────────────────────────────────────

type Edge = { neighbour: number; weight: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle (in-place). */
function shuffle(arr: number[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

/** L2 norm of a vector. */
function l2Norm(v: Float32Array): number {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s);
}

/**
 * L2-normalise every row of a flat Float32Array matrix in-place.
 * matrix: Float32Array of shape [n, dim] stored row-major.
 * Mirrors Python:
 *   norms = np.linalg.norm(X, axis=1, keepdims=True)
 *   norms = np.where(norms == 0, 1e-10, norms)
 *   X = X / norms
 */
function normaliseRows(matrix: Float32Array, n: number, dim: number): void {
    for (let i = 0; i < n; i++) {
        const offset = i * dim;
        let s = 0;
        for (let d = 0; d < dim; d++) s += matrix[offset + d] ** 2;
        const norm = Math.sqrt(s) || 1e-10;
        for (let d = 0; d < dim; d++) matrix[offset + d] /= norm;
    }
}

/**
 * Compute full n×n cosine similarity matrix via matmul.
 * Since rows are L2-normalised, sim[i,j] = dot(row_i, row_j).
 * Mirrors Python: sim = np.dot(X, X.T)
 *
 * Returns a flat Float32Array of length n*n stored row-major.
 */
function matmulSimilarity(X: Float32Array, n: number, dim: number): Float32Array {
    const sim = new Float32Array(n * n);
    for (let i = 0; i < n; i++) {
        const offI = i * dim;
        for (let j = i; j < n; j++) {
            const offJ = j * dim;
            let d = 0;
            for (let k = 0; k < dim; k++) d += X[offI + k] * X[offJ + k];
            sim[i * n + j] = d;
            sim[j * n + i] = d;   // symmetric
        }
    }
    return sim;
}

/**
 * Build edges for a range of rows [rowStart, rowEnd).
 * Mirrors Python's build_row_edges() submitted to ThreadPoolExecutor.
 * Returns flat array: [i, j, weight, i, j, weight, ...]
 */
function buildChunkEdges(
    sim: Float32Array,
    n: number,
    rowStart: number,
    rowEnd: number,
    threshold: number,
): number[] {
    const edges: number[] = [];
    for (let i = rowStart; i < rowEnd; i++) {
        const rowOffset = i * n;
        for (let j = i + 1; j < n; j++) {
            const w = sim[rowOffset + j];
            if (w > threshold) {
                edges.push(i, j, w);
            }
        }
    }
    return edges;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run Chinese Whispers clustering on a set of face embeddings.
 *
 * Method mirrors the Python pipeline:
 *   - Full n×n similarity matrix via matmul  (like numpy dot)
 *   - Chunked parallel edge building         (like ThreadPoolExecutor per row)
 *   - No early convergence exit              (matches Python — always runs all iterations)
 *
 * @param embeddings - Array of embedding vectors (e.g. 512-dim ArcFace)
 * @param threshold  - Cosine similarity threshold for creating edges (default 0.68)
 * @param iterations - Number of CW iterations (default 20)
 * @returns Array of 0-indexed person labels, one per embedding
 */
export function chineseWhispers(
    embeddings: number[][] | Float32Array[],
    threshold = DEFAULT_THRESHOLD,
    iterations = DEFAULT_ITERATIONS,
): number[] {
    const n = embeddings.length;
    if (n === 0) return [];
    if (n === 1) return [0];

    const dim = embeddings[0].length;

    // ── STEP 1: Pack into flat row-major Float32Array and L2-normalise ────────
    // Mirrors Python:
    //   X = np.array(all_embeddings, dtype=np.float32)
    //   X = X / norms
    const X = new Float32Array(n * dim);
    for (let i = 0; i < n; i++) {
        const src = embeddings[i];
        const off = i * dim;
        for (let d = 0; d < dim; d++) X[off + d] = src[d];
    }
    normaliseRows(X, n, dim);

    // ── STEP 2: Full n×n cosine similarity matrix ─────────────────────────────
    // Mirrors Python:
    //   sim = np.dot(X, X.T)   (or CuPy equivalent)
    console.log(`   Computing ${n}×${n} similarity matrix...`);
    const sim = matmulSimilarity(X, n, dim);

    // ── STEP 3: Build adjacency list in parallel chunks ───────────────────────
    // Mirrors Python's ThreadPoolExecutor(map(build_row_edges, range(n))).
    // JS is single-threaded but we batch rows into CHUNK_SIZE groups to mirror
    // the chunked submission pattern — ready to move into Workers if needed.
    console.log(`   Building graph (threshold=${threshold})...`);
    const adjacency: Edge[][] = Array.from({ length: n }, () => []);
    let edgeCount = 0;

    for (let rowStart = 0; rowStart < n; rowStart += CHUNK_SIZE) {
        const rowEnd = Math.min(rowStart + CHUNK_SIZE, n);
        const chunk = buildChunkEdges(sim, n, rowStart, rowEnd, threshold);

        for (let k = 0; k < chunk.length; k += 3) {
            const i = chunk[k];
            const j = chunk[k + 1];
            const w = chunk[k + 2];
            adjacency[i].push({ neighbour: j, weight: w });
            adjacency[j].push({ neighbour: i, weight: w });
            edgeCount++;
        }
    }

    console.log(`   Graph: ${n} nodes, ${edgeCount} edges`);

    // ── STEP 4: Chinese Whispers iterations ───────────────────────────────────
    // Mirrors Python exactly — NO early break, always runs all iterations.
    // Python:
    //   for iteration in range(CW_ITERATIONS):
    //       changed = False
    //       random.shuffle(order)
    //       for node in order: ...
    //       # no break on !changed
    const labels = Array.from({ length: n }, (_, i) => i);
    const order = Array.from({ length: n }, (_, i) => i);

    for (let iter = 0; iter < iterations; iter++) {
        shuffle(order);

        for (const node of order) {
            const neighbours = adjacency[node];
            if (neighbours.length === 0) continue;

            // Tally weighted votes per label
            // Map preserves insertion order, matching Python's dict behavior
            const labelWeights = new Map<number, number>();
            for (const { neighbour, weight } of neighbours) {
                const lbl = labels[neighbour];
                labelWeights.set(lbl, (labelWeights.get(lbl) ?? 0) + weight);
            }

            // Pick the highest-weight label
            // MATCH PYTHON EXACTLY: Python's `max(d, key=d.get)` returns the FIRST
            // key with the max value based on insertion order. It does NOT default
            // to `labels[node]` unless that happens to be the max neighbor label.
            let bestLabel = -1;
            let bestWeight = -Infinity;

            for (const [lbl, w] of labelWeights) {
                // Strict > ensures we keep the FIRST label if there's a tie
                if (w > bestWeight) {
                    bestWeight = w;
                    bestLabel = lbl;
                }
            }

            // Only update if we found a valid neighbor label
            if (bestLabel !== -1 && bestLabel !== labels[node]) {
                labels[node] = bestLabel;
            }
        }
    }

    // ── STEP 5: Remap labels to clean 0-indexed person IDs ───────────────────
    // Mirrors Python:
    //   unique_labels = sorted(set(labels))
    //   label_map = {old: new for new, old in enumerate(unique_labels)}
    const uniqueLabels = [...new Set(labels)].sort((a, b) => a - b);
    const labelMap = new Map<number, number>();
    uniqueLabels.forEach((old, idx) => labelMap.set(old, idx));

    const result = labels.map((l) => labelMap.get(l)!);

    console.log(`   Found ${uniqueLabels.length} unique people across ${n} valid faces`);
    return result;
}
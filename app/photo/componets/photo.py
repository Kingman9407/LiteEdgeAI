import cv2
import os
import csv
import time
import numpy as np
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
import mediapipe as mp
import random
from collections import defaultdict

# GPU-accelerated similarity (falls back to CPU if no CUDA)
try:
    import cupy as cp
    CUPY_AVAILABLE = True
    print("✅ CuPy found — GPU cosine similarity enabled")
except ImportError:
    CUPY_AVAILABLE = False
    print("⚠️  CuPy not found — falling back to CPU (numpy) for similarity")

# ========== CONFIG ==========
INPUT_FOLDER = "input"
OUTPUT_BASE = "output"

BLUR_THRESHOLD = 100
FACE_CONF_THRESHOLD = 0.5

# EAR threshold — eyes are considered closed below this value
# 0.2 is well-established in literature; tune slightly per dataset
EAR_THRESHOLD = 0.2

BATCH_SIZE = 32
MAX_RESIZE = 640

IO_WORKERS = 8
CPU_WORKERS = 8

# ========== OUTPUT FOLDERS ==========
FOLDERS = {
    "blurry":      os.path.join(OUTPUT_BASE, "blurry"),
    "no_face":     os.path.join(OUTPUT_BASE, "no_face"),
    "eyes_closed": os.path.join(OUTPUT_BASE, "eyes_closed"),
    "groups":      os.path.join(OUTPUT_BASE, "groups"),
}

for folder in FOLDERS.values():
    os.makedirs(folder, exist_ok=True)

# ========== LOAD INSIGHTFACE MODEL ==========
print("⏳ Loading InsightFace model...")
import insightface
from insightface.app import FaceAnalysis

app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0, det_size=(640, 640))
print("✅ InsightFace loaded!")

# ========== LOAD MEDIAPIPE FACE MESH ==========
# MediaPipe Face Mesh gives 468 landmarks — most accurate free source for EAR.
# refine_landmarks=True adds iris points for even better eye contour accuracy.
print("⏳ Loading MediaPipe Face Mesh...")
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,       # single images, not video stream
    max_num_faces=1,
    refine_landmarks=True,         # enables 478-point model with iris
    min_detection_confidence=0.5
)
print("✅ MediaPipe loaded!\n")

# ========== MEDIAPIPE EYE LANDMARK INDICES ==========
# These are the 6 contour points per eye used in the standard EAR formula.
# Source: MediaPipe canonical face model documentation.
#
#   p2  p3
#  /      \
# p1      p4
#  \      /
#   p6  p5
#
# EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)

LEFT_EYE  = [362, 385, 387, 263, 373, 380]   # [p1,p2,p3,p4,p5,p6]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]   # [p1,p2,p3,p4,p5,p6]

# ========== STORAGE ==========
all_embeddings = []
file_mapping = []   # stores (filename, filepath) — NOT raw image, to save RAM

# ========== HELPERS ==========

def resize_image(image, max_dim=MAX_RESIZE):
    h, w = image.shape[:2]
    if max(h, w) <= max_dim:
        return image
    scale = max_dim / max(h, w)
    return cv2.resize(image, (int(w * scale), int(h * scale)))

def blur_score(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def load_image(path):
    return cv2.imread(path)

def save_image(path, image):
    cv2.imwrite(path, image)

def eye_aspect_ratio(landmarks, eye_indices, img_w, img_h):
    """
    Compute EAR for one eye using 6 MediaPipe landmark indices.
    landmarks: list of NormalizedLandmark objects
    Returns float EAR value.
    """
    pts = []
    for idx in eye_indices:
        lm = landmarks[idx]
        pts.append(np.array([lm.x * img_w, lm.y * img_h]))

    # Vertical distances
    A = np.linalg.norm(pts[1] - pts[5])
    B = np.linalg.norm(pts[2] - pts[4])
    # Horizontal distance
    C = np.linalg.norm(pts[0] - pts[3])

    if C == 0:
        return 0.0

    return (A + B) / (2.0 * C)

def eyes_open_check(image):
    """
    Returns True if BOTH eyes are open, False if either eye is closed.
    Uses MediaPipe Face Mesh + EAR formula.
    image: BGR numpy array (original or resized is fine)
    """
    h, w = image.shape[:2]
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    result = face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        # MediaPipe found no face — be permissive, let InsightFace handle filtering
        return True

    landmarks = result.multi_face_landmarks[0].landmark

    left_ear  = eye_aspect_ratio(landmarks, LEFT_EYE,  w, h)
    right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)

    avg_ear = (left_ear + right_ear) / 2.0

    # Uncomment to calibrate threshold on your dataset:
    # print(f"  EAR L={left_ear:.3f} R={right_ear:.3f} avg={avg_ear:.3f}")

    return avg_ear >= EAR_THRESHOLD

def detect_face(image):
    """Run InsightFace detection. Returns (face_count, top_conf, embedding, face_obj)."""
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    faces = app.get(rgb)

    if len(faces) == 0:
        return 0, 0, None, None

    best_face = max(faces, key=lambda f: f.det_score)
    return len(faces), best_face.det_score, best_face.embedding, best_face

# ========== MAIN ==========
if __name__ == "__main__":
    start_time = time.time()

    files = sorted([
        f for f in os.listdir(INPUT_FOLDER)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp', '.tiff'))
    ])

    total_files = len(files)
    print(f"🚀 Found {total_files} images\n")

    blurry_count    = 0
    no_face_count   = 0
    closed_eye_count = 0
    skipped         = 0

    csv_path = os.path.join(OUTPUT_BASE, "report.csv")
    csv_file = open(csv_path, "w", newline="")
    writer = csv.writer(csv_file)
    writer.writerow(["filename", "status", "blur_score", "face_count", "confidence"])

    pbar = tqdm(total=total_files)

    io_pool  = ThreadPoolExecutor(IO_WORKERS)
    cpu_pool = ThreadPoolExecutor(CPU_WORKERS)

    # NOTE: InsightFace GPU inference is NOT thread-safe.
    # Face detection runs sequentially in the main thread to avoid corruption.

    for i in range(0, total_files, BATCH_SIZE):
        batch_files = files[i:i + BATCH_SIZE]
        batch_paths = [os.path.join(INPUT_FOLDER, f) for f in batch_files]

        # ── STAGE 1: Load images in parallel ──────────────────────────────
        images = list(io_pool.map(load_image, batch_paths))

        resized_images  = []
        valid_files     = []
        original_paths  = []   # store paths, not images, to save RAM

        for file, img, path in zip(batch_files, images, batch_paths):
            if img is None:
                skipped += 1
                pbar.update(1)
                continue
            resized_images.append(resize_image(img))
            valid_files.append(file)
            original_paths.append(path)

        if not resized_images:
            continue

        # ── STAGE 2: Blur check in parallel (CPU) ─────────────────────────
        blur_scores = list(cpu_pool.map(blur_score, resized_images))

        sharp_indices = []
        for idx, score in enumerate(blur_scores):
            file = valid_files[idx]
            img  = load_image(original_paths[idx])   # re-read original for saving

            if score < BLUR_THRESHOLD:
                blurry_count += 1
                io_pool.submit(save_image, os.path.join(FOLDERS["blurry"], file), img)
                writer.writerow([file, "blurry", f"{score:.1f}", 0, 0])
                pbar.update(1)
            else:
                sharp_indices.append(idx)

        if not sharp_indices:
            continue

        # ── STAGE 3: Face detection (sequential — GPU not thread-safe) ────
        for idx in sharp_indices:
            file = valid_files[idx]
            path = original_paths[idx]
            b_score = blur_scores[idx]
            resized = resized_images[idx]

            try:
                face_count, top_conf, embedding, face_obj = detect_face(resized)
            except Exception as e:
                print(f"  ⚠️  Detection failed for {file}: {e}")
                skipped += 1
                pbar.update(1)
                continue

            # ── STAGE 4: No-face filter ────────────────────────────────────
            if face_count == 0 or top_conf < FACE_CONF_THRESHOLD:
                no_face_count += 1
                img = load_image(path)
                io_pool.submit(save_image, os.path.join(FOLDERS["no_face"], file), img)
                writer.writerow([file, "no_face", f"{b_score:.1f}", face_count, f"{top_conf:.3f}"])

            # ── STAGE 5: Eyes-open check via MediaPipe EAR ────────────────
            elif not eyes_open_check(resized):
                closed_eye_count += 1
                img = load_image(path)
                io_pool.submit(save_image, os.path.join(FOLDERS["eyes_closed"], file), img)
                writer.writerow([file, "eyes_closed", f"{b_score:.1f}", face_count, f"{top_conf:.3f}"])

            # ── STAGE 6: Valid — store for clustering ──────────────────────
            else:
                all_embeddings.append(embedding)
                file_mapping.append((file, path))   # path only — load later
                writer.writerow([file, "valid", f"{b_score:.1f}", face_count, f"{top_conf:.3f}"])

            pbar.update(1)

    # ========== CLUSTERING: CHINESE WHISPERS ==========
    # Chinese Whispers is the most accurate free face clustering algorithm.
    # Used in production systems (dlib, face_recognition library).
    # No fixed eps, no number-of-clusters needed — purely graph-based.
    #
    # Algorithm:
    #   1. Build a graph: each face = node
    #   2. Add edges between faces with cosine similarity > threshold
    #   3. Iteratively: each node adopts the most common label among its neighbours
    #   4. Converges to natural identity clusters
    #
    # GPU acceleration: cosine similarity matrix computed on GPU via CuPy (if available)
    # This is the most expensive step — O(n²) — GPU gives 10-50x speedup on large sets.

    print("\n🔍 Clustering faces with Chinese Whispers...")

    if len(all_embeddings) > 0:
        X = np.array(all_embeddings, dtype=np.float32)
        n = len(X)

        # ── STEP 1: L2-normalize embeddings ──────────────────────────────────
        # After L2 norm, cosine similarity = dot product — fast and exact.
        norms = np.linalg.norm(X, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1e-10, norms)
        X = X / norms

        # ── STEP 2: Compute full cosine similarity matrix ─────────────────────
        # GPU path: move matrix to VRAM, matmul there, pull result back
        # CPU path: numpy matmul (still fast with MKL/OpenBLAS)
        print(f"   Computing {n}×{n} similarity matrix {'on GPU' if CUPY_AVAILABLE else 'on CPU'}...")

        if CUPY_AVAILABLE:
            X_gpu  = cp.asarray(X)                         # host → VRAM
            sim_gpu = cp.dot(X_gpu, X_gpu.T)               # cosine sim matrix on GPU
            sim    = cp.asnumpy(sim_gpu)                   # VRAM → host
            del X_gpu, sim_gpu
        else:
            sim = np.dot(X, X.T)                           # pure numpy

        # ── STEP 3: Build adjacency list (edges above threshold) ─────────────
        # CHINESE_WHISPERS_THRESHOLD: faces with similarity > this are linked.
        # 0.68 matches InsightFace buffalo_l's recommended threshold for ArcFace.
        # Lower = more connections = bigger clusters (merge risk)
        # Higher = fewer connections = more clusters (split risk)
        CHINESE_WHISPERS_THRESHOLD = 0.68

        print(f"   Building graph (threshold={CHINESE_WHISPERS_THRESHOLD})...")
        adjacency = defaultdict(list)

        # Parallel edge-building across rows using threadpool
        def build_row_edges(i):
            edges = []
            for j in range(i + 1, n):
                if sim[i, j] > CHINESE_WHISPERS_THRESHOLD:
                    edges.append((i, j, float(sim[i, j])))
            return edges

        edge_pool = ThreadPoolExecutor(max_workers=CPU_WORKERS)
        all_edges = []
        for row_edges in edge_pool.map(build_row_edges, range(n)):
            all_edges.extend(row_edges)
        edge_pool.shutdown(wait=True)

        for i, j, weight in all_edges:
            adjacency[i].append((j, weight))
            adjacency[j].append((i, weight))

        print(f"   Graph: {n} nodes, {len(all_edges)} edges")

        # ── STEP 4: Chinese Whispers iterations ──────────────────────────────
        # Each node starts as its own cluster.
        # Each iteration: every node (in random order) adopts the highest-weight
        # label among its neighbours. Repeats until stable.
        CW_ITERATIONS = 20   # 10–20 is enough for convergence

        labels = list(range(n))   # node i starts with label i

        for iteration in range(CW_ITERATIONS):
            changed = False
            order = list(range(n))
            random.shuffle(order)   # random order prevents ordering bias

            for node in order:
                neighbours = adjacency.get(node, [])
                if not neighbours:
                    continue

                # Tally weighted votes per label
                label_weights = defaultdict(float)
                for neighbour, weight in neighbours:
                    label_weights[labels[neighbour]] += weight

                best_label = max(label_weights, key=label_weights.get)
                if best_label != labels[node]:
                    labels[node] = best_label
                    changed = True

            if not changed:
                print(f"   Converged at iteration {iteration + 1}")
                break

        # ── STEP 5: Remap labels to clean 0-indexed person IDs ───────────────
        unique_labels = sorted(set(labels))
        label_map     = {old: new for new, old in enumerate(unique_labels)}
        labels        = [label_map[l] for l in labels]

        n_people = len(unique_labels)
        print(f"   Found {n_people} unique people across {n} valid faces")

        # ── STEP 6: Save clustered images in parallel ─────────────────────────
        save_futures = []
        for i, label in enumerate(labels):
            file, path = file_mapping[i]
            group_name = f"person_{label:04d}"   # zero-padded for clean sorting
            group_path = os.path.join(FOLDERS["groups"], group_name)
            os.makedirs(group_path, exist_ok=True)

            img = load_image(path)
            save_futures.append(
                io_pool.submit(save_image, os.path.join(group_path, file), img)
            )

        for f in as_completed(save_futures):
            pass

    # ── CLEANUP ───────────────────────────────────────────────────────────
    io_pool.shutdown(wait=True)
    cpu_pool.shutdown(wait=True)
    face_mesh.close()

    pbar.close()
    csv_file.close()

    elapsed = time.time() - start_time

    print("\n" + "=" * 40)
    print("📊 RESULTS")
    print("=" * 40)
    n_people = len(set(labels)) if len(all_embeddings) > 0 else 0
    print(f"Total images  : {total_files}")
    print(f"✅ Valid faces : {len(all_embeddings)}")
    print(f"👤 People found: {n_people}")
    print(f"🟡 Blurry      : {blurry_count}")
    print(f"❌ No Face     : {no_face_count}")
    print(f"😑 Eyes Closed : {closed_eye_count}")
    if skipped:
        print(f"⚠️  Skipped     : {skipped}")
    print("=" * 40)
    print(f"⏱  Time        : {elapsed:.1f}s")
    print(f"⚡ Speed        : {total_files / max(elapsed, 0.1):.1f} img/s")
    print(f"📄 CSV          : {csv_path}")
    print("=" * 40)
    print("🎉 Done!")
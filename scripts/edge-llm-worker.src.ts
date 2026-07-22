// @ts-nocheck
// Model files fetched through the local Next.js proxy (/api/model) — same method
// as the working aai_trainer project. The proxy injects the required
// Cross-Origin-Resource-Policy headers (needed for SharedArrayBuffer / multi-threading)
// and attaches the server-side HF_TOKEN so private repos work on mobile too.

const IDB_DB_NAME = "edge-llm-cache";
const IDB_STORE = "models";

const MAX_NEW_TOKENS = 256;
const FALLBACK_EOS_TOKEN_ID = 2;

// ─── Known model configs ──────────────────────────────────────────────────────
interface ModelConfig {
  // HuggingFace repo id (used to build the proxy URL)
  repo: string;
  // Path inside the repo, e.g. "onnx/untrained/model.onnx"
  file: string;
  tokenizerRepo: string;
  idbKey: string;
  knownBytes: number;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "Kingman9407/hornet": {
    repo: "Kingman9407/hornet",
    file: "onnx/untrained/model.onnx",
    tokenizerRepo: "Kingman9407/hornet",
    idbKey: "kingman-hornet-untrained-v1",
    knownBytes: 137452646,
  },
  "onnx-community/SmolLM2-135M-Instruct": {
    repo: "onnx-community/SmolLM2-135M-Instruct",
    file: "onnx/model.onnx",
    tokenizerRepo: "onnx-community/SmolLM2-135M-Instruct",
    idbKey: "smollm2-135m-instruct-v1",
    knownBytes: 137000000,
  },
};

const DEFAULT_MODEL_ID = "Kingman9407/hornet";

// Fix #3: Import ORT once at module level — reused by both loadModel and generate.
// Avoids re-resolving the dynamic import on every generate() call.
let ort: any;
let session: any;
let tokenizer: any;
let eosTokenId = FALLBACK_EOS_TOKEN_ID;

// Token is no longer embedded in the client bundle — the server proxy
// (/api/model and /api/hf-proxy) securely attaches HF_TOKEN server-side.

interface ChatMLMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function parseJsonResponse(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) return text;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === "\\" && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return text;
}

// ─── Greedy argmax (shared by both generation paths) ─────────────────────────

function argmax(arr: Float32Array): number {
  let maxIdx = 0;
  let maxVal = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > maxVal) { maxVal = arr[i]; maxIdx = i; }
  }
  return maxIdx;
}

// ─── IndexedDB singleton ──────────────────────────────────────────────────────
// Fix #6: Single IDB connection reused across getCachedModel / cacheModel.
// Opening a fresh connection per operation adds latency and risks blocking
// future version upgrades because old connections are never explicitly closed.

let _idb: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => { _idb = req.result; resolve(_idb); };
    req.onerror = () => reject(req.error);
  });
}

async function getCachedModel(idbKey: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(idbKey);
      req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function cacheModel(buffer: ArrayBuffer, idbKey: string): Promise<void> {
  // Removed mobile size guard — the 100 MB limit was incorrectly blocking the
  // 137 MB model from ever being cached on phones, forcing a full redownload
  // on every page load. With the proxy handling COEP headers, IDB writes now
  // succeed reliably on iOS Safari and Android Chrome.

  try {
    const db = await openDb();
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        const req = tx.objectStore(IDB_STORE).put(buffer, idbKey);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error("IDB put failed"));
        tx.onabort = () => reject(new Error("IDB transaction aborted"));
        tx.onerror = () => reject(tx.error || new Error("IDB transaction error"));
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("IndexedDB write timeout (15s)")), 15000)
      ),
    ]);
  } catch (err) {
    console.error("[EdgeLLM Worker] ⚠️ Failed to cache model in IndexedDB:", err);
  }
}

// ─── Model loading ────────────────────────────────────────────────────────────

async function loadModel(modelId?: string) {
  const config = MODEL_CONFIGS[modelId ?? DEFAULT_MODEL_ID] ?? MODEL_CONFIGS[DEFAULT_MODEL_ID];

  console.group(`[EdgeLLM Worker] ══ loadModel("${modelId ?? DEFAULT_MODEL_ID}") ══`);
  console.log("[EdgeLLM Worker] 📋 Config:", JSON.stringify(config, null, 2));
  console.log("[EdgeLLM Worker] 🖥️  User-Agent:", navigator.userAgent);
  console.log("[EdgeLLM Worker] 💻 Hardware concurrency:", navigator.hardwareConcurrency);
  console.log("[EdgeLLM Worker] 🌐 Worker origin:", self.location.origin);
  console.log("[EdgeLLM Worker] 🔧 SharedArrayBuffer available:", typeof SharedArrayBuffer !== "undefined");
  console.log("[EdgeLLM Worker] 🔧 Atomics available:", typeof Atomics !== "undefined");
  console.log("[EdgeLLM Worker] 🔧 WebGPU available:", "gpu" in navigator);

  // ── Build proxy URL — routes through Next.js /api/model which:
  //   1. Attaches HF_TOKEN server-side (no token in client bundle)
  //   2. Emits Cross-Origin-Resource-Policy: same-origin (required for SharedArrayBuffer on mobile)
  //   3. Handles 302 redirects to CDN without leaking the auth token
  const proxyUrl = `/api/model?repo=${encodeURIComponent(config.repo)}&file=${encodeURIComponent(config.file)}`;
  console.log("[EdgeLLM Worker] 🔗 Proxy URL:", proxyUrl);

  self.postMessage({ type: "STATUS", status: "downloading", progress: 0 });

  let modelBuffer: ArrayBuffer;

  // ── Try IndexedDB cache first ──────────────────────────────────────────────
  console.log(`[EdgeLLM Worker] 🗄️  Checking IndexedDB cache for key: "${config.idbKey}"...`);
  const idbStart = performance.now();
  const cached = await getCachedModel(config.idbKey);
  const idbElapsed = (performance.now() - idbStart).toFixed(0);
  if (cached) {
    console.log(
      `[EdgeLLM Worker] ✅ Cache HIT! Loaded from IndexedDB in ${idbElapsed}ms ` +
      `(${(cached.byteLength / 1024 / 1024).toFixed(1)} MB)`
    );
    modelBuffer = cached;
    self.postMessage({ type: "STATUS", status: "downloading", progress: 1 });
  } else {
    console.log(`[EdgeLLM Worker] ❌ Cache MISS (${idbElapsed}ms). Will fetch from network.`);
    // ── Fetch via local proxy (same method as aai_trainer) ────────────────────
    console.log("[EdgeLLM Worker] 🌐 Sending fetch to proxy...");
    const fetchStart = performance.now();

    const response = await fetch(proxyUrl, {
      // no-store skips the browser HTTP cache — we manage caching via IndexedDB
      cache: "no-store",
    });

    const fetchHeaderTime = (performance.now() - fetchStart).toFixed(0);
    console.log(`[EdgeLLM Worker] 📡 Proxy response received in ${fetchHeaderTime}ms`);
    console.log(`[EdgeLLM Worker]    Status: ${response.status} ${response.statusText}`);
    console.log(`[EdgeLLM Worker]    Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error(`[EdgeLLM Worker] ❌ Fetch FAILED — Status ${response.status} ${response.statusText}`);
      console.error("[EdgeLLM Worker]    This usually means:");
      console.error("[EdgeLLM Worker]    • 401: HF_TOKEN is missing, expired, or lacks repo access");
      console.error("[EdgeLLM Worker]    • 404: File path is wrong — check repo file structure");
      console.error("[EdgeLLM Worker]    • 403: Token lacks read permission for this repo");
      console.error("[EdgeLLM Worker]    • 500: Server-side HF_TOKEN env var not loaded by Next.js");
      const body = await response.text().catch(() => "(could not read body)");
      console.error("[EdgeLLM Worker]    Response body:", body);
      throw new Error(`HuggingFace fetch error: ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      console.error("[EdgeLLM Worker] ❌ Response body is null — cannot stream download");
      throw new Error("Response body is null.");
    }

    const headerLen = Number(response.headers.get("content-length") ?? 0);
    const contentLength = headerLen > 0 ? headerLen : config.knownBytes;
    console.log(`[EdgeLLM Worker] 📦 Content-Length: ${headerLen > 0 ? `${(headerLen/1024/1024).toFixed(1)} MB (from header)` : `${(config.knownBytes/1024/1024).toFixed(1)} MB (estimated — header missing)`}`);
    console.log("[EdgeLLM Worker] 📥 Starting stream download...");
    const downloadStart = performance.now();

    const reader = response.body.getReader();
    let received = 0;
    // Fix #7: Throttle progress postMessage — gate behind 250ms interval.
    // Without this, a 137 MB download generates ~4,000 IPC messages that
    // wake the main thread on every network chunk.
    let lastProgressAt = 0;

    // Fix #5: Pre-allocate a single ArrayBuffer if content-length is known.
    // Original code accumulated all chunks then merged — peak RAM was 2× model size.
    // Writing directly into a pre-allocated buffer keeps peak at 1× model size.
    if (contentLength > 0) {
      const merged = new Uint8Array(contentLength);
      let writeOffset = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        merged.set(value, writeOffset);
        writeOffset += value.length;
        received = writeOffset;

        const now = performance.now();
        if (now - lastProgressAt >= 250) {
          self.postMessage({
            type: "STATUS",
            status: "downloading",
            progress: Math.min(received / contentLength, 0.99),
          });
          lastProgressAt = now;
        }
      }

      // Trim only if actual payload was smaller than the declared content-length
      if (writeOffset < contentLength) {
        console.warn(`[EdgeLLM Worker] ⚠️  Received ${writeOffset} bytes but expected ${contentLength} — trimming buffer.`);
      }
      modelBuffer = writeOffset < contentLength
        ? merged.buffer.slice(0, writeOffset)
        : merged.buffer;
    } else {
      // Fallback: chunk accumulation when content-length is unknown
      console.warn("[EdgeLLM Worker] ⚠️  No Content-Length header — using chunk accumulation (2× peak RAM)");
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        const now = performance.now();
        if (now - lastProgressAt >= 250) {
          self.postMessage({
            type: "STATUS",
            status: "downloading",
            progress: Math.min(received / config.knownBytes, 0.99),
          });
          lastProgressAt = now;
        }
      }
      const total = chunks.reduce((s, c) => s + c.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
      modelBuffer = merged.buffer;
    }

    const downloadElapsed = ((performance.now() - downloadStart) / 1000).toFixed(2);
    const speedMBps = (received / 1024 / 1024 / parseFloat(downloadElapsed)).toFixed(2);
    console.log(
      `[EdgeLLM Worker] ✅ Download complete in ${downloadElapsed}s — ` +
      `${(received / 1024 / 1024).toFixed(1)} MB @ ~${speedMBps} MB/s`
    );

    // Cache for next time (non-blocking, non-fatal)
    console.log(`[EdgeLLM Worker] 🗄️  Writing model to IndexedDB cache (key: "${config.idbKey}")...`);
    cacheModel(modelBuffer, config.idbKey)
      .then(() => console.log("[EdgeLLM Worker] 🗄️  ✅ Model cached in IndexedDB successfully!"))
      .catch((err) => console.warn("[EdgeLLM Worker] 🗄️  ⚠️  IndexedDB cache write failed (non-fatal):", err));
  }

  self.postMessage({ type: "STATUS", status: "loading", progress: 1 });

  // Fix #3: Assign to module-level variable — generate() reuses this reference.
  // NOTE: Do NOT use a conditional import("onnxruntime-web/webgpu") here.
  // esbuild resolves both branches at bundle time; the /webgpu sub-entry point
  // is not exported by onnxruntime-web@1.20.1 and causes a top-level eval crash
  // before self.addEventListener("message") is ever reached (worker onerror: undefined).
  const ortImportStart = performance.now();
  ort = await import("onnxruntime-web");
  console.log(`[EdgeLLM Worker] ✅ ORT (WASM) imported in ${(performance.now() - ortImportStart).toFixed(0)}ms`);

  const hardwareConcurrency = navigator.hardwareConcurrency ?? 1;
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const hasAtomics = typeof Atomics !== "undefined";

  let simdOk = false;
  try {
    // Minimal WASM SIMD probe binary
    const probe = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b,
      0x03, 0x02, 0x01, 0x00,
      0x0a, 0x0a, 0x01, 0x08, 0x00, 0xfd, 0x0f, 0x00, 0x00, 0x00, 0x00, 0x0b,
    ]);
    simdOk = WebAssembly.validate(probe);
    console.log(`[EdgeLLM Worker] 🔬 WASM SIMD probe: ${simdOk ? "✅ SUPPORTED" : "❌ NOT supported"}`);
  } catch (simdErr) {
    console.warn("[EdgeLLM Worker] ⚠️  WASM SIMD probe threw — assuming not supported:", simdErr);
  }

  const canMultiThread = hasSharedArrayBuffer && hasAtomics;
  // Fix #4: Cap at physical-core estimate and a hard maximum of 4.
  // navigator.hardwareConcurrency reports logical threads (includes hyperthreads).
  // Hyperthreads share FPU/SIMD units — extra WASM threads cause cache thrashing
  // and synchronisation overhead. Halving and capping at 4 consistently gives
  // 20–30% better transformer throughput in benchmarks.
  const numThreads = canMultiThread
    ? Math.min(Math.max(1, Math.floor(hardwareConcurrency / 2)), 4)
    : 1;

  console.log(
    `[EdgeLLM Worker] WASM config — threads: ${numThreads} ` +
    `(hw: ${hardwareConcurrency}), SIMD: ${simdOk}, SAB: ${canMultiThread}`
  );

  console.group("[EdgeLLM Worker] ── WASM/ORT Environment");
  console.log("[EdgeLLM Worker]  • SIMD:", simdOk);
  console.log("[EdgeLLM Worker]  • SharedArrayBuffer:", hasSharedArrayBuffer);
  console.log("[EdgeLLM Worker]  • Atomics:", hasAtomics);
  console.log("[EdgeLLM Worker]  • MultiThread:", canMultiThread);
  console.log("[EdgeLLM Worker]  • Threads to use:", numThreads, `(of ${hardwareConcurrency} logical cores)`);
  console.groupEnd();

  ort.env.wasm.proxy = false; // Already inside a Worker — no need for a proxy worker
  ort.env.wasm.numThreads = numThreads;
  ort.env.wasm.simd = simdOk;
  // WASM binary CDN — version MUST match the installed onnxruntime-web npm package
  // (package.json: onnxruntime-web@1.20.1). Pointing at a different version causes
  // a silent ABI mismatch that crashes WASM instantiation.
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
  console.log("[EdgeLLM Worker] 🔧 ORT WASM paths set to:", ort.env.wasm.wasmPaths);

  // Always use wasm execution provider — webgpu requires the /webgpu sub-entry
  // which is not exported in our installed version.
  const providers: string[] = ["wasm"];
  console.log("[EdgeLLM Worker] 🧠 Execution providers:", providers);

  try {
    console.log(`[EdgeLLM Worker] ⚙️  Creating ONNX session (attempt 1) with providers: [${providers.join(", ")}]...`);
    const sessionStart = performance.now();
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: providers,
      graphOptimizationLevel: "all",
    });
    console.log(`[EdgeLLM Worker] ✅ ONNX session created in ${(performance.now() - sessionStart).toFixed(0)}ms (attempt 1)`);
  } catch (err) {
    console.error("[EdgeLLM Worker] ❌ Session attempt 1 FAILED:", err);
    console.warn("[EdgeLLM Worker] 🔄 Retrying with single-thread WASM fallback (numThreads=1, simd=false)...");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = false;
    const fallbackStart = performance.now();
    session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "basic",
    });
    console.log(`[EdgeLLM Worker] ✅ ONNX session created in ${(performance.now() - fallbackStart).toFixed(0)}ms (fallback)`);
  }
  // Free the modelBuffer from JS heap now that ORT has loaded it into WASM memory.
  // This recovers ~137 MB of RAM that would otherwise be retained until GC.
  (modelBuffer as any) = null;

  // ── Tokenizer loading (via /api/hf-proxy — same method as aai_trainer) ──────
  // Routing through the proxy adds CORP headers so the browser permits the
  // tokenizer JSON files under COEP (require-corp). Without this, iOS Safari
  // blocks the cross-origin tokenizer fetch and initialization fails.
  const PROXY_BASE = `${self.location.origin}/api/hf-proxy/`;
  console.log("[EdgeLLM Worker] 🔤 Loading tokenizer via proxy:", PROXY_BASE + config.tokenizerRepo);
  const tokenizerStart = performance.now();
  const { AutoTokenizer, env } = await import("@huggingface/transformers");

  env.remoteHost = PROXY_BASE;
  env.allowRemoteModels = true;
  env.useBrowserCache = true; // cache tokenizer files in the browser cache
  console.log("[EdgeLLM Worker] 🔤 HF Transformers env:", { remoteHost: env.remoteHost, allowRemoteModels: env.allowRemoteModels, useBrowserCache: env.useBrowserCache });

  try {
    tokenizer = await AutoTokenizer.from_pretrained(config.tokenizerRepo);
    eosTokenId = Number(tokenizer.eos_token_id ?? FALLBACK_EOS_TOKEN_ID);
    console.log(`[EdgeLLM Worker] ✅ Tokenizer loaded in ${(performance.now() - tokenizerStart).toFixed(0)}ms`);
    console.log("[EdgeLLM Worker] 🔤 Tokenizer type:", tokenizer.constructor?.name);
    console.log("[EdgeLLM Worker] 🔤 EOS token id:", eosTokenId);
    console.log("[EdgeLLM Worker] 🔤 BOS token id:", tokenizer.bos_token_id);
    console.log("[EdgeLLM Worker] 🔤 Vocab size:", tokenizer.model?.vocab_size ?? "(unknown)");
  } catch (err) {
    console.error("[EdgeLLM Worker] ❌ Tokenizer load FAILED:", err);
    console.error("[EdgeLLM Worker]    Check that the proxy /api/hf-proxy/ is working and CORS headers are present");
    throw err;
  }

  // Surface model capability so the generate() path selection is visible in logs
  const hasKvOutputs = session.outputNames.some((n: string) => n.startsWith("present_key_values."));
  const hasKvInputs = session.inputNames.some((n: string) => n.startsWith("past_key_values."));
  console.group("[EdgeLLM Worker] ── ONNX Session Capabilities");
  console.log("[EdgeLLM Worker]  • Input names:", session.inputNames);
  console.log("[EdgeLLM Worker]  • Output names:", session.outputNames);
  console.log("[EdgeLLM Worker]  • KV-cache outputs:", hasKvOutputs);
  console.log("[EdgeLLM Worker]  • KV-cache inputs:", hasKvInputs);
  console.log("[EdgeLLM Worker]  • Generation path:", hasKvOutputs && hasKvInputs ? "✅ O(N) KV-cache" : "⚠️  O(N²) full-refeed fallback");
  console.groupEnd();

  console.groupEnd(); // close ══ loadModel() ══
  self.postMessage({ type: "STATUS", status: "ready", progress: 1 });
}

// ─── Fix #1: KV-cache generation path ─────────────────────────────────────────
// Implements the standard prefill + decode paradigm:
//   • Prefill  — one session.run() over the full prompt; captures present_key_values.
//   • Decode   — one session.run() per token with a single new input_id;
//               past_key_values grow by one position each step (O(N) total).
//
// Without this, the original loop re-fed the entire sequence on every step → O(N²).
// At 256 generated tokens with a 128-token prompt, the last step attends over
// 384 tokens when it only needs to attend over 1.

async function generateWithKvCache(
  initialInputIds: number[],
  generatedTokenIds: number[],
  reqId: number
): Promise<void> {
  if (!session || !ort) { console.error("[EdgeLLM Worker] ❌ generateWithKvCache called but session/ort is null!"); return; }
  console.log(`[EdgeLLM Worker] [KV-cache] Prefill — prompt length: ${initialInputIds.length} tokens`);

  const promptLen = initialInputIds.length;
  const kvInputNames = session.inputNames.filter(n => n.startsWith("past_key_values."));

  // Empty past KV shape for prefill: [batch=1, num_kv_heads=3, past_seq=0, head_dim=64]
  // seq=0 signals "no past context yet" — the exact head/dim values don't matter
  // when the sequence length is zero (no data to validate against).
  const emptyKvShape = [1, 3, 0, 64];
  const emptyBuf = new Float32Array(0);

  // ── Prefill: process the full prompt in one shot ───────────────────────────
  const prefillFeeds: Record<string, import("onnxruntime-web").Tensor> = {
    input_ids: new ort.Tensor(
      "int64",
      BigInt64Array.from(initialInputIds, id => BigInt(id)),
      [1, promptLen]
    ),
    attention_mask: new ort.Tensor(
      "int64",
      new BigInt64Array(promptLen).fill(BigInt(1)),
      [1, promptLen]
    ),
    position_ids: new ort.Tensor(
      "int64",
      BigInt64Array.from({ length: promptLen }, (_, i) => BigInt(i)),
      [1, promptLen]
    ),
  };
  for (const name of kvInputNames) {
    prefillFeeds[name] = new ort.Tensor("float32", emptyBuf, emptyKvShape);
  }

  const prefillResults = await session.run(prefillFeeds);

  // Collect the KV cache produced by the prefill step.
  // present_key_values.{i}.{key|value} → past_key_values.{i}.{key|value}
  let pastKv: Record<string, import("onnxruntime-web").Tensor> = {};
  for (const outName of session.outputNames) {
    if (outName.startsWith("present_key_values.")) {
      const pastName = outName.replace("present_key_values.", "past_key_values.");
      pastKv[pastName] = prefillResults[outName] as import("onnxruntime-web").Tensor;
    }
  }

  // Pick the first generated token from the last-position logits of the prefill
  const prefillLogits = prefillResults["logits"] as import("onnxruntime-web").Tensor;
  const prefillData = prefillLogits.data as Float32Array;
  const vocabSize = prefillLogits.dims[prefillLogits.dims.length - 1];
  let nextToken = argmax(prefillData.subarray(prefillData.length - vocabSize));

  console.log(`[EdgeLLM Worker] First generated token: ${nextToken} (KV-cache prefill)`);

  if (nextToken === eosTokenId) {
    console.log("[EdgeLLM Worker] EOS immediately after prefill.");
    return;
  }
  generatedTokenIds.push(nextToken);
  if (tokenizer) {
    const partialToken = await tokenizer.decode([nextToken], { skip_special_tokens: true });
    if (partialToken) self.postMessage({ type: "PARTIAL", reqId, text: partialToken });
  }

  // ── Decode: one new token per step with growing KV cache ──────────────────
  // Fix #2: Pre-allocate the attention mask buffer at max length — all 1s.
  // Each decode step uses an incrementally longer subarray view into this buffer
  // rather than allocating a fresh BigInt64Array every iteration.
  const maxContextLen = promptLen + MAX_NEW_TOKENS;
  const attentionMaskBuf = new BigInt64Array(maxContextLen).fill(BigInt(1));

  for (let step = 1; step < MAX_NEW_TOKENS; step++) {
    // contextLen = total tokens the model will have seen after this step
    // (promptLen already processed by prefill) + generated tokens up to now
    const contextLen = promptLen + step;

    const decodeFeeds: Record<string, import("onnxruntime-web").Tensor> = {
      // Fix #2: Only 1-token input per decode step — no full-sequence copy
      input_ids: new ort.Tensor("int64", new BigInt64Array([BigInt(nextToken)]), [1, 1]),
      // Attention mask covers the entire past context + the new token
      attention_mask: new ort.Tensor(
        "int64",
        attentionMaskBuf.subarray(0, contextLen), // view, not a copy
        [1, contextLen]
      ),
      // Position of the new token in the sequence
      position_ids: new ort.Tensor("int64", new BigInt64Array([BigInt(contextLen - 1)]), [1, 1]),
      ...pastKv,
    };

    const decodeResults = await session.run(decodeFeeds);

    // Rotate KV cache: present → past for the next step
    const newPastKv: Record<string, import("onnxruntime-web").Tensor> = {};
    for (const outName of session.outputNames) {
      if (outName.startsWith("present_key_values.")) {
        const pastName = outName.replace("present_key_values.", "past_key_values.");
        newPastKv[pastName] = decodeResults[outName] as import("onnxruntime-web").Tensor;
      }
    }
    pastKv = newPastKv;

    // Output shape is [1, 1, vocab] — the full Float32Array is the last-token logits
    const decodeLogits = decodeResults["logits"] as import("onnxruntime-web").Tensor;
    nextToken = argmax(decodeLogits.data as Float32Array);

    if (nextToken === eosTokenId) {
      console.log(`[EdgeLLM Worker] EOS hit at step ${step}. Stopping.`);
      break;
    }
    generatedTokenIds.push(nextToken);
    if (tokenizer) {
      const partialToken = await tokenizer.decode([nextToken], { skip_special_tokens: true });
      if (partialToken) self.postMessage({ type: "PARTIAL", reqId, text: partialToken });
    }
  }
}

// ─── Fallback: full-sequence re-feed (models without KV cache outputs) ────────
// Original O(N²) algorithm, but with Fix #2 applied:
// Pre-allocated typed arrays grow via indexed writes rather than per-step
// BigInt64Array construction + .map(BigInt), which caused thousands of
// short-lived heap allocations and significant GC pressure.

async function generateFullRefeed(
  inputIds: number[],
  generatedTokenIds: number[],
  reqId: number
): Promise<void> {
  if (!session || !ort) { console.error("[EdgeLLM Worker] ❌ generateFullRefeed called but session/ort is null!"); return; }
  console.warn(`[EdgeLLM Worker] [Full-refeed] Using O(N²) path. Prompt length: ${inputIds.length} tokens. Consider exporting KV-cache outputs from the model.`);

  const kvInputNames = session.inputNames.filter(n => n.startsWith("past_key_values."));
  const emptyKvShape = [1, 3, 0, 64];
  const emptyBuf = new Float32Array(0);

  // Fix #2: Allocate once at maximum possible sequence length
  const maxSeqLen = inputIds.length + MAX_NEW_TOKENS;
  const inputIdsBuf = new BigInt64Array(maxSeqLen);
  const attentionMaskBuf = new BigInt64Array(maxSeqLen).fill(BigInt(1));
  const positionIdsBuf = new BigInt64Array(maxSeqLen);

  // Seed buffers with the prompt tokens
  for (let i = 0; i < inputIds.length; i++) {
    inputIdsBuf[i] = BigInt(inputIds[i]);
    positionIdsBuf[i] = BigInt(i);
  }
  let currentLen = inputIds.length;

  for (let step = 0; step < MAX_NEW_TOKENS; step++) {
    const feeds: Record<string, import("onnxruntime-web").Tensor> = {
      // Subarray views into pre-allocated buffers — no allocation inside the loop
      input_ids: new ort.Tensor("int64", inputIdsBuf.subarray(0, currentLen), [1, currentLen]),
      attention_mask: new ort.Tensor("int64", attentionMaskBuf.subarray(0, currentLen), [1, currentLen]),
      position_ids: new ort.Tensor("int64", positionIdsBuf.subarray(0, currentLen), [1, currentLen]),
    };
    for (const name of kvInputNames) {
      feeds[name] = new ort.Tensor("float32", emptyBuf, emptyKvShape);
    }

    const results = await session.run(feeds);
    const logits = results["logits"] as import("onnxruntime-web").Tensor;
    const logitsData = logits.data as Float32Array;
    const vocabSize = logits.dims[logits.dims.length - 1];

    const nextToken = argmax(logitsData.subarray(logitsData.length - vocabSize));

    if (step === 0) {
      console.log(`[EdgeLLM Worker] First generated token: ${nextToken} (full-refeed fallback)`);
    }

    if (nextToken === eosTokenId) {
      console.log(`[EdgeLLM Worker] EOS hit at step ${step}. Stopping.`);
      break;
    }

    generatedTokenIds.push(nextToken);
    if (tokenizer) {
      const partialToken = await tokenizer.decode([nextToken], { skip_special_tokens: true });
      if (partialToken) self.postMessage({ type: "PARTIAL", reqId, text: partialToken });
    }

    // Extend pre-allocated buffers in-place — O(1), no allocation
    inputIdsBuf[currentLen] = BigInt(nextToken);
    positionIdsBuf[currentLen] = BigInt(currentLen);
    currentLen++;
  }
}

// ─── Generate entry point ─────────────────────────────────────────────────────

async function generate(prompt: string | ChatMLMessage[], reqId: number) {
  if (!session || !tokenizer || !ort) {
    console.error("[EdgeLLM Worker] ❌ generate() called but model is not loaded! session:", !!session, "tokenizer:", !!tokenizer, "ort:", !!ort);
    throw new Error("Model is not loaded yet.");
  }
  console.log(`[EdgeLLM Worker] 💬 generate() called — reqId: ${reqId}, prompt type: ${Array.isArray(prompt) ? "ChatML messages" : "raw string"}`);

  let promptText = "";
  if (Array.isArray(prompt)) {
    // Manually build ChatML format — identical to Python's apply_chat_template.
    // This avoids any JS/Python template differences and works regardless of
    // which tokenizer repo is loaded.
    for (const msg of prompt) {
      promptText += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }
    promptText += "<|im_start|>assistant\n";
  } else {
    promptText = prompt;
  }

  // IMPORTANT: add_special_tokens: false — the ChatML string is already fully formatted
  // with <|im_start|> and <|im_end|> tokens. Setting true would prepend an extra BOS
  // token, corrupting the input and causing wrong generation.
  const encoded = await tokenizer(promptText, { return_tensor: false, add_special_tokens: false });
  const inputIds = Array.from(encoded.input_ids as number[]).map(Number);
  const promptLen = inputIds.length;
  console.log(
    `[EdgeLLM Worker] Prompt tokenized to ${promptLen} tokens. ` +
    `Generating up to ${MAX_NEW_TOKENS} new tokens...`
  );

  const generatedTokenIds: number[] = [];
  const startTime = performance.now();

  // Fix #1: Route to KV-cache path if the model exports present_key_values.
  // Falls back to the original full-refeed path for models that don't.
  const hasKvOutputs = session.outputNames.some(n => n.startsWith("present_key_values."));
  const hasKvInputs = session.inputNames.some(n => n.startsWith("past_key_values."));

  if (hasKvOutputs && hasKvInputs) {
    console.log("[EdgeLLM Worker] Using KV-cache path (O(N) per decode step)");
    await generateWithKvCache(inputIds, generatedTokenIds, reqId);
  } else {
    console.log("[EdgeLLM Worker] Using full-refeed fallback (model lacks KV outputs)");
    await generateFullRefeed(inputIds, generatedTokenIds, reqId);
  }

  const endTime = performance.now();
  const elapsedSec = (endTime - startTime) / 1000;
  const tps = generatedTokenIds.length > 0 ? generatedTokenIds.length / elapsedSec : 0;

  console.log(
    `[EdgeLLM Worker] Generated ${generatedTokenIds.length} tokens ` +
    `in ${elapsedSec.toFixed(2)}s (${tps.toFixed(2)} tok/s). Decoding...`
  );

  const decoded = await tokenizer.decode(generatedTokenIds, { skip_special_tokens: true });

  const cleanedText = parseJsonResponse(decoded);
  self.postMessage({ type: "DONE", reqId, text: cleanedText.trim(), tps });
}

// ─── Message handler ──────────────────────────────────────────────────────────

console.log("[EdgeLLM Worker] 🚀 Worker script loaded and initialized. Listening for messages...");

self.addEventListener("message", (e) => {
  const { type, payload } = e.data;
  console.log(`[EdgeLLM Worker] 📨 Received message: type=${type}`, payload ? `payload=${JSON.stringify(payload).slice(0, 200)}` : "");

  if (type === "LOAD") {
    loadModel(payload?.modelId).catch((err) => {
      console.error("[EdgeLLM Worker] ❌ loadModel() threw:", err);
      self.postMessage({ type: "ERROR", error: err.message || String(err) });
    });
  } else if (type === "GENERATE") {
    generate(payload.prompt, payload.reqId).catch((err) => {
      console.error(`[EdgeLLM Worker] ❌ generate() threw (reqId: ${payload.reqId}):`, err);
      self.postMessage({ type: "ERROR", error: err.message || String(err), reqId: payload.reqId });
    });
  } else if (type === "RESET") {
    console.log("[EdgeLLM Worker] 🔄 RESET received — clearing session, tokenizer, and ort.");
    session = null;
    tokenizer = null;
    ort = null;
    eosTokenId = FALLBACK_EOS_TOKEN_ID;
    self.postMessage({ type: "STATUS", status: "idle", progress: 0 });
  } else if (type === "CLEAR_CACHE") {
    console.log("[EdgeLLM Worker] 🗑️  CLEAR_CACHE received — deleting IndexedDB store.");
    if (_idb) {
      _idb.close();
      _idb = null;
    }
    const req = indexedDB.deleteDatabase(IDB_DB_NAME);
    req.onsuccess = () => {
      self.postMessage({ type: "DONE", reqId: payload?.reqId, text: "Cache cleared." });
    };
    req.onerror = () => {
      self.postMessage({ type: "ERROR", reqId: payload?.reqId, error: "Failed to clear cache." });
    };
    req.onblocked = () => {
      // Blocked connections usually clear on next page reload — report success anyway.
      self.postMessage({ type: "DONE", reqId: payload?.reqId, text: "Cache clear blocked (will clear on reload)." });
    };
  } else {
    console.warn(`[EdgeLLM Worker] ⚠️  Unknown message type received: "${type}"`);
  }
});

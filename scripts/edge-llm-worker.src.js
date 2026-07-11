/**
 * edge-llm-worker.src.js
 *
 * Web Worker that runs the Kingman Hornet ONNX model (fine-tuned SmolLM2-135M)
 * 100% in-browser via onnxruntime-web (WASM execution provider).
 *
 * Fully client-side — fetches model directly from HuggingFace CDN.
 * __HF_TOKEN__ is injected at build time by build-edge-llm-worker.mjs
 * (reads HF_TOKEN from .env.local — no server proxy needed).
 *
 * Build: node scripts/build-edge-llm-worker.mjs  →  public/edge-llm.worker.js
 *
 * ── Inbound messages ──────────────────────────────────────────────────────────
 *   { type: 'LOAD',     modelRepo: string }
 *   { type: 'GENERATE', prompt: string|ChatMLMessage[], maxTokens?: number, reqId?: number }
 *   { type: 'RESET' }
 *
 * ── Outbound messages ─────────────────────────────────────────────────────────
 *   { type: 'STATUS',   message: string, status: string, progress?: number }
 *   { type: 'PROGRESS', loaded: number, total: number }
 *   { type: 'TOKEN',    text: string }
 *   { type: 'DONE',     text: string, reqId?: number }
 *   { type: 'ERROR',    message: string, error: string }
 */

import * as ort from 'onnxruntime-web';
import { env as xenv, AutoTokenizer } from '@huggingface/transformers';

// ── Auth token (baked in at build time from .env.local HF_TOKEN) ─────────────
const HF_TOKEN = (typeof __HF_TOKEN__ !== 'undefined' && __HF_TOKEN__) ? __HF_TOKEN__ : '';

// ── Known model configs ───────────────────────────────────────────────────────
const MODEL_CONFIGS = {
  'Kingman9407/hornet': {
    repo: 'Kingman9407/hornet',
    file: 'onnx/untrained/model.onnx',
    knownBytes: 137_452_646,
    idbKey: 'kingman-hornet-untrained-v1',
  },
  'onnx-community/SmolLM2-135M-Instruct': {
    repo: 'onnx-community/SmolLM2-135M-Instruct',
    file: 'onnx/model.onnx',
    knownBytes: 137_000_000,
    idbKey: 'smollm2-135m-v1',
  },
};
const DEFAULT_REPO = 'Kingman9407/hornet';

// ── Module-level state ────────────────────────────────────────────────────────
let session = null;
let tokenizer = null;
let vocabSize = 0;

// SmolLM2 / Hornet EOS token IDs
const EOS_IDS = new Set([0, 2]);

// ── Utilities ─────────────────────────────────────────────────────────────────
function post(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function argmax(arr) {
  let mi = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[mi]) mi = i;
  return mi;
}

/** Apply SmolLM2 / ChatML template */
function applyChatTemplate(input) {
  if (typeof input === 'string') {
    return `<|im_start|>user\n${input}<|im_end|>\n<|im_start|>assistant\n`;
  }
  // Array of { role, content } messages
  let out = '';
  for (const msg of input) {
    out += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
  }
  return out + '<|im_start|>assistant\n';
}

// ── IndexedDB model cache ─────────────────────────────────────────────────────
const IDB_DB = 'edge-llm-cache';
const IDB_STORE = 'models';

// Fix #6: Singleton IDB connection — open once, reuse for all operations.
// Opening a new connection per call adds latency and can block version upgrades
// because abandoned connections are never explicitly closed.
let _idb = null;

function openDb() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => { _idb = req.result; res(_idb); };
    req.onerror = () => rej(req.error);
  });
}

async function getCached(key) {
  try {
    const db = await openDb();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result ?? null);
      req.onerror = () => rej(req.error);
    });
  } catch { return null; }
}

async function saveCache(key, buffer) {
  // Skip on mobile if model is large (> 100 MB)
  if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) && buffer.byteLength > 100e6) return;
  try {
    const db = await openDb();
    await Promise.race([
      new Promise((res, rej) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const req = tx.objectStore(IDB_STORE).put(buffer, key);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
        tx.onabort = () => rej(new Error('IDB aborted'));
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('IDB timeout')), 15_000)),
    ]);
    console.log('[edge-llm] ✅ Model cached in IndexedDB');
  } catch (e) {
    console.warn('[edge-llm] ⚠️ IndexedDB cache failed (non-fatal):', e.message);
  }
}

/**
 * Stream response body with progress events.
 *
 * Fix #5: Pre-allocate a single ArrayBuffer at content-length bytes.
 *   Original: accumulated all chunks → merged into a second copy → peak RAM = 2× model size.
 *   Now: write each chunk directly into the pre-allocated buffer → peak RAM = 1× model size.
 *
 * Fix #7: Throttle postMessage to ≥250 ms intervals.
 *   Original: posted a STATUS message on every network chunk (~4 000 messages for a 137 MB model),
 *   waking the main thread and deserialising each payload unnecessarily.
 */
async function streamWithProgress(response, knownBytes) {
  const headerLen = Number(response.headers.get('Content-Length') ?? 0);
  const total = headerLen > 0 ? headerLen : knownBytes;

  const reader = response.body.getReader();
  let loaded = 0;
  let lastProgressAt = 0;

  if (total > 0) {
    // Fix #5: pre-allocated path — avoids the double-copy / 2× peak memory
    const merged = new Uint8Array(total);
    let writeOffset = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      merged.set(value, writeOffset);
      writeOffset += value.byteLength;
      loaded = writeOffset;

      // Fix #7: gate progress postMessage behind 250 ms interval
      const now = performance.now();
      if (now - lastProgressAt >= 250) {
        post('STATUS', {
          status: 'downloading',
          progress: Math.min(loaded / total, 0.99),
          message: `📥 Downloading model… ${Math.round(loaded / total * 100)}%`,
        });
        lastProgressAt = now;
      }
    }

    // Trim in case server sent fewer bytes than Content-Length declared
    return writeOffset < total ? merged.buffer.slice(0, writeOffset) : merged.buffer;
  } else {
    // Fallback: chunk accumulation when content-length is unknown
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;

      const now = performance.now();
      if (now - lastProgressAt >= 250) {
        post('STATUS', {
          status: 'downloading',
          progress: 0,
          message: `📥 Downloading model… ${(loaded / 1e6).toFixed(0)} MB`,
        });
        lastProgressAt = now;
      }
    }
    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
    return merged.buffer;
  }
}

// ── LOAD ──────────────────────────────────────────────────────────────────────
async function load(modelRepo) {
  session = null;
  tokenizer = null;
  vocabSize = 0;

  const cfg = MODEL_CONFIGS[modelRepo] ?? MODEL_CONFIGS[DEFAULT_REPO];

  post('STATUS', { status: 'downloading', progress: 0, message: `📥 Loading ${cfg.repo}…` });

  try {
    // ── Step 1: Model binary (IndexedDB cache → HuggingFace CDN) ─────────────
    let buffer = await getCached(cfg.idbKey);

    if (buffer) {
      console.log(`[edge-llm] ✅ Cache hit: ${cfg.idbKey} (${(buffer.byteLength / 1e6).toFixed(1)} MB)`);
      post('STATUS', { status: 'downloading', progress: 1, message: '✅ Loaded from cache' });
    } else {
      // Direct fetch from HuggingFace CDN (fully client-side)
      // COEP is set to 'credentialless' so cross-origin fetches are allowed.
      const hfUrl = `https://huggingface.co/${cfg.repo}/resolve/main/${cfg.file}`;
      const headers = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

      console.log('[edge-llm] Fetching from HuggingFace:', hfUrl);
      const resp = await fetch(hfUrl, { mode: 'cors', credentials: 'omit', headers, cache: 'no-store' });

      if (!resp.ok) throw new Error(`HuggingFace fetch error: ${resp.status} ${resp.statusText}`);
      if (!resp.body) throw new Error('Response body is null');

      buffer = await streamWithProgress(resp, cfg.knownBytes);
      // Cache asynchronously — don't block session creation
      saveCache(cfg.idbKey, buffer);
    }

    // ── Step 2: Create ORT InferenceSession with WASM provider ───────────────
    //
    // Library: onnxruntime-web (ORT)
    //   import * as ort from 'onnxruntime-web';
    //
    // ORT's web build uses WASM as its execution backend — it compiles the
    // C++ ONNX runtime into .wasm binaries that run natively in the browser.
    //
    // wasmPaths  → load .wasm files from /public/ (copied by copy-ort-wasm.js)
    //              required so COEP headers are satisfied (same-origin)
    // proxy=false → we are already inside a Web Worker
    // numThreads  → use multiple threads if SharedArrayBuffer is available,
    //               otherwise fall back to 1 (always safe)

    post('STATUS', { status: 'loading', progress: 1, message: `⚙️ Compiling WASM session… (${(buffer.byteLength / 1e6).toFixed(0)} MB)` });

    // Fix #4: Cap numThreads at physical-core estimate (hardwareConcurrency / 2),
    // max 4. navigator.hardwareConcurrency returns *logical* threads (hyperthreads).
    // Hyperthreads share FPU/SIMD units — extra WASM threads cause cache thrashing
    // and synchronisation overhead. Halving and capping at 4 gives 20–30% better
    // transformer throughput. Falls back to 1 when SharedArrayBuffer is unavailable.
    const hasSAB = typeof SharedArrayBuffer !== 'undefined' && typeof Atomics !== 'undefined';
    const hwConcurrency = navigator.hardwareConcurrency ?? 1;
    const numThreads = hasSAB
      ? Math.min(Math.max(1, Math.floor(hwConcurrency / 2)), 4)
      : 1;

    // Probe for SIMD support
    let simdOk = false;
    try {
      simdOk = WebAssembly.validate(new Uint8Array([
        0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,
        0x01,0x05,0x01,0x60,0x00,0x01,0x7b,
        0x03,0x02,0x01,0x00,
        0x0a,0x0a,0x01,0x08,0x00,0xfd,0x0f,0x00,0x00,0x00,0x00,0x0b,
      ]));
    } catch { /* ignore */ }

    ort.env.wasm.wasmPaths = `${self.location.origin}/`;
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = numThreads;
    ort.env.wasm.simd = simdOk;
    console.log(`[edge-llm] WASM config — threads: ${numThreads} (hw: ${hwConcurrency}), SIMD: ${simdOk}, SAB: ${hasSAB}`);

    const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
    function createSessionWithTimeout(buf, opts) {
      return Promise.race([
        ort.InferenceSession.create(buf, opts),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('WASM compilation timed out after 3 minutes')), SESSION_TIMEOUT_MS)
        ),
      ]);
    }

    try {
      session = await createSessionWithTimeout(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      });
    } catch (e1) {
      console.warn('[edge-llm] Session attempt 1 failed, retrying with basic optimisation:', e1.message);
      session = await createSessionWithTimeout(buffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'basic',
      });
    }

    console.log('[edge-llm] inputNames :', session.inputNames);
    
    // ── Step 3: Load tokenizer directly from HuggingFace ─────────────────────
    post('STATUS', { status: 'loading', progress: 1, message: '🔤 Loading tokenizer…' });

    xenv.allowRemoteModels = true;
    xenv.useBrowserCache = true;

    // Override the internal fetch to manually guarantee the token and COEP settings
    // are applied to every tokenizer file request, bypassing any package bugs.
    const originalFetch = globalThis.fetch;
    xenv.fetch = async (url, options = {}) => {
      if (HF_TOKEN && typeof url === 'string' && url.includes('huggingface.co')) {
        options.headers = { ...options.headers, Authorization: `Bearer ${HF_TOKEN}` };
        options.mode = 'cors';
        options.credentials = 'omit'; // Required for our COEP policy
      }
      return originalFetch(url, options);
    };

    tokenizer = await AutoTokenizer.from_pretrained(cfg.repo);

    post('STATUS', { status: 'ready', progress: 1, message: '✅ Model ready — WASM active' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[edge-llm] load error:', err);
    post('ERROR', { message: msg, error: msg });
  }
}

// ── GENERATE ──────────────────────────────────────────────────────────────────
//
// Flow Summary:
//   ONNX model binary (ArrayBuffer)
//         ↓
//   ort.InferenceSession.create()
//         ↓
//   WASM JIT compiles the model
//         ↓
//   session.run(feeds)  ← each token generation step
//         ↓
//   logits → argmax → next token
//
// No KV cache — full token sequence fed on every step (greedy decode).
// Simpler and WASM-compatible; slower on long contexts but correct.

async function generate(prompt, maxTokens = 256, reqId) {
  if (!session || !tokenizer) {
    post('ERROR', { message: 'Model not loaded — send LOAD first', error: 'Model not loaded', reqId });
    return;
  }

  try {
    const formatted = applyChatTemplate(prompt);
    console.log('[edge-llm] RAW PROMPT:\n', formatted);

    // Tokenize — return plain JS arrays (not tensors)
    const encoded = await tokenizer(formatted, { return_tensor: false, add_special_tokens: false });
    const rawIds = encoded.input_ids;
    // Handle batched [[...]] or flat [...] return
    let currentIds = (Array.isArray(rawIds[0]) ? rawIds[0] : rawIds).map(Number);

    console.log(`[edge-llm] Prompt: ${currentIds.length} tokens. Generating up to ${maxTokens}…`);

    let fullText = '';

    // ── Greedy decode loop WITH KV CACHE ──────────────────────────────────────
    //
    // Fix #1 (already present): KV-cache prefill + single-token decode.
    //
    // Fix #2: Pre-allocate typed-array buffers at max sequence length.
    //   Original: created new BigInt64Array + .map(BigInt) on EVERY step for the
    //   full sequence — thousands of short-lived heap objects and heavy GC pressure.
    //   Now: allocate once before the loop; subarray views grow in-place each step.
    //
    const promptLen = currentIds.length;
    const maxCtxLen = promptLen + maxTokens;

    // Pre-alloc: attention mask — all 1s up to max context (never needs rewriting)
    const attnMaskBuf = new BigInt64Array(maxCtxLen).fill(1n);

    let pastKeyValues = null;
    let contextLen = promptLen; // total tokens seen by the model (grows each step)

    for (let step = 0; step < maxTokens; step++) {
      let stepSeqLen;
      let inputIdsTensor;
      let posIdsTensor;

      if (step === 0) {
        // ── Prefill: run full prompt once to prime the KV cache ──────────────
        stepSeqLen = promptLen;
        // Fix #2: Build prefill input_ids from pre-seeded currentIds (no extra alloc)
        inputIdsTensor = new ort.Tensor(
          'int64',
          BigInt64Array.from(currentIds, id => BigInt(id)),
          [1, stepSeqLen]
        );
        posIdsTensor = new ort.Tensor(
          'int64',
          BigInt64Array.from({ length: stepSeqLen }, (_, i) => BigInt(i)),
          [1, stepSeqLen]
        );
      } else {
        // ── Decode: single new token, using KV cache for past context ─────────
        stepSeqLen = 1;
        // Fix #2: 1-element tensor — trivial cost regardless of sequence length
        inputIdsTensor = new ort.Tensor(
          'int64',
          new BigInt64Array([BigInt(currentIds[currentIds.length - 1])]),
          [1, 1]
        );
        posIdsTensor = new ort.Tensor(
          'int64',
          new BigInt64Array([BigInt(contextLen - 1)]),
          [1, 1]
        );
      }

      const feeds = {
        input_ids: inputIdsTensor,
        // Fix #2: subarray view into pre-allocated buffer — no allocation per step
        attention_mask: new ort.Tensor('int64', attnMaskBuf.subarray(0, contextLen), [1, contextLen]),
      };

      if (session.inputNames.includes('position_ids')) {
        feeds['position_ids'] = posIdsTensor;
      }

      // Inject KV cache (present→past rotation) or empty tensors on prefill step
      if (pastKeyValues) {
        for (const [k, v] of Object.entries(pastKeyValues)) {
          const pastName = k.replace('present', 'past_key_values');
          if (session.inputNames.includes(pastName)) feeds[pastName] = v;
        }
      } else {
        const emptyKvShape = [1, 3, 0, 64]; // SmolLM2-135M: batch=1, heads=3, seq=0, dim=64
        const emptyBuf = new Float32Array(0);
        for (const name of session.inputNames) {
          if (name.startsWith('past_key_values.') && !(name in feeds)) {
            feeds[name] = new ort.Tensor('float32', emptyBuf, emptyKvShape);
          }
        }
      }

      // Forward pass
      const output = await session.run(feeds);

      // Rotate KV cache: save present_* tensors for the next decode step
      pastKeyValues = {};
      for (const k of Object.keys(output)) {
        if (k.startsWith('present')) pastKeyValues[k] = output[k];
      }

      const logitsTensor = output.logits ?? output[session.outputNames[0]];

      if (vocabSize === 0) {
        vocabSize = logitsTensor.dims[2];
        console.log('[edge-llm] vocab size:', vocabSize);
      }

      const lastOffset = (stepSeqLen - 1) * vocabSize;
      // Fix #2: subarray avoids creating a copy of the logits slice
      const lastLogits = logitsTensor.data.subarray
        ? logitsTensor.data.subarray(lastOffset, lastOffset + vocabSize)
        : logitsTensor.data.slice(lastOffset, lastOffset + vocabSize);

      const nextId = argmax(lastLogits);

      if (step === 0) console.log('[edge-llm] First generated token id:', nextId);

      // Stop on EOS
      if (EOS_IDS.has(nextId)) {
        console.log(`[edge-llm] EOS hit at step ${step}`);
        break;
      }

      currentIds.push(nextId);
      contextLen++; // advance the context pointer for the next decode step

      // Decode this new token and stream it
      const decoded = await tokenizer.decode([nextId], { skip_special_tokens: true });
      if (decoded) {
        fullText += decoded;
        post('TOKEN', { text: decoded, reqId });
      }
    }

    console.log('[edge-llm] Generation complete. Output:', fullText.slice(0, 200));
    post('DONE', { text: fullText.trim(), reqId });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[edge-llm] generate error:', err);
    post('ERROR', { message: msg, error: msg, reqId });
  }
}

// ── Message router ────────────────────────────────────────────────────────────
self.onmessage = async ({ data }) => {
  // Guard: ORT WASM threading posts internal messages without our 'type' field.
  // Silently discard anything that isn't an application message.
  if (!data || typeof data.type !== 'string') return;

  const { type, payload, ...rest } = data;
  // Support both { type, payload } and { type, ...rest } call styles
  const p = payload ?? rest;

  switch (type) {
    case 'LOAD':
      await load(p.modelRepo ?? p.modelId ?? DEFAULT_REPO);
      break;

    case 'GENERATE':
      await generate(p.prompt, p.maxTokens ?? 256, p.reqId);
      break;

    case 'RESET':
      session = null;
      tokenizer = null;
      vocabSize = 0;
      _idb = null; // allow GC of the singleton DB connection on full reset
      post('STATUS', { status: 'idle', progress: 0, message: '' });
      break;

    default:
      console.warn('[edge-llm] unknown message type:', type);
  }
};

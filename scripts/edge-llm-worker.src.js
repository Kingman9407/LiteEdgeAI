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
    file: 'model.onnx',
    knownBytes: 137_452_646,
    idbKey: 'kingman-hornet-v1',
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

function openDb() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
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

/** Stream response body with progress events */
async function streamWithProgress(response, knownBytes) {
  const headerLen = Number(response.headers.get('Content-Length') ?? 0);
  const total = headerLen > 0 ? headerLen : knownBytes;

  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    post('STATUS', {
      status: 'downloading',
      progress: total > 0 ? Math.min(loaded / total, 0.99) : 0,
      message: `📥 Downloading model… ${total > 0 ? Math.round(loaded / total * 100) + '%' : (loaded / 1e6).toFixed(0) + ' MB'}`,
    });
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return merged.buffer;
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

    // Always use 1 thread — multi-threading inside a Worker requires a very
    // specific SharedArrayBuffer + WASM threading setup that can silently
    // deadlock. Single-threaded is slower but guaranteed not to hang.
    ort.env.wasm.wasmPaths = `${self.location.origin}/`;
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 1;
    // Note: ort.env.wasm.simd is deprecated in ORT v1.20+ — SIMD is always enabled

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

    // ── Greedy decode loop (no KV cache) ──────────────────────────────────────
    for (let step = 0; step < maxTokens; step++) {
      const seqLen = currentIds.length;

      // Build input tensors:
      //   input_ids     : [1, seqLen]  int64  — token IDs
      //   attention_mask: [1, seqLen]  int64  — all 1s
      const feeds = {
        input_ids: new ort.Tensor(
          'int64',
          BigInt64Array.from(currentIds.map(BigInt)),
          [1, seqLen]
        ),
        attention_mask: new ort.Tensor(
          'int64',
          new BigInt64Array(seqLen).fill(1n),
          [1, seqLen]
        ),
      };

      if (session.inputNames.includes('position_ids')) {
        const posArray = new BigInt64Array(seqLen);
        for (let i = 0; i < seqLen; i++) posArray[i] = BigInt(i);
        feeds['position_ids'] = new ort.Tensor('int64', posArray, [1, seqLen]);
      }

      // Inject empty past_key_values if the model expects them
      const emptyKvShape = [1, 3, 0, 64];
      const emptyBuf = new Float32Array(0);
      for (const name of session.inputNames) {
        if (name.startsWith('past_key_values.') && !(name in feeds)) {
          feeds[name] = new ort.Tensor('float32', emptyBuf, emptyKvShape);
        }
      }

      // Forward pass — each call to session.run() is one token generation step
      const output = await session.run(feeds);
      const logitsTensor = output.logits ?? output[session.outputNames[0]];

      // Discover vocab size on first step
      if (vocabSize === 0) {
        vocabSize = logitsTensor.dims[2];
        console.log('[edge-llm] vocab size:', vocabSize);
      }

      // logits shape: [1, seqLen, vocabSize] — grab last position's logits
      const lastOffset = (seqLen - 1) * vocabSize;
      const lastLogits = logitsTensor.data.slice(lastOffset, lastOffset + vocabSize);

      // Greedy: pick the token with the highest logit (argmax)
      const nextId = argmax(lastLogits);

      if (step === 0) console.log('[edge-llm] First generated token id:', nextId);

      // Stop on EOS
      if (EOS_IDS.has(nextId)) {
        console.log(`[edge-llm] EOS hit at step ${step}`);
        break;
      }

      currentIds.push(nextId);

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
      post('STATUS', { status: 'idle', progress: 0, message: '' });
      break;

    default:
      console.warn('[edge-llm] unknown message type:', type);
  }
};

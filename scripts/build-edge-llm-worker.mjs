/**
 * Bundles scripts/edge-llm-worker.src.ts  →  public/edge-llm.worker.js
 *
 * Bundling strategy:
 *   - onnxruntime-web  : bundled (it already handles WASM file URLs internally)
 *   - @huggingface/transformers : bundled, with loader '.wasm' = 'file' so that
 *     tokenizers-web WASM is emitted as a separate file into /public and its
 *     URL is set correctly via `new URL('./...', import.meta.url)` transform.
 *
 * Run via: npm run build-edge-worker
 * Auto-run in predev / prebuild via package.json.
 */

import { build } from 'esbuild';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Read HF_TOKEN from .env.local so it can be baked into the worker bundle.
// This avoids any runtime env-injection issues (Next.js doesn't process the
// pre-built worker file, so NEXT_PUBLIC_* substitution would never happen).
function readHfToken(rootDir) {
  // 1. Prefer explicit shell env (CI / deployment)
  if (process.env.HF_TOKEN) return process.env.HF_TOKEN;
  if (process.env.NEXT_PUBLIC_HF_TOKEN) return process.env.NEXT_PUBLIC_HF_TOKEN;
  // 2. Fall back to .env.local
  try {
    const content = readFileSync(resolve(rootDir, '.env.local'), 'utf8');
    // Match HF_TOKEN=... or NEXT_PUBLIC_HF_TOKEN=...
    const match = content.match(/^(?:NEXT_PUBLIC_)?HF_TOKEN[ \t]*=[ \t]*(.+)$/m);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = resolve(__dirname, '..');
const hfToken   = readHfToken(rootDir);
console.log(`[build-edge-worker] HF_TOKEN: ${hfToken ? '✅ found (' + hfToken.slice(0, 8) + '…)' : '⚠️  not found — model fetches will be unauthenticated'}`);
const publicDir = resolve(rootDir, 'public');

await build({
  // Use entryPoints as a map so we control the output filename exactly
  entryPoints: {
    'edge-llm.worker': resolve(__dirname, 'edge-llm-worker.src.ts'),
  },
  outdir:   publicDir,
  bundle:   true,
  format:   'esm',
  platform: 'browser',
  minify:   false,      // keep readable for debugging
  sourcemap: false,

  // Copy WASM assets (tokenizers-web, etc.) into public/ with stable names.
  // esbuild transforms `new URL('./foo.wasm', import.meta.url)` patterns to
  // reference the copied file, so loading works correctly in the worker.
  loader: { '.wasm': 'file' },
  assetNames: '[name]',   // no content-hash → deterministic filename

  define: {
    'process.env.NODE_ENV': '"production"',
    // Baked-in HF token — used by the worker to authenticate with HuggingFace CDN
    '__HF_TOKEN__': JSON.stringify(hfToken),
  },
}).then(() => {
  console.log('✅  public/edge-llm.worker.js built successfully');
}).catch((err) => {
  console.error('❌  edge-llm worker build failed:', err.message);
  process.exit(1);
});

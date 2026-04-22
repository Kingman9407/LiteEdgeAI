/**
 * Bundles the inferis-ml custom worker entry into public/inferis-worker.js.
 * Run via: npm run build-inferis-worker
 *
 * Uses esbuild (bundled with Next.js) to produce a self-contained ESM bundle
 * that the browser can run as a Web Worker without needing module resolution.
 */

import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

await build({
    entryPoints: [resolve(__dirname, 'inferis-worker-entry.js')],
    outfile:     resolve(__dirname, '../public/inferis-worker.js'),
    bundle:      true,       // inline all imports into one file
    format:      'esm',      // Web Workers support ES modules in modern browsers
    platform:    'browser',
    minify:      false,       // keep readable for debugging
    sourcemap:   false,
    // @mlc-ai/web-llm is already loaded by the main thread (via CDN/npm);
    // in the worker it is dynamically imported, so we keep it external here
    // and let it resolve from the same origin.
    // If web-llm causes issues inside the worker, mark it external:
    // external: ['@mlc-ai/web-llm'],
    define: {
        'process.env.NODE_ENV': '"production"',
    },
}).then(() => {
    console.log('✅  public/inferis-worker.js built successfully');
}).catch((err) => {
    console.error('❌  Worker bundle failed:', err.message);
    process.exit(1);
});

/**
 * inferis-ml custom worker entry point.
 * This file is bundled by scripts/build-inferis-worker.mjs
 * into public/inferis-worker.js and served as a static asset.
 *
 * The worker runtime (dedicated.worker.js) requires an adapter to be
 * registered before it can handle any inference tasks.
 */

// 1. Import the adapter registration function from the inferis-ml worker runtime
import { registerAdapterFactory } from 'inferis-ml/worker';

// 2. Import the web-llm adapter factory
import { webLlmAdapter } from 'inferis-ml/adapters/web-llm';

// 3. Register — this must happen synchronously before any postMessage arrives
registerAdapterFactory(webLlmAdapter());

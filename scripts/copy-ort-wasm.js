#!/usr/bin/env node
// Copies ORT WASM + JSEP runtime files from node_modules to /public.
// Run automatically via "predev" and "prebuild" npm hooks.

const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "../node_modules/onnxruntime-web/dist");
const dst = path.join(__dirname, "../public");

const FILES = [
  "ort-wasm-simd-threaded.jsep.wasm",
  "ort-wasm-simd-threaded.jsep.mjs",
  "ort-wasm-simd-threaded.wasm",
  "ort-wasm-simd-threaded.mjs",
];

for (const file of FILES) {
  const srcPath = path.join(src, file);
  const dstPath = path.join(dst, file);
  if (!fs.existsSync(srcPath)) {
    console.warn(`[copy-ort-wasm] WARNING: ${file} not found in dist — skipping`);
    continue;
  }
  fs.copyFileSync(srcPath, dstPath);
  console.log(`[copy-ort-wasm] Copied ${file} → public/`);
}

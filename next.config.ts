import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Tell Turbopack NOT to bundle these large WASM/AI libs into worker chunks.
  // When bundled, ORT's thread spawner resolves its own path to file:// URLs
  // which browsers block from HTTP origins (SecurityError). Keeping them external
  // lets Turbopack serve them via proper HTTP, so ORT threads work correctly.
  serverExternalPackages: [
    "onnxruntime-web",
    "@huggingface/transformers",
  ],

  async headers() {
    return [
      // ── Global COOP/COEP — required for SharedArrayBuffer / WebGPU ──────────
      // These headers enable cross-origin isolation, needed by WebLLM.
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "credentialless" },
        ],
      },
      // ── CORP for static assets (WASM + ONNX models + ORT JS/MJS) ─────────────
      // COEP: require-corp requires every sub-resource to carry a
      // Cross-Origin-Resource-Policy header, even when served from the same
      // origin. Next.js static files don't get this header by default, so the
      // browser blocks them. Adding it here fixes model + WASM loading.
      {
        source: "/:file*.wasm",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Content-Type",                 value: "application/wasm" },
        ],
      },
      {
        // ORT v1.20 JSEP runtime file — needed by WebGPU/WebNN EP
        source: "/:file*.mjs",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/models/:file*.onnx",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      // ── CORP for Next.js compiled JS chunks (module workers) ─────────────────
      // When spawning a worker via new URL('./worker.ts', import.meta.url),
      // Turbopack serves the compiled worker as a /_next/static/chunks/*.js file.
      // COEP (credentialless) requires a CORP header on same-origin resources too.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },

  turbopack: {},

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("onnxruntime-node");
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    return config;
  },
};

export default nextConfig;

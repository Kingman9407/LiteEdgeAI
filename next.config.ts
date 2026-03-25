import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      // ── Global COOP/COEP — required for SharedArrayBuffer / WebGPU ──────────
      // These headers enable cross-origin isolation, needed by WebLLM.
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy",  value: "require-corp" },
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

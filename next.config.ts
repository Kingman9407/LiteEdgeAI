import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devServer: {
    allowedDevOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://172.27.146.228:3000",
      "http://192.168.*",
      "http://172.*",
    ],
  },

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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.baoangiang.com.vn",
      },
    ],
  },
};

export default nextConfig;

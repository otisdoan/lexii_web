import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.baoangiang.com.vn",
      },
      {
        protocol: "https",
        hostname: "lh7-rt.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;

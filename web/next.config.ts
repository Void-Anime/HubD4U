import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Ensure output file tracing resolves from the web app directory in this workspace
  outputFileTracingRoot: path.join(__dirname, '..'),
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static'],
  },
  webpack: (config) => {
    // Keep ffmpeg-static as external to preserve runtime path
    config.externals = config.externals || [];
    config.externals.push({ 'ffmpeg-static': 'commonjs ffmpeg-static' });
    return config;
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

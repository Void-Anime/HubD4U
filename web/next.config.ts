import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Ensure output file tracing resolves from the web app directory in this workspace
  outputFileTracingRoot: path.join(__dirname, '..'),
  serverExternalPackages: ['ffmpeg-static'],
  webpack: (config) => {
    // Keep ffmpeg-static as external to preserve runtime path
    config.externals = config.externals || [];
    config.externals.push({ 'ffmpeg-static': 'commonjs ffmpeg-static' });
    
    // Handle FFmpeg warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
    ];
    
    return config;
  },
};

export default nextConfig;

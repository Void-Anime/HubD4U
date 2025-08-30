import path from 'path';
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  // Ensure output file tracing resolves from the web app directory in this workspace
  outputFileTracingRoot: path.join(__dirname, '..'),
  
  // External packages for server-side execution
  serverExternalPackages: [
    '@ffmpeg-installer/ffmpeg',
    'child_process'
  ],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep FFmpeg package as external to preserve runtime path
      config.externals = config.externals || [];
      config.externals.push(
        { '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg' }
      );
    }
    
    // Handle FFmpeg warnings
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'ffmpeg'/,
      /Module not found: Can't resolve '@ffmpeg-installer\/ffmpeg'/,
    ];
    
    return config;
  }
};

export default nextConfig;

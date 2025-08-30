import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check if we're in Vercel environment
    const isVercel = !!process.env.VERCEL;
    const environment = process.env.NODE_ENV || 'unknown';
    const region = process.env.VERCEL_REGION || 'unknown';
    
    // Check FFmpeg availability
    let ffmpegStatus = 'unknown';
    try {
      const ff = require('@ffmpeg-installer/ffmpeg');
      if (ff?.path && typeof ff.path === 'string') {
        ffmpegStatus = 'available';
      } else {
        ffmpegStatus = 'not-found';
      }
    } catch {
      ffmpegStatus = 'error';
    }
    
    // Check environment variables
    const envVars = {
      NODE_ENV: environment,
      VERCEL: isVercel,
      VERCEL_REGION: region,
      FFMPEG_PATH: process.env.FFMPEG_PATH || 'not-set'
    };
    
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: envVars,
      ffmpeg: ffmpegStatus,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

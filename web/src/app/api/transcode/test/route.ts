import {NextRequest} from 'next/server';
import {spawn} from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    // Test FFmpeg path resolution
    let ffmpegPath: string | null = null;
    
    // Try @ffmpeg-installer/ffmpeg
    try {
      const ff = require('@ffmpeg-installer/ffmpeg');
      if (ff?.path && typeof ff.path === 'string') {
        ffmpegPath = ff.path;
      }
    } catch {}
    
    // Try system ffmpeg
    if (!ffmpegPath) {
      ffmpegPath = 'ffmpeg';
    }
    
    if (!ffmpegPath) {
      return new Response(JSON.stringify({
        error: 'No FFmpeg path found',
        available: false
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Test FFmpeg version using a simpler approach
    try {
      const { execSync } = require('child_process');
      const output = execSync(`${ffmpegPath} -version`, { 
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });
      
      const versionLine = output.split('\n')[0];
      return new Response(JSON.stringify({
        available: true,
        path: ffmpegPath,
        version: versionLine,
        codec: 'libx264',
        audio: 'aac'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (execError: any) {
      return new Response(JSON.stringify({
        error: 'FFmpeg version check failed',
        message: execError.message,
        available: false
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: 'Test failed',
      message: error.message,
      available: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

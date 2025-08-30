import {NextRequest} from 'next/server';
import {spawn} from 'child_process';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
    
    // Test FFmpeg version
    return new Promise((resolve) => {
      const child = spawn(ffmpegPath, ['-version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          const versionLine = output.split('\n')[0];
          resolve(new Response(JSON.stringify({
            available: true,
            path: ffmpegPath,
            version: versionLine,
            codec: 'libx264',
            audio: 'aac'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        } else {
          resolve(new Response(JSON.stringify({
            error: 'FFmpeg version check failed',
            code,
            stderr: errorOutput,
            available: false
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      });
      
      child.on('error', (err) => {
        resolve(new Response(JSON.stringify({
          error: 'FFmpeg spawn failed',
          message: err.message,
          available: false
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }));
      });
    });
    
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

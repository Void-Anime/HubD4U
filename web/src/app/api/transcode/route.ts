import {NextRequest} from 'next/server';
import {spawn} from 'child_process';
import path from 'path';

// FFmpeg path resolution with fallbacks
function getFFmpegPath(): string | null {
  try {
    // First try: explicit environment variable
    if (process.env.FFMPEG_PATH) {
      return process.env.FFMPEG_PATH;
    }

    // Second try: @ffmpeg-installer/ffmpeg
    try {
      const ff = require('@ffmpeg-installer/ffmpeg');
      if (ff?.path && typeof ff.path === 'string') {
        return ff.path;
      }
    } catch {}

    // Third try: system ffmpeg (if available)
    return 'ffmpeg';
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;
  
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('Bad Request: Invalid URL', {status: 400});
  }

  const ffmpegPath = getFFmpegPath();
  if (!ffmpegPath) {
    console.error('FFmpeg not available - no path found');
    return new Response('FFmpeg not available', {status: 500});
  }

  console.log(`Using FFmpeg at: ${ffmpegPath}`);

  // Build headers for ffmpeg input
  const headerLines: string[] = [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept: */*',
    'Accept-Language: en-US,en;q=0.9',
    'Accept-Encoding: gzip, deflate, br',
    'Connection: keep-alive',
    'Upgrade-Insecure-Requests: 1',
  ];
  
  if (referer) {
    headerLines.push(`Referer: ${referer}`);
  }

  const headersArg = headerLines.join('\r\n');

  // FFmpeg arguments for optimal streaming
  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-headers', headersArg,
    '-i', url,
    // Video codec settings for browser compatibility
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '3.1',
    // Audio codec settings
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    // Output format settings
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    '-y', // Overwrite output files
    'pipe:1'
  ];

  console.log(`FFmpeg args: ${args.join(' ')}`);

  let child: any = null;
  let controllerClosed = false;

  try {
    child = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    // Handle FFmpeg process errors
    child.on('error', (err: any) => {
      console.error('FFmpeg spawn error:', err);
      if (!controllerClosed) {
        controllerClosed = true;
      }
    });

    child.on('exit', (code: number, signal: string) => {
      console.log(`FFmpeg process exited with code ${code}, signal ${signal}`);
      if (!controllerClosed) {
        controllerClosed = true;
      }
    });

    // Handle stderr for debugging
    child.stderr.on('data', (data: Buffer) => {
      console.log('FFmpeg stderr:', data.toString());
    });

    const headers = new Headers({
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    });

    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        child.stdout.on('data', (chunk: Buffer) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(chunk);
            } catch (e) {
              console.error('Controller enqueue error:', e);
              if (!controllerClosed) {
                controllerClosed = true;
                controller.close();
              }
            }
          }
        });

        child.stdout.on('end', () => {
          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        });

        child.stdout.on('error', (err: any) => {
          console.error('FFmpeg stdout error:', err);
          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        });

        child.on('close', () => {
          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        });
      },

      cancel() {
        console.log('Stream cancelled, killing FFmpeg process');
        if (child && !child.killed) {
          try {
            child.kill('SIGKILL');
          } catch (e) {
            console.error('Error killing FFmpeg process:', e);
          }
        }
        if (!controllerClosed) {
          controllerClosed = true;
        }
      }
    });

    return new Response(body, {status: 200, headers});

  } catch (error) {
    console.error('Error creating FFmpeg process:', error);
    
    // Clean up if child was created
    if (child && !child.killed) {
      try {
        child.kill('SIGKILL');
      } catch {}
    }
    
    return new Response('Internal Server Error', {status: 500});
  }
}



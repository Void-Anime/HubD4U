import {NextRequest} from 'next/server';
import {spawn} from 'child_process';
// Resolve ffmpeg path at runtime to avoid bundling issues
// Resolve ffmpeg path strictly from @ffmpeg-installer/ffmpeg or env to avoid bundling stub paths
let ffmpegPath: string | null = null;
try {
  // Highest priority: explicit env override
  if (process.env.FFMPEG_PATH) {
    ffmpegPath = process.env.FFMPEG_PATH;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ff = require('@ffmpeg-installer/ffmpeg');
    ffmpegPath = ff?.path || null;
  }
} catch {
  ffmpegPath = null;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('Bad Request', {status: 400});
  }

  if (!ffmpegPath) {
    return new Response('ffmpeg not available', {status: 500});
  }

  // Build headers for ffmpeg input
  const headerLines: string[] = [
    'User-Agent: Mozilla/5.0',
    'Accept: */*',
  ];
  if (referer) headerLines.push(`Referer: ${referer}`);
  const headersArg = headerLines.join('\r\n');

  const args = [
    '-hide_banner',
    '-loglevel', 'error',
    '-headers', headersArg,
    '-i', url,
    // fast start MP4 suitable for streaming
    '-movflags', 'frag_keyframe+empty_moov',
    // ensure browser-compatible codecs
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-profile:v', 'baseline',
    '-level', '3.1',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    'pipe:1',
  ];

  const child = spawn(ffmpegPath as string, args);

  child.on('error', err => {
    console.error('ffmpeg error', err);
  });

  const headers = new Headers({
    'Content-Type': 'video/mp4',
    // CORS
    'Access-Control-Allow-Origin': '*',
    // Allow seeking; chunked stream without known length
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  });

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch {}
      };
      child.stdout.on('data', chunk => {
        try { controller.enqueue(chunk as Buffer); } catch { safeClose(); }
      });
      child.stdout.once('end', safeClose);
      child.stdout.once('error', safeClose);
      child.once('close', safeClose);
    },
    cancel() {
      try { child.kill('SIGKILL'); } catch {}
    },
  });

  return new Response(body, {status: 200, headers});
}



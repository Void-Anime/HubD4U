import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('Bad Request', {status: 400});
  }

  const range = req.headers.get('range') || undefined;
  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    Accept: '*/*',
    Connection: 'keep-alive',
  };
  if (referer) headers.Referer = referer;
  if (range) headers.Range = range;

  const upstream = await fetch(url, {
    headers,
    redirect: 'follow',
  });

  const resHeaders = new Headers();
  const pass = [
    'content-type',
    'content-length',
    'accept-ranges',
    'content-range',
    'cache-control',
    'expires',
    'last-modified',
    'etag',
    'age',
  ];
  pass.forEach(k => {
    const v = upstream.headers.get(k);
    if (v) resHeaders.set(k, v);
  });

  // If MP4-like and missing length/range, try HEAD to learn them for better seeking
  const ct = (resHeaders.get('content-type') || '').toLowerCase();
  if ((!resHeaders.get('content-length') || !resHeaders.get('accept-ranges')) && (ct.includes('video/mp4') || ct.includes('application/octet-stream'))) {
    try {
      const head = await fetch(url, { method: 'HEAD', headers, redirect: 'follow' });
      const len = head.headers.get('content-length');
      const ranges = head.headers.get('accept-ranges');
      if (len && !resHeaders.get('content-length')) resHeaders.set('content-length', len);
      if (ranges && !resHeaders.get('accept-ranges')) resHeaders.set('accept-ranges', ranges);
    } catch {}
  }

  // Ensure range support and avoid caching
  if (!resHeaders.get('accept-ranges')) resHeaders.set('accept-ranges', 'bytes');
  resHeaders.set('cache-control', 'no-store');
  // CORS for browser playback
  resHeaders.set('access-control-allow-origin', '*');

  return new Response(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}



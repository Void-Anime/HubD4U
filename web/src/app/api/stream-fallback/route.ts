import {NextRequest} from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url);
  const url = searchParams.get('url');
  const referer = searchParams.get('referer') || undefined;
  
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response('Bad Request: Invalid URL', {status: 400});
  }

  console.log(`[STREAM-FALLBACK] Processing URL: ${url}`);

  try {
    // Build headers for the request
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity', // Don't accept compressed content
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
    
    if (referer) {
      headers['Referer'] = referer;
    }

    // Fetch the video stream
    const response = await fetch(url, {
      method: 'GET',
      headers,
      // Don't cache
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[STREAM-FALLBACK] HTTP error: ${response.status} ${response.statusText}`);
      return new Response(`Stream not available: ${response.statusText}`, {status: response.status});
    }

    // Get content type and other headers
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');

    console.log(`[STREAM-FALLBACK] Content-Type: ${contentType}, Length: ${contentLength}`);

    // Create response headers
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive',
    });

    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }

    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    }

    // Stream the response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[STREAM-FALLBACK] Stream completed');
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[STREAM-FALLBACK] Stream error:', error);
          controller.error(error);
        }
      },
      cancel() {
        console.log('[STREAM-FALLBACK] Stream cancelled');
      }
    });

    return new Response(stream, {
      status: 200,
      headers: responseHeaders
    });

  } catch (error: any) {
    console.error('[STREAM-FALLBACK] Error:', error);
    return new Response(`Stream error: ${error.message}`, {status: 500});
  }
}

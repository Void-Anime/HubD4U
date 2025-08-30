import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules, clearProviderCache} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';
import {providerContext} from '@/server/providerContext';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const providerValue = searchParams.get('provider') || '';
    const link = searchParams.get('link') || '';
    const type = searchParams.get('type') || 'movie';
    
    console.log(`[STREAM-API] Request: provider=${providerValue}, type=${type}, link=${link}`);
    
    if (!providerValue || !link) {
      console.error('[STREAM-API] Missing required parameters');
      return NextResponse.json({error: 'provider and link required'}, {status: 400});
    }
    
    // Fetch provider modules
    console.log(`[STREAM-API] Fetching modules for provider: ${providerValue}`);
    
    // Force refresh modules for testing (bypass cache)
    const forceRefresh = searchParams.get('refresh') === 'true';
    if (forceRefresh) {
      console.log(`[STREAM-API] Force refreshing modules (bypassing cache)`);
      clearProviderCache(providerValue);
    }
    
    // Also check if we should force refresh based on timestamp
    const cacheAge = searchParams.get('cache_age');
    if (cacheAge && parseInt(cacheAge) > 300000) { // 5 minutes
      console.log(`[STREAM-API] Cache age threshold exceeded, forcing refresh`);
      clearProviderCache(providerValue);
    }
    
    const modules = await fetchProviderModules(providerValue);
    console.log(`[STREAM-API] Modules fetched:`, Object.keys(modules));
    
    // Check if stream module exists
    if (!modules.stream) {
      console.error(`[STREAM-API] No stream module found for provider: ${providerValue}`);
      return NextResponse.json({error: `No stream module for provider: ${providerValue}`}, {status: 500});
    }
    
    console.log(`[STREAM-API] Stream module found, executing...`);
    
    // Execute the stream module
    const streamModule = executeModule(modules.stream);
    console.log(`[STREAM-API] Stream module executed:`, typeof streamModule);
    
    // Find the getStream function
    const getStream =
      (streamModule as any).getStream ||
      (streamModule as any).default?.getStream ||
      (streamModule as any).stream ||
      (streamModule as any).default?.stream;
    
    if (!getStream || typeof getStream !== 'function') {
      console.error(`[STREAM-API] getStream function not found in module:`, streamModule);
      return NextResponse.json({error: 'getStream function not available'}, {status: 500});
    }
    
    console.log(`[STREAM-API] getStream function found, calling with:`, { link, type });
    
    // Log provider context for debugging
    console.log(`[STREAM-API] Provider context keys:`, Object.keys(providerContext));
    console.log(`[STREAM-API] Provider context axios:`, typeof providerContext.axios);
    console.log(`[STREAM-API] Provider context cheerio:`, typeof providerContext.cheerio);
    console.log(`[STREAM-API] Provider context extractors:`, Object.keys(providerContext.extractors));
    console.log(`[STREAM-API] Provider context headers:`, Object.keys(providerContext.commonHeaders));
    
    // Call getStream function with detailed logging
    const controller = new AbortController();
    
    try {
      console.log(`[STREAM-API] About to call getStream function...`);
      console.log(`[STREAM-API] Arguments being passed:`, { link, type, signal: controller.signal, providerContext: Object.keys(providerContext) });
      
      const data = await getStream({
        link,
        type,
        signal: controller.signal,
        providerContext,
      });
      
      console.log(`[STREAM-API] getStream completed successfully`);
      console.log(`[STREAM-API] getStream result type:`, typeof data);
      console.log(`[STREAM-API] getStream result:`, data);
      console.log(`[STREAM-API] getStream result length:`, Array.isArray(data) ? data.length : 'not array');
      
      if (Array.isArray(data) && data.length === 0) {
        console.warn(`[STREAM-API] getStream returned empty array - this might indicate extraction failure`);
        console.warn(`[STREAM-API] This could be due to: URL parsing failure, HTTP request failure, content parsing failure, or extraction logic failure`);
      }
      
      console.log(`[STREAM-API] Returning data:`, { data: data || [] });
      
      return NextResponse.json({data: data || []});
      
    } catch (getStreamError: any) {
      console.error(`[STREAM-API] getStream function threw an error:`, getStreamError);
      console.error(`[STREAM-API] getStream error message:`, getStreamError?.message);
      console.error(`[STREAM-API] getStream error stack:`, getStreamError?.stack);
      
      return NextResponse.json({
        error: `getStream function failed: ${getStreamError?.message || 'Unknown error'}`,
        details: process.env.NODE_ENV === 'development' ? getStreamError?.stack : undefined
      }, {status: 500});
    }
    
  } catch (e: any) {
    console.error(`[STREAM-API] Error:`, e);
    console.error(`[STREAM-API] Error stack:`, e?.stack);
    console.error(`[STREAM-API] Error message:`, e?.message);
    
    return NextResponse.json({
      error: e?.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, {status: 500});
  }
}



import {NextRequest, NextResponse} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
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
    
    // Call getStream function
    const controller = new AbortController();
    const data = await getStream({
      link,
      type,
      signal: controller.signal,
      providerContext,
    });
    
    console.log(`[STREAM-API] getStream result:`, data);
    console.log(`[STREAM-API] Returning data:`, { data: data || [] });
    
    return NextResponse.json({data: data || []});
    
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



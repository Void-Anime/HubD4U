import {NextRequest} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const provider = searchParams.get('provider') || 'vega';
    
    console.log(`[TEST-PROVIDER] Testing provider: ${provider}`);
    
    // Test module fetching
    const modules = await fetchProviderModules(provider);
    console.log(`[TEST-PROVIDER] Modules loaded:`, Object.keys(modules));
    
    // Test module execution
    let streamModuleResult = null;
    let streamModuleError = null;
    
    if (modules.stream) {
      try {
        streamModuleResult = executeModule(modules.stream);
        console.log(`[TEST-PROVIDER] Stream module executed successfully`);
      } catch (error: any) {
        streamModuleError = error.message;
        console.error(`[TEST-PROVIDER] Stream module execution failed:`, error);
      }
    }
    
    // Test getStream function availability
    let getStreamAvailable = false;
    let getStreamType = 'not-found';
    
    if (streamModuleResult) {
      const getStream = 
        (streamModuleResult as any).getStream ||
        (streamModuleResult as any).default?.getStream ||
        (streamModuleResult as any).stream ||
        (streamModuleResult as any).default?.stream;
      
      if (getStream) {
        getStreamAvailable = true;
        getStreamType = typeof getStream;
      }
    }
    
    const result = {
      provider,
      modules: Object.keys(modules),
      streamModule: {
        available: !!modules.stream,
        size: modules.stream ? modules.stream.length : 0,
        executed: !!streamModuleResult,
        error: streamModuleError,
        result: streamModuleResult ? Object.keys(streamModuleResult) : null
      },
      getStream: {
        available: getStreamAvailable,
        type: getStreamType
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        platform: process.platform,
        arch: process.arch
      }
    };
    
    console.log(`[TEST-PROVIDER] Test result:`, result);
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error(`[TEST-PROVIDER] Error:`, error);
    
    return new Response(JSON.stringify({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

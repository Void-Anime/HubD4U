import {NextRequest} from 'next/server';
import {fetchProviderModules} from '@/server/providerLoader';
import {executeModule} from '@/server/providerExecutor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const provider = searchParams.get('provider') || 'vega';
    const testLink = searchParams.get('link') || 'https://nexdrive.pro/genxfm784776430633/';
    const testType = searchParams.get('type') || 'movie';
    
    console.log(`[TEST-PROVIDER] Testing provider: ${provider}`);
    console.log(`[TEST-PROVIDER] Test link: ${testLink}`);
    console.log(`[TEST-PROVIDER] Test type: ${testType}`);
    
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
    let getStreamResult = null;
    let getStreamError = null;
    
    if (streamModuleResult) {
      const getStream = 
        (streamModuleResult as any).getStream ||
        (streamModuleResult as any).default?.getStream ||
        (streamModuleResult as any).stream ||
        (streamModuleResult as any).default?.stream;
      
      if (getStream) {
        getStreamAvailable = true;
        getStreamType = typeof getStream;
        
        // Actually test the getStream function
        try {
          console.log(`[TEST-PROVIDER] Testing getStream function with real parameters...`);
          getStreamResult = await getStream({
            link: testLink,
            type: testType,
            signal: new AbortController().signal,
            providerContext: {
              axios: require('axios'),
              cheerio: require('cheerio'),
              getBaseUrl: () => 'https://example.com',
              commonHeaders: {},
              Crypto: {},
              extractors: {}
            }
          });
          console.log(`[TEST-PROVIDER] getStream test completed successfully`);
        } catch (error: any) {
          getStreamError = error.message;
          console.error(`[TEST-PROVIDER] getStream test failed:`, error);
        }
      }
    }
    
    const result = {
      provider,
      testLink,
      testType,
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
        type: getStreamType,
        testResult: getStreamResult,
        testError: getStreamError
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

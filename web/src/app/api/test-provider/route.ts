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
          
          // First, let's test if we can fetch the URL directly
          try {
            console.log(`[TEST-PROVIDER] Testing direct URL fetch: ${testLink}`);
            const testResponse = await fetch(testLink, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
              }
            });
            
            console.log(`[TEST-PROVIDER] Direct fetch status:`, testResponse.status);
            console.log(`[TEST-PROVIDER] Direct fetch headers:`, Object.fromEntries(testResponse.headers.entries()));
            
            if (testResponse.ok) {
              const testContent = await testResponse.text();
              console.log(`[TEST-PROVIDER] Direct fetch content length:`, testContent.length);
              console.log(`[TEST-PROVIDER] Direct fetch content preview:`, testContent.substring(0, 500));
              
              // Check if content contains expected elements
              const hasVideoElements = testContent.includes('video') || testContent.includes('source') || testContent.includes('.mp4') || testContent.includes('.m3u8');
              console.log(`[TEST-PROVIDER] Content contains video elements:`, hasVideoElements);
            }
          } catch (fetchError: any) {
            console.error(`[TEST-PROVIDER] Direct fetch failed:`, fetchError.message);
          }
          
          // Now test the actual getStream function with more detailed context
          console.log(`[TEST-PROVIDER] Testing getStream with enhanced context...`);
          
          const enhancedContext = {
            axios: require('axios'),
            cheerio: require('cheerio'),
            getBaseUrl: () => 'https://example.com',
            commonHeaders: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            Crypto: {},
            extractors: {}
          };
          
          console.log(`[TEST-PROVIDER] Enhanced context created with:`, Object.keys(enhancedContext));
          
          // Test with the original URL
          console.log(`[TEST-PROVIDER] Testing with original URL: ${testLink}`);
          
          // Create a proxy to capture what the provider is doing
          const originalAxios = enhancedContext.axios;
          const axiosCalls: any[] = [];
          
          enhancedContext.axios = new Proxy(originalAxios, {
            get(target, prop) {
              if (prop === 'get' || prop === 'post') {
                return function(...args: any[]) {
                  console.log(`[TEST-PROVIDER] Provider making ${prop} request to:`, args[0]);
                  axiosCalls.push({ method: prop, url: args[0], args });
                  return target[prop].apply(target, args);
                };
              }
              return target[prop];
            }
          });
          
          getStreamResult = await getStream({
            link: testLink,
            type: testType,
            signal: new AbortController().signal,
            providerContext: enhancedContext
          });
          
          console.log(`[TEST-PROVIDER] getStream test completed successfully`);
          console.log(`[TEST-PROVIDER] Provider made ${axiosCalls.length} HTTP requests:`, axiosCalls.map(call => ({ method: call.method, url: call.url })));
          
          // If the first test returns empty, try with a different URL format
          if (Array.isArray(getStreamResult) && getStreamResult.length === 0) {
            console.log(`[TEST-PROVIDER] First test returned empty, trying alternative URL format...`);
            
            // Try different URL variations
            const alternativeUrls = [
              testLink.replace('https://nexdrive.pro/', 'https://nexdrive.pro/watch/'),
              testLink.replace('https://nexdrive.pro/', 'https://nexdrive.pro/embed/'),
              testLink.replace('https://nexdrive.pro/', 'https://nexdrive.pro/stream/'),
            ];
            
            for (const altUrl of alternativeUrls) {
              try {
                console.log(`[TEST-PROVIDER] Trying alternative URL: ${altUrl}`);
                const altResult = await getStream({
                  link: altUrl,
                  type: testType,
                  signal: new AbortController().signal,
                  providerContext: enhancedContext
                });
                
                if (Array.isArray(altResult) && altResult.length > 0) {
                  console.log(`[TEST-PROVIDER] Alternative URL worked:`, altUrl);
                  getStreamResult = altResult;
                  break;
                }
              } catch (altError: any) {
                console.log(`[TEST-PROVIDER] Alternative URL failed:`, altUrl, altError.message);
              }
            }
          }
        } catch (error: any) {
          getStreamError = error.message;
          console.error(`[TEST-PROVIDER] getStream test failed:`, error);
          console.error(`[TEST-PROVIDER] Error stack:`, error.stack);
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

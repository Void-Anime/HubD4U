import axios from 'axios';

type ProviderModules = {
  posts?: string;
  meta?: string;
  stream?: string;
  catalog?: string;
  episodes?: string;
};

// Multiple fallback URLs in case GitHub raw content is blocked
const BASE_URLS = [
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/dist',
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/main/dist',
  'https://github.com/Zenda-Cross/vega-providers/raw/main/dist'
];

const memoryCache = new Map<string, {modules: ProviderModules; ts: number}>();
const CACHE_MS = 10 * 60 * 1000;

// Make cache globally accessible for testing
(globalThis as any).__providerCache = memoryCache;

// Function to clear cache for testing
export function clearProviderCache(provider?: string) {
  if (provider) {
    const key = normalizeProviderValue(provider);
    memoryCache.delete(key);
    console.log(`[PROVIDER-LOADER] Cleared cache for provider: ${key}`);
  } else {
    memoryCache.clear();
    console.log(`[PROVIDER-LOADER] Cleared all provider cache`);
  }
}

function normalizeProviderValue(providerValue: string): string {
  const v = (providerValue || '').toLowerCase().trim();
  const aliases: Record<string, string> = {
    modflix: 'mod',
    moviesmod: 'mod',
    multimovie: 'multi',
    multimovies: 'multi',
    world4ufree: 'world4u',
    hdhub: 'hdhub4u',
  };
  return aliases[v] || v;
}

async function fetchModuleWithFallback(baseUrl: string, key: string, name: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const url = `${baseUrl}/${key}/${name}.js`;
    console.log(`[PROVIDER-LOADER] Trying: ${url}`);
    
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HubD4u/1.0)',
        'Accept': 'text/javascript,application/javascript,*/*'
      }
    });
    
    if (res.status === 200 && res.data && typeof res.data === 'string') {
      console.log(`[PROVIDER-LOADER] Success: ${name} (${res.data.length} chars) from ${baseUrl}`);
      return { success: true, data: res.data };
    } else {
      return { success: false, error: `Invalid response: ${res.status}` };
    }
  } catch (err: any) {
    const errorMsg = err.response?.status ? `HTTP ${err.response.status}` : err.message;
    console.warn(`[PROVIDER-LOADER] Failed ${baseUrl}/${key}/${name}.js: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

export async function fetchProviderModules(
  providerValue: string,
): Promise<ProviderModules> {
  const key = normalizeProviderValue(providerValue);
  console.log(`[PROVIDER-LOADER] Normalized provider: ${providerValue} -> ${key}`);
  
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    console.log(`[PROVIDER-LOADER] Using cached modules for: ${key}`);
    return cached.modules;
  }

  console.log(`[PROVIDER-LOADER] Fetching fresh modules for: ${key}`);
  const all = ['posts', 'meta', 'stream', 'catalog', 'episodes'] as const;

  const modules: ProviderModules = {};
  
  // Try each base URL for each module
  for (const name of all) {
    let moduleData: string | null = null;
    
    for (const baseUrl of BASE_URLS) {
      const result = await fetchModuleWithFallback(baseUrl, key, name);
      if (result.success && result.data) {
        moduleData = result.data;
        break;
      }
    }
    
    if (moduleData) {
      (modules as any)[name] = moduleData;
      console.log(`[PROVIDER-LOADER] Module ${name} loaded successfully`);
    } else {
      console.warn(`[PROVIDER-LOADER] Module ${name} failed to load from all URLs`);
    }
  }
  
  console.log(`[PROVIDER-LOADER] Final modules:`, Object.keys(modules));
  
  memoryCache.set(key, {modules, ts: Date.now()});
  return modules;
}



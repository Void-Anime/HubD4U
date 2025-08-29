import axios from 'axios';

type ProviderModules = {
  posts?: string;
  meta?: string;
  stream?: string;
  catalog?: string;
  episodes?: string;
};

const BASE_URL =
  'https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/dist';

const memoryCache = new Map<string, {modules: ProviderModules; ts: number}>();
const CACHE_MS = 10 * 60 * 1000;

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

export async function fetchProviderModules(
  providerValue: string,
): Promise<ProviderModules> {
  const key = normalizeProviderValue(providerValue);
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    return cached.modules;
  }

  const all = ['posts', 'meta', 'stream', 'catalog', 'episodes'] as const;

  const modules: ProviderModules = {};
  await Promise.all(
    all.map(async name => {
      try {
        const url = `${BASE_URL}/${key}/${name}.js`;
        const res = await axios.get(url, {timeout: 15000});
        (modules as any)[name] = res.data;
      } catch (err) {
        console.warn(`Module missing for ${key}: ${name}`);
      }
    }),
  );

  memoryCache.set(key, {modules, ts: Date.now()});
  return modules;
}



const memoryCache = new Map<string, {url: string; ts: number}>();
const EXPIRE_MS = 60 * 60 * 1000; // 1 hour

export async function getBaseUrl(providerValue: string): Promise<string> {
  const cached = memoryCache.get(providerValue);
  if (cached && Date.now() - cached.ts < EXPIRE_MS) {
    return cached.url;
  }

  const res = await fetch(
    'https://himanshu8443.github.io/providers/modflix.json',
  );
  const json = await res.json();
  const baseUrl = json?.[providerValue]?.url || '';
  memoryCache.set(providerValue, {url: baseUrl, ts: Date.now()});
  return baseUrl;
}



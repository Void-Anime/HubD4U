"use client";
import {useEffect, useState} from 'react';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [provider, setProvider] = useState('modflix');
  const [providers, setProviders] = useState<{value: string; name: string}[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadProviders() {
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        if (!mounted) return;
        const list = (json?.providers || []) as {value: string; name: string}[];
        setProviders(list);
        if (list.length > 0) {
          const hasModflix = list.find(p => p.value === 'modflix');
          setProvider(hasModflix ? 'modflix' : list[0].value);
        }
      } catch {}
    }
    loadProviders();
    return () => {
      mounted = false;
    };
  }, []);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?provider=${provider}&q=${encodeURIComponent(q)}`);
      const json = await res.json();
      setResults(json?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 text-white bg-black">
      <div className="mx-auto max-w-5xl space-y-6">
        <form onSubmit={onSearch} className="flex items-center gap-3">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm"
          >
            {providers.map(p => (
              <option key={p.value} value={p.value}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm"
            placeholder="Search movies or shows"
          />
          <button className="bg-white text-black rounded px-3 py-2 text-sm">Search</button>
        </form>
        {loading && <div className="text-sm text-gray-400">Searching…</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {results?.map((p: any) => (
            <a key={p.link} href={`/info?provider=${provider}&link=${encodeURIComponent(p.link)}`}
               className="block text-xs text-gray-300 hover:text-white">
              <div className="aspect-[2/3] bg-black/30 rounded mb-1 overflow-hidden">
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              {p.title}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}



"use client";
import {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';

type Prov = {value: string; name: string; type?: string; icon?: string};

export default function ProvidersPage() {
  const [list, setList] = useState<Prov[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/providers');
        const json = await res.json();
        if (!mounted) return;
        setList(json?.providers || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load providers');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(p => `${p.name} ${p.value}`.toLowerCase().includes(t));
  }, [list, q]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Select Provider</h1>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search providers"
          className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm w-64"
        />
      </div>
      {loading && <div className="text-sm text-gray-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filtered.map(p => (
          <Link
            key={p.value}
            href={`/?provider=${encodeURIComponent(p.value)}`}
            className="block bg-zinc-900 border border-zinc-800 rounded p-3 hover:border-white/30"
            onClick={() => {
              try { localStorage.setItem('preferredProvider', p.value); } catch {}
            }}
          >
            <div className="text-sm font-medium">{p.name}</div>
            <div className="mt-1 text-xs text-gray-400">{p.value}</div>
            {p.type ? <div className="mt-2 text-[10px] uppercase tracking-wide bg-white/10 inline-block px-2 py-1 rounded">{p.type}</div> : null}
          </Link>
        ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="text-sm text-gray-400 mt-6">No providers matched.</div>
      )}
    </main>
  );
}



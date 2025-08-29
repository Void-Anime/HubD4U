"use client";
import {useEffect, useMemo, useState} from 'react';
import Row from './Row';

export default function HomeClient() {
  const [provider, setProvider] = useState('modflix');
  const [providers, setProviders] = useState<{value: string; name: string}[]>([]);
  const [items, setItems] = useState<any[]>([]);
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home?provider=${provider}`);
        const json = await res.json();
        if (!mounted) return;
        setItems(json?.data || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [provider]);

  const list = useMemo(
    () =>
      items?.map((s: any) => (
        <Row key={s.title} title={s.title} items={s.Posts || []} provider={provider} filter={s.filter} />
      )),
    [items, provider],
  );

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Provider</label>
        <select
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-sm"
          value={provider}
          onChange={e => setProvider(e.target.value)}
        >
          {providers.map(p => (
            <option key={p.value} value={p.value}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <div className="text-sm text-gray-400">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="space-y-4">{list}</div>
    </section>
  );
}



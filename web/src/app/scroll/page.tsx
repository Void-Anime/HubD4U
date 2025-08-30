"use client";
import {useEffect, useMemo, useRef, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';

function ScrollPageContent() {
  const sp = useSearchParams();
  const provider = sp.get('provider') || 'vega';
  const title = sp.get('title') || 'Browse';
  const filter = sp.get('filter') || '';
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Track fetched pages and seen links to avoid duplicates
  const fetchedPagesRef = useRef<Set<number>>(new Set());
  const seenLinksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setItems([]);
    setPage(1);
    fetchedPagesRef.current.clear();
    seenLinksRef.current.clear();
  }, [provider, filter]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!filter) return;
      // avoid refetching the same page
      if (fetchedPagesRef.current.has(page)) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/posts?provider=${encodeURIComponent(provider)}&filter=${encodeURIComponent(filter)}&page=${page}`, { cache: 'no-store' });
        const json = await res.json();
        if (!mounted) return;
        const incoming: any[] = Array.isArray(json?.data) ? json.data : [];
        // Deduplicate by link
        const unique = incoming.filter(p => {
          const key = p?.link || `${p?.title}-${p?.image}`;
          if (!key) return false;
          if (seenLinksRef.current.has(key)) return false;
          seenLinksRef.current.add(key);
          return true;
        });
        setItems(prev => [...prev, ...unique]);
        fetchedPagesRef.current.add(page);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider, filter, page]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && !loading) {
          setPage(p => p + 1);
        }
      });
    }, {rootMargin: '200px'});
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  const grid = useMemo(() => (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
      {items.map((p, idx) => (
        <a key={`${p.link || p.title}-${idx}`} href={`/info?provider=${provider}&link=${encodeURIComponent(p.link)}${p.image ? `&poster=${encodeURIComponent(p.image)}` : ''}`} className="block">
          <div className="aspect-[2/3] bg-zinc-900 rounded overflow-hidden">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt={p.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : null}
          </div>
          <div className="mt-1 text-xs text-gray-300 line-clamp-2">{p.title}</div>
        </a>
      ))}
    </div>
  ), [items, provider]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Main Content in requested container */}
      <main>
        <div className="px-10 py-10 max-w-6x7 mx-auto">
          <h1 className="text-2xl font-semibold mb-4">{title}</h1>
          {grid}
          {error && <div className="text-sm text-red-400 mt-4">{error}</div>}
          <div ref={sentinelRef} className="h-12" />
          {loading && <div className="text-sm text-gray-400 mt-2">Loading…</div>}
        </div>
      </main>
    </main>
  );
}

export default function ScrollPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScrollPageContent />
    </Suspense>
  );
}



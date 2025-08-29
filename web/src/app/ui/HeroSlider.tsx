"use client";
import {useEffect, useMemo, useRef, useState} from 'react';

export default function HeroSlider({provider}: {provider: string}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home?provider=${encodeURIComponent(provider)}`);
        const json = await res.json();
        if (!mounted) return;
        const sections = json?.data || [];
        // try to find a trending-like section
        const trending = sections.find((s: any) => /trend|hot|new/i.test(s.title)) || sections[0] || {Posts: []};
        setItems(trending.Posts || []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [provider]);

  const slides = useMemo(() => (
    (items || []).slice(0, 12).map((p: any) => (
      <a
        key={p.link}
        href={`/info?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(p.link)}${p.image ? `&poster=${encodeURIComponent(p.image)}` : ''}`}
        className="relative flex-[0_0_70vw] sm:flex-[0_0_50vw] lg:flex-[0_0_33vw] h-[38vw] max-h-[360px] rounded-lg overflow-hidden bg-zinc-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.image ? <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <div className="text-sm sm:text-base font-semibold line-clamp-2">{p.title}</div>
          <div className="mt-2 inline-block bg-white text-black text-xs px-3 py-1 rounded">Play</div>
        </div>
      </a>
    ))
  ), [items, provider]);

  if (error) return null;
  if (loading && !items.length) return null;
  if (!items.length) return null;

  return (
    <div className="relative px-6 max-w-6xl mx-auto -mt-10 z-30">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Trending</h2>
        <div className="text-xs text-gray-400">Top picks for you</div>
      </div>
      <div className="relative group">
        <button
          aria-label="Prev"
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black text-white w-8 h-8 items-center justify-center rounded-full"
          onClick={() => railRef.current?.scrollBy({left: -800, behavior: 'smooth'})}
        >
          ‹
        </button>
        <div ref={railRef} className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {slides}
        </div>
        <button
          aria-label="Next"
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black text-white w-8 h-8 items-center justify-center rounded-full"
          onClick={() => railRef.current?.scrollBy({left: 800, behavior: 'smooth'})}
        >
          ›
        </button>
      </div>
    </div>
  );
}




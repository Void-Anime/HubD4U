"use client";
import {useEffect, useState} from 'react';

export default function StreamChooser({provider, infoLink, title}: {provider: string; infoLink: string; title?: string;}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const q = encodeURIComponent(infoLink);
        const p = encodeURIComponent(provider);
        // Try series first, then movie as fallback
        const [resSeries, resMovie] = await Promise.allSettled([
          fetch(`/api/stream?provider=${p}&type=series&link=${q}`),
          fetch(`/api/stream?provider=${p}&type=movie&link=${q}`),
        ]);
        const seriesJson = resSeries.status === 'fulfilled' ? await resSeries.value.json().catch(() => ({})) : {};
        const movieJson = resMovie.status === 'fulfilled' ? await resMovie.value.json().catch(() => ({})) : {};
        const arrA = Array.isArray(seriesJson?.data) ? seriesJson.data : [];
        const arrB = Array.isArray(movieJson?.data) ? movieJson.data : [];
        // Merge unique by link
        const seen = new Set<string>();
        const merged = [...arrA, ...arrB].filter((s: any) => {
          const key = s?.link || '';
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!mounted) return;
        setStreams(merged);
        if (merged.length === 0) {
          const err = seriesJson?.error || movieJson?.error;
          if (err) setError(err);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load streams');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [provider, infoLink]);

  if (loading) return <div className="text-xs text-gray-400 mt-2">Loading streams…</div>;
  if (error) return <div className="text-xs text-red-400 mt-2">{error}</div>;
  if (!streams.length) return <div className="text-xs text-gray-400 mt-2">No streams found.</div>;

  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {streams.map((s, i) => (
        <a
          key={`${s.server || s.type || 's'}-${i}`}
          href={`/player?provider=${encodeURIComponent(provider)}&type=${encodeURIComponent(s.type || 'movie')}&link=${encodeURIComponent(s.link)}`}
          className="text-xs bg-white text-black rounded px-2 py-1"
        >
          {s.server || s.type || `Stream ${i + 1}`}
        </a>
      ))}
    </div>
  );
}



"use client";
import {useEffect, useMemo, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import StreamChooser from './StreamChooser';

function InfoPageContent() {
  const searchParams = useSearchParams();
  const link = searchParams.get('link') || '';
  const providerParam = searchParams.get('provider') || '';
  const posterParam = searchParams.get('poster') || '';
  const provider = useMemo(() => {
    if (providerParam) return providerParam;
    const host = (() => {
      try {
        return new URL(link).host;
      } catch {
        return '';
      }
    })();
    if (/vegamovies/i.test(host)) return 'vega';
    if (/hdhub4u/i.test(host)) return 'hdhub4u';
    if (/multimovies/i.test(host)) return 'multi';
    if (/moviesdrive/i.test(host)) return 'drive';
    if (/world4u/i.test(host)) return 'world4u';
    if (/katmovie/i.test(host)) return 'katmovies';
    if (/uhdmovies/i.test(host)) return 'uhd';
    if (/moviesmod|moviesmod/i.test(host)) return 'mod';
    return 'vega';
  }, [providerParam, link]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [episodesMap, setEpisodesMap] = useState<Record<string, { title: string; link: string; }[]>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!link) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/info?provider=${provider}&link=${encodeURIComponent(link)}`);
        const json = await res.json();
        if (!mounted) return;
        setData(json?.data || null);
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
  }, [provider, link]);

  // Fetch episodes for any section that has episodesLink
  useEffect(() => {
    let cancelled = false;
    async function loadEpisodes() {
      if (!data || !Array.isArray(data.linkList)) return;
      const entries = await Promise.allSettled(
        data.linkList
          .filter((l: any) => l.episodesLink)
          .map(async (l: any) => {
            try {
              const res = await fetch(`/api/episodes?provider=${encodeURIComponent(provider)}&url=${encodeURIComponent(l.episodesLink)}`);
              const json = await res.json();
              return { key: l.title || l.episodesLink, items: Array.isArray(json?.data) ? json.data : [] };
            } catch {
              return { key: l.title || l.episodesLink, items: [] };
            }
          })
      );
      if (cancelled) return;
      const map: Record<string, { title: string; link: string; }[]> = {};
      for (const r of entries) {
        if (r.status === 'fulfilled' && r.value) {
          map[r.value.key] = r.value.items;
        }
      }
      setEpisodesMap(map);
    }
    loadEpisodes();
    return () => { cancelled = true; };
  }, [data, provider]);

  const extractQuality = (title: string) => {
    const qualityMatch = title.match(/(\d{3,4}p|4K|HDR|WEB-DL|BluRay|HDTV|DVD)/gi);
    return qualityMatch ? qualityMatch.join(', ') : '';
  };

  const extractSize = (title: string) => {
    const sizeMatch = title.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/gi);
    return sizeMatch ? sizeMatch.join(', ') : '';
  };

  const extractAudio = (title: string) => {
    const audioMatch = title.match(/(Hindi|English|Dual Audio|Multi Audio|DD5\.1|AAC)/gi);
    return audioMatch ? audioMatch.join(', ') : '';
  };

  const formatDuration = (duration: string) => {
    if (!duration) return '';
    const minutesMatch = duration.match(/(\d+)\s*(?:min|minutes?)/i);
    const hoursMatch = duration.match(/(\d+)\s*(?:hr|hour|h)/i);
    if (hoursMatch && minutesMatch) {
      return `${parseInt(hoursMatch[1])}h ${parseInt(minutesMatch[1])}m`;
    }
    if (hoursMatch) return `${parseInt(hoursMatch[1])}h`;
    if (minutesMatch) return `${parseInt(minutesMatch[1])}m`;
    const plainMins = duration.match(/^(\d{1,3})$/);
    if (plainMins) return `${parseInt(plainMins[1])}m`;
    return duration;
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
    } catch {
      return date;
    }
  };

  return (
    <main className="min-h-screen text-white bg-black">
      {data && (
        <div className="relative h-[50vw] max-h-[70vh] min-h-[300px] bg-gradient-to-b from-zinc-900 via-zinc-900/80 to-black">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{backgroundImage: (data.image || posterParam) ? `url(${data.image || posterParam})` : undefined}} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 sm:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-end">
              <div className="hidden lg:block">
                {data.image || posterParam ? (
                  <img src={data.image || posterParam} alt={data.title} className="w-full rounded-2xl shadow-2xl" />
                ) : null}
              </div>
              <div>
                <h1 className="text-4xl sm:text-6xl font-bold drop-shadow-2xl leading-tight">{data.title}</h1>
                <div className="mt-4 text-lg text-gray-200 flex flex-wrap gap-3">
                  {data.type ? <span className="uppercase tracking-wide text-sm bg-white/20 px-3 py-1 rounded-full">{data.type}</span> : null}
                  {data.rating ? <span className="text-sm bg-yellow-600/80 px-3 py-1 rounded-full">⭐ {data.rating}</span> : null}
                  {data.year ? <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{data.year}</span> : null}
                </div>
                {Array.isArray(data.tags) && data.tags.length ? (
                  <div className="mt-3 text-sm text-gray-300">
                    {data.tags.slice(0,8).join(' • ')}
                  </div>
                ) : null}
                <p className="mt-6 max-w-3xl text-base sm:text-lg text-gray-200/90 leading-relaxed">{data.synopsis}</p>
                {Array.isArray(data.linkList) && data.linkList.length > 0 && data.linkList[0]?.directLinks?.[0]?.link ? (
                  <div className="mt-8 flex gap-4">
                    <a
                      href={`/player?provider=${provider}&type=${data.linkList[0]?.directLinks?.[0]?.type || 'movie'}&link=${encodeURIComponent(data.linkList[0]?.directLinks?.[0]?.link)}`}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-8 py-3 text-lg font-semibold transition-colors"
                    >
                      ▶ Play Now
                    </a>
                    <a href="#downloads" className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-8 py-3 text-lg font-semibold transition-colors">
                      📥 Downloads
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading && <div className="text-center py-12"><div className="text-lg text-gray-400">Loading movie details...</div></div>}
        {error && <div className="text-center py-12"><div className="text-lg text-red-400">{error}</div></div>}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
            <div className="space-y-6">
              <div className="lg:hidden">
                {data.image || posterParam ? (
                  <img src={data.image || posterParam} alt={data.title} className="w-full rounded-2xl shadow-xl" />
                ) : null}
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2">Movie Info</h3>
                <div className="space-y-3 text-sm">
                  {data.year && <div className="flex justify-between"><span className="text-gray-400">Year:</span> <span className="text-white">{data.year}</span></div>}
                  {data.releaseDate && <div className="flex justify-between"><span className="text-gray-400">Release Date:</span> <span className="text-white">{formatDate(data.releaseDate)}</span></div>}
                  {data.type && <div className="flex justify-between"><span className="text-gray-400">Type:</span> <span className="text-white">{data.type}</span></div>}
                  {data.rating && <div className="flex justify-between"><span className="text-gray-400">Rating:</span> <span className="text-white">{data.rating}</span></div>}
                  {data.imdbId && <div className="flex justify-between"><span className="text-gray-400">IMDB:</span> <span className="text-white">{data.imdbId}</span></div>}
                  {data.duration && <div className="flex justify-between"><span className="text-gray-400">Duration:</span> <span className="text-white">{formatDuration(data.duration)}</span></div>}
                  {data.language && <div className="flex justify-between"><span className="text-gray-400">Language:</span> <span className="text-white">{data.language}</span></div>}
                  {data.genre && <div className="flex justify-between"><span className="text-gray-400">Genre:</span> <span className="text-white">{Array.isArray(data.genre) ? data.genre.join(', ') : data.genre}</span></div>}
                  {data.country && <div className="flex justify-between"><span className="text-gray-400">Country:</span> <span className="text-white">{data.country}</span></div>}
                  {data.budget && <div className="flex justify-between"><span className="text-gray-400">Budget:</span> <span className="text-white">{data.budget}</span></div>}
                  {data.revenue && <div className="flex justify-between"><span className="text-gray-400">Revenue:</span> <span className="text-white">{data.revenue}</span></div>}
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2">Cast & Crew</h3>
                <div className="space-y-3 text-sm">
                  {data.cast && <div className="flex justify-between"><span className="text-gray-400">Cast:</span> <span className="text-white text-right max-w-xs">{Array.isArray(data.cast) ? data.cast.slice(0, 5).join(', ') : data.cast}</span></div>}
                  {data.director && <div className="flex justify-between"><span className="text-gray-400">Director:</span> <span className="text-white">{Array.isArray(data.director) ? data.director.join(', ') : data.director}</span></div>}
                  {data.writer && <div className="flex justify-between"><span className="text-gray-400">Writer:</span> <span className="text-white">{Array.isArray(data.writer) ? data.writer.join(', ') : data.writer}</span></div>}
                  {data.producer && <div className="flex justify-between"><span className="text-gray-400">Producer:</span> <span className="text-white">{Array.isArray(data.producer) ? data.producer.join(', ') : data.producer}</span></div>}
                </div>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2">Production</h3>
                <div className="space-y-3 text-sm">
                  {data.production && <div className="flex justify-between"><span className="text-gray-400">Production:</span> <span className="text-white">{Array.isArray(data.production) ? data.production.join(', ') : data.production}</span></div>}
                  {data.awards && <div className="flex justify-between"><span className="text-gray-400">Awards:</span> <span className="text-white">{Array.isArray(data.awards) ? data.awards.join(', ') : data.awards}</span></div>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2">Plot Summary</h3>
                <p className="text-gray-200 leading-relaxed">{data.synopsis || 'No plot summary available.'}</p>
              </div>

              <div id="downloads" className="bg-zinc-900/50 rounded-2xl p-6 space-y-4">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2">Download Links</h3>
                {Array.isArray(data.linkList) && data.linkList.length > 0 ? (
                  <div className="space-y-6">
                    {data.linkList.map((l: any, idx: number) => (
                      <div key={`${l.title || 'section'}-${idx}`} className="border border-zinc-700 rounded-lg p-4">
                        <h4 className="text-lg font-semibold mb-3 text-blue-400">{l.title || 'Download Section'}</h4>
                        
                        {Array.isArray(l.directLinks) && l.directLinks.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-300 mb-2">Direct Links:</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {l.directLinks.map((d: any, i: number) => (
                                <a
                                  key={`${d.title || 'link'}-${i}`}
                                  href={`/player?provider=${provider}&type=${d.type || 'movie'}&link=${encodeURIComponent(d.link)}`}
                                  className="block bg-zinc-800 hover:bg-zinc-700 rounded-lg p-3 transition-colors"
                                >
                                  <div className="text-sm font-medium text-white">{d.title || 'Play'}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {d.quality && <span className="mr-2">{d.quality}</span>}
                                    {d.size && <span className="mr-2">{d.size}</span>}
                                    {d.audio && <span>{d.audio}</span>}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {l.episodesLink && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-300 mb-2">Episodes:</h5>
                            {episodesMap[l.title || l.episodesLink] ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {episodesMap[l.title || l.episodesLink].map((episode, i) => (
                                  <a
                                    key={`${episode.title}-${i}`}
                                    href={`/player?provider=${provider}&type=series&link=${encodeURIComponent(episode.link)}`}
                                    className="block bg-zinc-800 hover:bg-zinc-700 rounded-lg p-2 text-center transition-colors"
                                  >
                                    <div className="text-xs font-medium text-white">{episode.title}</div>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">Loading episodes...</div>
                            )}
                          </div>
                        )}

                        {Array.isArray(l.links) && l.links.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-300 mb-2">Download Links:</h5>
                            <div className="space-y-2">
                              {l.links.map((link: any, i: number) => (
                                <div key={`${link.title || 'link'}-${i}`} className="flex items-center justify-between bg-zinc-800 rounded-lg p-3">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-white">{link.title}</div>
                                    <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-2">
                                      {extractQuality(link.title) && <span className="bg-blue-600/20 px-2 py-1 rounded">{extractQuality(link.title)}</span>}
                                      {extractSize(link.title) && <span className="bg-green-600/20 px-2 py-1 rounded">{extractSize(link.title)}</span>}
                                      {extractAudio(link.title) && <span className="bg-purple-600/20 px-2 py-1 rounded">{extractAudio(link.title)}</span>}
                                    </div>
                                  </div>
                                  <a
                                    href={link.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                                  >
                                    Download
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">No download links available.</div>
                )}
              </div>

              <StreamChooser provider={provider} infoLink={link} title={data?.title} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function InfoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen text-white bg-black flex items-center justify-center"><div className="text-lg text-gray-400">Loading...</div></div>}>
      <InfoPageContent />
    </Suspense>
  );
}



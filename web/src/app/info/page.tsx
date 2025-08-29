"use client";
import {useEffect, useMemo, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import StreamChooser from './StreamChooser';

export default function InfoPage() {
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

              {Array.isArray(data.cast) && data.cast.length > 0 && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Cast</h3>
                  <div className="space-y-2 text-sm">
                    {data.cast.slice(0, 12).map((actor: string, idx: number) => (
                      <div key={idx} className="text-gray-300 hover:text-white transition-colors">
                        {actor}
                      </div>
                    ))}
                    {data.cast.length > 12 && (
                      <div className="text-gray-500 text-xs pt-2">+{data.cast.length - 12} more</div>
                    )}
                  </div>
                </div>
              )}

              {Array.isArray(data.crew) && data.crew.length > 0 && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Crew</h3>
                  <div className="space-y-2 text-sm">
                    {data.crew.slice(0, 8).map((member: string, idx: number) => (
                      <div key={idx} className="text-gray-300 hover:text-white transition-colors">
                        {member}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(data.director || data.writer || data.producer || data.cinematographer || data.editor) && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Production</h3>
                  <div className="space-y-3 text-sm">
                    {data.director && <div><span className="text-gray-400">Director:</span> <span className="text-white">{Array.isArray(data.director) ? data.director.join(', ') : data.director}</span></div>}
                    {data.writer && <div><span className="text-gray-400">Writer:</span> <span className="text-white">{Array.isArray(data.writer) ? data.writer.join(', ') : data.writer}</span></div>}
                    {data.producer && <div><span className="text-gray-400">Producer:</span> <span className="text-white">{Array.isArray(data.producer) ? data.producer.join(', ') : data.producer}</span></div>}
                    {data.cinematographer && <div><span className="text-gray-400">Cinematographer:</span> <span className="text-white">{data.cinematographer}</span></div>}
                    {data.editor && <div><span className="text-gray-400">Editor:</span> <span className="text-white">{data.editor}</span></div>}
                  </div>
                </div>
              )}

              {(data.awards || data.nominations) && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Awards</h3>
                  <div className="space-y-3 text-sm">
                    {data.awards && <div><span className="text-gray-400">Awards:</span> <span className="text-white">{data.awards}</span></div>}
                    {data.nominations && <div><span className="text-gray-400">Nominations:</span> <span className="text-white">{data.nominations}</span></div>}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="bg-zinc-900/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Synopsis</h3>
                <p className="text-gray-200 leading-relaxed text-base">{data.synopsis}</p>
              </div>

              {data.plot && data.plot !== data.synopsis && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Plot Summary</h3>
                  <p className="text-gray-200 leading-relaxed text-base">{data.plot}</p>
                </div>
              )}

              <div id="downloads" className="bg-zinc-900/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-6">Watch / Download Options</h3>
                <div className="space-y-6">
                  {(data.linkList || []).map((l: any, idx: number) => (
                    <div key={`${l.title || 'section'}-${idx}`} className="border border-zinc-700 rounded-xl p-4">
                      <h4 className="text-lg font-medium text-white mb-4">{l.title}</h4>

                      {/* Episodes listing if available */}
                      {l.episodesLink && (episodesMap[l.title] || []).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                          {(episodesMap[l.title] || []).map((ep, ei) => (
                            <a
                              key={`${ep.link}-${ei}`}
                              href={`/player?provider=${provider}&type=series&link=${encodeURIComponent(ep.link)}`}
                              className="text-xs bg-white text-black rounded px-2 py-1 text-center"
                            >
                              {ep.title || `Episode ${ei + 1}`}
                            </a>
                          ))}
                        </div>
                      )}

                      {(l.directLinks && l.directLinks.length > 0) ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {l.directLinks.map((d: any, i: number) => {
                            const quality = extractQuality(d.title);
                            const size = extractSize(d.title);
                            const audio = extractAudio(d.title);
                            return (
                              <div key={`${d.title || 'link'}-${i}`} className="bg-zinc-800 rounded-lg p-4 hover:bg-zinc-700 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-white">{d.title}</span>
                                  <a
                                    href={`/player?provider=${provider}&type=${d.type || 'movie'}&link=${encodeURIComponent(d.link)}`}
                                    className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-full transition-colors"
                                  >
                                    Play
                                  </a>
                                </div>
                                {quality && <div className="text-xs text-gray-400 mb-1">Quality: {quality}</div>}
                                {size && <div className="text-xs text-gray-400 mb-1">Size: {size}</div>}
                                {audio && <div className="text-xs text-gray-400">Audio: {audio}</div>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <StreamChooser provider={provider} infoLink={link} title={l.title} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {data.additionalInfo && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Additional Information</h3>
                  <div className="text-gray-200 text-sm leading-relaxed">
                    {data.additionalInfo}
                  </div>
                </div>
              )}

              {(data.aspectRatio || data.color || data.soundMix || data.camera || data.laboratory || data.filmLength) && (
                <div className="bg-zinc-900/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold border-b border-zinc-700 pb-2 mb-4">Technical Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {data.aspectRatio && <div><span className="text-gray-400">Aspect Ratio:</span> <span className="text-white">{data.aspectRatio}</span></div>}
                    {data.color && <div><span className="text-gray-400">Color:</span> <span className="text-white">{data.color}</span></div>}
                    {data.soundMix && <div><span className="text-gray-400">Sound Mix:</span> <span className="text-white">{data.soundMix}</span></div>}
                    {data.camera && <div><span className="text-gray-400">Camera:</span> <span className="text-white">{data.camera}</span></div>}
                    {data.laboratory && <div><span className="text-gray-400">Laboratory:</span> <span className="text-white">{data.laboratory}</span></div>}
                    {data.filmLength && <div><span className="text-gray-400">Film Length:</span> <span className="text-white">{data.filmLength}</span></div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}



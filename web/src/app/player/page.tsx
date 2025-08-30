"use client";
import {useEffect, useMemo, useRef, useState, Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import Hls from 'hls.js';

function PlayerPageContent() {
  const searchParams = useSearchParams();
  const link = searchParams.get('link') || '';
  const providerParam = searchParams.get('provider') || '';
  const type = searchParams.get('type') || 'movie';
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
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [levels, setLevels] = useState<{index: number; label: string}[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | 'auto'>('auto');

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showClickToPlay, setShowClickToPlay] = useState(false);
  const controlsTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!link) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stream?provider=${provider}&type=${type}&link=${encodeURIComponent(link)}`);
        const json = await res.json();
        if (!mounted) return;
        setStreams(Array.isArray(json?.data) ? json.data : []);
        if ((!json?.data || json?.data?.length === 0) && json?.error) {
          setError(json.error);
        }
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
  }, [provider, link, type]);

  const firstHlsIndex = useMemo(() => streams.findIndex(s => (s.link || '').includes('.m3u8')), [streams]);
  useEffect(() => {
    setCurrentIndex(firstHlsIndex >= 0 ? firstHlsIndex : 0);
  }, [firstHlsIndex]);

  // Restore last position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !link) return;
    const key = `pos:${provider}:${link}`;
    const saved = Number(localStorage.getItem(key) || '0');
    const onLoaded = () => {
      if (saved > 5 && saved < video.duration - 5) {
        video.currentTime = saved;
      }
    };
    const onTime = () => {
      try { localStorage.setItem(key, String(Math.floor(video.currentTime))); } catch {}
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
    };
  }, [provider, link]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (v.paused) v.play().catch(() => {}); else v.pause();
      } else if (e.key === 'ArrowRight') {
        v.currentTime = Math.min((v.currentTime || 0) + 10, v.duration || 1e9);
      } else if (e.key === 'ArrowLeft') {
        v.currentTime = Math.max((v.currentTime || 0) - 10, 0);
      } else if (e.key.toLowerCase() === 'f') {
        if (!document.fullscreenElement) v.requestFullscreen?.(); else document.exitFullscreen?.();
      } else if (e.key.toLowerCase() === 'm') {
        v.muted = !v.muted;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Wire up media state for custom controls
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // allow autoplay
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onLoaded = () => setDuration(v.duration || 0);
    const onTime = () => setCurrentTime(v.currentTime || 0);
    const onVol = () => { setVolume(v.volume); setMuted(v.muted); };
    const onRate = () => setPlaybackRate(v.playbackRate);
    const onError = () => {
      // try next stream if available
      setError('Playback error');
      setTimeout(() => tryNextStream(), 0);
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('volumechange', onVol);
    v.addEventListener('ratechange', onRate);
    v.addEventListener('error', onError);
    setVolume(v.volume); setMuted(v.muted); setPlaybackRate(v.playbackRate);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('volumechange', onVol);
      v.removeEventListener('ratechange', onRate);
      v.removeEventListener('error', onError);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    const container = document.getElementById('player-container');
    if (!container) return;
    const show = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
    };
    container.addEventListener('mousemove', show);
    container.addEventListener('touchstart', show, { passive: true } as any);
    show();
    return () => {
      container.removeEventListener('mousemove', show);
      container.removeEventListener('touchstart', show as any);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const tryNextStream = () => {
    setLevels([]);
    setCurrentLevel('auto');
    setShowClickToPlay(false);
    if (streams.length <= 1) return;
    const next = (currentIndex + 1) % streams.length;
    if (next !== currentIndex) setCurrentIndex(next);
  };

  useEffect(() => {
    const video = videoRef.current;
    const raw = streams[currentIndex]?.link as string | undefined;
    const ref = (streams[currentIndex]?.headers?.Referer || streams[currentIndex]?.headers?.referer) as string | undefined;
    const toProxy = (u: string) => `/api/proxy?url=${encodeURIComponent(u)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
    if (!video || !raw) return;
    const lower = raw.toLowerCase();
    const isHls = lower.includes('.m3u8');
    const isBrowserMp4 = lower.includes('.mp4') || lower.includes('.m4v') || lower.includes('.webm');

    if (hlsRef.current) {
      try { hlsRef.current.destroy(); } catch {}
      hlsRef.current = null;
      setLevels([]);
      setCurrentLevel('auto');
    }

    const attemptAutoplay = () => {
      setShowClickToPlay(false);
      video.play().then(() => {
        // ok
      }).catch(() => {
        // autoplay blocked
        setShowClickToPlay(true);
      });
    };

    if (Hls.isSupported() && isHls) {
      class ProxyLoader extends (Hls as any).DefaultConfig.loader {
        load(context: any, config: any, callbacks: any) {
          try {
            if (context && typeof context.url === 'string') {
              context.url = toProxy(context.url);
            }
          } catch {}
          super.load(context, config, callbacks);
        }
      }

      const hls = new Hls({
        maxBufferLength: 1800,
        maxMaxBufferLength: 108000,
        maxBufferSize: 0,
        backBufferLength: 300,
        enableWorker: true,
        autoStartLoad: true,
        loader: ProxyLoader as any,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 500,
        fragLoadingMaxRetryTimeout: 8000,
        appendErrorMaxRetry: 10,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(raw);
        hls.startLoad(0);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const list = hls.levels.map((l, idx) => ({ index: idx, label: l.height ? `${l.height}p` : (l.bitrate ? `${Math.round(l.bitrate/1000)}kbps` : `L${idx}`) }));
        setLevels(list);
        const avcIndex = hls.levels.findIndex((l: any) =>
          (l.codecSet || '').includes('avc') || (l.attrs?.CODECS || '').toLowerCase().includes('avc1'),
        );
        if (avcIndex >= 0) {
          hls.currentLevel = avcIndex;
        }
        attemptAutoplay();
      });
      hls.on(Hls.Events.ERROR, (evt, data) => {
        if (!data) return;
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            tryNextStream();
          }
        }
      });
      return () => { hls.destroy(); };
    } else if (isBrowserMp4) {
      const playableUrl = toProxy(raw);
      video.src = playableUrl;
      attemptAutoplay();
    } else {
      // Try transcoding first, fallback to direct streaming if it fails
      const transcodeUrl = `/api/transcode?url=${encodeURIComponent(raw)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
      const fallbackUrl = `/api/stream-fallback?url=${encodeURIComponent(raw)}${ref ? `&referer=${encodeURIComponent(ref)}` : ''}`;
      
      // Set up error handling for transcoding
      const handleTranscodeError = () => {
        console.log('[PLAYER] Transcoding failed, trying fallback streaming');
        video.src = fallbackUrl;
        attemptAutoplay();
      };
      
      // Set up error handling for fallback
      const handleFallbackError = () => {
        console.log('[PLAYER] Fallback streaming also failed');
        setError('Stream not available. The video format may not be supported.');
      };
      
      // Try transcoding first
      video.src = transcodeUrl;
      video.onerror = handleTranscodeError;
      video.onloadstart = () => {
        console.log('[PLAYER] Transcoding started');
        video.onerror = null; // Clear error handler once it starts
      };
      
      // Fallback timeout
      setTimeout(() => {
        if (video.readyState === 0) { // HAVE_NOTHING
          console.log('[PLAYER] Transcoding timeout, trying fallback');
          handleTranscodeError();
        }
      }, 5000); // 5 second timeout
      
      attemptAutoplay();
    }
  }, [streams, currentIndex]);

  useEffect(() => {
    if (!hlsRef.current) return;
    if (currentLevel === 'auto') {
      hlsRef.current.currentLevel = -1;
    } else {
      hlsRef.current.currentLevel = currentLevel as number;
    }
  }, [currentLevel]);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const seekTo = (time: number) => { const v = videoRef.current; if (!v) return; v.currentTime = time; };
  const skip = (sec: number) => { const v = videoRef.current; if (!v) return; v.currentTime = Math.min(Math.max(v.currentTime + sec, 0), v.duration || 1e9); };
  const changeVolume = (val: number) => { const v = videoRef.current; if (!v) return; v.volume = val; setVolume(val); if (val > 0) v.muted = false; };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const changeRate = (rate: number) => { const v = videoRef.current; if (!v) return; v.playbackRate = rate; setPlaybackRate(rate); };
  const togglePip = async () => { const v = videoRef.current as any; if (!v) return; if (document.pictureInPictureElement) { await (document as any).exitPictureInPicture?.(); } else { try { await v.requestPictureInPicture?.(); } catch {} } };
  const toggleFullscreen = () => { const v = videoRef.current as any; if (!v) return; if (!document.fullscreenElement) v.requestFullscreen?.(); else document.exitFullscreen?.(); };

  const formatTime = (t: number) => {
    if (!isFinite(t) || t < 0) return '0:00';
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    const m = Math.floor((t / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(t / 3600);
    return h > 0 ? `${h}:${m}:${s}` : `${parseInt(m)}:${s}`;
  };

  // Note: suppressHydrationWarning is used on dynamic elements to prevent hydration mismatch
  // between server-side rendering and client-side state

  return (
    <main className="min-h-screen p-6 text-white bg-black">
      <div className="mx-auto max-w-5xl space-y-4" suppressHydrationWarning>
        {loading && <div className="text-sm text-gray-400" suppressHydrationWarning>Loading…</div>}
        {error && <div className="text-sm text-red-400" suppressHydrationWarning>{error}</div>}

        <div id="player-container" className="relative w-full aspect-video bg-black rounded-lg overflow-hidden" suppressHydrationWarning>
          <video
            ref={videoRef}
            controls={false}
            playsInline
            preload="auto"
            className="absolute inset-0 w-full h-full bg-black"
            onClick={togglePlay}
          />

          {showClickToPlay && (
            <button onClick={() => { setShowClickToPlay(false); videoRef.current?.play().catch(() => {}); }} className="absolute inset-0 m-auto h-14 w-36 bg-white text-black rounded text-lg font-semibold" suppressHydrationWarning>
              Click to Play
            </button>
          )}

          <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`} suppressHydrationWarning>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => seekTo(Number((e.target as HTMLInputElement).value))}
              className="w-full h-1 appearance-none accent-red-600 cursor-pointer"
              suppressHydrationWarning
            />

            <div className="flex items-center justify-between px-3 py-2" suppressHydrationWarning>
              <div className="flex items-center gap-2" suppressHydrationWarning>
                <button onClick={togglePlay} className="bg-white text-black rounded px-3 py-1 text-sm font-medium" suppressHydrationWarning>{isPlaying ? 'Pause' : 'Play'}</button>
                <button onClick={() => skip(-10)} className="bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm">-10s</button>
                <button onClick={() => skip(10)} className="bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm">+10s</button>
                <div className="text-xs text-gray-300 ml-2" suppressHydrationWarning>{formatTime(currentTime)} / {formatTime(duration)}</div>
              </div>
              <div className="flex items-center gap-3" suppressHydrationWarning>
                <button onClick={toggleMute} className="bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm" suppressHydrationWarning>{muted || volume === 0 ? 'Unmute' : 'Mute'}</button>
                <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number((e.target as HTMLInputElement).value))} className="w-24" suppressHydrationWarning />
                <select value={playbackRate} onChange={(e) => changeRate(Number(e.target.value))} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs" suppressHydrationWarning>
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(r => <option key={r} value={r}>{r}x</option>)}
                </select>
                <button onClick={togglePip} className="bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm">PiP</button>
                <button onClick={toggleFullscreen} className="bg-white/10 hover:bg-white/20 rounded px-2 py-1 text-sm">Full</button>
              </div>
            </div>
          </div>
        </div>

        {streams.length === 0 && (
          <div className="text-sm text-gray-400" suppressHydrationWarning>No stream found. Try a different section/server on the Info page.</div>
        )}
        {streams.length > 0 && (
          <div className="flex flex-wrap gap-2" suppressHydrationWarning>
            {streams.map((s, i) => (
              <button
                key={`${s.server}-${i}`}
                onClick={() => setCurrentIndex(i)}
                className={`text-xs rounded px-2 py-1 ${i === currentIndex ? 'bg-white text-black' : 'bg-zinc-800 text-gray-200'}`}
                title={s.type}
              >
                {s.server || s.type || `Stream ${i + 1}`}
              </button>
            ))}
          </div>
        )}
        {levels.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center text-xs" suppressHydrationWarning>
            <span className="text-gray-400">Quality:</span>
            <button
              onClick={() => setCurrentLevel('auto')}
              className={`rounded px-2 py-1 ${currentLevel === 'auto' ? 'bg-white text-black' : 'bg-zinc-800 text-gray-200'}`}
            >Auto</button>
            {levels.map(l => (
              <button
                key={l.index}
                onClick={() => setCurrentLevel(l.index)}
                className={`rounded px-2 py-1 ${currentLevel === l.index ? 'bg-white text-black' : 'bg-zinc-800 text-gray-200'}`}
              >{l.label}</button>
            ))}
          </div>
        )}
        {streams.length > 0 && (
          <div className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
            Selected: {streams[currentIndex]?.server || streams[currentIndex]?.type} — <a className="underline" href={streams[currentIndex]?.link} target="_blank" rel="noreferrer">open source</a>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div>Loading player...</div>}>
      <PlayerPageContent />
    </Suspense>
  );
}



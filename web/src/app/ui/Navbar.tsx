"use client";
import Link from 'next/link';
import {useEffect, useState} from 'react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-40 transition-colors ${scrolled ? 'bg-black/80' : 'bg-gradient-to-b from-black/80 to-transparent'} backdrop-blur border-b border-white/5`} suppressHydrationWarning>
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3" suppressHydrationWarning>
        <div className="flex items-center gap-6" suppressHydrationWarning>
          <Link href="/" className="text-xl font-semibold tracking-wide">HubD4u</Link>
          <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-300">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/search" className="hover:text-white">Search</Link>
          </nav>
        </div>
        <div className="text-sm text-gray-300 flex items-center gap-3" suppressHydrationWarning>
          <Link href="/providers" className="bg-[var(--accent)] text-white px-3 py-1.5 rounded text-xs font-semibold hover:opacity-90">Providers</Link>
          <Link href="/search" className="hover:text-white">Browse</Link>
        </div>
      </div>
    </header>
  );
}



"use client";
import Link from 'next/link';

export default function Card({
  title,
  image,
  href,
}: {
  title: string;
  image?: string;
  href: string;
}) {
  return (
    <Link href={href} className="group relative block w-[150px] sm:w-[180px] lg:w-[200px] flex-shrink-0">
      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
          <div className="flex items-center gap-2">
            <span className="bg-white text-black text-[10px] px-2 py-1 rounded">Play</span>
            <span className="bg-zinc-800/90 text-white text-[10px] px-2 py-1 rounded">More</span>
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-300 line-clamp-2 group-hover:text-white">{title}</div>
    </Link>
  );
}



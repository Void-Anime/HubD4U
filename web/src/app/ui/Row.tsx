"use client";
import Card from './Card';

export default function Row({title, items, provider, filter}: {title: string; items: any[]; provider: string; filter?: string;}) {
  const viewFilter = filter || title.toLowerCase();
  return (
    <section className="mb-8">
      <div className="px-1 mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <a
          href={`/scroll?provider=${encodeURIComponent(provider)}&title=${encodeURIComponent(title)}&filter=${encodeURIComponent(viewFilter)}`}
          className="text-xs text-gray-300 hover:text-white"
        >
          View all
        </a>
      </div>
      <div className="relative group/row">
        <button
          aria-label="Scroll left"
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity bg-black/60 hover:bg-black text-white w-8 h-8 items-center justify-center rounded-full"
          onClick={(e) => {
            const container = (e.currentTarget.nextSibling as HTMLDivElement);
            container?.scrollBy({left: -600, behavior: 'smooth'});
          }}
        >
          ‹
        </button>
        <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent px-1">
          {items.map((p: any) => (
            <Card
              key={p.link}
              title={p.title}
              image={p.image}
              href={`/info?provider=${encodeURIComponent(provider)}&link=${encodeURIComponent(p.link)}${p.image ? `&poster=${encodeURIComponent(p.image)}` : ''}`}
            />
          ))}
        </div>
        <button
          aria-label="Scroll right"
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/row:opacity-100 transition-opacity bg-black/60 hover:bg-black text-white w-8 h-8 items-center justify-center rounded-full"
          onClick={(e) => {
            const container = (e.currentTarget.previousSibling as HTMLDivElement);
            container?.scrollBy({left: 600, behavior: 'smooth'});
          }}
        >
          ›
        </button>
      </div>
    </section>
  );
}



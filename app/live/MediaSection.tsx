"use client";

import { useEffect, useMemo, useState } from "react";

 type MediaItem = {
  id?: string;
  title?: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  category?: string;
  active?: boolean;
  status?: string;
  order?: number;
};

const clean = (items: MediaItem[] = []) =>
  items
    .filter((x) => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft")
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

function isYouTube(value: string) {
  return /(?:youtube\.com|youtu\.be)/i.test(value);
}

function youtubeId(value: string) {
  const match = value.match(/(?:v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i);
  return match?.[1] || (value.length >= 6 && !value.includes("/") ? value : "");
}

export default function MediaSection() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/media", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (alive) setItems(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const media = useMemo(() => clean(items), [items]);

  return (
    <section id="media" className="relative border-y border-white/10 py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-5 md:px-10">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <span className="text-[9px] tracking-[.3em] text-[#d4b56a]">05 / MEDIA</span>
            <h2 className="mt-5 text-5xl tracking-[-.06em] md:text-8xl">FBMR<br /><span className="text-white/35">in the field.</span></h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/35">Official photos and videos published by the development team.</p>
          </div>
          <span className="hidden font-mono text-[8px] tracking-[.2em] text-white/25 md:block">{String(media.length).padStart(2, "0")} ITEMS</span>
        </div>

        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => <div key={n} className="aspect-[4/3] animate-pulse border border-white/10 bg-white/[.03]" />)}
          </div>
        ) : media.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {media.map((item, index) => {
              const video = String(item.videoUrl || "").trim();
              const image = String(item.imageUrl || "").trim();
              const yt = video && isYouTube(video) ? youtubeId(video) : "";
              return (
                <article key={item.id || index} className="group overflow-hidden border border-white/10 bg-[#0b0e0c]">
                  <div className="aspect-[4/3] overflow-hidden bg-black">
                    {video && yt ? (
                      <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${yt}`} title={item.title || "FBMR video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                    ) : video ? (
                      <video className="h-full w-full object-cover" src={video} controls preload="metadata" />
                    ) : image ? (
                      <img className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" src={image} alt={item.title || "FBMR media"} loading="lazy" />
                    ) : (
                      <div className="grid h-full place-items-center font-mono text-[9px] tracking-[.2em] text-white/20">MEDIA UNAVAILABLE</div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold">{item.title || "FBMR Media"}</h3>
                      {item.category && <span className="shrink-0 font-mono text-[8px] uppercase tracking-[.15em] text-[#d4b56a]">{item.category}</span>}
                    </div>
                    {item.caption && <p className="mt-2 text-xs leading-5 text-white/35">{item.caption}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 px-6 py-14 text-center">
            <div className="font-mono text-[9px] tracking-[.2em] text-[#d4b56a]">NO MEDIA PUBLISHED</div>
            <p className="mt-2 text-sm text-white/25">Developer-published photos and videos will appear here automatically.</p>
          </div>
        )}
      </div>
    </section>
  );
}

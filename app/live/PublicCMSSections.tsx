"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, BadgeCheck, Newspaper } from "lucide-react";

type Item = Record<string, any>;
const clean = (items: Item[] = []) => items.filter(x => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft").sort((a,b) => Number(a?.order || 0) - Number(b?.order || 0));

function Group({ id, label, eyebrow, Icon, items }: { id:string; label:string; eyebrow:string; Icon:any; items:Item[] }) {
  if (!items.length) return null;
  return <section id={id} className="relative border-t border-white/10 py-24 md:py-32">
    <div className="mx-auto max-w-[1500px] px-5 md:px-10">
      <div className="mb-12 flex items-end justify-between gap-8">
        <div><span className="font-mono text-[9px] tracking-[.3em] text-[#d4b56a]">{eyebrow}</span><h2 className="mt-4 text-5xl tracking-[-.06em] md:text-7xl">{label}</h2></div>
        <Icon className="hidden text-[#d4b56a] md:block" size={28}/>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x,i)=><article key={x.id||i} className="border border-white/10 bg-[#0b0e0c] p-6">
          <div className="font-mono text-[8px] text-[#d4b56a]">{String(i+1).padStart(2,"0")}</div>
          <h3 className="mt-2 text-xl font-semibold">{x.title||x.name||"Untitled"}</h3>
          {x.code && <p className="mt-1 font-mono text-[8px] uppercase tracking-[.16em] text-white/30">{x.code}</p>}
          {x.role && <p className="mt-1 font-mono text-[8px] uppercase tracking-[.16em] text-white/30">{x.role}</p>}
          {x.department && <p className="mt-1 text-xs text-white/35">{x.department}</p>}
          {x.excerpt && <p className="mt-3 text-sm leading-6 text-white/40">{x.excerpt}</p>}
          {x.description && <p className="mt-3 text-sm leading-6 text-white/40">{x.description}</p>}
          {x.body && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-white/45">{x.body}</p>}
          {x.date && <p className="mt-4 font-mono text-[8px] uppercase tracking-[.15em] text-[#d4b56a]/65">{x.date}</p>}
          {x.imageUrl && <img src={x.imageUrl} alt="" className="mt-5 max-h-64 w-full object-cover border border-white/10" onError={(e)=>{e.currentTarget.style.display="none"}}/>}
        </article>)}
      </div>
    </div>
  </section>;
}

export default function PublicCMSSections(){
  const [content,setContent]=useState<any>({});
  useEffect(()=>{let alive=true; const load=async()=>{try{const r=await fetch('/api/content',{cache:'no-store'}); if(r.ok&&alive)setContent(await r.json())}catch{} }; void load(); const t=setInterval(load,15000); return()=>{alive=false;clearInterval(t)}} ,[]);
  const government=useMemo(()=>clean(content.government||[]),[content.government]);
  const ranks=useMemo(()=>clean(content.ranks||[]),[content.ranks]);
  const news=useMemo(()=>clean(content.news||[]),[content.news]);
  return <>
    <Group id="government" label="Government" eyebrow="06 / GOVERNMENT" Icon={Landmark} items={government}/>
    <Group id="ranks" label="Military Ranks" eyebrow="07 / MILITARY RANKS" Icon={BadgeCheck} items={ranks}/>
    <Group id="news" label="News" eyebrow="08 / NEWS" Icon={Newspaper} items={news}/>
  </>;
}

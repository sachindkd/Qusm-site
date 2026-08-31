'use client'

import { useEffect, useMemo, useState } from 'react'

type Block = { id:string; type:string; title:string; body:string; image:string; cta:string }
const templates = [
  ['Hero','Large editorial introduction with optional image and CTA.'],
  ['Announcement','Time-stamped notice with priority and call to action.'],
  ['Event','Date, location, host, description and registration CTA.'],
  ['Department','Mission, leadership, authority and responsibilities.'],
  ['Gallery','Image-led feature with captions and optional links.'],
  ['Resource','Rules, guides, documents or external resources.'],
]

export function StudioClient() {
  const [blocks,setBlocks]=useState<Block[]>([])
  const [selected,setSelected]=useState<string>('')
  const [published,setPublished]=useState(false)
  const [savedAt,setSavedAt]=useState('')
  useEffect(()=>{ try { const x=localStorage.getItem('fbmr-studio-draft'); if(x)setBlocks(JSON.parse(x)) } catch {} },[])
  const active=blocks.find(b=>b.id===selected)
  const update=(patch:Partial<Block>)=>active&&setBlocks(bs=>bs.map(b=>b.id===active.id?{...b,...patch}:b))
  const add=(type:string)=>{ const b:Block={id:crypto.randomUUID(),type,title:type==='Hero'?'New section':'New '+type,body:'Add the information your members need here.',image:'',cta:'Learn more'}; setBlocks(bs=>[...bs,b]);setSelected(b.id);setPublished(false) }
  const save=()=>{localStorage.setItem('fbmr-studio-draft',JSON.stringify(blocks));setSavedAt(new Date().toLocaleTimeString());setPublished(false)}
  const publish=()=>{localStorage.setItem('fbmr-studio-published',JSON.stringify(blocks));localStorage.setItem('fbmr-studio-draft',JSON.stringify(blocks));setPublished(true);setSavedAt(new Date().toLocaleTimeString())}
  const remove=()=>{if(!active)return;setBlocks(bs=>bs.filter(b=>b.id!==active.id));setSelected('');setPublished(false)}
  const preview=useMemo(()=>blocks.slice(0,6),[blocks])

  return <main className="min-h-screen bg-[#080908] text-[#f1efe8]">
    <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-[10px] uppercase tracking-[.4em] text-[#d7b86a]">FBMR / STUDIO</p><h1 className="mt-2 text-3xl tracking-tight md:text-5xl">Content Command</h1></div><div className="flex items-center gap-2 text-[10px] uppercase tracking-[.2em] text-white/40"><span className={`h-2 w-2 rounded-full ${published?'bg-[#d7b86a]':'bg-white/25'}`}/>{published?'Published':'Draft'}</div></header>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr_320px]">
        <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-3"><p className="px-3 pb-3 text-[9px] uppercase tracking-[.3em] text-white/35">Add section</p>{templates.map(([t,d])=><button key={t} onClick={()=>add(t)} className="mb-1 w-full rounded-xl p-3 text-left transition hover:bg-white/[.06]"><b className="block text-sm">{t}</b><span className="mt-1 block text-[10px] leading-4 text-white/35">{d}</span></button>)}</aside>
        <section className="min-h-[600px] rounded-2xl border border-white/10 bg-[#0b0d0c] p-4 md:p-7"><div className="mb-5 flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.3em] text-white/30">Live canvas</span><span className="text-[9px] text-white/25">Motion + responsive layout applied automatically</span></div>{preview.length===0?<div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center"><div><div className="text-4xl text-white/10">＋</div><p className="mt-3 text-sm text-white/45">Start building an FBMR section</p><p className="mt-1 text-xs text-white/25">Choose a block from the left.</p></div></div>:<div className="space-y-3">{preview.map((b,i)=><button key={b.id} onClick={()=>setSelected(b.id)} className={`group w-full rounded-xl border p-5 text-left transition-all ${selected===b.id?'border-[#d7b86a]/70 bg-[#d7b86a]/[.07]':'border-white/10 bg-white/[.025] hover:border-white/25'}`}><div className="flex items-center justify-between"><span className="text-[9px] uppercase tracking-[.3em] text-[#d7b86a]">{b.type} · 0{i+1}</span><span className="text-white/20">↕</span></div><h2 className="mt-5 text-xl">{b.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-white/35">{b.body}</p></button>)}</div>}</section>
        <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-4"><p className="mb-5 text-[9px] uppercase tracking-[.3em] text-white/35">Section settings</p>{!active?<p className="text-sm leading-6 text-white/30">Select a section to edit its content, media and behaviour.</p>:<div className="space-y-4"><Field label="Title" value={active.title} onChange={v=>update({title:v})}/><Field label="Content" value={active.body} onChange={v=>update({body:v})} area/><Field label="Image URL" value={active.image} onChange={v=>update({image:v})}/><Field label="Button label" value={active.cta} onChange={v=>update({cta:v})}/><button onClick={remove} className="w-full rounded-lg border border-red-400/20 px-3 py-2 text-[10px] uppercase tracking-[.2em] text-red-300/70">Delete section</button></div>}<div className="mt-7 border-t border-white/10 pt-5"><button onClick={save} className="mb-2 w-full rounded-lg border border-white/15 px-3 py-3 text-[10px] uppercase tracking-[.2em]">Save draft</button><button onClick={publish} className="w-full rounded-lg bg-[#d7b86a] px-3 py-3 text-[10px] font-medium uppercase tracking-[.2em] text-black">Publish</button>{savedAt&&<p className="mt-3 text-center text-[9px] text-white/25">Saved {savedAt}</p>}</div></aside>
      </div>
      <p className="mt-5 text-[9px] uppercase tracking-[.22em] text-white/20">FBMR Studio • draft/publish controls • content blocks inherit the site design system</p>
    </div>
  </main>
}

function Field({label,value,onChange,area=false}:{label:string,value:string,onChange:(v:string)=>void,area?:boolean}){return <label className="block"><span className="mb-2 block text-[9px] uppercase tracking-[.25em] text-white/30">{label}</span>{area?<textarea value={value} onChange={e=>onChange(e.target.value)} rows={5} className="w-full resize-y rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 outline-none focus:border-[#d7b86a]/50"/>:<input value={value} onChange={e=>onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/20 p-3 text-xs outline-none focus:border-[#d7b86a]/50"/>}</label>}

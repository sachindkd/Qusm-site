'use client'

import { useMemo, useState } from 'react'

const products = [
  { tag: 'APPAREL', name: 'FBMR Command Tee', price: '$24.99', detail: 'Official community issue • limited run' },
  { tag: 'COLLECTIVE', name: 'Fort Bliss Field Patch', price: '$12.00', detail: 'Embroidered morale patch' },
  { tag: 'DIGITAL', name: 'FBMR Operations Pack', price: 'FREE', detail: 'Wallpapers, insignia and community assets' },
  { tag: 'ARCHIVE', name: 'Founders Edition', price: '$39.00', detail: 'Collector presentation • numbered release' },
]

export function StoreClient() {
  const [filter, setFilter] = useState('ALL')
  const visible = useMemo(() => filter === 'ALL' ? products : products.filter(p => p.tag === filter), [filter])

  return <main className="min-h-screen bg-[#080908] text-[#f1efe8] selection:bg-[#d7b86a] selection:text-black">
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-14 flex items-end justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[.42em] text-[#d7b86a]">FBMR / STORE</p>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-[-.045em] md:text-7xl">Issued for the community.</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/55">Official FBMR merchandise, digital assets and limited community releases. Built with the same field-manual discipline as the rest of the site.</p>
        </div>
        <div className="hidden border border-[#d7b86a]/30 px-4 py-3 text-right md:block"><span className="block text-[9px] uppercase tracking-[.3em] text-white/40">STATUS</span><span className="text-xs uppercase tracking-[.18em] text-[#d7b86a]">OPEN / 24.7</span></div>
      </header>

      <nav className="mb-9 flex flex-wrap gap-2">{['ALL','APPAREL','COLLECTIVE','DIGITAL','ARCHIVE'].map(x => <button key={x} onClick={() => setFilter(x)} className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[.25em] transition-all duration-300 ${filter===x ? 'border-[#d7b86a] bg-[#d7b86a] text-black' : 'border-white/10 text-white/55 hover:border-white/30 hover:text-white'}`}>{x}</button>)}</nav>

      <section className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-2">
        {visible.map((p, i) => <article key={p.name} className="group relative min-h-[390px] bg-[#0c0e0d] p-7 transition-colors duration-500 hover:bg-[#111411] md:p-10">
          <div className="flex items-center justify-between"><span className="text-[10px] tracking-[.3em] text-[#d7b86a]">{p.tag}</span><span className="text-xs text-white/30">0{i+1}</span></div>
          <div className="mt-24 md:mt-28">
            <div className="mb-8 h-28 w-28 border border-white/10 bg-gradient-to-br from-white/10 to-transparent transition-transform duration-700 group-hover:scale-105" />
            <h2 className="text-2xl font-medium tracking-tight md:text-3xl">{p.name}</h2>
            <p className="mt-2 text-sm text-white/45">{p.detail}</p>
          </div>
          <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/10 pt-5 md:bottom-10 md:left-10 md:right-10"><span className="text-sm text-white/70">{p.price}</span><button className="text-[10px] uppercase tracking-[.25em] text-[#d7b86a] transition-transform duration-300 group-hover:translate-x-1">View issue →</button></div>
        </article>)}
      </section>

      <section className="mt-20 grid gap-8 border-y border-white/10 py-12 md:grid-cols-[1.2fr_.8fr] md:py-16">
        <div><p className="text-[10px] uppercase tracking-[.35em] text-[#d7b86a]">THE QUARTERMASTER</p><h2 className="mt-4 text-3xl tracking-tight md:text-5xl">A store that feels like FBMR.</h2></div>
        <p className="text-sm leading-7 text-white/50">Releases can be organised by collection, status and availability. Future items can plug into the same content system without redesigning the page.</p>
      </section>
    </div>
  </main>
}

import { loadContent } from "@/lib/content-store";
import { ShoppingBag, ExternalLink, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const content: any = await loadContent();
  const org = content.org || {};
  const items = Array.isArray(content.shop) ? content.shop.filter((x:any)=>x.active !== false && x.status !== "inactive").sort((a:any,b:any)=>Number(a.order||0)-Number(b.order||0)) : [];
  return <main className="min-h-screen bg-bg text-white">
    <header className="border-b border-border bg-bg/90 backdrop-blur px-5 sm:px-10 py-5 flex items-center justify-between sticky top-0 z-20">
      <a href="/live" className="font-mono text-xs tracking-[3px] text-golddim uppercase">{org.name || "FBMRP"} / SHOP</a>
      <a href="/live" className="font-mono text-[10px] uppercase text-textdim hover:text-white">Back to site</a>
    </header>
    <section className="max-w-6xl mx-auto px-5 sm:px-10 py-16">
      <div className="max-w-2xl"><div className="font-mono text-[10px] tracking-[3px] text-golddim uppercase">OFFICIAL MARKETPLACE</div><h1 className="font-serif text-5xl sm:text-6xl font-bold mt-3">Factions <span className="text-golddim">& Families.</span></h1><p className="text-textdim mt-5 leading-7">Official faction and family packages available for the community. Gamepass purchases are handled through the linked Roblox gamepass.</p></div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-12">{items.map((item:any)=><article key={item.id} className="rounded-2xl border border-border bg-panel overflow-hidden hover:border-gold/50 transition-colors">{item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full aspect-[16/9] object-cover"/> : <div className="aspect-[16/9] bg-panel2 flex items-center justify-center text-golddim"><Shield size={40}/></div>}<div className="p-6"><div className="flex items-center justify-between gap-3"><span className="font-mono text-[9px] uppercase tracking-[2px] text-golddim">{item.type || "faction"}</span><span className="font-mono text-xs">{item.price || "Contact staff"}</span></div><h2 className="font-serif text-2xl font-bold mt-3">{item.name || "Untitled"}</h2><p className="text-sm text-textdim leading-6 mt-3">{item.description || "Official community package."}</p>{item.status === "sold-out" ? <div className="mt-6 rounded-xl border border-border px-4 py-3 text-center font-mono text-[10px] uppercase text-textfaint">Sold out</div> : item.gamepassUrl ? <a href={item.gamepassUrl} target="_blank" rel="noreferrer" className="mt-6 rounded-xl bg-gold text-black px-4 py-3 font-mono text-[10px] uppercase flex items-center justify-center gap-2">Purchase gamepass <ExternalLink size={12}/></a> : <div className="mt-6 rounded-xl border border-border px-4 py-3 text-center font-mono text-[10px] uppercase text-textfaint">Gamepass link coming soon</div>}</div></article>)}{items.length===0&&<div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-border p-16 text-center text-textfaint">No shop listings are currently published.</div>}</div>
    </section>
  </main>;
}

"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X, Shield, Radio } from "lucide-react";
import { motion } from "framer-motion";

type Any = Record<string, any>;
const fade = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: .65, ease: [.16,1,.3,1] } } };
const roleGroups = [
  ["owner", "OWNER"], ["coOwner", "CO-OWNER"], ["chairman", "CHAIRMAN"], ["viceChairman", "VCM"]
] as const;

function Avatar({ src, name }: { src?: string; name: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-[#182019] to-[#080a08]"><span className="text-6xl font-semibold text-white/15">{name?.[0]?.toUpperCase() || "F"}</span></div>;
  return <img src={src} alt="" onError={() => setBad(true)} className="absolute inset-0 h-full w-full object-cover opacity-75 grayscale group-hover:grayscale-0 group-hover:scale-105 transition duration-700" />;
}

function LoadingCard() { return <div className="h-[330px] animate-pulse rounded-xl border border-white/10 bg-white/[.035]" />; }

export default function FBMRExperience() {
  const [c, setC] = useState<Any>({});
  const [p, setP] = useState<Any>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [a,b] = await Promise.all([
          fetch('/api/content', { cache: 'no-store' }),
          fetch('/api/discord/leadership', { cache: 'no-store' })
        ]);
        if (!alive) return;
        if (a.ok) setC(await a.json());
        if (b.ok) setP(await b.json());
      } finally { if (alive) setLoading(false); }
    };
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const org = c.org || {};
  const news = (c.announcements || []).filter((x:Any) => x?.active !== false).slice(0,3);
  const div = (c.divisions || []).filter((x:Any) => x?.active !== false);
  const events = (c.calendar || []).filter((x:Any) => x?.active !== false).slice(0,3);
  const leaders = roleGroups.flatMap(([key, rank]) => (Array.isArray(p[key]) ? p[key] : []).map((x:Any) => ({ ...x, rank })));

  return <main className="min-h-screen overflow-x-hidden bg-[#050706] text-[#f3f0e7] selection:bg-[#d4b56a] selection:text-black">
    <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_75%_12%,rgba(212,181,106,.12),transparent_30%),radial-gradient(circle_at_15%_55%,rgba(70,110,90,.10),transparent_28%)]" />
    <nav className="fixed z-50 top-0 w-full border-b border-white/10 bg-[#050706]/80 backdrop-blur-2xl">
      <div className="mx-auto max-w-[1500px] h-20 px-5 md:px-10 flex items-center justify-between">
        <a href="#home" className="font-black tracking-[-.05em] text-xl">FBMR<span className="text-[#d4b56a]">.</span></a>
        <div className="hidden md:flex gap-8 text-[10px] tracking-[.2em] text-white/45">{['INTEL','COMMAND','DIVISIONS','OPERATIONS'].map(x => <a key={x} href={'#'+x.toLowerCase()} className="hover:text-white transition">{x}</a>)}</div>
        <a href="/staff" className="hidden md:flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[10px] tracking-widest hover:border-[#d4b56a] transition">STAFF <ArrowUpRight size={13}/></a>
        <button className="md:hidden" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
      {open && <div className="md:hidden border-t border-white/10 bg-[#070907] px-5 py-6 grid gap-5 text-xs tracking-widest">{['intel','command','divisions','operations'].map(x => <a key={x} href={'#'+x} onClick={() => setOpen(false)}>{x.toUpperCase()}</a>)}<a href="/staff">STAFF PORTAL</a></div>}
    </nav>

    <section id="home" className="relative min-h-[100svh] flex items-end">
      <div className="mx-auto w-full max-w-[1500px] px-5 md:px-10 pb-16 md:pb-24 pt-32">
        <motion.div initial="hidden" animate="show" variants={fade} className="max-w-5xl">
          <div className="flex items-center gap-3 mb-7 text-[9px] tracking-[.35em] text-[#d4b56a]"><span className="h-px w-10 bg-[#d4b56a]"/> FEDERAL BUREAU OF MILITARY ROLEPLAY</div>
          <h1 className="text-[clamp(4rem,14vw,12.5rem)] leading-[.78] tracking-[-.09em] font-semibold">FORGED<br/><span className="text-[#d4b56a]">TO LEAD.</span></h1>
          <p className="mt-10 max-w-xl text-base md:text-lg leading-7 text-white/45">{org.heroDescription || 'A disciplined military roleplay organization built around command, service, investigation and immersive operations.'}</p>
        </motion.div>
        <div className="mt-16 flex items-end justify-between border-t border-white/10 pt-5 text-[9px] tracking-[.2em] text-white/30"><span>FBMR // OFFICIAL NETWORK</span><span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/> SYSTEM OPERATIONAL</span></div>
      </div>
    </section>

    <section id="intel" className="relative border-t border-white/10 py-28 md:py-40"><div className="mx-auto max-w-[1500px] px-5 md:px-10">
      <div className="flex justify-between items-end mb-16"><div><span className="text-[9px] tracking-[.3em] text-[#d4b56a]">01 / INTELLIGENCE</span><h2 className="mt-5 text-5xl md:text-7xl tracking-[-.06em]">What matters<br/><span className="text-white/35">right now.</span></h2></div><Radio className="hidden md:block text-[#d4b56a]"/></div>
      {loading ? <div className="grid lg:grid-cols-3 gap-px bg-white/10"><LoadingCard/><LoadingCard/><LoadingCard/></div> : news.length ? <div className="grid lg:grid-cols-3 gap-px bg-white/10">{news.map((x:Any,i:number)=><motion.article initial="hidden" whileInView="show" viewport={{once:true}} variants={fade} key={x.id||i} className="group min-h-[300px] bg-[#080b09] p-7 md:p-9 hover:bg-[#0e130f] transition-colors"><span className="text-[10px] text-[#d4b56a]">0{i+1}</span><h3 className="mt-20 text-2xl md:text-3xl tracking-tight">{x.title || 'Official announcement'}</h3><p className="mt-4 text-sm leading-6 text-white/40">{x.body || x.description || 'No additional details have been published.'}</p><div className="mt-8 h-px w-0 bg-[#d4b56a] group-hover:w-full transition-all duration-700"/></motion.article>)}</div> : <div className="rounded-2xl border border-white/10 bg-white/[.025] px-8 py-16 text-center"><p className="text-sm text-white/40">No announcements at this time.</p></div>}
    </div></section>

    <section id="command" className="relative py-28 md:py-40 bg-[#d4b56a] text-[#080906]"><div className="mx-auto max-w-[1500px] px-5 md:px-10">
      <div className="flex justify-between"><div><span className="text-[9px] tracking-[.3em]">02 / COMMAND</span><h2 className="mt-5 text-5xl md:text-8xl tracking-[-.07em]">The people<br/>behind FBMR.</h2></div><Shield className="hidden md:block" size={70}/></div>
      <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{loading ? [1,2,3,4].map(i => <LoadingCard key={i}/>) : leaders.length ? leaders.map((x:Any,i:number)=><motion.article initial={{opacity:0,y:25}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.06}} key={x.id||i} className="group relative overflow-hidden min-h-[330px] bg-[#11140f] text-white p-5"><Avatar src={x.avatar} name={x.displayName||x.username||'F'}/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"/><div className="absolute bottom-5 left-5 right-5 min-w-0"><span className="text-[9px] tracking-[.25em] text-[#d4b56a]">{x.rank}</span><h3 className="mt-2 text-xl font-semibold break-words line-clamp-2">{x.displayName||x.username||'CLASSIFIED'}</h3><p className="text-[10px] text-white/40 truncate">@{x.username||'unknown'}</p><p className="mt-1 text-[9px] uppercase text-white/30">{x.statusLabel || x.status || 'Offline'}</p></div></motion.article>) : <div className="sm:col-span-2 lg:col-span-4 rounded-xl bg-[#11140f] p-12 text-center text-white/50">Leadership profiles are temporarily unavailable.</div>}</div>
    </div></section>

    <section id="divisions" className="relative py-28 md:py-40"><div className="mx-auto max-w-[1500px] px-5 md:px-10"><span className="text-[9px] tracking-[.3em] text-[#d4b56a]">03 / DIVISIONS</span><div className="mt-8 flex flex-col">{div.length ? div.map((x:Any,i:number)=><motion.a initial={{opacity:0,x:-20}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:i*.04}} href={x.href||'#'} key={x.id||i} className="group border-t border-white/10 py-7 md:py-9 flex items-center justify-between gap-6"><div className="flex items-center gap-6 md:gap-12 min-w-0"><span className="text-[10px] text-white/20">{String(i+1).padStart(2,'0')}</span><h3 className="text-3xl md:text-6xl tracking-[-.05em] break-words group-hover:text-[#d4b56a] transition">{x.name||x.title||'Division'}</h3></div><ArrowUpRight className="shrink-0 text-white/20 group-hover:text-[#d4b56a] group-hover:translate-x-1 group-hover:-translate-y-1 transition"/></motion.a>) : <div className="rounded-2xl border border-white/10 bg-white/[.025] px-8 py-16 text-center text-sm text-white/40">No divisions are currently published.</div>}</div></div></section>

    <section id="operations" className="relative border-t border-white/10 py-28 md:py-40"><div className="mx-auto max-w-[1500px] px-5 md:px-10"><span className="text-[9px] tracking-[.3em] text-[#d4b56a]">04 / OPERATIONS</span><div className="mt-12 grid lg:grid-cols-3 gap-5">{events.length ? events.map((x:Any,i:number)=><article key={x.id||i} className="rounded-2xl border border-white/10 bg-white/[.025] p-7 hover:-translate-y-2 transition-transform duration-500"><div className="text-[10px] text-[#d4b56a]">{x.date||'DATE TBA'} / {x.time||'TIME TBA'}</div><h3 className="mt-16 text-3xl tracking-tight">{x.title||'FBMR Operation'}</h3><p className="mt-4 text-sm text-white/40">{x.description||'Official FBMR operation.'}</p><div className="mt-10 text-[9px] tracking-widest text-white/25">{x.location||'LOCATION TBA'}</div></article>) : <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[.025] px-8 py-16 text-center text-sm text-white/40">No upcoming operations announced.</div>}</div></div></section>

    <footer className="border-t border-white/10 py-10"><div className="mx-auto max-w-[1500px] px-5 md:px-10 flex flex-col md:flex-row justify-between gap-5 text-[9px] tracking-[.2em] text-white/25"><span>FBMR // FEDERAL BUREAU OF MILITARY ROLEPLAY</span><span>WE SERVE. WE LEAD. WE ROLEPLAY.</span></div></footer>
  </main>;
}

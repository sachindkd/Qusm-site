"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowDown, ArrowUpRight, CalendarDays, ChevronRight, Clock3, Crown, Menu, Radio, Shield, Sparkles, X } from "lucide-react";

type Item = Record<string, any>;
type People = Record<string, Item[]>;

const active = (items: Item[] = []) => items.filter(x => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft").sort((a,b) => Number(a.order || 0) - Number(b.order || 0));

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .65, delay, ease: [.16, 1, .3, 1] }} className={className}>{children}</motion.div>;
}

function SectionHead({ number, eyebrow, title, copy }: { number: string; eyebrow: string; title: React.ReactNode; copy?: string }) {
  return <div className="mb-14 grid gap-7 lg:grid-cols-[120px_1fr_330px] lg:items-end">
    <div className="font-mono text-[10px] tracking-[.3em] text-[#c7aa68]">{number}</div>
    <div><div className="mb-4 font-mono text-[9px] tracking-[.28em] text-white/35">{eyebrow}</div><h2 className="text-[clamp(2.8rem,7vw,6.8rem)] font-semibold leading-[.86] tracking-[-.06em]">{title}</h2></div>
    {copy && <p className="text-sm leading-6 text-white/38 lg:pb-2">{copy}</p>}
  </div>;
}

function Profile({ person, role }: { person: Item; role: string }) {
  const status = String(person.status || "offline").toLowerCase();
  const dot = status === "online" ? "bg-emerald-400" : status === "idle" ? "bg-amber-300" : status === "dnd" ? "bg-red-400" : "bg-white/20";
  return <motion.article whileHover={{ y: -4 }} className="group relative overflow-hidden border border-white/10 bg-[#0d100e] p-5 transition-colors duration-300 hover:border-[#c7aa68]/35 hover:bg-[#111511]">
    <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-[#c7aa68] transition-transform duration-500 group-hover:scale-x-100" />
    <div className="flex items-center gap-4">
      <div className="relative shrink-0"><img src={person.avatar} alt="" className="h-14 w-14 rounded-full border border-white/10 object-cover"/><span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0d100e] ${dot}`} /></div>
      <div className="min-w-0 flex-1"><div className="font-mono text-[8px] tracking-[.2em] text-[#c7aa68]">{role}</div><h3 className="mt-1 break-words text-base font-semibold leading-5">{person.displayName || person.username || "Unknown"}</h3><p className="truncate text-xs text-white/30">@{person.username || "unknown"}</p></div>
    </div>
    <div className="mt-5 flex items-center justify-between border-t border-white/[.07] pt-4 font-mono text-[8px] uppercase tracking-[.13em] text-white/30"><span className="flex items-center gap-2"><i className={`h-1.5 w-1.5 rounded-full ${dot}`} />{status}</span><ChevronRight size={13} className="text-white/20 transition group-hover:translate-x-1 group-hover:text-[#c7aa68]"/></div>
  </motion.article>;
}

export default function LiveHomeRevampV3() {
  const [content, setContent] = useState<Item>({});
  const [people, setPeople] = useState<People>({});
  const [menu, setMenu] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 25, restDelta: .001 });

  useEffect(() => {
    let alive = true;
    const load = async () => { try { const [a,b] = await Promise.all([fetch("/api/content", { cache: "no-store" }), fetch("/api/discord/leadership", { cache: "no-store" })]); if (!alive) return; if (a.ok) setContent(await a.json()); if (b.ok) setPeople(await b.json()); } catch {} };
    void load(); const timer = setInterval(load, 15000); return () => { alive = false; clearInterval(timer); };
  }, []);

  const org = content.org || {};
  const news = useMemo(() => active(content.announcements || []).slice(0,5), [content.announcements]);
  const divisions = useMemo(() => active(content.divisions || []), [content.divisions]);
  const events = useMemo(() => active(content.calendar || []).slice(0,4), [content.calendar]);
  const media = useMemo(() => active(content.media || []).slice(0,6), [content.media]);
  const owners = people.owner || [], coOwners = people.coOwner || [], chairmen = people.chairman || [], vcms = people.viceChairman || [];

  return <main className="min-h-screen overflow-x-hidden bg-[#070908] text-[#eeeae0] selection:bg-[#c7aa68] selection:text-black">
    <motion.div style={{ scaleX }} className="fixed left-0 right-0 top-0 z-[70] h-[2px] origin-left bg-[#c7aa68]" />
    <div className="pointer-events-none fixed inset-0 z-0 opacity-[.16]" style={{ backgroundImage: "radial-gradient(circle at 50% -10%,rgba(199,170,104,.14),transparent 38%),linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)", backgroundSize: "100% 100%,64px 64px,64px 64px" }} />

    <nav className="fixed inset-x-0 top-0 z-60 border-b border-white/[.08] bg-[#070908]/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-[74px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3 font-mono text-[10px] tracking-[.3em]"><span className="h-2 w-2 rounded-full bg-[#c7aa68] shadow-[0_0_16px_rgba(199,170,104,.65)]"/>QUSM</a>
        <div className="hidden items-center gap-8 lg:flex">{[["01","News","news"],["02","Command","command"],["03","Divisions","divisions"],["04","Operations","operations"],["05","Media","media"]].map(([n,l,id])=><a key={id} href={`#${id}`} className="group flex items-center gap-2 font-mono text-[8px] tracking-[.18em] text-white/35 transition hover:text-white"><span className="text-[#c7aa68]/50">{n}</span>{l}</a>)}</div>
        <a href="/staff" className="hidden border border-[#c7aa68]/35 px-4 py-2.5 font-mono text-[8px] tracking-[.16em] text-[#c7aa68] transition hover:bg-[#c7aa68] hover:text-black sm:block">STAFF PORTAL ↗</a>
        <button onClick={() => setMenu(!menu)} className="rounded-full border border-white/10 p-3 lg:hidden" aria-label="Open navigation">{menu ? <X size={18}/> : <Menu size={18}/>}</button>
      </div>
      {menu && <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} className="border-t border-white/10 bg-[#070908] px-5 py-6 lg:hidden"><div className="grid gap-5 font-mono text-[10px] tracking-[.2em] text-white/60">{["news","command","divisions","operations","media"].map(id=><a key={id} href={`#${id}`} onClick={()=>setMenu(false)}>{id.toUpperCase()}</a>)}<a href="/staff">STAFF PORTAL ↗</a></div></motion.div>}
    </nav>

    <section id="top" className="relative z-10 min-h-[100svh] border-b border-white/10 px-5 pb-14 pt-32 sm:px-8 lg:px-12 lg:pb-20">
      <div className="mx-auto flex min-h-[calc(100svh-150px)] max-w-[1500px] flex-col justify-between">
        <div className="flex items-center justify-between font-mono text-[8px] tracking-[.25em] text-white/25"><span>EST. QUSM / OFFICIAL SYSTEM</span><span className="hidden sm:block">SCROLL TO EXPLORE ↓</span></div>
        <div className="py-20">
          <Reveal><div className="mb-7 flex items-center gap-3 font-mono text-[9px] tracking-[.3em] text-[#c7aa68]"><span className="h-px w-10 bg-[#c7aa68]/60"/>{org.fullName || "QUAVY'S UNITED STATES MILITARY"}</div></Reveal>
          <Reveal delay={.08}><h1 className="max-w-[1100px] text-[clamp(4.5rem,14vw,13rem)] font-semibold leading-[.76] tracking-[-.085em]">BUILT TO<br/><span className="text-[#c7aa68]">SERVE.</span></h1></Reveal>
          <Reveal delay={.16} className="mt-10 max-w-2xl"><p className="text-base leading-7 text-white/45 sm:text-xl sm:leading-8">{org.heroDescription || "A structured military roleplay community built around organization, progression, leadership and immersive operations."}</p></Reveal>
        </div>
        <div className="flex flex-col gap-8 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between"><a href="#command" className="group inline-flex w-fit items-center gap-5 font-mono text-[9px] tracking-[.18em] text-white/65">EXPLORE COMMAND <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c7aa68]/40 text-[#c7aa68] transition group-hover:bg-[#c7aa68] group-hover:text-black"><ArrowDown size={14}/></span></a><div className="grid grid-cols-3 gap-8 font-mono text-[8px] uppercase text-white/25"><div><b className="block text-xl text-white/80">{divisions.length}</b>Divisions</div><div><b className="block text-xl text-white/80">{news.length}</b>Updates</div><div><b className="block text-xl text-white/80">{events.length}</b>Events</div></div></div>
      </div>
    </section>

    <section id="news" className="relative z-10 border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><SectionHead number="01" eyebrow="OFFICIAL DISPATCHES" title={<>What changed.<br/><span className="text-white/30">What matters.</span></>} copy="Official announcements, decisions and updates from across the organization."/><div className="overflow-hidden border-y border-white/10">{news.length ? news.map((x,i)=><Reveal key={x.id || i} delay={i*.04}><article className="group grid gap-5 border-b border-white/[.07] px-2 py-8 transition hover:bg-white/[.025] sm:px-5 md:grid-cols-[60px_1fr_150px]"><span className="font-mono text-[9px] text-[#c7aa68]">{String(i+1).padStart(2,"0")}</span><div><h3 className="text-xl font-semibold sm:text-2xl">{x.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-white/35">{x.body || x.description}</p></div><time className="font-mono text-[8px] text-white/25 md:text-right">{x.date || "OFFICIAL"}</time></article></Reveal>) : <div className="p-10 text-sm text-white/30">No current dispatches.</div>}</div></div></section>

    <section id="command" className="relative z-10 border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><SectionHead number="02" eyebrow="CHAIN OF COMMAND" title={<>Authority, <span className="text-white/30">defined.</span></>} copy="Leadership is presented in a clear hierarchy, from ownership through the Chairman Board."/><div className="grid gap-3 lg:grid-cols-4">{[["OWNER",owners],["CO-OWNER",coOwners],["CHAIRMAN",chairmen],["VCM / CHAIRMAN BOARD",vcms]].map(([role,list]: any,index)=><Reveal key={role} delay={index*.07} className={index===0 ? "lg:col-span-4" : "lg:col-span-1"}><div className={`h-full border border-white/10 bg-[#0b0e0c] p-5 sm:p-6 ${index===0 ? "lg:p-7" : ""}`}><div className="mb-5 flex items-center justify-between font-mono text-[8px] tracking-[.2em] text-[#c7aa68]"><span className="flex items-center gap-2">{index<2 && <Crown size={12}/>} {role}</span><span className="text-white/20">{String(list.length).padStart(2,"0")}</span></div><div className={index===0 ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-2"}>{list.length ? list.map((p: Item)=><Profile key={p.id} person={p} role={String(role)}/>) : <div className="py-5 text-xs text-white/25">No profile linked.</div>}</div></div></Reveal>)}</div></div></section>

    <section id="divisions" className="relative z-10 border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><SectionHead number="03" eyebrow="ORGANIZATION" title={<>Built in <span className="text-white/30">divisions.</span></>} copy="Distinct branches with their own responsibilities, leadership and operating identity."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{divisions.map((x,i)=><Reveal key={x.id || i} delay={i*.05}><motion.article whileHover={{ y:-7 }} className="group relative min-h-[280px] overflow-hidden border border-white/10 bg-[#0b0e0c] p-7 sm:p-9"><div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#c7aa68]/[.04] blur-2xl transition group-hover:bg-[#c7aa68]/[.09]"/><div className="relative flex h-full flex-col"><div className="flex justify-between font-mono text-[8px] text-white/25"><span>{String(i+1).padStart(2,"0")}</span><ArrowUpRight size={14} className="transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-[#c7aa68]"/></div><h3 className="mt-auto pt-16 text-3xl font-semibold tracking-tight">{x.name}</h3><p className="mt-3 max-w-md text-sm leading-6 text-white/35">{x.description || x.desc || "Official division of QUSM."}</p><div className="mt-6 border-t border-white/[.07] pt-4 font-mono text-[8px] uppercase tracking-[.15em] text-[#c7aa68]/60">{x.leadership || x.head || "Leadership pending"}</div></div></motion.article></Reveal>)}</div></div></section>

    <section id="operations" className="relative z-10 border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><SectionHead number="04" eyebrow="OPERATIONS CALENDAR" title={<>Always <span className="text-white/30">moving.</span></>} copy="Upcoming events and operations, kept visible without clutter."/><div className="grid gap-3">{events.length ? events.map((x,i)=><Reveal key={x.id || i} delay={i*.05}><article className="group grid gap-6 border border-white/10 bg-[#0b0e0c] p-6 transition hover:border-[#c7aa68]/25 sm:p-8 md:grid-cols-[150px_1fr_190px] md:items-center"><div className="font-mono text-[9px] uppercase tracking-[.14em] text-[#c7aa68]"><CalendarDays size={15} className="mb-3"/>{x.date || "DATE TBA"}<br/><span className="text-white/25">{x.time || "TIME TBA"}</span></div><div><h3 className="text-2xl font-semibold">{x.title}</h3><p className="mt-2 text-sm leading-6 text-white/35">{x.description || "Official operation."}</p></div><div className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-[.12em] text-white/25"><Clock3 size={14} className="text-[#c7aa68]"/>{x.location || "Location TBA"}</div></article></Reveal>) : <div className="border border-white/10 p-10 text-sm text-white/30">No upcoming operations.</div>}</div></div></section>

    <section id="media" className="relative z-10 border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-36"><div className="mx-auto max-w-[1500px]"><SectionHead number="05" eyebrow="MEDIA & ARCHIVE" title={<>The <span className="text-white/30">record.</span></>} copy="A visual archive of operations, announcements and community moments."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{media.length ? media.map((x,i)=><Reveal key={x.id || i} delay={i*.04}><article className="group overflow-hidden border border-white/10 bg-[#0b0e0c]"><div className="aspect-[16/10] overflow-hidden bg-[#111512]">{x.url || x.image ? <img src={x.url || x.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/> : <div className="flex h-full items-center justify-center font-mono text-[9px] text-white/15">NO PREVIEW</div>}</div><div className="p-5"><div className="flex items-center justify-between font-mono text-[8px] uppercase text-white/25"><span>{x.type || "ARCHIVE"}</span><ArrowUpRight size={13}/></div><h3 className="mt-3 text-lg font-semibold">{x.title || x.name || "Untitled"}</h3></div></article></Reveal>) : <div className="border border-white/10 p-10 text-sm text-white/30 sm:col-span-2 lg:col-span-3">No media published.</div>}</div></div></section>

    <footer className="relative z-10 px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="mx-auto max-w-[1500px]"><div className="grid gap-12 border-b border-white/10 pb-14 lg:grid-cols-[1fr_auto] lg:items-end"><div><div className="flex items-center gap-3 font-mono text-[9px] tracking-[.3em] text-[#c7aa68]"><span className="h-2 w-2 rounded-full bg-[#c7aa68]"/>QUSM</div><p className="mt-5 max-w-lg text-sm leading-6 text-white/30">{org.footerDescription || "Built to serve. Structured to operate. Designed for immersive roleplay."}</p></div><a href="#top" className="flex items-center gap-3 font-mono text-[8px] tracking-[.18em] text-white/40 transition hover:text-[#c7aa68]">BACK TO TOP <ArrowUpRight size={14}/></a></div><div className="flex flex-col gap-3 pt-6 font-mono text-[8px] uppercase tracking-[.16em] text-white/20 sm:flex-row sm:justify-between"><span>QUSM / OFFICIAL</span><span className="flex items-center gap-2"><Radio size={11} className="text-[#c7aa68]"/> Live system · updates every 15s</span></div></div></footer>
  </main>;
}

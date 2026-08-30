"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, BadgeCheck, CalendarDays, ChevronDown, Clock3, Code2, ExternalLink, Image as ImageIcon, Landmark, LogIn, Megaphone, Newspaper, ScrollText, Shield, ShoppingBag, Sparkles, Users } from "lucide-react";

type R = Record<string, any>;
const clean = (items: any[] = []) => items.filter(x => x?.active !== false && x?.status !== "inactive").sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
const dateText = (v: any) => v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "OFFICIAL";
const reveal = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: .65, ease: [0.16, 1, 0.3, 1] } } } as const;

export default function LiveHomeV2() {
  const [content, setContent] = useState<R>({});
  const [openCoc, setOpenCoc] = useState("leadership");
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: .2 });
  const heroY = useTransform(progress, [0, .35], [0, 100]);
  const heroScale = useTransform(progress, [0, .3], [1, .94]);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try { const r = await fetch("/api/content", { cache: "no-store" }); if (r.ok && !dead) setContent(await r.json()); } catch {}
    };
    void load();
    const timer = window.setInterval(load, 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { dead = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  const org = content.org || {};
  const announcements = useMemo(() => clean(content.announcements).filter(x => x.published).slice(0, 6), [content.announcements]);
  const divisions = useMemo(() => clean(content.divisions), [content.divisions]);
  const events = useMemo(() => clean(content.calendar).filter(x => x.status !== "draft").slice(0, 6), [content.calendar]);
  const leadership = useMemo(() => clean(content.leadership), [content.leadership]);
  const rules = useMemo(() => clean(content.rules), [content.rules]);
  const government = useMemo(() => clean(content.government), [content.government]);
  const ranks = useMemo(() => clean(content.ranks), [content.ranks]);
  const news = useMemo(() => clean(content.news).slice(0, 6), [content.news]);
  const media = useMemo(() => clean(content.media).slice(0, 9), [content.media]);
  const shop = useMemo(() => clean(content.shop).slice(0, 6), [content.shop]);
  const coc = [["leadership", "Leadership CoC", content.cocLeadership || []], ["staff", "Staff CoC", content.cocStaff || []], ["roleplay", "Roleplay CoC", content.cocRoleplay || []]] as const;

  return <main className="min-h-screen overflow-x-hidden bg-[#070707] text-[#f4f0e7] selection:bg-[#c7a45b] selection:text-black">
    <motion.div className="fixed left-0 right-0 top-0 z-[100] h-[2px] origin-left bg-[#c7a45b]" style={{ scaleX: progress }} />
    <div className="pointer-events-none fixed inset-0 z-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:90px_90px]" />

    <nav className="sticky top-0 z-50 border-b border-white/[.08] bg-[#070707]/85 px-5 py-4 backdrop-blur-2xl sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <a href="#top" className="group flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-[#c7a45b]/40 bg-[#c7a45b]/10 text-[#c7a45b] transition group-hover:rotate-12"><Shield size={14}/></span><span className="font-mono text-[11px] font-medium tracking-[.28em]">{org.name || "FBMRP"}</span></a>
        <div className="hidden items-center gap-6 xl:flex">{[["NEWS","announcements"],["COMMAND","command"],["DIVISIONS","divisions"],["OPS","calendar"],["MEDIA","media"],["SHOP","shop"]].map(([label,id]) => <a key={id} href={`#${id}`} className="font-mono text-[9px] tracking-[.18em] text-white/45 transition hover:text-[#d7b66d]">{label}</a>)}</div>
        <a href="/api/auth/signin/discord?staff=1" className="group inline-flex items-center gap-2 rounded-full border border-[#c7a45b]/45 bg-[#c7a45b]/10 px-4 py-2.5 font-mono text-[9px] tracking-[.12em] text-[#e0c27d] transition hover:-translate-y-0.5 hover:bg-[#c7a45b] hover:text-black"><LogIn size={12}/> STAFF ACCESS <ArrowRight size={11} className="transition group-hover:translate-x-1"/></a>
      </div>
    </nav>

    <section id="top" className="relative isolate min-h-[calc(100svh-65px)] overflow-hidden px-5 py-20 sm:px-10 lg:px-16 lg:py-28">
      <motion.div style={{ y: heroY, scale: heroScale }} className="mx-auto grid max-w-[1500px] items-center gap-14 lg:grid-cols-[1.25fr_.75fr]">
        <motion.div initial="hidden" animate="show" variants={reveal}>
          <div className="mb-7 flex items-center gap-3 font-mono text-[9px] tracking-[.2em] text-white/45"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c7a45b]"/>{org.heroEyebrow || org.fullName || "FORT BLISS MILITARY ROLEPLAY"}<span className="rounded-full border border-[#c7a45b]/30 px-2 py-1 text-[#c7a45b]">LIVE CMS</span></div>
          <h1 className="max-w-5xl font-sans text-[clamp(4.4rem,11vw,10.5rem)] font-semibold uppercase leading-[.78] tracking-[-.085em]"><span className="block">{String(org.heroTitle || "BUILT TO SERVE").split(" ")[0]}</span><span className="block text-transparent [-webkit-text-stroke:1px_rgba(244,240,231,.48)]">{String(org.heroTitle || "BUILT TO SERVE").split(" ").slice(1).join(" ")}</span></h1>
          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 border-t border-white/10 pt-4 font-mono text-[8px] tracking-[.18em] text-white/30">{["STRUCTURE","DISCIPLINE","IMMERSION","COMMUNITY"].map(x => <span key={x}>{x}</span>)}</div>
          <p className="mt-7 max-w-xl text-sm leading-7 text-white/55">{org.heroDescription || "A structured military roleplay community built around organization, progression, leadership and immersive operations."}</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#announcements" className="group inline-flex items-center gap-3 rounded-full bg-[#e9e4d8] px-5 py-3 font-mono text-[9px] tracking-[.12em] text-black transition hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(199,164,91,.16)]">ENTER COMMUNITY <ArrowDown size={12} className="transition group-hover:translate-y-1"/></a><a href="/api/auth/signin/discord?staff=1" className="inline-flex items-center gap-3 rounded-full border border-white/15 px-5 py-3 font-mono text-[9px] tracking-[.12em] text-white/75 transition hover:border-[#c7a45b]/50 hover:text-[#e0c27d]">STAFF AUTH <LogIn size={12}/></a></div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 50, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 3 }} transition={{ duration: 1, delay: .15, ease: [0.16,1,0.3,1] }} className="relative mx-auto w-full max-w-[440px]">
          <div className="absolute -inset-10 rounded-full bg-[#c7a45b]/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-[#c7a45b]/30 bg-gradient-to-br from-[#17130d] via-[#0c0c0c] to-[#080808] p-6 shadow-[0_35px_100px_rgba(0,0,0,.65)]">
            <div className="absolute right-[-20%] top-[-15%] h-64 w-64 rounded-full border border-[#c7a45b]/15 animate-[spin_24s_linear_infinite]"/><div className="absolute right-[-8%] top-[-3%] h-48 w-48 rounded-full border border-white/5"/>
            <div className="flex items-center justify-between font-mono text-[8px] tracking-[.16em] text-white/35"><span className="flex items-center gap-2"><i className="h-1.5 w-1.5 rounded-full bg-[#c7a45b] animate-pulse"/> SYSTEM ONLINE</span><span>01 / {String(divisions.length).padStart(2,"0")}</span></div>
            <div className="my-20 grid place-items-center"><div className="relative grid h-36 w-36 place-items-center rounded-full border border-[#c7a45b]/25"><div className="absolute inset-4 rounded-full border border-white/10 animate-[spin_12s_linear_infinite]"/><Shield size={48} strokeWidth={1} className="text-[#d8bb78]"/></div></div>
            <div className="relative"><div className="font-mono text-[8px] tracking-[.2em] text-white/35">{org.name || "FBMRP"}</div><div className="mt-2 font-sans text-2xl font-semibold tracking-tight">{org.fullName || "MILITARY ROLEPLAY"}</div><div className="mt-2 font-mono text-[8px] tracking-[.15em] text-[#c7a45b]/70">COMMAND // COMMUNITY // OPERATIONS</div></div>
          </div>
        </motion.div>
      </motion.div>
      <div className="absolute bottom-7 left-5 flex items-center gap-3 font-mono text-[8px] tracking-[.15em] text-white/25 sm:left-10 lg:left-16"><ArrowDown size={12} className="animate-bounce"/> SCROLL TO EXPLORE</div>
    </section>

    <div className="overflow-hidden border-y border-white/[.08] bg-white/[.025] py-3"><div className="flex min-w-max animate-[ticker_28s_linear_infinite] gap-14 font-mono text-[9px] tracking-[.22em] text-white/35">{Array.from({length:2},(_,i)=><span key={i}>FORT BLISS MILITARY ROLEPLAY　•　LIVE UPDATES　•　COMMAND　•　DIVISIONS　•　OPERATIONS　•　RECRUITMENT　•　COMMUNITY　•　FBMRP　•　</span>)}</div></div>

    <Section id="announcements" number="01" label="INTELLIGENCE FEED" title={<>Official<br/><span>updates.</span></>} text="Published announcements from Staff Management appear here automatically." icon={<Megaphone/>}>
      {announcements.length ? <div className="grid gap-4 lg:grid-cols-2">{announcements.map((a,i)=><motion.article variants={reveal} initial="hidden" whileInView="show" viewport={{once:true,amount:.1}} transition={{delay:i*.05}} key={a.id||i} className="group rounded-2xl border border-white/10 bg-white/[.025] p-6 transition duration-500 hover:-translate-y-1 hover:border-[#c7a45b]/30 hover:bg-[#c7a45b]/[.035]"><div className="flex items-center justify-between font-mono text-[8px] text-white/30"><span>BRIEFING {String(i+1).padStart(2,"0")}</span><span>{dateText(a.createdAt||a.date)}</span></div><h3 className="mt-8 font-sans text-2xl font-semibold tracking-tight group-hover:text-[#e0c27d]">{a.title}</h3><p className="mt-3 text-sm leading-7 text-white/45">{a.body}</p></motion.article>)}</div> : <Empty title="No published announcements"/>}
    </Section>

    <Section id="command" number="02" label="CHAIN OF COMMAND" title={<>Command<br/><span>structure.</span></>} text="The official chain of command is maintained from the staff CMS." icon={<Shield/>} dark>
      <div className="mx-auto max-w-5xl space-y-3">{coc.map(([key,title,list],i)=>{const items=clean(list);const active=openCoc===key;return <div key={key} className={`overflow-hidden rounded-2xl border ${active?"border-[#c7a45b]/45":"border-white/10"} bg-black/20 transition`}><button onClick={()=>setOpenCoc(active?"":key)} className="flex w-full items-center justify-between p-5 text-left sm:p-6"><span className="flex items-center gap-4"><span className="grid h-10 w-10 place-items-center rounded-xl border border-[#c7a45b]/20 bg-[#c7a45b]/10 font-mono text-[9px] text-[#d8bb78]">0{i+1}</span><span><strong className="font-serif text-xl sm:text-2xl">{title}</strong><small className="mt-1 block font-mono text-[8px] uppercase tracking-[.15em] text-white/25">{items.length} published levels</small></span></span><ChevronDown size={18} className={`text-[#c7a45b] transition ${active?"rotate-180":""}`}/></button>{active&&<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} className="border-t border-[#c7a45b]/15 px-6 pb-6 pt-2">{items.length?items.map((x,j)=><div key={x.id||j} className="relative ml-4 border-l border-[#c7a45b]/20 py-4 pl-8"><span className="absolute -left-[5px] top-6 h-2.5 w-2.5 rounded-full border border-[#c7a45b] bg-[#070707]"/><div className="font-mono text-[8px] tracking-[.16em] text-[#c7a45b]">LEVEL {String(j+1).padStart(2,"0")}</div><div className="mt-1 font-medium">{x.title||x.name||"Position"}</div>{x.name&&x.title&&<div className="mt-1 text-xs text-[#d8bb78]">{x.name}</div>}{x.description&&<div className="mt-1 text-xs leading-6 text-white/40">{x.description}</div>}</div>):<p className="py-6 text-sm text-white/30">No entries published.</p>}</motion.div>}</div>})}</div>
    </Section>

    <Section id="divisions" number="03" label="ORGANIZATION" title={<>Active<br/><span>divisions.</span></>} text="Official division records, insignia and descriptions are controlled by staff." icon={<Shield/>}>
      {divisions.length?<Grid>{divisions.map((d,i)=><Card key={d.id||i} index={i} image={d.logoUrl}><small>{d.code||"DIVISION"} · {String(d.status||"ACTIVE").toUpperCase()}</small><h3>{d.name}</h3><p>{d.description||"Official division."}</p></Card>)}</Grid>:<Empty title="No divisions published"/>}
    </Section>

    <Section id="calendar" number="04" label="OPERATIONS CALENDAR" title={<>Upcoming<br/><span>operations.</span></>} text="Training, operations and community events published by staff." icon={<CalendarDays/>} dark>
      {events.length?<Grid>{events.map((e,i)=><Card key={e.id||i} index={i}><small>{e.date||"DATE TBA"}</small><h3>{e.title}</h3><div className="mt-5 space-y-2 font-mono text-[8px] text-white/35"><div><Clock3 size={11} className="mr-2 inline text-[#c7a45b]"/>{e.time||"TIME TBA"}</div><div><Shield size={11} className="mr-2 inline text-[#c7a45b]"/>{e.location||"LOCATION TBA"}</div></div><p>{e.description||"Official operation."}</p></Card>)}</Grid>:<Empty title="No upcoming operations"/>}
    </Section>

    <Section id="organization" number="05" label="OFFICIAL ORGANIZATION" title={<>People &amp;<br/><span>structure.</span></>} text="Leadership, government, ranks and rules are maintained from the same CMS." icon={<Users/>}>
      <div className="grid gap-4 lg:grid-cols-2"><Panel title="Command" icon={<Users/>} items={leadership} render={(x)=><><strong>{x.title}</strong><span>{x.name||x.rank||""}</span><small>{x.division||x.description||""}</small></>}/><Panel title="Government" icon={<Landmark/>} items={government} render={(x)=><><strong>{x.name||"Vacant"}</strong><span>{x.role||x.title||""}</span><small>{x.department||x.description||""}</small></>}/><Panel title="Ranks" icon={<BadgeCheck/>} items={ranks} render={(x)=><><strong>{x.name}</strong><span>{x.level||x.code||""}</span><small>{x.description||x.desc||""}</small></>}/><Panel title="Rules & Regulations" icon={<ScrollText/>} items={rules} render={(x)=><><strong>{x.title}</strong><span>{x.category||"POLICY"}</span><small>{x.body}</small></>}/></div>
    </Section>

    <Section id="news" number="06" label="NEWSROOM" title={<>Latest<br/><span>briefings.</span></>} text="News published by staff." icon={<Newspaper/>} dark>
      {news.length?<Grid>{news.map((n,i)=><Card key={n.id||i} index={i} image={n.imageUrl}><small>{n.tag||"NEWS"} · {dateText(n.date)}</small><h3>{n.title}</h3><p>{n.excerpt||n.body}</p></Card>)}</Grid>:<Empty title="No news published"/>}
    </Section>

    <Section id="media" number="07" label="MEDIA ARCHIVE" title={<>Field<br/><span>archive.</span></>} text="Images and videos published through Staff Management and Developer Media." icon={<ImageIcon/>}>
      {media.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{media.map((m,i)=><motion.article variants={reveal} initial="hidden" whileInView="show" viewport={{once:true,amount:.1}} transition={{delay:i*.04}} key={m.id||i} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.025]"><div className="aspect-video overflow-hidden bg-[#111]">{m.videoUrl?<video src={m.videoUrl} controls className="h-full w-full object-cover"/>:m.imageUrl?<img src={m.imageUrl} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/>:<div className="grid h-full place-items-center"><Shield size={32} className="text-[#c7a45b]/50"/></div>}</div><div className="p-5"><div className="font-mono text-[8px] tracking-[.16em] text-[#c7a45b]">{m.category||"ARCHIVE"}</div><h3 className="mt-2 font-serif text-xl font-bold">{m.title||m.caption||"Media"}</h3>{m.caption&&<p className="mt-2 text-sm text-white/40">{m.caption}</p>}</div></motion.article>)}</div>:<Empty title="No media published"/>}
    </Section>

    <Section id="developers" number="08" label="DEVELOPER PROGRAM" title={<>Build the<br/><span>system.</span></>} text="A dedicated publishing area for approved developers." icon={<Code2/>} dark>
      <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="mx-auto flex max-w-5xl flex-col justify-between gap-6 rounded-3xl border border-[#c7a45b]/25 bg-gradient-to-br from-[#c7a45b]/10 via-white/[.025] to-transparent p-7 sm:flex-row sm:items-center sm:p-9"><div><div className="mb-2 flex items-center gap-2 font-mono text-[8px] tracking-[.18em] text-[#c7a45b]"><Sparkles size={11}/> VERIFIED DEVELOPER AREA</div><h3 className="font-serif text-2xl font-bold">Developer Media Studio</h3><p className="mt-2 max-w-xl text-sm leading-6 text-white/45">Approved developers can upload images and videos with an enforced 8 MB limit and publish them to the media archive.</p></div><a href="/developer-media" className="button button-primary inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e9e4d8] px-5 py-3 font-mono text-[9px] text-black">OPEN STUDIO <ArrowRight size={12}/></a></motion.div>
    </Section>

    <Section id="shop" number="09" label="OFFICIAL MARKETPLACE" title={<>Factions<br/><span>&amp; families.</span></>} text="Official packages are managed only by authorized Owner and Co-Owner accounts." icon={<ShoppingBag/>}>
      {shop.length?<Grid>{shop.map((s,i)=><Card key={s.id||i} index={i} image={s.imageUrl}><small>{s.type||"FACTION"} · {s.price||"CONTACT STAFF"}</small><h3>{s.name}</h3><p>{s.description||"Official package."}</p>{s.gamepassUrl&&<a href={s.gamepassUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 font-mono text-[8px] tracking-[.12em] text-[#d8bb78]">PURCHASE GAMEPASS <ExternalLink size={11}/></a>}</Card>)}</Grid>:<Empty title="No shop listings"/>}
    </Section>

    <section id="recruitment" className="relative overflow-hidden border-t border-white/10 px-5 py-28 sm:px-10 lg:px-16"><div className="mx-auto max-w-5xl rounded-[2rem] border border-[#c7a45b]/30 bg-gradient-to-br from-[#c7a45b]/12 via-white/[.025] to-transparent p-10 text-center sm:p-16"><div className="font-mono text-[8px] tracking-[.25em] text-[#c7a45b]">JOIN THE RANKS</div><h2 className="mt-4 font-serif text-5xl font-bold tracking-tight sm:text-7xl">Ready to serve?</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/45">Apply through the official recruitment channel and begin your progression.</p><a href={org.recruitmentUrl||"#"} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#e9e4d8] px-6 py-3 font-mono text-[9px] text-black transition hover:-translate-y-1">RECRUITMENT <ExternalLink size={12}/></a></div></section>

    <a href="/api/auth/signin/discord?staff=1" aria-label="Staff access" className="group fixed bottom-5 right-5 z-50 hidden items-center gap-3 rounded-full border border-[#c7a45b]/50 bg-[#0d0c0a]/90 px-4 py-3 shadow-2xl backdrop-blur-xl sm:flex"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#c7a45b] text-black"><LogIn size={13}/></span><span className="font-mono text-[8px] tracking-[.14em] text-[#e0c27d]">STAFF ACCESS</span></a>
    <footer className="border-t border-white/10 px-5 py-10 sm:px-10 lg:px-16"><div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-3 font-mono text-[8px] uppercase tracking-[.14em] text-white/25 sm:flex-row"><span>{org.name||"FBMRP"} · {org.fullName||"Fort Bliss Military Roleplay"}</span><span>{org.footerText||"COMMAND // COMMUNITY // OPERATIONS"}</span></div></footer>
  </main>;
}

function Section({id,number,label,title,text,icon,children,dark=false}:{id:string;number:string;label:string;title:any;text:string;icon:any;children:any;dark?:boolean}){return <section id={id} className={`relative px-5 py-24 sm:px-10 lg:px-16 lg:py-32 ${dark?"bg-white/[.018]":""}`}><div className="mx-auto max-w-[1280px]"><motion.div initial="hidden" whileInView="show" viewport={{once:true,amount:.15}} variants={reveal} className="mb-12 flex flex-col justify-between gap-7 lg:flex-row lg:items-end"><div><div className="mb-4 flex items-center gap-3 font-mono text-[8px] tracking-[.22em] text-[#c7a45b]"><span>{number}</span><span className="h-px w-8 bg-[#c7a45b]/40"/>{label}</div><h2 className="font-sans text-5xl font-semibold leading-[.9] tracking-[-.06em] sm:text-7xl">{title}</h2><p className="mt-5 max-w-2xl text-sm leading-7 text-white/40">{text}</p></div><div className="text-[#c7a45b]/70">{icon}</div></motion.div>{children}</div></section>}

function Grid({children}:{children:any}){return <div className="grid gap-4 md:grid-cols-2">{children}</div>}
function Card({children,index,image}:{children:any;index:number;image?:string}){return <motion.article initial="hidden" whileInView="show" viewport={{once:true,amount:.08}} variants={reveal} transition={{delay:index*.04}} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 transition duration-500 hover:-translate-y-1 hover:border-[#c7a45b]/30"><span className="absolute right-5 top-5 font-mono text-[8px] text-white/15">{String(index+1).padStart(2,"0")}</span>{image&&<div className="-mx-6 -mt-6 mb-6 aspect-[2/1] overflow-hidden bg-[#111]"><img src={image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/></div>}<div className="space-y-3">{children}</div></motion.article>}
function Panel({title,icon,items,render}:{title:string;icon:any;items:any[];render:(x:any)=>any}){return <motion.div initial="hidden" whileInView="show" viewport={{once:true,amount:.08}} variants={reveal} className="rounded-2xl border border-white/10 bg-[#0c0c0c] p-6"><div className="flex items-center gap-3 border-b border-white/10 pb-5"><span className="text-[#c7a45b]">{icon}</span><h3 className="font-serif text-2xl font-bold">{title}</h3><span className="ml-auto font-mono text-[8px] text-white/20">{items.length}</span></div><div className="mt-2 divide-y divide-white/[.06]">{clean(items).slice(0,8).map((x,i)=><div key={x.id||i} className="py-4">{render(x)}</div>)}{!items.length&&<p className="py-5 text-sm text-white/25">No records published.</p>}</div></motion.div>}
function Empty({title}:{title:string}){return <div className="rounded-2xl border border-dashed border-white/10 p-14 text-center font-mono text-[9px] tracking-[.16em] text-white/25">{title.toUpperCase()}</div>}

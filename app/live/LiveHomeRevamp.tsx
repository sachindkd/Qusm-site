"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, CalendarDays, ChevronRight, ExternalLink, Menu, Shield, X } from "lucide-react";
import { motion } from "framer-motion";

type Item = Record<string, any>;

const groups = ["OVERSIGHT", "CHAIRMAN BOARD", "OWNERSHIP TEAM", "SENIOR LEADERSHIP", "DEVELOPMENT"];
const staffGroups = ["LEADERSHIP", "STAFF"];

function active(items: Item[] = []) {
  return items.filter((x) => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft").sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function Group({ title, items }: { title: string; items: Item[] }) {
  const visible = items.filter((x) => x.section === title);
  if (!visible.length) return null;
  return (
    <div className="border-t border-white/10 first:border-t-0">
      <div className="flex items-center justify-between gap-4 py-5">
        <div className="text-[10px] tracking-[.28em] text-[#c7aa68] font-mono">{title}</div>
        <div className="h-px flex-1 bg-white/[.06]" />
      </div>
      <div className="divide-y divide-white/[.07]">
        {visible.map((item, index) => (
          <motion.article key={item.id || item.title} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .15 }} transition={{ duration: .35, delay: index * .025 }} className="group grid gap-5 py-7 md:grid-cols-[46px_260px_1fr] md:items-start">
            <div className="font-mono text-[9px] text-white/25">{String(index + 1).padStart(2, "0")}</div>
            <h3 className="font-sans text-xl font-semibold tracking-[-.025em] text-[#ece9df] group-hover:text-[#c7aa68] transition-colors">{item.title}</h3>
            <p className="max-w-3xl text-sm leading-7 text-white/50">{item.description}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

export default function LiveHomeRevamp() {
  const [content, setContent] = useState<Item>({});
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(true);

  const load = async () => {
    try {
      const response = await fetch("/api/content", { cache: "no-store" });
      if (response.ok) setContent(await response.json());
    } catch {}
  };

  useEffect(() => {
    void load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const org = content.org || {};
  const announcements = useMemo(() => active(content.announcements || []).slice(0, 4), [content.announcements]);
  const divisions = useMemo(() => active(content.divisions || []), [content.divisions]);
  const events = useMemo(() => active(content.calendar || []).slice(0, 4), [content.calendar]);
  const media = useMemo(() => active(content.media || []).slice(0, 6), [content.media]);
  const leadership = active(content.cocLeadership || []);
  const staff = active(content.cocStaff || []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080a09] text-[#ece9df]">
      <div className="fixed inset-0 pointer-events-none opacity-[.13]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)", backgroundSize: "54px 54px" }} />
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[#080a09]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3 font-mono text-[11px] tracking-[.2em]"><span className="h-2 w-2 rounded-full bg-[#c7aa68] shadow-[0_0_0_5px_rgba(199,170,104,.08)]" />QUSM</a>
          <div className="hidden lg:flex items-center gap-7 font-mono text-[9px] tracking-[.16em] text-white/45">
            {[["NEWS", "news"], ["COMMAND", "command"], ["DIVISIONS", "divisions"], ["OPERATIONS", "operations"], ["MEDIA", "media"]].map(([label, id]) => <a key={id} href={`#${id}`} className="transition hover:text-[#c7aa68]">{label}</a>)}
          </div>
          <div className="hidden sm:flex gap-2"><a href="/staff" className="border border-[#c7aa68]/60 bg-[#c7aa68] px-4 py-3 font-mono text-[9px] tracking-[.12em] text-[#10110e] transition hover:-translate-y-0.5">STAFF PORTAL</a></div>
          <button onClick={() => setMenu(!menu)} className="lg:hidden p-2" aria-label="Menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
        {menu && <div className="border-t border-white/10 bg-[#080a09] px-5 py-5 grid gap-4 font-mono text-[10px]"><a href="#news" onClick={() => setMenu(false)}>NEWS</a><a href="#command" onClick={() => setMenu(false)}>COMMAND</a><a href="#divisions" onClick={() => setMenu(false)}>DIVISIONS</a><a href="#operations" onClick={() => setMenu(false)}>OPERATIONS</a><a href="#media" onClick={() => setMenu(false)}>MEDIA</a><a href="/staff">STAFF PORTAL</a></div>}
      </nav>

      <header id="top" className="relative flex min-h-[92svh] items-end border-b border-white/10 px-5 pb-16 pt-36 sm:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
          <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ .6: .6 } as any} className="mb-6 font-mono text-[9px] tracking-[.28em] text-[#c7aa68]">{org.fullName || "QUAVY'S UNITED STATES MILITARY"} / OFFICIAL</motion.div>
            <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [.16, 1, .3, 1] }} className="max-w-5xl font-sans text-[clamp(4rem,11vw,10rem)] font-semibold leading-[.82] tracking-[-.075em]">
              BUILT TO<br /><span className="text-[#c7aa68]">SERVE.</span>
            </motion.h1>
            <p className="mt-8 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">{org.heroDescription || "A structured military roleplay community built around organization, progression, leadership and immersive operations."}</p>
            <div className="mt-8 flex flex-wrap gap-2"><a href="#command" className="flex items-center gap-3 bg-[#c7aa68] px-5 py-3.5 font-mono text-[9px] tracking-[.12em] text-[#10110e] transition hover:-translate-y-1">VIEW COMMAND <ArrowRight size={13} /></a><a href="#news" className="flex items-center gap-3 border border-white/15 px-5 py-3.5 font-mono text-[9px] tracking-[.12em] transition hover:border-[#c7aa68]/50 hover:-translate-y-1">LATEST ORDERS <ArrowDownRight size={13} /></a></div>
          </div>
          <div className="hidden lg:block border-l border-[#c7aa68]/30 pl-8 pb-2"><div className="font-mono text-[8px] tracking-[.22em] text-white/30">SYSTEM STATUS</div><div className="mt-3 font-sans text-4xl tracking-[-.04em]">Operational.</div><div className="mt-8 grid grid-cols-2 gap-6 font-mono text-[8px] uppercase text-white/30"><div><b className="block font-sans text-3xl text-white">{divisions.length}</b>Divisions</div><div><b className="block font-sans text-3xl text-white">{leadership.length}</b>Command roles</div><div><b className="block font-sans text-3xl text-white">{announcements.length}</b>Updates</div><div><b className="block font-sans text-3xl text-white">{events.length}</b>Operations</div></div></div>
        </div>
      </header>

      <section id="news" className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHead index="01" label="NEWS" title={<>What changed.<br /><span>What matters.</span></>} /><div className="divide-y divide-white/10 border-y border-white/10">{announcements.map((item, i) => <article key={item.id || i} className="grid gap-5 py-7 md:grid-cols-[60px_1fr_150px] transition hover:bg-white/[.018]"><span className="font-mono text-[9px] text-[#c7aa68]">{String(i + 1).padStart(2, "0")}</span><div><h3 className="font-sans text-2xl font-semibold tracking-[-.03em]">{item.title}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">{item.body}</p></div><time className="font-mono text-[8px] text-white/25 md:text-right">{item.date || "OFFICIAL"}</time></article>)}</div></div></section>

      <section id="command" className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHead index="02" label="CHAIN OF COMMAND" title={<>One structure.<br /><span>Clear authority.</span></>} /><div className="overflow-hidden border border-white/10 bg-white/[.012]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5"><div className="flex items-center gap-3 font-mono text-[9px] tracking-[.2em] text-[#c7aa68]"><Shield size={14} /> COMMAND STRUCTURE</div><button onClick={() => setOpen(!open)} className="font-mono text-[8px] text-white/35">{open ? "COLLAPSE" : "EXPAND"}</button></div>
        {open && <div className="p-6 sm:p-8"><Group title="OVERSIGHT" items={leadership} /><Group title="CHAIRMAN BOARD" items={leadership} /><Group title="OWNERSHIP TEAM" items={leadership} /><Group title="SENIOR LEADERSHIP" items={leadership} /><Group title="DEVELOPMENT" items={leadership} /><div className="mt-14 border-t border-white/10 pt-8"><div className="mb-6 font-mono text-[9px] tracking-[.2em] text-[#c7aa68]">STAFF CHAIN</div><Group title="LEADERSHIP" items={staff} /><Group title="STAFF" items={staff} /></div></div>}
      </div></div></section>

      <section id="divisions" className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHead index="03" label="DIVISIONS" title={<>The operating<br /><span>branches.</span></>} /><div className="grid border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">{divisions.map((item, i) => <motion.article key={item.id || i} whileHover={{ y: -5 }} className="relative min-h-[230px] border-b border-r border-white/10 bg-[#0d110f] p-7 transition-colors hover:bg-[#111612]"><div className="flex justify-between font-mono text-[8px] text-white/25"><span>{String(i + 1).padStart(2, "0")}</span><ChevronRight size={12} /></div><h3 className="mt-12 font-sans text-3xl font-semibold tracking-[-.04em]">{item.name}</h3><p className="mt-3 text-sm leading-6 text-white/40">{item.description || item.desc}</p><div className="mt-6 font-mono text-[8px] uppercase text-[#c7aa68]/60">{item.leadership || item.head || "Leadership pending"}</div></motion.article>)}</div></div></section>

      <section id="operations" className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHead index="04" label="OPERATIONS" title={<>Next on the<br /><span>schedule.</span></>} />{events.length ? <div className="divide-y divide-white/10 border-y border-white/10">{events.map((item, i) => <article key={item.id || i} className="grid gap-5 py-7 md:grid-cols-[110px_1fr_180px]"><div className="font-mono text-[9px] text-[#c7aa68]">{item.date || "DATE TBA"}<br /><span className="text-white/25">{item.time || "TIME TBA"}</span></div><div><h3 className="text-2xl font-semibold">{item.title}</h3><p className="mt-2 text-sm text-white/40">{item.description || "Official operation."}</p></div><div className="font-mono text-[8px] uppercase text-white/25"><CalendarDays size={12} className="mr-2 inline text-[#c7aa68]" />{item.location || "LOCATION TBA"}</div></article>)}</div> : <Empty text="No upcoming operations." />}</div></section>

      <section id="media" className="border-b border-white/10 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"><div className="mx-auto max-w-7xl"><SectionHead index="05" label="MEDIA" title={<>On the ground.<br /><span>In the archive.</span></>} />{media.length ? <div className="grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-3">{media.map((item, i) => <article key={item.id || i} className="bg-[#0d110f] transition hover:bg-[#111612]"><div className="aspect-video overflow-hidden bg-[#101510]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover saturate-75 transition duration-700 hover:scale-105 hover:saturate-100" /> : <div className="grid h-full place-items-center font-mono text-[9px] text-white/20">FIELD ARCHIVE / {String(i + 1).padStart(2, "0")}</div>}</div><div className="p-5"><div className="font-mono text-[8px] text-[#c7aa68]">{item.category || "FIELD ARCHIVE"}</div><h3 className="mt-2 text-lg font-semibold">{item.title || item.caption || "Untitled media"}</h3></div></article>)}</div> : <Empty text="No media published." />}</div></section>

      <footer className="px-5 py-12 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"><div className="font-mono text-[9px] tracking-[.2em] text-white/30">QUSM / QUAVY'S UNITED STATES MILITARY</div><div className="font-mono text-[8px] text-white/20">OFFICIAL INFORMATION SYSTEM · {new Date().getFullYear()}</div></div></footer>
    </main>
  );
}

function SectionHead({ index, label, title }: { index: string; label: string; title: React.ReactNode }) {
  return <div className="mb-12 flex items-end justify-between gap-8 border-b border-white/10 pb-7"><div><div className="mb-4 font-mono text-[9px] tracking-[.25em] text-[#c7aa68]">{index} / {label}</div><h2 className="font-sans text-[clamp(2.8rem,6vw,6rem)] font-medium leading-[.88] tracking-[-.065em]">{title}</h2></div><div className="hidden sm:block font-mono text-[8px] text-white/20">QUSM / LIVE CMS</div></div>;
}

function Empty({ text }: { text: string }) { return <div className="border border-white/10 px-6 py-12 font-mono text-[9px] text-white/25">{text}</div>; }

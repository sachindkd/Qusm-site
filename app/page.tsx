"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ChevronDown, Menu, Shield, X } from "lucide-react";

const divisions = [
  ["HLS", "Homeland security and protective operations."],
  ["SS", "Special security and executive protection."],
  ["USMC", "United States Marine Corps roleplay division."],
  ["NAVY", "Temporarily disbanded.", "TEMPORARILY DISBANDED"],
  ["SOCOM", "Special Operations Command."],
  ["MED", "Medical and emergency services."],
  ["DOJ", "Department of Justice."],
  ["MP", "Military Police."],
];

const coc = [
  { title: "Senior Leadership", items: ["General Manager", "Divisional Heads", "Head of Community Affairs", "Head of Development", "Head of Divisional Operations", "Head of Administrative Operations"] },
  { title: "Management / Staff", items: ["Head of Management", "Management", "Administration", "Moderation", "Intern"] },
  { title: "Roleplay Leadership", items: ["President", "Vice President", "Speaker of the House", "President Pro Tempore", "Secretary of Defense", "Secretary of Homeland Security", "Attorney General"] },
];

export default function HomePage() {
  const [open, setOpen] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="fbmrp">
      <style>{`
        :root{--gold:#d7ad57;--gold2:#f0d58b;--ink:#050606;--panel:#0a0d0c;--line:rgba(215,173,87,.22);--muted:#92958f}
        *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink);color:#f2f0e9;font-family:Arial,Helvetica,sans-serif}.fbmrp{overflow:hidden;background:radial-gradient(circle at 75% 10%,rgba(214,174,87,.09),transparent 28%),#050606}.fbmrp a{color:inherit;text-decoration:none}
        .nav{position:fixed;z-index:40;top:0;left:0;right:0;height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;border-bottom:1px solid transparent;transition:.3s}.nav.scrolled{background:rgba(5,6,6,.86);backdrop-filter:blur(12px);border-color:var(--line)}.brand{display:flex;align-items:center;gap:11px;font-weight:800;letter-spacing:.16em;font-size:14px}.crest{width:34px;height:34px;border:1px solid var(--gold);display:grid;place-items:center;position:relative}.crest:before{content:"";width:13px;height:13px;border:1px solid var(--gold);transform:rotate(45deg)}.navlinks{display:flex;gap:32px;color:#b5b5ad;font-size:12px;text-transform:uppercase;letter-spacing:.14em}.navlinks a:hover{color:var(--gold2)}.navcta{border:1px solid var(--gold);padding:11px 17px;font-size:11px;text-transform:uppercase;letter-spacing:.14em}.menub{display:none;background:none;border:0;color:white}
        .hero{min-height:100svh;position:relative;display:grid;align-items:center;padding:120px 7vw 80px}.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(0,0,0,.97) 18%,rgba(0,0,0,.72) 52%,rgba(8,11,10,.36)),radial-gradient(circle at 78% 45%,rgba(215,173,87,.18),transparent 28%);animation:breath 8s ease-in-out infinite alternate}.hero:after{content:"";position:absolute;inset:0;opacity:.2;background:linear-gradient(rgba(215,173,87,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(215,173,87,.09) 1px,transparent 1px);background-size:70px 70px;mask-image:linear-gradient(to bottom,black,transparent 85%);animation:gridmove 18s linear infinite}.hero-video{position:absolute;inset:0;overflow:hidden;background:linear-gradient(120deg,#070a09,#111612 50%,#080a09)}.hero-video span{position:absolute;width:55vw;height:55vw;border:1px solid rgba(215,173,87,.13);border-radius:50%;right:-14vw;top:12vh;animation:orbit 22s linear infinite}.hero-video span:nth-child(2){width:35vw;height:35vw;right:2vw;top:25vh;animation-duration:15s;animation-direction:reverse}.hero-copy{position:relative;z-index:2;max-width:900px}.eyebrow{display:flex;align-items:center;gap:12px;color:var(--gold);font-size:10px;text-transform:uppercase;letter-spacing:.28em;margin-bottom:25px}.eyebrow i{width:35px;height:1px;background:var(--gold)}h1{font-size:clamp(48px,8vw,128px);line-height:.86;letter-spacing:-.055em;text-transform:uppercase;margin:0;max-width:1100px}.hero-title2{color:transparent;-webkit-text-stroke:1px rgba(240,213,139,.75)}.hero-sub{max-width:530px;color:#a9aaa4;line-height:1.75;margin:30px 0;font-size:15px}.actions{display:flex;gap:12px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;gap:12px;padding:14px 18px;text-transform:uppercase;letter-spacing:.13em;font-size:10px;border:1px solid var(--gold)}.btn.primary{background:var(--gold);color:#080807}.btn.ghost{border-color:rgba(255,255,255,.2)}.hero-meta{position:absolute;right:6vw;bottom:8vh;z-index:2;display:flex;flex-direction:column;gap:8px;text-align:right;color:#747770;font-size:9px;letter-spacing:.18em}.hero-meta b{color:var(--gold);font-weight:400}.scroll{position:absolute;left:7vw;bottom:34px;z-index:2;color:#70736d;font-size:9px;letter-spacing:.2em;text-transform:uppercase;display:flex;gap:10px;align-items:center}
        .section{padding:110px 7vw;border-top:1px solid rgba(255,255,255,.07)}.label{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--gold);margin-bottom:35px}.intro{display:grid;grid-template-columns:1.2fr .8fr;gap:8vw}.intro h2,.section h2{font-size:clamp(38px,5vw,72px);line-height:.95;letter-spacing:-.045em;text-transform:uppercase;margin:0}.intro h2 em,.section h2 em{font-style:normal;color:var(--gold)}.intro p{color:#92958f;line-height:1.8;max-width:480px;margin:0}.stats{display:flex;gap:35px;margin-top:38px}.stat strong{font-size:32px;color:#eee;font-weight:500}.stat span{display:block;color:#70736d;font-size:9px;letter-spacing:.15em;text-transform:uppercase;margin-top:6px}
        .cocgrid{display:grid;gap:10px;margin-top:45px}.cocrow{border-top:1px solid var(--line);background:linear-gradient(90deg,rgba(215,173,87,.045),transparent);}.cochead{width:100%;padding:25px 20px;background:none;border:0;color:#eee;display:flex;align-items:center;justify-content:space-between;text-align:left;cursor:pointer}.cochead strong{font-size:16px;text-transform:uppercase;letter-spacing:.08em}.cochead span{color:var(--gold);font-size:11px;letter-spacing:.16em}.cocbody{display:grid;grid-template-columns:1fr 1fr;padding:0 20px 24px;gap:10px}.cocitem{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);color:#9b9e97;font-size:13px}.cocitem:before{content:"/";color:var(--gold);margin-right:10px}
        .divisions{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:45px}.division{min-height:210px;border:1px solid rgba(255,255,255,.09);padding:22px;position:relative;overflow:hidden;background:linear-gradient(145deg,#0b0e0d,#080a09);transition:.3s}.division:hover{transform:translateY(-4px);border-color:var(--line)}.division:after{content:"";position:absolute;width:100px;height:100px;border:1px solid rgba(215,173,87,.16);border-radius:50%;right:-45px;bottom:-45px}.division small{color:var(--gold);font-size:9px;letter-spacing:.18em}.division h3{font-size:27px;margin:55px 0 10px;letter-spacing:.04em}.division p{color:#737770;font-size:12px;line-height:1.6;max-width:220px}.status{font-size:8px!important;color:#d4b46d!important;letter-spacing:.1em}
        .announce{display:grid;grid-template-columns:.7fr 1.3fr;border:1px solid rgba(255,255,255,.09);margin-top:45px}.announce-side{padding:35px;background:rgba(215,173,87,.04);border-right:1px solid rgba(255,255,255,.08)}.announce-main{padding:35px}.announce h3{font-size:28px;text-transform:uppercase;margin:0 0 14px}.muted{color:#777a74;line-height:1.7;font-size:13px}.pill{display:inline-block;color:var(--gold);font-size:9px;letter-spacing:.18em;text-transform:uppercase;border:1px solid var(--line);padding:8px 10px;margin-bottom:28px}
        .cta{min-height:55vh;display:grid;place-items:center;text-align:center;position:relative;background:radial-gradient(circle,rgba(215,173,87,.1),transparent 45%)}.cta h2{font-size:clamp(44px,7vw,92px)}.footer{padding:35px 7vw;border-top:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;color:#686b65;font-size:9px;letter-spacing:.16em;text-transform:uppercase}.gold{color:var(--gold)}
        @keyframes breath{to{opacity:.72;transform:scale(1.03)}}@keyframes gridmove{to{background-position:70px 70px}}@keyframes orbit{to{transform:rotate(360deg)}}
        @media(max-width:800px){.nav{padding:0 20px}.navlinks,.navcta{display:none}.menub{display:block}.hero{padding:120px 22px 75px;min-height:92svh}.hero-copy{max-width:100%}.hero-meta{display:none}.hero-title2{-webkit-text-stroke:.7px rgba(240,213,139,.75)}.hero-sub{font-size:13px;margin:24px 0}.scroll{left:22px}.section{padding:75px 22px}.intro{grid-template-columns:1fr;gap:35px}.stats{gap:20px}.stat strong{font-size:25px}.cocbody{grid-template-columns:1fr}.divisions{grid-template-columns:1fr 1fr}.division{min-height:175px}.division h3{margin-top:38px;font-size:23px}.announce{grid-template-columns:1fr}.announce-side{border-right:0;border-bottom:1px solid rgba(255,255,255,.08)}.footer{padding:28px 22px;gap:20px;flex-wrap:wrap}.mobile-panel{position:fixed;z-index:35;inset:76px 0 auto 0;background:#070908;border-bottom:1px solid var(--line);padding:25px 22px;display:grid;gap:18px}.mobile-panel a{text-transform:uppercase;font-size:12px;letter-spacing:.14em;color:#aaa}.mobile-panel a:hover{color:var(--gold)}}
      `}</style>

      <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
        <a href="#top" className="brand"><span className="crest" />FBMRP</a>
        <div className="navlinks"><a href="#about">About</a><a href="#command">Command</a><a href="#divisions">Divisions</a><a href="#announcements">Announcements</a></div>
        <a className="navcta" href="#join">Join FBMRP <ArrowRight size={13}/></a>
        <button className="menub" onClick={() => setMenu(!menu)} aria-label="Open menu">{menu ? <X/> : <Menu/>}</button>
      </nav>
      {menu && <div className="mobile-panel"><a href="#about" onClick={() => setMenu(false)}>About</a><a href="#command" onClick={() => setMenu(false)}>Command</a><a href="#divisions" onClick={() => setMenu(false)}>Divisions</a><a href="#announcements" onClick={() => setMenu(false)}>Announcements</a><a href="#join" onClick={() => setMenu(false)}>Recruitment</a></div>}

      <section id="top" className="hero">
        <div className="hero-video" aria-hidden="true"><span/><span/></div>
        <div className="hero-copy">
          <div className="eyebrow"><i/> Fort Bliss Military Roleplay <b>•</b></div>
          <h1>FORT BLISS<br/><span className="hero-title2">MILITARY<br/>ROLEPLAY</span></h1>
          <p className="hero-sub">A centralized command hub for the Fort Bliss Military Roleplay community — built around its people, divisions, leadership and operations.</p>
          <div className="actions"><a className="btn primary" href="#join">Enter FBMRP <ArrowRight size={14}/></a><a className="btn ghost" href="#command">Explore <ArrowDown size={14}/></a></div>
        </div>
        <div className="hero-meta"><b>FBMRP / 001</b><span>FORT BLISS</span><span>EST. COMMAND PORTAL</span></div>
        <div className="scroll"><ArrowDown size={12}/> Scroll to explore</div>
      </section>

      <section id="about" className="section"><div className="label">01 / The organization</div><div className="intro"><h2>One command.<br/><em>One community.</em></h2><div><p>Fort Bliss Military Roleplay brings the complete organization into one clear, living website. Leadership, divisions, announcements, events and community information will be managed from the platform itself.</p><div className="stats"><div className="stat"><strong>08</strong><span>Divisions</span></div><div className="stat"><strong>03</strong><span>CoC categories</span></div><div className="stat"><strong>24/7</strong><span>Community</span></div></div></div></div></section>

      <section id="command" className="section"><div className="label">02 / Chain of command</div><h2>Know the <em>command.</em></h2><div className="cocgrid">{coc.map((group, i) => <div className="cocrow" key={group.title}><button className="cochead" onClick={() => setOpen(open === i ? null : i)}><strong>{group.title}</strong><span>{open === i ? "CLOSE" : "OPEN"} <ChevronDown size={14} style={{transform: open === i ? "rotate(180deg)" : undefined, verticalAlign:"middle"}}/></span></button>{open === i && <div className="cocbody">{group.items.map(item => <div className="cocitem" key={item}>{item}</div>)}</div>}</div>)}</div></section>

      <section id="divisions" className="section"><div className="label">03 / Divisions</div><h2>Choose your <em>division.</em></h2><div className="divisions">{divisions.map(([name, desc, status], i) => <article className="division" key={name}><small>0{i+1} / DIVISION</small><h3>{name}</h3><p className={status ? "status" : ""}>{status || desc}</p></article>)}</div></section>

      <section id="announcements" className="section"><div className="label">04 / Updates</div><h2>Stay <em>informed.</em></h2><div className="announce"><div className="announce-side"><span className="pill">Live channel</span><Shield size={34} strokeWidth={1}/><p className="muted">Public announcements will be able to flow automatically from the official FBMRP Discord channel once the bot is connected.</p></div><div className="announce-main"><h3>Public announcements</h3><p className="muted">This preview uses a clean placeholder state. The production version will support both automatic Discord announcements and authorized manual publishing from the website.</p><a className="btn ghost" href="#join">View all updates <ArrowRight size={13}/></a></div></div></section>

      <section id="join" className="section cta"><div><div className="label">05 / Recruitment</div><h2>Ready to<br/><em>serve?</em></h2><p className="muted">Recruitment will connect directly to the official FBMRP recruitment channel.</p><a className="btn primary" href="#">Join FBMRP <ArrowRight size={14}/></a></div></section>

      <footer className="footer"><span className="gold">FBMRP</span><span>Fort Bliss Military Roleplay</span><span>Website preview / 2026</span></footer>
    </main>
  );
}

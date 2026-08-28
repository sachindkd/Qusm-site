import { getContent } from "@/lib/content";
import ScrollReveal from "@/components/ScrollReveal";
import MotionShell from "@/components/motion-shell";
import { ArrowDown, ArrowUpRight, Command, Menu, Shield, Sparkles } from "lucide-react";

export default async function HomePage() {
  const content = await getContent();
  const featuredAnnouncement = content.announcements[0];
  const featuredMedia = content.media.slice(0, 3);

  return (
    <MotionShell>
      <main className="site-shell">
        <div className="site-progress" aria-hidden="true" />
        <div className="ambient-lines" aria-hidden="true"><i /><i /><i /><i /></div>

        <nav className="site-nav">
          <a href="#top" className="brand-mark" aria-label="QUSM home"><span className="brand-dot" />QUSM</a>
          <div className="nav-links"><a href="#about">About</a><a href="#command">Command</a><a href="#news">Updates</a></div>
          <a href="/login" className="nav-action">Staff <ArrowUpRight size={14} /></a>
          <button className="mobile-menu" aria-label="Menu"><Menu size={20} /></button>
        </nav>

        <section id="top" className="hero-section">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-noise" aria-hidden="true" />
          <div className="hero-crosshair" aria-hidden="true"><span /><span /></div>
          <div className="hero-rule hero-rule-a" aria-hidden="true" /><div className="hero-rule hero-rule-b" aria-hidden="true" />
          <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />

          <div className="hero-copy hero-enter">
            <div className="eyebrow"><span /> Official command portal <b>2026</b></div>
            <h1 aria-label={content.org.fullName}>
              <span className="hero-line hero-word hero-word-1">{content.org.fullName.split(" ").slice(0, 2).join(" ")}</span>
              <span className="hero-line hero-outline hero-word hero-word-2">{content.org.fullName.split(" ").slice(2).join(" ") || "QUSM"}</span>
            </h1>
            <div className="hero-meta"><span>EST. / COMMAND</span><span>UAE / HQ</span><span>SCROLL ↓</span></div>
            <p className="hero-description hero-fade-delay">A living command hub for people, divisions, announcements and the systems that keep QUSM moving.</p>
            <div className="hero-actions hero-fade-delay"><a href="#command" className="button button-primary">Explore QUSM <ArrowDown size={16} /></a><a href="#news" className="button button-ghost">Latest updates <ArrowUpRight size={15} /></a></div>
          </div>

          <div className="hero-card-wrap">
            <div className="hero-card-shadow" />
            <article className="hero-card">
              <div className="card-topbar"><span><span className="status-dot" /> LIVE SYSTEM</span><span>QUSM / 001</span></div>
              <div className="card-symbol"><Shield size={30} strokeWidth={1.2} /></div>
              <div className="card-big-number">01</div>
              <div className="card-caption"><span>COMMAND</span><strong>{content.org.owner}</strong></div>
              <div className="card-scanline" /><div className="card-corner card-corner-tl" /><div className="card-corner card-corner-br" />
              <div className="card-axis card-axis-x" /><div className="card-axis card-axis-y" />
            </article>
          </div>
          <div className="scroll-cue"><span>Scroll to explore</span><ArrowDown size={14} /></div>
        </section>

        <div className="ticker" aria-hidden="true"><div><span>QUSM</span><i>COMMAND / PEOPLE / PURPOSE</i><span>QUSM</span><i>COMMAND / PEOPLE / PURPOSE</i><span>QUSM</span><i>COMMAND / PEOPLE / PURPOSE</i></div></div>

        <ScrollReveal><section id="about" className="statement-section section-pad" data-reveal>
          <div className="section-label">/ 01 — The organization</div>
          <div className="statement-grid"><h2>Built like a <em>system.</em><br />Presented like a <em>statement.</em></h2>
            <div className="statement-side"><p>{content.org.fullName} brings the entire command structure into one clear, accessible place.</p>
              <div className="mini-stats"><div><strong>{content.divisions.length.toString().padStart(2, "0")}</strong><span>Divisions</span></div><div><strong>{content.leadership.length.toString().padStart(2, "0")}</strong><span>Leaders</span></div><div><strong>{content.ranks.length.toString().padStart(2, "0")}</strong><span>Ranks</span></div></div>
            </div>
          </div>
        </section></ScrollReveal>

        <ScrollReveal delay={0.05}><section id="command" className="command-section section-pad" data-reveal>
          <div className="section-label">/ 02 — Command structure</div>
          <div className="section-heading-row"><h2>Meet the <span>command.</span></h2><span className="heading-index">01 / 03</span></div>
          <div className="command-feature"><div className="feature-number">01</div><div className="feature-main"><div className="feature-kicker"><Command size={15} /> COMMAND</div><h3>{featuredAnnouncement?.title || "The command center"}</h3><p>{featuredAnnouncement?.body || "The latest information from QUSM command."}</p><a href="#news" className="text-link">View announcements <ArrowUpRight size={15} /></a></div><div className="feature-side"><span>OWNER</span><strong>{content.org.owner}</strong><span>CO-OWNER</span><strong>{content.org.coOwner}</strong></div></div>
          <div className="division-grid">{content.divisions.slice(0, 4).map((d, index) => <article className="division-card" key={d.id}><div className="division-top"><span>0{index + 1}</span><ArrowUpRight size={16} /></div><h3>{d.name}</h3><p>{d.desc}</p><div className="division-head">HEAD — {d.head}</div></article>)}</div>
        </section></ScrollReveal>

        <ScrollReveal><section id="news" className="news-section section-pad" data-reveal><div className="section-label">/ 03 — Signal</div><div className="section-heading-row"><h2>What&apos;s <span>happening.</span></h2><Sparkles size={22} className="heading-icon" /></div>
          <div className="news-list">{content.news.slice(0, 5).map((n, index) => <article className="news-item" key={n.id}><span className="news-index">0{index + 1}</span><span className="news-date">{n.date}</span><div className="news-body"><span className="news-tag">{n.tag}</span><h3>{n.title}</h3><p>{n.body}</p></div><ArrowUpRight className="news-arrow" size={18} /></article>)}</div>
        </section></ScrollReveal>

        <ScrollReveal><section className="media-section section-pad" data-reveal><div className="section-label">/ Visual archive</div><div className="media-intro"><h2>Inside<br /><em>QUSM.</em></h2><p>Selected moments, systems and visual records.</p></div>
          <div className="media-grid">{featuredMedia.map((m, index) => <div className={`media-card media-${index + 1}`} key={m.id} style={m.imageUrl ? { backgroundImage: `url(${m.imageUrl})` } : undefined}><div className="media-overlay" /><span>{m.caption}</span></div>)}</div>
        </section></ScrollReveal>

        <ScrollReveal><section className="cta-section section-pad" data-reveal><div className="cta-glow" /><div className="cta-ring" /><div className="section-label">/ End transmission</div><h2>Keep the<br /><span>mission moving.</span></h2><p>Stay close to the command structure, latest updates and everything QUSM.</p><a href="/login" className="button button-primary">Enter staff portal <ArrowUpRight size={16} /></a></section></ScrollReveal>

        <footer className="site-footer"><div><span className="brand-dot" /> QUSM</div><span>© {new Date().getFullYear()} {content.org.fullName}</span><a href="/login">Staff access</a></footer>
      </main>
    </MotionShell>
  );
}

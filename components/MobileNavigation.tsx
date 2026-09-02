"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

type CustomSection = { id?: string; slug?: string; title?: string; published?: boolean; order?: number };
type NavLink = readonly [string, `#${string}`];

const baseLinks: readonly NavLink[] = [
  ["INTEL", "#intel"], ["COMMAND", "#command"], ["DIVISIONS", "#divisions"],
  ["OPERATIONS", "#operations"], ["RULES", "#rules"], ["MEDIA", "#media"], ["STORE", "#store"],
];

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<CustomSection[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/content", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (alive && Array.isArray(data.customSections)) setSections(data.customSections);
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 15000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  const links = useMemo<readonly NavLink[]>(() => {
    const custom: NavLink[] = [];
    [...sections]
      .filter(section => section.published !== false && Boolean(section.title))
      .sort((a, b) => Number(a.order ?? 99) - Number(b.order ?? 99))
      .forEach(section => {
        const target = String(section.slug || section.id || "").replace(/^#/, "").replace(/^\//, "");
        if (target) custom.push([String(section.title), `#${target}` as `#${string}`]);
      });
    return [...baseLinks, ...custom];
  }, [sections]);

  return (
    <>
      <header className="mobile-functional-nav" data-open={open}>
        <a href="#home" className="mobile-functional-brand" onClick={() => setOpen(false)}>FBMR<span>.</span></a>
        <button type="button" className="mobile-functional-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
        </button>
      </header>
      {open && (
        <div className="mobile-functional-panel" role="dialog" aria-label="Mobile navigation">
          <div className="mobile-functional-panel-inner">
            <div className="mobile-functional-kicker">FBMR / NAVIGATION</div>
            <nav aria-label="Mobile site navigation">
              {links.map(([label, href], index) => (
                <a key={`${href}-${label}`} href={href} className="mobile-functional-link" onClick={() => setOpen(false)}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><ArrowUpRight size={17} strokeWidth={1.5} />
                </a>
              ))}
            </nav>
            <div className="mobile-functional-actions">
              <a href="/authorize" onClick={() => setOpen(false)}>DISCORD <ArrowUpRight size={15} /></a>
              <a href="/staff" onClick={() => setOpen(false)}>STAFF <ArrowUpRight size={15} /></a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

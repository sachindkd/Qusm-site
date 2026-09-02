"use client";

import { useEffect, useState } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";

const links = [
  ["INTEL", "#intel"],
  ["COMMAND", "#command"],
  ["DIVISIONS", "#divisions"],
  ["OPERATIONS", "#operations"],
  ["RULES", "#rules"],
  ["MEDIA", "#media"],
  ["STORE", "#store"],
] as const;

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  return (
    <>
      <header className="mobile-functional-nav" data-open={open}>
        <a href="#home" className="mobile-functional-brand" onClick={() => setOpen(false)}>
          FBMR<span>.</span>
        </a>
        <button
          type="button"
          className="mobile-functional-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          onClick={() => setOpen(value => !value)}
        >
          {open ? <X size={22} strokeWidth={1.7} /> : <Menu size={22} strokeWidth={1.7} />}
        </button>
      </header>

      {open && (
        <div className="mobile-functional-panel" role="dialog" aria-label="Mobile navigation">
          <div className="mobile-functional-panel-inner">
            <div className="mobile-functional-kicker">FBMR / NAVIGATION</div>
            <nav aria-label="Mobile site navigation">
              {links.map(([label, href], index) => (
                <a key={href} href={href} className="mobile-functional-link" onClick={() => setOpen(false)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{label}</strong>
                  <ArrowUpRight size={17} strokeWidth={1.5} />
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

"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

type Rule = {
  id?: string;
  title?: string;
  category?: string;
  body?: string;
  order?: number;
  active?: boolean;
  status?: string;
};

const clean = (items: Rule[] = []) =>
  items
    .filter((x) => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft")
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

export default function RulesSection() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/content", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        setRules(clean(Array.isArray(data?.rules) ? data.rules : []));
      })
      .catch(() => alive && setRules([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="rules" className="relative border-t border-white/10 py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-5 md:px-10">
        <div className="mb-14 flex items-end justify-between gap-8">
          <div>
            <span className="font-mono text-[9px] tracking-[.35em] text-[#d4b56a]">05 / RULES & STANDARDS</span>
            <h2 className="mt-5 text-6xl font-semibold tracking-[-.07em] md:text-8xl">THE<br/><span className="text-[#d4b56a]">RULEBOOK.</span></h2>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/40 md:text-base">
              Official FBMR rules published by staff. Updates made through Staff Management are reflected here automatically.
            </p>
          </div>
          <BookOpen className="hidden text-[#d4b56a] md:block" size={28}/>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse border border-white/10 bg-white/[.025]" />)}
          </div>
        ) : rules.length ? (
          <div className="space-y-2">
            {rules.map((rule, i) => {
              const key = rule.id || `${rule.title || "rule"}-${i}`;
              const expanded = open === key;
              return (
                <motion.article key={key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border border-white/10 bg-[#0b0e0c]">
                  <button onClick={() => setOpen(expanded ? null : key)} className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-7">
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="font-mono text-[9px] text-[#d4b56a]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block break-words text-base font-semibold md:text-lg">{rule.title || `Rule ${i + 1}`}</span>
                        {rule.category && <span className="mt-1 block font-mono text-[8px] uppercase tracking-[.18em] text-white/30">{rule.category}</span>}
                      </span>
                    </span>
                    <ChevronDown size={17} className={`shrink-0 text-[#d4b56a] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-white/10 px-5 py-6 text-sm leading-7 text-white/55 md:px-7">
                      {rule.body || "No additional details have been published for this rule."}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 px-6 py-16 text-center">
            <BookOpen className="mx-auto mb-4 text-[#d4b56a]/50" size={28}/>
            <h3 className="text-2xl">No rules published yet.</h3>
            <p className="mt-2 text-sm text-white/30">Publish rules from Staff Management and they will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

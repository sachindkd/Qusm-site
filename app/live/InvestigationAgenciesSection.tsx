"use client";

import { motion } from "framer-motion";

const agencies = [
  {
    code: "OPR",
    name: "Office of Professional Responsibility",
    eyebrow: "INTERNAL AFFAIRS",
    description:
      "Handles professional standards, misconduct investigations, personnel accountability, integrity matters, and internal-affairs cases within QUSM. OPR focuses on conduct, standards, and keeping personnel accountable.",
    scope: "Personnel conduct • Standards • Misconduct • Accountability",
  },
  {
    code: "HSI",
    name: "Homeland Security Investigations",
    eyebrow: "INVESTIGATIONS",
    description:
      "Handles criminal, intelligence, and investigative operations involving domestic QUSM-related threats and violations. HSI may investigate personnel matters reaching up to VPOTUS-level involvement when authorized.",
    scope: "Criminal cases • Intelligence • Threats • Major investigations",
  },
  {
    code: "CISA",
    name: "Cybersecurity & Infrastructure Security Agency",
    eyebrow: "CYBERSECURITY",
    description:
      "Handles cybersecurity, cyber-threat response, infrastructure protection, and resilience against digital threats affecting QUSM. CISA is the specialist agency for protecting critical systems and responding to cyber incidents.",
    scope: "Cybersecurity • Threat response • Infrastructure • Resilience",
  },
];

export default function InvestigationAgenciesSection() {
  return (
    <section className="border-t border-white/10 bg-[#080a0d] px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl sm:mb-16">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-[#c2a05f]">
            INVESTIGATIONS / SECURITY AGENCIES
          </p>
          <h2 className="font-serif text-4xl leading-[0.95] text-[#f2efe7] sm:text-6xl">
            Beyond the NSA.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
            Specialized investigative agencies operate beneath the National Security Agency in the security structure, each with a defined mission and jurisdiction.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {agencies.map((agency, index) => (
            <motion.article
              key={agency.code}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="group relative overflow-hidden rounded-sm border border-white/10 bg-white/[0.025] p-6 transition-colors duration-300 hover:border-[#c2a05f]/35 hover:bg-white/[0.04] sm:p-7"
            >
              <div className="absolute left-0 top-0 h-full w-px bg-[#c2a05f]/35 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-4">
                <span className="font-mono text-[10px] tracking-[0.28em] text-[#c2a05f]">{agency.eyebrow}</span>
                <span className="font-mono text-xs text-white/25">0{index + 1}</span>
              </div>
              <h3 className="mt-8 font-serif text-2xl text-[#f2efe7]">{agency.code}</h3>
              <p className="mt-1 text-sm font-medium text-white/70">{agency.name}</p>
              <p className="mt-5 text-sm leading-6 text-white/48">{agency.description}</p>
              <div className="mt-7 border-t border-white/8 pt-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">Primary scope</p>
                <p className="mt-2 text-xs leading-5 text-white/55">{agency.scope}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-l border-[#c2a05f]/40 pl-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
            Agency structure remains subordinate to NSA authority.
          </p>
          <p className="font-serif text-sm italic text-[#c2a05f]/75">"Every case leaves a trail."</p>
        </div>
      </div>
    </section>
  );
}

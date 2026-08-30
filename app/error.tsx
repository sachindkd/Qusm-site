"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("QUSM page runtime error", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-bg text-white flex items-center justify-center px-6">
      <section className="max-w-xl w-full border border-border bg-panel rounded-2xl p-8 text-center">
        <p className="font-mono text-[10px] tracking-[2px] text-golddim uppercase">QUSM / SYSTEM RECOVERY</p>
        <h1 className="font-serif text-4xl font-bold mt-3">Page failed to load.</h1>
        <p className="text-textdim text-sm mt-4">The website hit a client-side error. You can retry without losing your saved content.</p>
        <button onClick={() => reset()} className="mt-7 bg-gold text-black px-5 py-3 rounded-lg font-mono text-[10px] uppercase">
          Retry page
        </button>
      </section>
    </main>
  );
}

export default function Loading() {
  return (
    <main aria-label="Loading" className="min-h-screen bg-[#070707] px-5 py-20 text-[#f2f0ea]">
      <div className="mx-auto max-w-6xl space-y-10 animate-pulse">
        <div className="h-px w-full bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/10" />
        <div className="space-y-3">
          <div className="h-16 w-3/4 rounded bg-white/10" />
          <div className="h-16 w-1/2 rounded bg-white/10" />
        </div>
        <div className="h-4 w-full max-w-xl rounded bg-white/5" />
        <div className="h-4 w-2/3 max-w-lg rounded bg-white/5" />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-44 rounded border border-white/10 bg-white/[0.02]" />
          <div className="h-44 rounded border border-white/10 bg-white/[0.02]" />
          <div className="h-44 rounded border border-white/10 bg-white/[0.02]" />
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#070707] px-5 py-20 text-[#f2f0ea]">
      <div className="mx-auto max-w-6xl animate-pulse space-y-8">
        <div className="h-2 w-24 rounded bg-white/10" />
        <div className="h-16 w-3/4 rounded bg-white/10" />
        <div className="h-4 w-1/2 rounded bg-white/5" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-44 rounded border border-white/10 bg-white/[0.02]" />
          <div className="h-44 rounded border border-white/10 bg-white/[0.02]" />
        </div>
      </div>
    </main>
  );
}

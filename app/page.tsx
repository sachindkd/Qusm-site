import { getContent } from "@/lib/content";

export default async function HomePage() {
  const content = await getContent();

  return (
    <main className="min-h-screen bg-bg text-white px-6 py-12 sm:px-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <header className="mb-14 pb-8 border-b border-border">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-3">
            Command Portal
          </div>
          <h1 className="font-serif text-4xl font-bold">{content.org.fullName}</h1>
          <p className="text-textdim text-sm mt-3">
            {content.org.owner} — Owner · {content.org.coOwner} — Co-Owner
          </p>
        </header>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Announcements
          </div>
          <div className="border-t border-border">
            {content.announcements.map((a) => (
              <div key={a.id} className="grid grid-cols-[90px_1fr] gap-4 py-4 border-b border-border">
                <div className="font-mono text-xs text-textfaint pt-0.5">{a.date}</div>
                <div>
                  <div className="font-semibold text-sm mb-1">{a.title}</div>
                  <div className="text-sm text-textdim leading-relaxed">{a.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Government
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {content.government.map((g) => (
              <div key={g.id} className="border border-border bg-panel p-5">
                <div className="font-semibold text-sm">{g.name}</div>
                <div className="font-mono text-[10px] text-gold uppercase tracking-wide mt-1 mb-2">{g.title}</div>
                <div className="text-xs text-textdim leading-relaxed">{g.note}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Chain of Command
          </div>
          <div className="border-t border-border">
            {content.leadership.map((l) => (
              <div key={l.id} className="grid grid-cols-[70px_1fr] gap-4 items-center py-4 border-b border-border">
                <div className="font-mono text-[11px] text-golddim">{l.rank}</div>
                <div>
                  <div className="font-semibold text-sm">{l.name}</div>
                  <div className="text-xs text-textdim mt-0.5">{l.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Divisions
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {content.divisions.map((d) => (
              <div key={d.id} className="border border-border bg-panel p-5">
                <div className="font-serif font-semibold text-lg mb-1">{d.name}</div>
                <div className="text-xs text-gold mb-2">Head — {d.head}</div>
                <div className="text-xs text-textdim leading-relaxed">{d.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Rank Structure
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left font-mono text-[10px] uppercase tracking-wide text-textfaint pb-2 border-b border-borderhi">Code</th>
                <th className="text-left font-mono text-[10px] uppercase tracking-wide text-textfaint pb-2 border-b border-borderhi">Rank</th>
                <th className="text-left font-mono text-[10px] uppercase tracking-wide text-textfaint pb-2 border-b border-borderhi">Description</th>
              </tr>
            </thead>
            <tbody>
              {content.ranks.map((r) => (
                <tr key={r.id}>
                  <td className="py-3 border-b border-border font-mono text-xs text-gold">{r.code}</td>
                  <td className="py-3 border-b border-border text-sm font-semibold">{r.name}</td>
                  <td className="py-3 border-b border-border text-xs text-textdim">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Rules &amp; Regulations
          </div>
          {content.rules.map((r) => (
            <div key={r.id} className="py-5 border-b border-border">
              <div className="font-semibold text-sm mb-1.5">{r.title}</div>
              <div className="text-sm text-textdim leading-relaxed">{r.body}</div>
            </div>
          ))}
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            News &amp; Updates
          </div>
          <div className="border-l border-border ml-1.5">
            {content.news.map((n) => (
              <div key={n.id} className="relative pl-6 pb-7 last:pb-0">
                <div className="absolute -left-[5px] top-1 w-2 h-2 bg-golddim" />
                <div className="font-mono text-[10px] text-textfaint tracking-wide mb-1.5">{n.date}</div>
                <span className="inline-block font-mono text-[9px] uppercase tracking-wide border border-borderhi text-textdim px-2 py-0.5 mb-2">{n.tag}</span>
                <div className="font-semibold text-sm mb-1.5">{n.title}</div>
                <div className="text-xs text-textdim leading-relaxed">{n.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Media
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {content.media.map((m) => (
              <div
                key={m.id}
                className="aspect-[4/3] border border-border flex items-end p-3"
                style={{
                  background: m.imageUrl
                    ? `url(${m.imageUrl}) center/cover`
                    : "linear-gradient(135deg,#171C27,#0F131C)",
                }}
              >
                <span className="font-mono text-[9px] text-textdim tracking-wide">{m.caption}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-4">
            Applications
          </div>
          <div className="flex flex-col gap-3">
            {content.applications.map((a) => (
              <div key={a.id} className="border border-border bg-panel p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-sm">{a.name}</div>
                  <div className="text-xs text-textdim mt-1">{a.desc}</div>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 border shrink-0 ${
                    a.status === "open" ? "text-olive border-olive" : "text-red border-red"
                  }`}
                >
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer className="pt-8 font-mono text-[9px] text-textfaint tracking-wide">
          <a href="/login" className="hover:text-textdim transition-colors">staff</a>
        </footer>
      </div>
    </main>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Database, MessageSquare, ShieldCheck } from "lucide-react";
import { FBMRP_GUILD_ID } from "@/lib/discord-roles";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { QUOTA_GOOGLE_WEBHOOK_URL, QUOTA_REVIEW_CHANNEL_ID, QUOTA_REVIEW_ROLE_ID } from "@/lib/quota";

async function getReviewer() {
  const session = readDiscordSession((await cookies()).get(DISCORD_SESSION_COOKIE)?.value);
  if (!session || !process.env.DISCORD_BOT_TOKEN) return null;
  const response = await fetch(`https://discord.com/api/v10/guilds/${FBMRP_GUILD_ID}/members/${encodeURIComponent(session.id)}`, { headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }, cache: "no-store" });
  if (!response.ok) return null;
  const member = await response.json() as { roles?: string[]; nick?: string | null; user?: { username?: string } };
  if (!(member.roles ?? []).includes(QUOTA_REVIEW_ROLE_ID)) return null;
  return { id: session.id, name: member.nick || member.user?.username || session.username };
}

export default async function QuotaTester() {
  const reviewer = await getReviewer();
  if (!reviewer) redirect("/authorize?next=/quota-tester");
  const discordReady = Boolean(process.env.DISCORD_BOT_TOKEN && QUOTA_REVIEW_CHANNEL_ID);
  const googleReady = Boolean(QUOTA_GOOGLE_WEBHOOK_URL);
  return <main className="min-h-screen bg-[#060a12] text-white px-5 py-10"><div className="mx-auto max-w-5xl"><a href="/member" className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[2px] text-white/40 hover:text-white"><ArrowLeft size={13}/> Member Portal</a>
    <header className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6 sm:p-8"><p className="font-mono text-[9px] uppercase tracking-[3px] text-amber-300">FBMRP · LOGISTICS TEST PANEL</p><h1 className="mt-2 text-3xl sm:text-4xl font-bold">Quota workflow tester</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">Restricted to the Logistics reviewer role. This panel is separate from the existing Time Database flow and is designed to verify the new quota → Discord review → Google database pipeline.</p><p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-white/35">Signed in as {reviewer.name} · Role {QUOTA_REVIEW_ROLE_ID}</p></header>
    <section className="grid gap-4 sm:grid-cols-2 mt-6"><Status icon={<MessageSquare size={16}/>} title="Discord review channel" value={discordReady ? "Configured" : "Needs channel ID"} ok={discordReady}/><Status icon={<Database size={16}/>} title="External Google database" value={googleReady ? "Configured" : "Needs webhook URL"} ok={googleReady}/></section>
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><div className="flex items-start gap-4"><ShieldCheck className="text-amber-300 shrink-0" size={20}/><div><h2 className="font-semibold">How the live test works</h2><ol className="mt-4 space-y-3 text-sm text-white/60 list-decimal pl-5"><li>Use the member portal's <b className="text-white">Log your quota</b> page to submit a real test entry.</li><li>The site posts the submission, proof link and two review buttons into the dedicated Logistics Discord channel.</li><li>A reviewer with this role approves or rejects it directly in Discord.</li><li>Only an approval triggers the external Google webhook; rejection never writes a quota row.</li></ol></div></div></section>
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.025] p-6"><h2 className="font-semibold">Integration configuration</h2><div className="mt-4 grid gap-3 font-mono text-[10px]"><Row name="Reviewer role" value={QUOTA_REVIEW_ROLE_ID}/><Row name="Review channel" value={QUOTA_REVIEW_CHANNEL_ID || "NOT CONFIGURED"}/><Row name="Google endpoint" value={googleReady ? "CONFIGURED (hidden)" : "NOT CONFIGURED"}/><Row name="Main guild" value={FBMRP_GUILD_ID}/></div><p className="mt-5 text-xs text-white/35">The Google endpoint is intentionally hidden here. Keep it server-side as an environment variable.</p></section>
    <a href="/quota" className="button button-primary inline-flex mt-6"><CheckCircle2 size={13}/> OPEN QUOTA SUBMISSION</a>
  </div></main>;
}
function Status({icon,title,value,ok}:{icon:React.ReactNode;title:string;value:string;ok:boolean}){return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center gap-3 text-white/70">{icon}<span className="font-semibold">{title}</span></div><p className={`mt-4 font-mono text-[10px] uppercase tracking-wider ${ok?"text-emerald-300":"text-red-300"}`}>{ok?"●":"●"} {value}</p></div>}
function Row({name,value}:{name:string;value:string}){return <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-white/5 bg-black/10 px-3 py-3"><span className="text-white/35">{name}</span><span className="text-white/70 break-all">{value}</span></div>}

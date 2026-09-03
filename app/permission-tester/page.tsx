import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/discord-auth";
import { SPECIAL_OWNER_ID, ROLE_IDS, getAccessLevel, getPermissions, type AccessLevel } from "@/lib/discord-roles";

const TEST_ROLES = [
  ["Owner", ROLE_IDS.owner, "owner"], ["Co-Owner", ROLE_IDS.coOwner, "owner"], ["Chairman", ROLE_IDS.chairman, "owner"],
  ["Vice Chairman", ROLE_IDS.viceChairman, "owner"], ["OFC Admin", ROLE_IDS.ofcAdmin, "owner"],
  ["Head Operations", ROLE_IDS.headOperations, "ownership"], ["Head Administration", ROLE_IDS.headAdministration, "ownership"],
  ["Community Affairs", ROLE_IDS.communityAffairs, "ownership"], ["CEO", ROLE_IDS.ceo, "ownership"], ["Head Development", ROLE_IDS.headDevelopment, "ownership"],
  ["Head Management", ROLE_IDS.headManagement, "senior-leadership"], ["General Manager", ROLE_IDS.generalManager, "senior-leadership"],
  ["Head Department", ROLE_IDS.headDepartment, "senior-leadership"], ["Senior Management", ROLE_IDS.seniorManagement, "senior-leadership"],
  ["Developer Posts", ROLE_IDS.developerPosts, "developer"], ["Aides", ROLE_IDS.aides, "aide"], ["Staff", ROLE_IDS.staff, "staff"],
  ["Member / No special role", "", "member"],
] as const;

const EXPECTED = new Map(TEST_ROLES.map(([name, , access]) => [name, access]));
const SELECTED_ROLE_COOKIE = "fbmrp-permission-tester-role";

function label(value: AccessLevel) {
  return value === "senior-leadership" ? "Senior Leadership" : value.replaceAll("-", " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default async function PermissionTester() {
  const session = await getServerSession(authOptions);
  const user = session?.user as ({ id?: string; discordId?: string } | undefined);
  const discordId = user?.id ?? user?.discordId;

  if (!session) redirect("/authorize?next=/permission-tester");
  if (discordId !== SPECIAL_OWNER_ID) redirect("/live");

  async function selectRole(formData: FormData) {
    "use server";

    const currentSession = await getServerSession(authOptions);
    const currentUser = currentSession?.user as ({ id?: string; discordId?: string } | undefined);
    const currentDiscordId = currentUser?.id ?? currentUser?.discordId;
    if (!currentSession || currentDiscordId !== SPECIAL_OWNER_ID) redirect("/live");

    const roleId = String(formData.get("roleId") ?? "");
    const valid = TEST_ROLES.some(([, id]) => id === roleId);
    if (!valid) redirect("/permission-tester");

    const cookieStore = await cookies();
    cookieStore.set(SELECTED_ROLE_COOKIE, roleId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/permission-tester",
      maxAge: 60 * 60 * 8,
    });
    redirect("/permission-tester");
  }

  const selectedRoleId = (await cookies()).get(SELECTED_ROLE_COOKIE)?.value ?? TEST_ROLES[0][1];
  const selected = TEST_ROLES.find(([, id]) => id === selectedRoleId) ?? TEST_ROLES[0];
  const [selectedName, selectedId] = selected;
  const simulated = getAccessLevel("permission-tester", selectedId ? [selectedId] : []);
  const permissions = getPermissions(simulated);

  return (
    <main className="min-h-screen bg-[#060a12] text-white px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[3px] text-amber-300">FBMRP · SPECIAL USER TOOL</p>
          <h1 className="mt-2 text-3xl font-bold">Discord Permission Tester</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">Simulate any configured Discord role against the exact deterministic access resolver used by the website. Nothing here changes your real Discord roles or live session permissions.</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <h2 className="font-semibold">Simulate Discord role</h2>
            <p className="mt-1 text-xs text-white/40">Choose a role below. The selection is stored server-side; it is not passed in the URL.</p>
            <form action={selectRole} className="mt-4 space-y-2">
              {TEST_ROLES.map(([name, id]) => (
                <button key={name} name="roleId" value={id} type="submit" className={`block w-full rounded-xl border px-4 py-3 text-left text-sm transition ${name === selectedName ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/10 bg-black/10 text-white/75 hover:bg-white/[0.06]"}`}>
                  <span className="font-medium">{name}</span>
                  {name === selectedName && <span className="float-right font-mono text-[9px] uppercase tracking-widest text-amber-300/70">Selected</span>}
                </button>
              ))}
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <p className="text-xs uppercase tracking-widest text-white/35">Simulated result</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedName}</h2>
                  <p className="mt-1 font-mono text-xs text-white/35">Role ID: {selectedId || "none"}</p>
                </div>
                <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-200">{label(simulated)}</div>
              </div>
              <p className="mt-5 text-sm text-white/50">Expected access: <span className="text-white/80">{label(EXPECTED.get(selectedName) as AccessLevel)}</span> · Resolver result: <span className={simulated === EXPECTED.get(selectedName) ? "text-emerald-300" : "text-red-300"}>{simulated === EXPECTED.get(selectedName) ? "PASS" : "FAIL"}</span></p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="font-semibold">Permissions granted</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {permissions.map(permission => <div key={permission} className="rounded-lg border border-white/10 bg-black/10 px-3 py-2 font-mono text-xs text-white/65">✓ {permission}</div>)}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
              <h2 className="font-semibold">Quick hierarchy check</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-white/10 text-white/35"><th className="px-3 py-2">Discord role</th><th className="px-3 py-2">Expected</th><th className="px-3 py-2">Result</th></tr></thead>
                  <tbody>{TEST_ROLES.map(([name, id, expected]) => { const actual = getAccessLevel("permission-tester", id ? [id] : []); return <tr key={name} className="border-b border-white/5"><td className="px-3 py-2">{name}</td><td className="px-3 py-2 text-white/50">{label(expected)}</td><td className={`px-3 py-2 font-semibold ${actual === expected ? "text-emerald-300" : "text-red-300"}`}>{actual === expected ? "PASS" : `FAIL: ${label(actual)}`}</td></tr>; })}</tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

const cards = [
  ["Website Content", "Edit pages, leadership, divisions and information."],
  ["Announcements", "Manage website announcements and public updates."],
  ["Calendar", "Create and manage official FBMRP events."],
  ["Developer Media", "Publish approved developer images and media."],
];

export default function StaffDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => {
      setUser(data.authenticated ? data.user : null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <main className="staff-page"><div className="staff-shell"><p>Checking Discord access…</p></div></main>;
  if (!user) return <main className="staff-page"><div className="staff-shell"><h1>Staff Access</h1><p>You must sign in with Discord to access this area.</p><a className="staff-button" href="/api/auth/signin/discord">Login with Discord</a></div></main>;

  const access = user.access || "member";
  const allowed = access !== "member";

  if (!allowed) return <main className="staff-page"><div className="staff-shell"><h1>Access Denied</h1><p>Your Discord account does not have an FBMRP staff role.</p></div></main>;

  return <main className="staff-page"><div className="staff-shell">
    <div className="staff-top"><div><span className="eyebrow">FBMRP STAFF PORTAL</span><h1>Command Center</h1><p>Signed in as <strong>{user.username}</strong></p></div><span className="access-badge">{access.replace("-", " ")}</span></div>
    <section className="staff-grid">{cards.map(([title, desc]) => <article className="staff-card" key={title}><span className="card-arrow">↗</span><h2>{title}</h2><p>{desc}</p><button>Open</button></article>)}</section>
  </div></main>;
}

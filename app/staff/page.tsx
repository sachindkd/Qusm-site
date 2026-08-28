"use client";
import { useEffect, useState } from "react";
import "./staff.css";
const cards=[
 ["Website Content","Edit leadership, divisions, CoC and site information.","owner","content"],
 ["Announcements","Manage public announcements and automatic Discord feed.","management","announcements"],
 ["Calendar","Create and manage official FBMRP events.","management","calendar"],
 ["Developer Media","Publish approved developer images and media.","developer","developer"],
];
const rankOrder:any={owner:5,management:4,"senior-leadership":3,developer:2,aide:2,staff:1};
export default function StaffDashboard(){
 const [user,setUser]=useState<any>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/auth/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{setUser(d.authenticated?d.user:null);setLoading(false)}).catch(()=>setLoading(false))},[]);
 if(loading)return <main className="staff-page"><div className="staff-shell"><p>Checking live Discord access…</p></div></main>;
 if(!user)return <main className="staff-page"><div className="staff-shell"><span className="eyebrow">FBMRP STAFF PORTAL</span><h1>Staff Access</h1><p>Sign in with Discord to continue.</p><a className="staff-button" href="/api/auth/signin/discord">Login with Discord</a></div></main>;
 const access=user.access||"member"; if(access==="member")return <main className="staff-page"><div className="staff-shell"><h1>Access Denied</h1><p>Your current Discord roles do not grant website staff access.</p><a className="staff-button" href="/api/auth/signin/discord">Re-check Discord</a></div></main>;
 const level=rankOrder[access]||0;
 return <main className="staff-page"><div className="staff-shell"><div className="staff-top"><div><span className="eyebrow">FBMRP STAFF PORTAL</span><h1>Command Center</h1><p>Signed in as <strong>{user.username}</strong></p></div><span className="access-badge">{access.replaceAll("-"," ")}</span></div><section className="staff-grid">{cards.filter(c=>level>=rankOrder[c[2]]).map(c=><article className="staff-card" key={c[0]}><span className="card-arrow">↗</span><h2>{c[0]}</h2><p>{c[1]}</p><button>Open</button></article>)}</section></div></main>;
}

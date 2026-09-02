"use client";
import { useEffect, useState } from "react";
import { Bell, Check, X, ExternalLink } from "lucide-react";

type Notification={id:number;section:string;title:string;message:string;createdAt:string;read:boolean};

export default function NotificationCenter(){
 const [open,setOpen]=useState(false); const [items,setItems]=useState<Notification[]>([]); const [unread,setUnread]=useState(0); const [auth,setAuth]=useState(false); const [loading,setLoading]=useState(false);
 const load=async()=>{try{const r=await fetch('/api/notifications',{cache:'no-store'});const d=await r.json();setAuth(Boolean(d.authenticated));setItems(d.notifications||[]);setUnread(Number(d.unreadCount||0))}catch{}};
 useEffect(()=>{void load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);
 const markRead=async(id:number)=>{setItems(v=>v.map(n=>n.id===id?{...n,read:true}:n));setUnread(v=>Math.max(0,v-1));try{await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})})}catch{void load()}};
 const markAll=async()=>{setLoading(true);try{await fetch('/api/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({all:true})});setItems(v=>v.map(n=>({...n,read:true})));setUnread(0)}finally{setLoading(false)}};
 return <div className="fixed right-20 top-4 z-[240] sm:right-24 sm:top-5">
  <button aria-label="Notifications" onClick={()=>setOpen(v=>!v)} className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-[#080b09]/90 text-white shadow-lg backdrop-blur-xl transition hover:border-[#d4b56a]/50">
   <Bell size={17}/>{unread>0&&<span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[#080b09] bg-[#d4b56a] px-1 font-mono text-[8px] font-bold text-black">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<div className="fixed inset-x-3 top-16 z-[241] w-auto overflow-hidden rounded-2xl border border-white/10 bg-[#080b09]/98 shadow-2xl backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[390px]">
   <header className="flex items-center justify-between border-b border-white/10 px-4 py-4"><div><div className="font-mono text-[8px] tracking-[.22em] text-[#d4b56a]">FBMR / NOTIFICATIONS</div><h2 className="mt-1 text-lg font-semibold">Notification Center</h2></div><div className="flex gap-2"><button onClick={markAll} disabled={!auth||!unread||loading} className="border border-white/10 px-2.5 py-2 font-mono text-[8px] uppercase text-white/45 hover:border-[#d4b56a]/40 disabled:opacity-30">Mark all read</button><button onClick={()=>setOpen(false)} className="grid h-8 w-8 place-items-center border border-white/10 text-white/50 hover:text-white"><X size={14}/></button></div></header>
   {!auth?<div className="px-6 py-10 text-center"><Bell className="mx-auto text-[#d4b56a]/50" size={25}/><h3 className="mt-4 text-base font-semibold">Connect Discord</h3><p className="mt-2 text-xs leading-5 text-white/35">Sign in with Discord so the site can remember which notifications you have read.</p><a href="/authorize" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#d4b56a] px-4 py-2.5 font-mono text-[8px] tracking-[.12em] text-black">AUTHORIZE <ExternalLink size={12}/></a></div>:<div className="max-h-[65vh] overflow-auto">{items.length?items.map(n=><button key={n.id} onClick={()=>markRead(n.id)} className={`block w-full border-b border-white/[.07] px-4 py-4 text-left transition hover:bg-white/[.035] ${n.read?'opacity-45':'bg-[#d4b56a]/[.035]'}`}><div className="flex items-center gap-2"><span className="font-mono text-[7px] uppercase tracking-[.16em] text-[#d4b56a]">{n.section}</span>{!n.read&&<span className="h-1.5 w-1.5 rounded-full bg-[#d4b56a]"/>}<time className="ml-auto font-mono text-[7px] text-white/25">{new Date(n.createdAt).toLocaleString()}</time></div><div className="mt-2 text-sm font-semibold text-white/90">{n.title}</div><p className="mt-1 text-xs leading-5 text-white/40">{n.message}</p></button>):<div className="px-6 py-12 text-center text-xs text-white/30">You're all caught up.</div>}</div>}
  </div>}
 </div>
}

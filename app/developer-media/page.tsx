"use client";
import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX = 8 * 1024 * 1024;

export default function DeveloperMedia() {
  const [posts, setPosts] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const r = await fetch("/api/discord/developer-media", { cache: "no-store" });
    const d = await r.json();
    if (r.ok) setPosts(d.posts || []);
  };
  useEffect(() => { void load(); }, []);

  async function publish() {
    if (!file) return setMessage("Choose an image or video first.");
    if (file.size > MAX) return setMessage("Maximum file size is 8 MB.");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime"].includes(file.type)) return setMessage("Unsupported file type.");
    setBusy(true); setMessage("");
    try {
      const blob = await upload(`developer/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ type: file.type, size: file.size }),
      });
      const type = file.type.startsWith("video/") ? "video" : "image";
      const r = await fetch("/api/discord/developer-media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: blob.url, type, title, caption }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Publish failed");
      setPosts((p) => [d, ...p]); setFile(null); setTitle(""); setCaption(""); setMessage("Published to the public media archive.");
    } catch (e: any) { setMessage(e.message || "Upload failed"); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-bg text-white px-5 sm:px-10 py-20"><div className="max-w-6xl mx-auto">
    <div className="mb-10"><div className="font-mono text-[9px] tracking-[3px] text-golddim uppercase">FBMRP / DEVELOPER MEDIA</div><h1 className="font-serif text-5xl sm:text-7xl font-bold mt-2">Built in public.</h1><p className="text-textdim mt-4">Approved developers can publish images and videos. Maximum file size: 8 MB.</p></div>
    <section className="rounded-2xl border border-gold/25 bg-panel p-5 sm:p-7 mb-10"><div className="font-mono text-[9px] tracking-[2px] text-golddim uppercase">PUBLISH MEDIA</div><div className="grid md:grid-cols-2 gap-4 mt-5"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" className="bg-panel2 border border-border px-4 py-3 outline-none focus:border-gold"/><input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption" className="bg-panel2 border border-border px-4 py-3 outline-none focus:border-gold"/><label className="md:col-span-2 border border-dashed border-border p-5 cursor-pointer hover:border-gold"><span className="font-mono text-[9px] uppercase text-textfaint">Choose image / video</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={e=>setFile(e.target.files?.[0]||null)} className="block mt-3 w-full"/><span className="text-xs text-textfaint block mt-2">{file ? `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB` : "JPG, PNG, WebP, GIF, MP4, WebM or MOV · max 8 MB"}</span></label></div><button disabled={busy} onClick={publish} className="mt-5 bg-gold text-black px-6 py-3 font-mono text-[9px] uppercase disabled:opacity-50">{busy?"Publishing…":"Publish media"}</button>{message&&<p className="mt-3 text-sm text-textdim">{message}</p>}</section>
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{posts.map((m:any)=><article key={m.id} className="rounded-2xl border border-border bg-panel overflow-hidden">{m.videoUrl?<video src={m.videoUrl} controls className="w-full aspect-video object-cover"/>:m.imageUrl?<img src={m.imageUrl} alt={m.title||"Developer media"} className="w-full aspect-video object-cover"/>:null}<div className="p-5"><small className="font-mono text-[9px] text-golddim uppercase">{m.category||"DEVELOPER"}</small><h2 className="font-serif text-xl font-bold mt-2">{m.title||"Developer Media"}</h2>{m.caption&&<p className="text-sm text-textdim mt-2">{m.caption}</p>}</div></article>)}</div>
  </div></main>;
}

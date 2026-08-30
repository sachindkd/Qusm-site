"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { ArrowLeft, CheckCircle2, Code2, ImagePlus, Loader2, UploadCloud, Video } from "lucide-react";

const MAX = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";

export default function DeveloperMediaPage() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const submit = async () => {
    const file = input.current?.files?.[0];
    setError(""); setMessage("");
    if (!file) return setError("Choose an image or video first.");
    if (file.size > MAX) return setError("The maximum upload size is 8 MB.");
    setBusy(true); setProgress(0);
    try {
      const blob = await upload(`developer-media/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: JSON.stringify({ type: file.type, size: file.size }),
        multipart: file.size > 4 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      const current = await fetch("/api/content", { cache: "no-store" }).then(r => r.json());
      const media = Array.isArray(current.media) ? current.media : [];
      const record = { id: crypto.randomUUID(), title: file.name.replace(/\.[^/.]+$/, ""), caption: "Developer media", imageUrl: file.type.startsWith("image/") ? blob.url : "", videoUrl: file.type.startsWith("video/") ? blob.url : "", category: "developer" };
      const save = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json", "x-content-section": "media" }, body: JSON.stringify({ media: [...media, record] }) });
      if (!save.ok) throw new Error((await save.json().catch(() => ({}))).error || "Upload succeeded but media record could not be saved.");
      setMessage("Media uploaded and added to the public archive.");
      if (input.current) input.current.value = "";
      setProgress(100);
    } catch (e: any) { setError(e?.message || "Upload failed."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-bg text-white px-5 py-8 sm:px-10"><div className="max-w-4xl mx-auto"><a href="/staff" className="inline-flex items-center gap-2 font-mono text-[9px] uppercase text-textfaint hover:text-white"><ArrowLeft size={13}/> Staff Panel</a><header className="mt-10"><div className="font-mono text-[9px] tracking-[2px] text-golddim uppercase">FBMRP / Developer Studio</div><h1 className="font-serif text-5xl font-bold mt-3">Media upload.</h1><p className="text-textdim max-w-2xl mt-4 leading-7">Publish development screenshots, artwork and short videos to the public media archive. Maximum file size is <strong className="text-white">8 MB</strong>.</p></header><section className="mt-10 rounded-3xl border border-gold/25 bg-gradient-to-br from-gold/10 via-panel to-panel p-6 sm:p-10"><div className="grid sm:grid-cols-3 gap-4 mb-8"><div className="rounded-2xl border border-border bg-bg/50 p-5"><ImagePlus className="text-golddim" size={20}/><div className="font-serif text-lg font-bold mt-3">Images</div><div className="text-textfaint text-xs mt-1">JPG · PNG · WebP · GIF</div></div><div className="rounded-2xl border border-border bg-bg/50 p-5"><Video className="text-golddim" size={20}/><div className="font-serif text-lg font-bold mt-3">Video</div><div className="text-textfaint text-xs mt-1">MP4 · WebM · MOV</div></div><div className="rounded-2xl border border-border bg-bg/50 p-5"><Code2 className="text-golddim" size={20}/><div className="font-serif text-lg font-bold mt-3">Developer only</div><div className="text-textfaint text-xs mt-1">Permission checked server-side</div></div></div><label className="block rounded-2xl border border-dashed border-gold/40 bg-bg/50 p-8 text-center cursor-pointer hover:border-gold transition-colors"><UploadCloud className="mx-auto text-gold" size={30}/><span className="block font-serif text-xl font-bold mt-4">Choose media</span><span className="block text-textfaint text-xs mt-2">One file at a time · maximum 8 MB</span><input ref={input} type="file" accept={ACCEPT} className="sr-only"/></label>{busy && <div className="mt-5"><div className="flex justify-between font-mono text-[9px] uppercase text-textfaint"><span>Uploading</span><span>{progress}%</span></div><div className="mt-2 h-1.5 rounded-full bg-bg overflow-hidden"><div className="h-full bg-gold transition-all" style={{width:`${progress}%`}}/></div></div>}{error && <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}{message && <div className="mt-5 flex gap-2 items-center rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200"><CheckCircle2 size={16}/>{message}</div>}<button onClick={submit} disabled={busy} className="mt-6 w-full bg-gold text-black rounded-xl py-3.5 font-mono text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <><Loader2 size={14} className="animate-spin"/> Uploading…</> : <><UploadCloud size={14}/> Upload to Media Archive</>}</button></section></div></main>;
}

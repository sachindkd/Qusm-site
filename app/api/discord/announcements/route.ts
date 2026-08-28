import { NextResponse } from "next/server";
const CHANNEL_ID = "1506706237721546852";
export async function GET(){
 const token=process.env.DISCORD_BOT_TOKEN;
 if(!token)return NextResponse.json({announcements:[],error:"not_configured"},{status:503});
 const res=await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=15`,{headers:{Authorization:`Bot ${token}`},cache:"no-store"});
 if(!res.ok)return NextResponse.json({announcements:[]},{status:502});
 const messages=await res.json();
 return NextResponse.json({announcements:messages.filter((m:any)=>!m.author?.bot||m.content||m.attachments?.length).map((m:any)=>({id:m.id,content:m.content,createdAt:m.timestamp,author:m.author?.global_name||m.author?.username,avatar:m.author?.avatar,attachments:(m.attachments||[]).map((a:any)=>({url:a.url,name:a.filename,type:a.content_type}))}))});
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";
import { passesSameOrigin } from "@/lib/authorization";

function session(){return readDiscordSession((cookies as any)().get(DISCORD_SESSION_COOKIE)?.value)}

export async function GET(){
  const user=session();
  if(!user)return NextResponse.json({authenticated:false,notifications:[],unreadCount:0},{headers:{"Cache-Control":"no-store"}});
  try{return NextResponse.json({authenticated:true,...await listNotifications(user.id)},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({error:"Notifications unavailable"},{status:503})}
}

export async function POST(req:Request){
  if(!passesSameOrigin(req))return NextResponse.json({error:"Cross-origin request blocked"},{status:403});
  const user=session(); if(!user)return NextResponse.json({error:"Discord authorization required"},{status:401});
  try{
    const body=await req.json().catch(()=>({}));
    if(body?.all===true){await markAllNotificationsRead(user.id);return NextResponse.json({ok:true,all:true})}
    const id=Number(body?.id); if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Invalid notification id"},{status:400});
    await markNotificationRead(user.id,id); return NextResponse.json({ok:true,id});
  }catch{return NextResponse.json({error:"Could not update notification state"},{status:503})}
}

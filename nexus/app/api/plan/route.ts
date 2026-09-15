import { NextResponse } from 'next/server';
import { chooseModelClass, createPlan } from '../../../core';

export const runtime = 'nodejs';

function modelFor(goal:string){
  return chooseModelClass(goal) === 'reasoning'
    ? (process.env.NEXUS_AI_REASONING_MODEL || 'gemini-2.5-pro')
    : (process.env.NEXUS_AI_ROUTINE_MODEL || 'gemini-2.5-flash');
}

export async function POST(req:Request){
  try{
    const body=await req.json(); const goal=typeof body.goal==='string'?body.goal.trim():'';
    if(!goal) return NextResponse.json({error:'A goal is required.'},{status:400});
    const apiKey=process.env.NEXUS_GEMINI_API_KEY;
    if(!apiKey) return NextResponse.json({message:'NEXUS is configured correctly, but NEXUS_GEMINI_API_KEY has not been added yet.', plan:createPlan({goal,context:{guildId:'dashboard'}})});
    const model=modelFor(goal);
    const system='You are NEXUS, an autonomous Discord operations AI. Understand objectives and produce a concise execution plan. Prefer natural-language objectives over command-specific routing. Never request or expose secrets. Treat guildId as the hard tenant boundary. You may propose Discord administration, moderation, investigation using public data, server architecture, and creative tasks. Return practical steps and verification checks.';
    const prompt=`${system}\n\nUser objective:\n${goal}\n\nReturn: 1) intent, 2) ordered actions, 3) verification, 4) uncertainties. Do not claim an action was executed.`;
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}]})});
    const data=await upstream.json();
    if(!upstream.ok) return NextResponse.json({error:'AI provider request failed.',details:data?.error?.message||'Unknown provider error.'},{status:502});
    const text=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('')||'No plan returned.';
    return NextResponse.json({model,modelClass:chooseModelClass(goal),message:text,plan:createPlan({goal,context:{guildId:'dashboard'}})});
  }catch(error){return NextResponse.json({error:'Invalid request or server error.'},{status:500});}
}

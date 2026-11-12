"use strict";
/* ==================================================================
   1. UTILIDADES
   ================================================================== */
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const $=id=>document.getElementById(id);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const rgb=c=>`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`;
const mixA=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const mix=(a,b,t)=>rgb(mixA(hex(a),hex(b),clamp(t,0,1)));
const shade=(h,k)=>{const c=hex(h);return rgb(c.map(v=>clamp(v*k,0,255)))};
const num=(v,d=0)=>Number(v).toLocaleString("es-CO",{minimumFractionDigits:d,maximumFractionDigits:d});
const cop=v=>{const s=v<0?"−":"",a=Math.abs(v);return s+"$"+(a>=1e6?num(a/1e6,2)+" M":num(a/1e3,0)+" mil")};
function rng32(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const MES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const T0=Date.UTC(2026,9,6,0);              // t = horas desde el 6 de octubre de 2026, 00:00
const dateOf=t=>new Date(T0+t*36e5);
const hod=t=>((t%24)+24)%24;
const fmtD=t=>{const d=dateOf(t);return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`};
const fmtT=t=>{const d=dateOf(t);return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}, ${String(d.getUTCHours()).padStart(2,"0")}:00`};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");

/* Estado: forma + color + texto, nunca solo color */
const ST=[
  {k:"good",name:"Óptimo",c:"#57c98f"},
  {k:"warn",name:"Atención",c:"#f0c14b"},
  {k:"ser",name:"En riesgo",c:"#f28f45"},
  {k:"crit",name:"Crítico",c:"#f4706b"},
  {k:"off",name:"Sin señal",c:"#8ea4a6"}];
const stOf=s=>s>=72?ST[0]:s>=52?ST[1]:s>=34?ST[2]:ST[3];
const SHAPE={
  good:'<circle cx="5" cy="5" r="4.2"/>',
  warn:'<path d="M5 .6 9.7 9.2H.3Z"/>',
  ser:'<path d="M5 .2 9.8 5 5 9.8.2 5Z"/>',
  crit:'<path d="M1.6 0 5 3.4 8.4 0 10 1.6 6.6 5 10 8.4 8.4 10 5 6.6 1.6 10 0 8.4 3.4 5 0 1.6Z"/>',
  off:'<path d="M0 4h10v2H0Z"/>'};
const mark=st=>`<svg class="st" viewBox="0 0 10 10" fill="${st.c}" role="img" aria-label="${st.name}">${SHAPE[st.k]}</svg>`;
function drawMark(c,k,x,y,r,col){
  c.fillStyle=col;c.beginPath();
  if(k==="good")c.arc(x,y,r,0,7);
  else if(k==="warn"){c.moveTo(x,y-r*1.05);c.lineTo(x+r,y+r*.8);c.lineTo(x-r,y+r*.8);c.closePath()}
  else if(k==="ser"){c.moveTo(x,y-r*1.1);c.lineTo(x+r*1.1,y);c.lineTo(x,y+r*1.1);c.lineTo(x-r*1.1,y);c.closePath()}
  else if(k==="crit"){c.save();c.translate(x,y);c.rotate(Math.PI/4);c.rect(-r*1.1,-r*.32,r*2.2,r*.64);c.rect(-r*.32,-r*1.1,r*.64,r*2.2);c.restore()}
  else c.rect(x-r,y-r*.25,r*2,r*.5);
  c.fill();
}
const COMP={
  suelo:{n:"Suelo",sub:"Compactación, cobertura, MO",i:'<path d="M2 5h14M2 9c2-1 4 1 6 0s4 1 8 0M2 13h14" fill="none" stroke="currentColor" stroke-width="1.5"/>'},
  agua:{n:"Agua",sub:"Calidad, caudal, reservorio",i:'<path d="M9 2c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9Z" fill="none" stroke="currentColor" stroke-width="1.5"/>'},
  veg:{n:"Vegetación",sub:"Forraje, árboles, leguminosas",i:'<path d="M3 15C3 8 8 3 15 3c0 7-5 12-12 12Zm0 0 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/>'},
  animal:{n:"Animal",sub:"Bienestar, salud, producción",i:'<path d="M3 4c0 2 1 3 3 3h6c2 0 3-1 3-3M6 7l1 7h4l1-7M7.5 11h3" fill="none" stroke="currentColor" stroke-width="1.5"/>'},
  clima:{n:"Clima",sub:"Temperatura, lluvia, THI",i:'<circle cx="9" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.5v2.2M9 14.3v2.2M1.5 9h2.2M14.3 9h2.2M3.7 3.7l1.5 1.5M12.8 12.8l1.5 1.5M3.7 14.3l1.5-1.5M12.8 5.2l1.5-1.5" stroke="currentColor" stroke-width="1.5"/>'},
  bio:{n:"Biodiversidad",sub:"Aves, escarabajos, polinizadores",i:'<path d="M9 5v10M9 7C7 3 2 3 3 7c.5 3 4 4 6 3 2 1 5.500 0 6-3 1-4-4-4-6 0ZM9 10c-2 0-4 1-3.500 3S8 15 9 13c1 2 3 2 3.500 0S11 10 9 10Z" fill="none" stroke="currentColor" stroke-width="1.3"/>'},
  humano:{n:"Dimensión humana",sub:"Margen, respuesta, práctica",i:'<circle cx="9" cy="5" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 16c0-4 3-6 6-6s6 2 6 6" fill="none" stroke="currentColor" stroke-width="1.5"/>'}};
const icon=k=>`<svg class="ic" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${COMP[k].i}</svg>`;


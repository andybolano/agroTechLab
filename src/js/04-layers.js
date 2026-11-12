"use strict";
/* ==================================================================
   4. CAPAS DEL MAPA
   ================================================================== */
const LAYERS=[
 {k:"general",n:"Finca"},
 {k:"suelo",n:"Suelo",leg:"Salud del suelo",lo:"Compactado",hi:"Sano"},
 {k:"agua",n:"Agua",leg:"Agua y humedad",lo:"Turbia o seca",hi:"Limpia o húmeda"},
 {k:"veg",n:"Vegetación",leg:"Forraje disponible",lo:"Poco",hi:"Abundante"},
 {k:"animal",n:"Animal",leg:"Confort para el animal (THI con sombra)",lo:"Estrés",hi:"Confort"},
 {k:"clima",n:"Clima",leg:"Microclima",lo:"Caliente",hi:"Fresco"},
 {k:"bio",n:"Biodiversidad",leg:"Riqueza de hábitat",lo:"Baja",hi:"Alta"},
 {k:"humano",n:"Humano",leg:"Planificación predial"}];
let layer="general";
const RL=hex("#c9611f"),RM_=hex("#dcdacb"),RH=hex("#0f8378"),NEUT=hex("#566a6e");
const ramp=v=>{v=clamp(v);return v<50?mixA(RL,RM_,v/50):mixA(RM_,RH,(v-50)/50)};
const CATS={prod:["Producción","#d8a93f"],cons:["Conservación","#2b8f6b"],rec:["Recuperación","#b86fb0"],infra:["Infraestructura","#6b8fb5"],agua:["Agua","#3f9fd6"]};
function layerVal(t,v){
  const n=(t.n-.5)*7;
  const z=t.zone?v.pad[t.zone]:null;
  const K=t.kind;
  switch(layer){
    case"suelo":
      if(z)return .35*z.cov+.35*(100-z.comp)+.3*clamp(z.om/5*100)+n;
      if(K==="forest")return 90+n;if(K==="ripar")return 78+n;if(K==="recovery")return 42+n;if(K==="savanna")return 58+n;if(K==="lane")return 22;return null;
    case"agua":
      if(K==="water"||K==="bridge")return segScore(v,t.seg);if(K==="reservoir")return clamp(v.res.level*1.2);
      if(z)return clamp(z.moist*1.15)+n;if(K==="ripar")return .5*segScore(v,t.seg)+45+n;if(K==="forest")return 80+n;return null;
    case"veg":
      if(z)return clamp(z.bio/3200*100)+clamp(t.shade*14,0,12)+n;
      if(K==="forest")return 92+n;if(K==="ripar")return 75+n;if(K==="recovery")return 40+n;if(K==="savanna")return 48+n;return null;
    case"animal":{
      if(!z)return null;const e=v.w.thi-shadeK(z.trees)-clamp(t.shade,0,1.6)*1.8;return clamp(100-(e-68)*4.2)+n*.4}
    case"clima":{
      if(K==="water"||K==="reservoir")return clamp(100-(v.w.thi-74)*4.2);
      const s=K==="forest"?8:K==="ripar"?5:clamp(t.shade,0,1.8)*3.2;const e=v.w.thi-s+(K==="lane"||K==="yard"||K==="corral"?2:0);return clamp(100-(e-68)*4.2)+n*.5}
    case"bio":
      if(K==="forest")return 92+n;if(K==="ripar")return 74+n;if(K==="water"||K==="reservoir")return 68;
      if(z)return clamp(18+z.trees*.7+t.shade*8)+n;if(K==="recovery")return 44+n;if(K==="savanna")return 40+n;return 12;
  }
  return null;
}
function catOf(t){const K=t.kind;if(K==="pad")return"prod";if(K==="forest"||K==="ripar")return"cons";if(K==="recovery"||K==="savanna")return"rec";if(K==="water"||K==="reservoir")return"agua";return"infra"}
function tileColor(t,v){
  if(layer==="humano"){return CATS[catOf(t)][1]}
  if(layer!=="general"){const x=layerVal(t,v);return x==null?rgb(NEUT):rgb(ramp(x))}
  const K=t.kind,n=t.n-.5;
  if(K==="pad"){
    const z=v.pad[t.zone],b=clamp(z.bio/3000,0,1),dry=clamp(1-z.moist/45,0,1);
    let c=mixA(hex("#c4b268"),hex("#4e9c3e"),b*(1-dry*.55));
    if(t.n2>z.cov/100+.08)c=mixA(c,hex("#a5845a"),.62);
    return rgb(c.map(q=>clamp(q+n*16,0,255)));
  }
  if(K==="forest")return rgb(hex("#2f6e3d").map(q=>q+n*14));
  if(K==="ripar")return rgb(hex("#4c8f47").map(q=>q+n*14));
  if(K==="savanna"){const m=clamp(avgMoist(v)/55,0,1);return rgb(mixA(hex("#b7a862"),hex("#79a04c"),m).map(q=>q+n*16))}
  if(K==="recovery"){return rgb(mixA(hex("#b39a64"),hex("#7ca650"),.3+t.n2*.5).map(q=>q+n*12))}
  if(K==="lane")return rgb(hex("#c4a678").map(q=>q+n*10));
  if(K==="bridge"||K==="water")return waterColor(v,t.seg);
  if(K==="reservoir")return mix("#2f9bcf","#71a59f",clamp((60-v.res.level)/60,0,1));
  if(K==="yard")return rgb(hex("#b7b38a").map(q=>q+n*8));
  if(K==="corral")return rgb(hex("#b09a72").map(q=>q+n*8));
  return"#888";
}
const avgMoist=v=>avg(padList(v),z=>z.moist);
function waterColor(v,seg){const q=v.q[seg||"Q2"];return mix("#37a8dc","#97764a",clamp(q.ntu/60,0,1))}


"use strict";
/* ==================================================================
   8. INTERACCIÓN
   ================================================================== */
const hold={left:false,right:false};
for(const[k,el]of[["left",$("left")],["right",$("right")]]){
  el.addEventListener("pointerdown",()=>hold[k]=true);
  addEventListener("pointerup",()=>setTimeout(()=>{hold[k]=false},60));
}
function selectE(t,goTab=true){
  sel=t;if(goTab){tab="detalle"}uiDirty=true;uiT=0;
}
function parseSel(s){const[a,b]=s.split(":");return{type:a,id:b}}
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-layer],[data-sel],[data-act],[data-tab],[data-filter],[data-lot],[data-rel],[data-sp],[data-ev]");if(!t)return;
  const d=t.dataset;
  if(d.sp!==undefined){SPEED=+d.sp;uiDirty=true;uiT=0}
  else if(d.ev){provoke(d.ev)}
  else if(d.layer){layer=(layer===d.layer&&d.layer!=="general")?"general":d.layer;terrDirty=true;uiDirty=true;uiT=0}
  else if(d.act){
    if(d.act==="move")act("move",d.a.split(","));
    else if(d.act==="fence")act("fence");
    else act(d.act,d.a);
  }
  else if(d.tab){tab=d.tab;uiDirty=true;uiT=0;$("panel").scrollTop=0}
  else if(d.filter){logFilter=d.filter;uiDirty=true;uiT=0}
  else if(d.lot){openLot=openLot===d.lot?null:d.lot;uiDirty=true;uiT=0}
  else if(d.rel){relSel=relSel===d.rel?null:d.rel;uiDirty=true;uiT=0}
  else if(d.sel){selectE(parseSel(d.sel));$("panel").scrollTop=0}
});
document.addEventListener("keydown",e=>{
  if(e.target&&e.target.dataset&&e.target.dataset.rel&&(e.key==="Enter"||e.key===" ")){e.preventDefault();e.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  if(e.target===document.body||e.target===cv){
    if(e.key===" "){e.preventDefault();SPEED=SPEED===0?.5:0;uiDirty=true;uiT=0}
    const step_=40;if(e.key.startsWith("Arrow"))camTouched=true;if(e.key==="ArrowLeft")cam.x+=step_;if(e.key==="ArrowRight")cam.x-=step_;if(e.key==="ArrowUp")cam.y+=step_;if(e.key==="ArrowDown")cam.y-=step_;
  }
});
/* Mapa */
let drag=null,pts=new Map(),pinch=null;
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.offsetX,e.offsetY]);drag={x:e.clientX,y:e.clientY,cx:cam.x,cy:cam.y,moved:false};if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:cam.z}}});
cv.addEventListener("pointermove",e=>{
  if(pts.has(e.pointerId))pts.set(e.pointerId,[e.offsetX,e.offsetY]);
  if(pts.size===2&&pinch){const[a,b]=[...pts.values()];zoomAt((a[0]+b[0])/2,(a[1]+b[1])/2,pinch.z*Math.hypot(a[0]-b[0],a[1]-b[1])/pinch.d);if(drag)drag.moved=true;return}
  if(drag&&pts.size===1){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;if(drag.moved){camTouched=true;cam.x=drag.cx+dx;cam.y=drag.cy+dy;cv.classList.add("drag");hideTip();return}}
  const h=pickAt(e.offsetX,e.offsetY);
  hover=h;cv.classList.toggle("hit",!!h);
  if(h)showTip(e.clientX,e.clientY,h);else hideTip();
});
cv.addEventListener("pointerup",e=>{
  pts.delete(e.pointerId);if(pts.size<2)pinch=null;
  if(drag&&!drag.moved){const h=pickAt(e.offsetX,e.offsetY);if(h)selectE(h);$("panel").scrollTop=0}
  drag=null;cv.classList.remove("drag");
});
cv.addEventListener("pointerleave",()=>{hover=null;hideTip()});
cv.addEventListener("wheel",e=>{e.preventDefault();zoomAt(e.offsetX,e.offsetY,cam.z*Math.exp(-e.deltaY*.0013))},{passive:false});
function zoomAt(sx,sy,z){camTouched=true;z=clamp(z,cam.fit*.8,cam.fit*5);const[wx,wy]=toWorld(sx,sy);cam.z=z;cam.x=sx-wx*z;cam.y=sy-wy*z}
$("zi").onclick=()=>zoomAt(cw/2,ch/2,cam.z*1.35);
$("zo").onclick=()=>zoomAt(cw/2,ch/2,cam.z/1.35);
$("zr").onclick=()=>{camTouched=false;fitCam()};
$("auto").onclick=()=>{autoRot=!autoRot;addLog("humano",autoRot?ST[0]:ST[1],autoRot?"Rotación automática activada":"Rotación automática apagada",autoRot?"El sistema mueve el hato según el forraje y los días de ocupación.":"El hato se queda donde está hasta que lo muevas.",{type:"pad",id:S.grp.G1.pad},"Operador");uiDirty=true;uiT=0};
$("reset").onclick=()=>{boot();uiT=0};
$("golive").onclick=goLive;
/* Tooltip del mapa */
const tip=$("tip");
function placeTip(x,y){tip.style.display="block";const r=tip.getBoundingClientRect();tip.style.left=Math.min(innerWidth-r.width-8,x+14)+"px";tip.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y+14))+"px"}
function hideTip(){tip.style.display="none"}
function showTip(x,y,h){
  const v=viewState();let a="",b="";
  if(h.type==="pad"){const z=v.pad[h.id];a=`${h.id} · ${PADGEO[h.id].def.name}`;b=`${padState(z)} · ${num(z.bio)} kg MS/ha · ${num(z.trees)} árboles/ha`}
  else if(h.type==="seg"){const q=v.q[h.id];a=SEGNAME[h.id];b=`${num(q.ntu,1)} NTU · ${num(q.flow,1)} L/s`}
  else if(h.type==="cow"){const c=v.cow.find(q=>q.id===h.id);a=`${c.id} · ${c.breed}`;b=`${num(c.temp,1)} °C · rumia ${num(c.rum)} min/día${c.health?" · "+c.health.dx:""}`}
  else if(h.type==="sensor"){const s=SENS.find(q=>q.id===h.id);a=`${s.id} · ${sensorStatus(s,v).name}`;b=s.name}
  else if(h.type==="res"){a="Reservorio";b=`Nivel ${num(v.res.level)} %`}
  else if(h.type==="forest"){a="Bosque y corredor";b=`${num(v.bio.birds)} especies de aves`}
  else if(h.type==="recovery"){a="Zona de recuperación";b="Aislada del ganado"}
  else if(h.type==="bld"){a=BLD[h.id].name;b=BLD[h.id].sub}
  tip.innerHTML=`<b>${esc(a)}</b><span>${esc(b)}</span>`;placeTip(x,y);
}
/* Hover de sparklines */
document.addEventListener("pointermove",e=>{
  if(e.target===cv)return;
  const s=e.target.closest&&e.target.closest("svg.spark");
  if(!s){if(tip.dataset.spk){hideTip();delete tip.dataset.spk}return}
  const v=s.dataset.vals.split(",").map(Number),[a,b]=s.dataset.ts.split(",").map(Number),r=s.getBoundingClientRect(),i=Math.round(clamp((e.clientX-r.left)/r.width,0,1)*(v.length-1));
  tip.dataset.spk="1";tip.innerHTML=`<b>${num(v[i],+s.dataset.d)} ${esc(s.dataset.u)}</b><span>${fmtT(Math.round(lerp(a,b,i/(v.length-1))))}</span>`;placeTip(e.clientX,e.clientY);
});
/* Línea de tiempo */
let tlDrag=false;
tl.addEventListener("pointerdown",e=>{tl.setPointerCapture(e.pointerId);tlDrag=true;setReview(tlIdx(e))});
tl.addEventListener("pointermove",e=>{tlHover=tlIdx(e);tlNeedsDraw=true;if(tlDrag)setReview(tlHover)});
tl.addEventListener("pointerup",()=>{tlDrag=false});
tl.addEventListener("pointerleave",()=>{tlHover=null;tlNeedsDraw=true});
tl.addEventListener("keydown",e=>{const{end}=tlRange(),cur=VIEW??end;if(e.key==="ArrowLeft"){e.preventDefault();setReview(cur-1)}if(e.key==="ArrowRight"){e.preventDefault();setReview(cur+1)}if(e.key==="Home"){e.preventDefault();setReview(tlRange().start)}if(e.key==="End"){e.preventDefault();goLive()}});
addEventListener("resize",()=>{resize();tlNeedsDraw=true});


"use strict";
/* ==================================================================
   7. LÍNEA DE TIEMPO
   ================================================================== */
let tlNeedsDraw=true,tlHover=null;
const tl=$("tlc"),tx=tl.getContext("2d");
const TL_DAYS=30,TL_N=TL_DAYS*8;
const tlRange=()=>{const end=SNAP.length-1,start=Math.max(0,end-TL_N+1);return{start,end}};
const tlGeom=(w,h)=>({l:36,r:w-12,t:30,b:h-20});
function drawTimeline(v){
  const r=tl.getBoundingClientRect(),w=r.width,h=r.height,d=Math.min(devicePixelRatio||1,2);
  if(tl.width!==Math.round(w*d)||tl.height!==Math.round(h*d)){tl.width=Math.round(w*d);tl.height=Math.round(h*d)}
  const c=tx;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  const{start,end}=tlRange(),G=tlGeom(w,h);
  let lo=40;for(let i=start;i<=end;i++)lo=Math.min(lo,Math.floor(SNAP[i].idx/10)*10);
  const X=i=>G.l+(i-start)/Math.max(1,end-start)*(G.r-G.l),Y=q=>G.b-clamp((q-lo)/(100-lo)*100)/100*(G.b-G.t);
  c.font='11px "IBM Plex Sans",sans-serif';c.textBaseline="middle";
  c.strokeStyle="#21404a";c.lineWidth=1;c.fillStyle="#86a2a2";c.textAlign="right";
  for(const q of[lo,(lo+100)/2,100]){c.beginPath();c.moveTo(G.l,Y(q)+.5);c.lineTo(G.r,Y(q)+.5);c.stroke();c.fillText(q,G.l-7,Y(q))}
  c.textAlign="center";
  for(let i=start;i<=end;i++){const t=SNAP[i].t;if(hod(t)===0||hod(t)<3){const d0=dateOf(t);if(d0.getUTCDate()%(w<700?10:5)===0&&hod(t)<3)c.fillText(`${d0.getUTCDate()} ${MES[d0.getUTCMonth()]}`,clamp(X(i),G.l+14,G.r-14),h-9)}}
  // área e índice
  c.beginPath();for(let i=start;i<=end;i++){const x=X(i),y=Y(SNAP[i].idx);i===start?c.moveTo(x,y):c.lineTo(x,y)}
  c.strokeStyle="#ebf3ef";c.lineWidth=1.6;c.stroke();
  c.lineTo(X(end),G.b);c.lineTo(X(start),G.b);c.closePath();c.fillStyle="rgba(235,243,239,.1)";c.fill();
  // eventos
  const t0=SNAP[start].t,t1=SNAP[end].t;
  const seen={};
  for(let i=LOG.length-1;i>=0;i--){const l=LOG[i];if(l.t<t0||l.t>t1||l.sev<2)continue;if(seen[l.title]!=null&&l.t-seen[l.title]<96)continue;seen[l.title]=l.t;const x=G.l+(l.t-t0)/Math.max(1,t1-t0)*(G.r-G.l);const st=ST[l.sev];drawMark(c,st.k,x,G.t-8,3.6,st.c)}
  // cabeza
  const hi=VIEW!==null?VIEW:end;const hx=X(hi);
  c.strokeStyle="#8fd8f7";c.lineWidth=1.5;c.beginPath();c.moveTo(hx,G.t-3);c.lineTo(hx,G.b);c.stroke();
  c.fillStyle="#8fd8f7";c.beginPath();c.arc(hx,Y(SNAP[hi].idx),3.6,0,7);c.fill();
  if(tlHover!=null){const x=X(tlHover);c.strokeStyle="rgba(235,243,239,.5)";c.lineWidth=1;c.beginPath();c.moveTo(x,G.t);c.lineTo(x,G.b);c.stroke();
    const txt=`${fmtT(SNAP[tlHover].t)} · índice ${num(SNAP[tlHover].idx)}`;c.textAlign="left";const tw=c.measureText(txt).width;const lx=clamp(x+7,G.l,G.r-tw-8);c.fillStyle="#061419";c.fillRect(lx-4,G.t+1,tw+8,17);c.fillStyle="#ebf3ef";c.fillText(txt,lx,G.t+10)}
  c.textAlign="left";c.fillStyle="#b1c8c5";c.fillText(w<560?"Índice · arrastra para revisar":"Índice de integralidad, últimos 30 días. Arrastra para revisar el pasado.",G.l,9);
  tl.setAttribute("aria-valuenow",Math.round(SNAP[hi].idx));
}
const tlIdx=e=>{const r=tl.getBoundingClientRect(),G=tlGeom(r.width,r.height),{start,end}=tlRange();return Math.round(start+clamp((e.clientX-r.left-G.l)/(G.r-G.l),0,1)*(end-start))};
function setReview(i){const{end}=tlRange();if(i>=end){goLive();return}VIEW=i;$("review").style.display="flex";$("reviewt").textContent=`Revisando ${fmtT(SNAP[i].t)}`;document.querySelectorAll("#scen .chip").forEach(b=>b.disabled=false);terrDirty=true;uiDirty=true;tlNeedsDraw=true}
function goLive(){VIEW=null;$("review").style.display="none";terrDirty=true;uiDirty=true;tlNeedsDraw=true}


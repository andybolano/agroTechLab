"use strict";
/* ==================================================================
   5. RENDER
   ================================================================== */
const cv=$("map"),ctx=cv.getContext("2d");
const TS=2;
const terr=document.createElement("canvas");terr.width=WORLD_W*TS;terr.height=WORLD_H*TS;
const tc=terr.getContext("2d");
let terrDirty=true,lastTerr=0,uiDirty=true;
const cam={x:0,y:0,z:1,fit:1};
let dpr=1,cw=0,ch=0,bgGrad=null,camTouched=false;
function resize(){
  const r=cv.getBoundingClientRect(),pw=cw,ph=ch;dpr=Math.min(devicePixelRatio||1,2);cw=r.width;ch=r.height;
  cv.width=cw*dpr;cv.height=ch*dpr;
  // si la persona ya movió el mapa, se conserva su vista y solo se recentra
  if(camTouched){cam.x+=(cw-pw)/2;cam.y+=(ch-ph)/2}else fitCam();
}
function fitCam(){
  // caja real de la maqueta: del pico del cerro a la base
  const top=iso(0,0,0)[1]-42,bot=iso(W,H,-7)[1]+6,lf=iso(0,H,0)[0]-8,rt=iso(W,0,0)[0]+8;
  const z=Math.min((cw-16)/(rt-lf),(ch-86)/(bot-top));
  cam.fit=z;cam.z=z;cam.x=cw/2-(lf+rt)/2*z;cam.y=ch/2+2-(top+bot)/2*z;
}
const toScreen=(wx,wy)=>[wx*cam.z+cam.x,wy*cam.z+cam.y];
const toWorld=(sx,sy)=>[(sx-cam.x)/cam.z,(sy-cam.y)/cam.z];

function paintTerrain(v){
  const c=tc;c.setTransform(TS,0,0,TS,0,0);c.clearRect(0,0,WORLD_W,WORLD_H);
  const base=-7; // grosor de la maqueta
  // sombra de la maqueta
  const[a0,b0]=iso(0,H,base),[a1,b1]=iso(W,H,base),[a2,b2]=iso(W,0,base);
  c.fillStyle="rgba(0,0,0,.28)";c.filter="blur(14px)";c.beginPath();c.moveTo(a0,b0+14);c.lineTo(a1,b1+14);c.lineTo(a2,b2+14);c.lineTo(a2,b2-50);c.lineTo(a0,b0-50);c.fill();c.filter="none";
  for(const t of tiles){
    const{x,y,h}=t;const p0=iso(x,y,h),p1=iso(x+1,y,h),p2=iso(x+1,y+1,h),p3=iso(x,y+1,h);
    const col=tileColor(t,v);
    const nx=T[x+1]&&T[x+1][y],ny=T[x][y+1];
    const hx=nx?nx.h:base,hy=ny?ny.h:base;
    if(h>hx){
      const a=iso(x+1,y,hx),b=iso(x+1,y+1,hx);
      c.fillStyle=nx?"#6a4e33":"#5a432d";c.beginPath();c.moveTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.lineTo(b[0],b[1]);c.lineTo(a[0],a[1]);c.closePath();c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=.5;c.stroke();
      if(!nx)strata(c,x+1,y,x+1,y+1,h,hx,"#4a3524","#3a2a1c");
    }
    if(h>hy){
      const a=iso(x,y+1,hy),b=iso(x+1,y+1,hy);
      c.fillStyle=ny?"#7c5c3e":"#6f5339";c.beginPath();c.moveTo(p3[0],p3[1]);c.lineTo(p2[0],p2[1]);c.lineTo(b[0],b[1]);c.lineTo(a[0],a[1]);c.closePath();c.fill();c.strokeStyle=c.fillStyle;c.lineWidth=.5;c.stroke();
      if(!ny)strata(c,x,y+1,x+1,y+1,h,hy,"#5b442e","#463423");
    }
    c.fillStyle=col;c.strokeStyle=col;c.lineWidth=.45;
    c.beginPath();c.moveTo(p0[0],p0[1]);c.lineTo(p1[0],p1[1]);c.lineTo(p2[0],p2[1]);c.lineTo(p3[0],p3[1]);c.closePath();c.fill();c.stroke();
    // relieve: luz en el borde alto
    if(nx&&h>nx.h||ny&&h>ny.h){c.strokeStyle="rgba(255,255,230,.14)";c.beginPath();c.moveTo(p3[0],p3[1]);c.lineTo(p2[0],p2[1]);c.lineTo(p1[0],p1[1]);c.stroke()}
    // detalle natural solo en la capa general
    if(layer==="general"){
      const K=t.kind;
      if(K==="pad"||K==="savanna"||K==="ripar"||K==="recovery"){
        c.strokeStyle=K==="pad"&&v.pad[t.zone].bio<1200?"rgba(90,70,40,.35)":"rgba(20,60,20,.35)";c.lineWidth=.6;c.beginPath();
        for(const u of t.tuft){const q=iso(x+u[0],y+u[1],h);c.moveTo(q[0],q[1]);c.lineTo(q[0]+u[2]*1.6-.8,q[1]-1.6-u[2]*1.4)}c.stroke();
      }
      if(K==="lane"){c.fillStyle="rgba(120,90,55,.35)";for(const u of t.tuft){const q=iso(x+u[0],y+u[1],h);c.fillRect(q[0],q[1],1.2,.7)}}
      if(K==="water"||K==="reservoir"){
        c.strokeStyle="rgba(255,255,255,.12)";c.lineWidth=.5;c.beginPath();const u=t.tuft[0];const q=iso(x+u[0]*.6+.2,y+u[1]*.6+.2,h);c.moveTo(q[0]-3,q[1]);c.lineTo(q[0]+3,q[1]);c.stroke();
      }
    }
    if(t.kind==="bridge"){ // tablones del puente
      c.fillStyle="#8a6a44";c.beginPath();const k=T[x][y-1]&&walk(T[x][y-1])?1:0;
      const a=k?[iso(x+.22,y,h),iso(x+.78,y,h),iso(x+.78,y+1,h),iso(x+.22,y+1,h)]:[iso(x,y+.22,h),iso(x+1,y+.22,h),iso(x+1,y+.78,h),iso(x,y+.78,h)];
      c.moveTo(a[0][0],a[0][1]);a.slice(1).forEach(q=>c.lineTo(q[0],q[1]));c.closePath();c.fill();
      c.strokeStyle="rgba(50,30,15,.55)";c.lineWidth=.4;c.beginPath();for(let i=1;i<6;i++){const f=i/6;const u=k?iso(x+.22,y+f,h):iso(x+f,y+.22,h),w=k?iso(x+.78,y+f,h):iso(x+f,y+.78,h);c.moveTo(u[0],u[1]);c.lineTo(w[0],w[1])}c.stroke();
    }
  }
}
function strata(c,x1,y1,x2,y2,h,low,c1,c2){
  const band=(zt,zb,col)=>{const a=iso(x1,y1,zt),b=iso(x2,y2,zt),d=iso(x2,y2,zb),e=iso(x1,y1,zb);c.fillStyle=col;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(d[0],d[1]);c.lineTo(e[0],e[1]);c.closePath();c.fill()};
  band(-1.4,-3.6,c1);band(-3.6,low,c2);
}

/* Sprites de árboles */
const SPR={};
function treeSprite(type,dry){
  const key=type+(dry?"d":"");if(SPR[key])return SPR[key];
  const k=3,w=56,h=70,cn=document.createElement("canvas");cn.width=w*k;cn.height=h*k;
  const c=cn.getContext("2d");c.scale(k,k);
  const fx=w/2,fy=h-8;
  const ell=(x,y,a,b,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,a,b,0,0,7);c.fill()};
  ell(fx+3,fy+1,type==="plantula"?3:type==="leucaena"?6:type==="matarraton"?7:11,type==="plantula"?1.4:3.5,"rgba(15,35,15,.3)");
  const trunk=(hg,wd,col="#5d4630")=>{c.fillStyle=col;c.fillRect(fx-wd/2,fy-hg,wd,hg);c.fillStyle="rgba(0,0,0,.25)";c.fillRect(fx,fy-hg,wd/2,hg)};
  const g=dry?{d:"#6f7a35",m:"#8e9a42",l:"#b0b65a"}:{d:"#21602f",m:"#368a3f",l:"#62b552"};
  if(type==="palma"){
    trunk(25,1.8,"#7a6143");c.strokeStyle=dry?"#8e9a42":"#3b9141";c.lineWidth=1.7;c.lineCap="round";
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;c.beginPath();c.moveTo(fx,fy-25);c.quadraticCurveTo(fx+Math.cos(a)*8,fy-30+Math.sin(a)*2,fx+Math.cos(a)*14,fy-23+Math.sin(a)*4);c.stroke()}
  } else if(type==="plantula"){
    trunk(5,.9,"#6b5236");ell(fx,fy-7,3,3,g.m);ell(fx-.7,fy-8,1.6,1.6,g.l);
    c.strokeStyle="rgba(240,240,220,.7)";c.lineWidth=.5;c.strokeRect(fx-3.5,fy-3.5,7,4);
  } else if(type==="leucaena"){
    trunk(8,1.3);ell(fx,fy-11,7,5.5,g.d);ell(fx-1,fy-13,5.6,4.2,g.m);ell(fx-2,fy-14.5,3,2.2,g.l);
    c.fillStyle="#f4efc8";for(const[a,b]of[[-4,-14],[3,-12],[0,-16],[5,-9],[-5,-10]])c.fillRect(fx+a,fy+b,.9,.9);
  } else if(type==="matarraton"){
    trunk(10,1.5);ell(fx,fy-14,8,6.2,g.d);ell(fx-1,fy-16,6.4,5,g.m);ell(fx-2,fy-18,3.6,2.6,g.l);
    c.fillStyle="#f09ad0";for(const[a,b]of[[-5,-17],[3,-19],[0,-13],[5,-14],[-3,-20],[6,-17],[-6,-13],[2,-16]])c.fillRect(fx+a,fy+b,1.1,1.1);
  } else if(type==="campano"){
    trunk(16,2.6);ell(fx,fy-19,18,8,g.d);ell(fx-1,fy-22,15,6.6,g.m);ell(fx-4,fy-24.500,8,3.2,g.l);
  } else if(type==="ceiba"){
    trunk(25,3.2,"#8b806b");ell(fx,fy-30,16,10,g.d);ell(fx-1,fy-33,13,8,g.m);ell(fx-4,fy-36,7,4,g.l);
  } else { // roble rosado y similares
    trunk(16,2.2);ell(fx,fy-22,12,11,g.d);ell(fx-1,fy-25,10,8.6,g.m);ell(fx-3,fy-28,5.4,4,g.l);
  }
  return SPR[key]=cn;
}
function drawTree(c,tr,v,dry){
  if(tr.plantedT!=null&&tr.plantedT>v.t)return;
  const t=T[Math.floor(tr.x)][Math.floor(tr.y)];const[p,q]=iso(tr.x,tr.y,t.h);
  let s=tr.size;if(tr.plantedT!=null)s*=clamp(.35+(v.t-tr.plantedT)/1440,.35,1);
  const sp=treeSprite(tr.type,dry&&tr.type!=="plantula");
  c.drawImage(sp,p-28*s,q-62*s,56*s,70*s);
}

/* Primitivas sólidas */
function pg(c,pts,fill,stroke){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.5;c.stroke()}}
function box(c,x,y,z,w,d,h,col){
  const[t,l,r]=col;
  pg(c,[iso(x,y+d,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x,y+d,z+h)],l);
  pg(c,[iso(x+w,y,z),iso(x+w,y+d,z),iso(x+w,y+d,z+h),iso(x+w,y,z+h)],r);
  pg(c,[iso(x,y,z+h),iso(x+w,y,z+h),iso(x+w,y+d,z+h),iso(x,y+d,z+h)],t);
}
const tones=h=>[shade(h,1.1),shade(h,.82),shade(h,.62)];
function gable(c,x,y,z,w,d,h,col){ // caballete a lo largo de x
  const m=y+d/2,o=.28;
  pg(c,[iso(x-o,y-o,z),iso(x+w+o,y-o,z),iso(x+w+o,m,z+h),iso(x-o,m,z+h)],shade(col,1.1));
  pg(c,[iso(x+w,y,z),iso(x+w,y+d,z),iso(x+w,m,z+h)],"#d8d3bf");
  pg(c,[iso(x-o,y+d+o,z),iso(x+w+o,y+d+o,z),iso(x+w+o,m,z+h),iso(x-o,m,z+h)],shade(col,.85));
  pg(c,[iso(x+w+o,m,z+h),iso(x+w+o,y+d+o,z),iso(x+w,y+d,z),iso(x+w,m,z+h-.1)],shade(col,.62));
  c.strokeStyle="rgba(0,0,0,.2)";c.lineWidth=.35;c.beginPath();for(let i=1;i<Math.floor(w*2.4);i++){const f=x-o+i/2.4;const a=iso(f,y+d+o,z),b=iso(f,m,z+h);c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1])}c.stroke();
}
function cylinder(c,x,y,z,r,h,col){
  const[a,b]=iso(x,y,z),[a2,b2]=iso(x,y,z+h),rx=r*TW/Math.SQRT2*.72,ry=rx*.5;
  const g=c.createLinearGradient(a-rx,0,a+rx,0);g.addColorStop(0,shade(col,.95));g.addColorStop(.5,shade(col,.85));g.addColorStop(1,shade(col,.55));
  c.fillStyle=g;c.beginPath();c.moveTo(a-rx,b);c.ellipse(a,b,rx,ry,0,Math.PI,0,true);c.lineTo(a2+rx,b2);c.ellipse(a2,b2,rx,ry,0,0,Math.PI,true);c.closePath();c.fill();
  c.fillStyle=shade(col,1.15);c.beginPath();c.ellipse(a2,b2,rx,ry,0,0,7);c.fill();
}

function drawBuildings(){
  const list=[];
  const add=(d,f)=>list.push({d,f});
  const Y=1;
  /* Casa */
  add(2+23+4.4,(c)=>{
    const wl=tones("#e8e2cf");
    box(c,2,23,Y,5,4,3.2,wl);
    // porche
    box(c,2.2,27,Y,4.6,.9,.3,tones("#b89a70"));
    for(const px of[2.4,4.4,6.5]){box(c,px,27.65,Y,.14,.14,3,tones("#7a5a3a"))}
    // ventanas y puerta
    for(const u of[2.5,3.4,5.6]){pg(c,[iso(u,27,Y+1.2),iso(u+.55,27,Y+1.2),iso(u+.55,27,Y+2.4),iso(u,27,Y+2.4)],u===3.4?"#7c4f2b":"#35515f")}
    pg(c,[iso(7,23.8,Y+1.2),iso(7,24.6,Y+1.2),iso(7,24.6,Y+2.4),iso(7,23.8,Y+2.4)],"#35515f");
    pg(c,[iso(7,25.6,Y+1.2),iso(7,26.4,Y+1.2),iso(7,26.4,Y+2.4),iso(7,25.6,Y+2.4)],"#35515f");
    gable(c,2,23,Y+3.2,5,4.9,2.6,"#b9573a");
    // chimenea
    box(c,3,24.2,Y+4.2,.4,.4,2,tones("#a48a6a"));
  });
  /* Sala de ordeño */
  add(12+25+3.6,(c)=>{
    box(c,12,25,Y,5,3.5,.25,tones("#a6a59a"));
    box(c,12.1,25.1,Y+.25,4.8,3.3,1.2,tones("#d7d5c6"));
    // tanque de frío visible
    cylinder(c,16,27.9,Y+.25,.32,2,"#cfd9dd");
    for(const[a,b]of[[12.1,25.1],[16.8,25.1],[12.1,28.4],[16.8,28.4]])box(c,a,b,Y+.25,.14,.14,3.1,tones("#65737a"));
    // puestos de ordeño
    for(let i=0;i<5;i++)box(c,12.5+i*.75,28.5,Y+.25,.08,.14,1.1,tones("#65737a"));
    gable(c,12,25,Y+3.4,5,3.5,1.3,"#9db0b7");
    // paneles solares
    const a=iso(12.5,25.5,Y+4.2);
    for(let i=0;i<3;i++)pg(c,[iso(12.6+i*1.2,25.3,Y+3.75),iso(13.6+i*1.2,25.3,Y+3.75),iso(13.6+i*1.2,26.5,Y+4.5),iso(12.6+i*1.2,26.5,Y+4.5)],"#233e62","#6d8db0");
  });
  /* Tanque elevado */
  add(7.5+21.5+1.6,(c)=>{
    for(const[a,b]of[[7.6,21.6],[8.9,21.6],[7.6,22.9],[8.9,22.9]])box(c,a,b,Y,.12,.12,5,tones("#5f6b70"));
    cylinder(c,8.3,22.3,Y+5,.72,2.6,"#4b7ea3");
  });
  /* Biodigestor */
  add(1.5+27.5+2,(c)=>{
    const[a,b]=iso(3,28.4,Y);
    c.fillStyle="#1f2e2a";c.beginPath();c.ellipse(a,b,22,11,0,0,7);c.fill();
    const g=c.createRadialGradient(a-6,b-12,2,a,b-3,22);g.addColorStop(0,"#d89a55");g.addColorStop(1,"#7b4e26");
    c.fillStyle=g;c.beginPath();c.ellipse(a,b-2,20,14,0,Math.PI,0);c.ellipse(a,b-2,20,8,0,0,Math.PI);c.fill();
    c.strokeStyle="#aab6ba";c.lineWidth=1;c.beginPath();c.moveTo(a,b-15);c.lineTo(a,b-20);c.lineTo(a+18,b-14);c.stroke();
  });
  /* Compost */
  add(5.5+27.6+1.8,(c)=>{
    for(let i=0;i<3;i++){
      const x=5.5+i*1.2;
      box(c,x,27.6,Y,1.1,.08,.8,tones("#8a6a44"));box(c,x,27.6,Y,.08,1.8,.8,tones("#8a6a44"));
      const[a,b]=iso(x+.6,28.6,Y);
      c.fillStyle=["#4f3a22","#5f4629","#6e5430"][i];c.beginPath();c.ellipse(a,b-1,10,7,0,Math.PI,0);c.ellipse(a,b-1,10,4,0,0,Math.PI);c.fill();
      c.fillStyle="rgba(255,255,255,.1)";c.beginPath();c.ellipse(a-3,b-5,4,1.6,0,0,7);c.fill();
    }
  });
  /* Apiario */
  add(9.6+9.6+1.2,(c)=>{
    const t=T[10][10];
    for(let i=0;i<3;i++){const x=9.7+i*.8,z=t.h;box(c,x,9.8,z,.5,.5,.8,tones("#e7d39a"));box(c,x-.05,9.75,z+.8,.6,.6,.15,tones("#b58a4a"))}
  });
  /* Corral de terneros: cerca de postes */
  add(17.3+25+1.5,(c)=>{
    const R=[[17.4,25.1,19.6,25.1],[19.6,25.1,19.6,28.5],[17.4,28.5,19.6,28.5]];
    for(const[a,b,e,f]of R){const n=Math.max(2,Math.ceil(Math.hypot(e-a,f-b)));for(let i=0;i<=n;i++){const u=lerp(a,e,i/n),w=lerp(b,f,i/n);box(c,u,w,Y,.08,.08,1.1,tones("#7a5a3a"))}c.strokeStyle="#9c7b52";c.lineWidth=.8;for(const zz of[.6,1]){const p=iso(a,b,Y+zz),q=iso(e,f,Y+zz);c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke()}}
  });
  /* Nacimiento cercado */
  add(5+2+2,(c)=>{
    const t=T[5][2],z=t.h+.3;c.strokeStyle="#c7d3d6";c.lineWidth=.7;
    const ring=[[3.8,.9],[6.2,.9],[6.2,3.2],[3.8,3.2]];
    for(const[a,b]of ring)box(c,a,b,T[Math.floor(a)][Math.floor(b)].h,.08,.08,1.2,tones("#7a5a3a"));
  });
  /* Bebederos en cada potrero */
  for(const p of PADDEF){
    const g=PADGEO[p.id],gt=g.gate.t;
    const x=gt.x+.1,y=gt.y+.15;
    add(x+y+.8,(c,v)=>{
      const z=gt.h;box(c,x,y,z,.85,.32,.35,tones("#7d8f95"));
      const lvl=v.pad[p.id].water;
      pg(c,[iso(x+.05,y+.05,z+.36),iso(x+.8,y+.05,z+.36),iso(x+.8,y+.27,z+.36),iso(x+.05,y+.27,z+.36)],lvl>25?"#49b2e2":"#8a7a55");
    });
  }
  return list;
}
const BLIST=drawBuildings();

/* Ganado (posición visual) */
let VC=[],CALVES=[],WORKERS=[],BIRDS=[],PACKETS=[],DROPS=[];
const vR=rng32(555);
function randInPad(id){const g=PADGEO[id],t=g.tiles[Math.floor(vR()*g.tiles.length)];return[t.x+.15+vR()*.7,t.y+.15+vR()*.7]}
function initVisual(){
  VC=S.cow.map(c=>{const p=S.grp[c.grp].pad,[x,y]=randInPad(p);return{id:c.id,x,y,tx:x,ty:y,wait:vR()*5,dir:1,pad:p,route:null,z:T[Math.floor(x)][Math.floor(y)].h,ph:vR()*6}});
  CALVES=[0,1,2,3].map(i=>({x:17.9+vR()*1.4,y:25.5+vR()*2.7,wait:vR()*6,tx:18,ty:26,dir:1,ph:vR()*6,coat:i%2?"roja":"cebu"}));
  WORKERS=[{x:10.5,y:22.5,route:null,wait:2,job:null,shirt:"#2e7fbf",hat:"#e8dcb5"},{x:22.5,y:12.5,route:null,wait:5,job:null,shirt:"#c8553d",hat:"#d6c79c"}];
  BIRDS=[0,1].map(i=>({x:vR()*800,y:100+vR()*300,vx:14+vR()*12,vy:(vR()-.5)*5,n:5+i*2}));
  PACKETS=[];
}
function dispatchWorker(pid){const w=WORKERS[1],g=PADGEO[pid],l=g.gate.n;const cur=[Math.floor(w.x),Math.floor(w.y)];const cs=walk(T[cur[0]][cur[1]])?cur:[22,12];const r=bfs(cs[0],cs[1],l.x,l.y);if(r){w.route=r.slice();w.job=pid;w.final=g.brk?[g.brk.t.x+.5,g.brk.t.y+.5]:null;w.wait=0}}
function updateVisual(dt,v){
  const sp=SPEED>=12?2.2:1;
  VC.forEach((m,i)=>{
    const c=v.cow[i],gr=v.grp[c.grp];m.sick=c.health&&!c.health.treated;
    if(VIEW!==null){
      if(m.pad!==gr.pad){const[x,y]=randInPad(gr.pad);m.x=m.tx=x;m.y=m.ty=y;m.pad=gr.pad;m.route=null;m.z=T[Math.floor(x)][Math.floor(y)].h}
    } else if(m.pad!==gr.pad&&!m.route){
      const a=PADGEO[m.pad].gate.n,b=PADGEO[gr.pad].gate.n,base=bfs(a.x,a.y,b.x,b.y);
      if(base){const[fx,fy]=randInPad(gr.pad);m.route=[[a.x+.5,a.y+.5],...base.map(q=>[q[0]+(vR()-.5)*.5,q[1]+(vR()-.5)*.5]),[PADGEO[gr.pad].gate.t.x+.5,PADGEO[gr.pad].gate.t.y+.5],[fx,fy]];m.wait=i*.12;m.tx=m.x;m.ty=m.y}
      m.pad=gr.pad;
    }
    if(RM&&!m.route)return;
    m.wait-=dt;
    if(m.route&&m.wait<=0){
      const q=m.route[0],d=Math.hypot(q[0]-m.x,q[1]-m.y),st=1.8*sp*dt;
      if(d<st){m.route.shift();if(!m.route.length){m.route=null;m.wait=1+vR()*3;m.tx=m.x;m.ty=m.y}}
      else{const dx=(q[0]-m.x)/d,dy=(q[1]-m.y)/d;m.x+=dx*st;m.y+=dy*st;m.dir=(dx-dy)>=0?1:-1;m.ph+=dt*11}
      m.moving=true;
    } else if(!m.route&&m.wait<=0){
      const d=Math.hypot(m.tx-m.x,m.ty-m.y);
      if(d<.05){
        // elegir nuevo destino: si la cerca está rota y es su potrero, algunos van al agua
        let tgt;
        const brk=v.fence.broken&&v.fence.pad===gr.pad&&PADGEO[gr.pad].brk;
        if(brk&&i%3===0){const n=PADGEO[gr.pad].brk.n;const w=nearKind(n.x,n.y,["water"]);const f=vR();tgt=[lerp(n.x+.5,w.x+.5,f)+(vR()-.5)*1.4,lerp(n.y+.5,w.y+.5,f)+(vR()-.5)*1.4]}
        else if(m.tile&&m.tile.kind!=="pad"){tgt=[PADGEO[gr.pad].cx,PADGEO[gr.pad].cy]}
        else{const r=2+vR()*2.5,a=vR()*6.28;let cand=[m.x+Math.cos(a)*r,m.y+Math.sin(a)*r];const t=T[Math.floor(cand[0])]&&T[Math.floor(cand[0])][Math.floor(cand[1])];
          tgt=(t&&t.zone===gr.pad)?cand:randInPad(gr.pad)}
        m.tx=clamp(tgt[0],.2,W-.2);m.ty=clamp(tgt[1],.2,H-.2);m.wait=m.sick?6+vR()*10:vR()<.75?2+vR()*7:.2;m.moving=false;
      } else {
        const st=Math.min(d,.32*sp*dt);m.x+=(m.tx-m.x)/d*st;m.y+=(m.ty-m.y)/d*st;m.dir=(m.tx-m.x)-(m.ty-m.y)>=0?1:-1;m.ph+=dt*6;m.moving=true;
      }
    } else m.moving=false;
    const t=T[clamp(Math.floor(m.x),0,W-1)][clamp(Math.floor(m.y),0,H-1)];m.tile=t;
    m.z+=(t.h-m.z)*Math.min(1,dt*6);
  });
  if(!RM){
    for(const c of CALVES){c.wait-=dt;if(c.wait<=0){const d=Math.hypot(c.tx-c.x,c.ty-c.y);if(d<.05){c.tx=17.8+vR()*1.5;c.ty=25.5+vR()*2.7;c.wait=1+vR()*6}else{const st=Math.min(d,.4*dt);c.x+=(c.tx-c.x)/d*st;c.y+=(c.ty-c.y)/d*st;c.dir=(c.tx-c.x)-(c.ty-c.y)>=0?1:-1;c.ph+=dt*7}}}
    for(const w of WORKERS){
      w.wait-=dt;
      if(w.route&&w.wait<=0){const q=w.route[0],d=Math.hypot(q[0]-w.x,q[1]-w.y),st=1.4*sp*dt;if(d<st){w.route.shift();if(!w.route.length){w.route=null;w.wait=w.job?6:2+vR()*5;if(w.job&&w.final){w.x=w.final[0];w.y=w.final[1];w.job=null}}}else{const dx=(q[0]-w.x)/d,dy=(q[1]-w.y)/d;w.x+=dx*st;w.y+=dy*st;w.dir=dx-dy>=0?1:-1;w.ph=(w.ph||0)+dt*9}}
      else if(!w.route&&w.wait<=0){const cur=[Math.floor(w.x),Math.floor(w.y)];const lanes=tiles.filter(walk);const dst=lanes[Math.floor(vR()*lanes.length)];const f=walk(T[cur[0]][cur[1]])?cur:null;
        if(f){w.route=bfs(f[0],f[1],dst.x,dst.y);w.route=w.route&&w.route.slice();w.wait=0}else{const n=PADGEO[S.grp.G1.pad].gate.n;w.x=n.x+.5;w.y=n.y+.5;w.wait=2}}
    }
    for(const b of BIRDS){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x>WORLD_W+30){b.x=-40;b.y=90+vR()*420;b.vy=(vR()-.5)*5}}
  }
}
function drawCow(c,x,y,z,dir,ph,moving,coat,small,graze){
  const[p,q]=iso(x,y,z);
  const s=small?.68:1;
  c.save();c.translate(p,q);c.scale(dir*s*1.22,s*1.22);
  const col={pinta:["#f2efe8","#26221f"],roja:["#a4502a","#7b3a1e"],cuerno:["#8a5c33","#5f3d20"],cebu:["#ddd5c4","#b4aa96"]}[coat];
  c.fillStyle="rgba(15,30,10,.32)";c.beginPath();c.ellipse(0,.4,7.4,2.6,0,0,7);c.fill();
  // patas
  c.fillStyle=shade(col[0]==="#f2efe8"?"#c9c4b8":col[0],.72);
  const sw=moving?Math.sin(ph)*1.2:0;
  for(const[a,o]of[[-4.2,1],[-2.4,-1],[2.6,-1],[4.200,1]]){c.fillRect(a+sw*o-.5,-4,1.1,4)}
  // cuerpo
  c.fillStyle=col[0];c.beginPath();c.roundRect(-5.8,-8.8,11.4,5.6,2.4);c.fill();
  c.fillStyle="rgba(0,0,0,.14)";c.beginPath();c.roundRect(-5.8,-5.4,11.4,2.2,1.1);c.fill();
  if(coat==="pinta"){c.fillStyle=col[1];c.beginPath();c.ellipse(-2.4,-7,2.4,1.6,.4,0,7);c.ellipse(2.4,-6,1.6,1.4,-.3,0,7);c.fill()}
  if(coat==="cebu"){c.fillStyle=col[0];c.beginPath();c.ellipse(3,-9.200,1.8,1.7,0,0,7);c.fill()}
  // cola
  c.strokeStyle=col[1];c.lineWidth=.7;c.beginPath();c.moveTo(-5.6,-8);c.quadraticCurveTo(-7,-6.6,-6.6,-4.2);c.stroke();
  // cabeza
  const hy=graze?-3.2:-9.2,hx=graze?6.2:6.4;
  c.strokeStyle=col[0];c.lineWidth=2.3;c.beginPath();c.moveTo(4.6,-7.2);c.lineTo(hx,hy+1);c.stroke();
  c.fillStyle=col[0];c.beginPath();c.roundRect(hx-1.2,hy-1.2,3.8,2.8,1.1);c.fill();
  c.fillStyle="#dcb6a0";c.fillRect(hx+1.5,hy-.1,1.2,1.4);
  c.fillStyle="#191410";c.fillRect(hx+.6,hy-.4,.7,.7);
  if(coat==="cuerno"){c.strokeStyle="#e6dcc4";c.lineWidth=.6;c.beginPath();c.moveTo(hx,hy-1);c.quadraticCurveTo(hx-.6,hy-3,hx+1,hy-3.4);c.stroke()}
  if(!small){c.fillStyle="#5cc7f0";c.fillRect(3.7,-6.3,1,1.4)} // collar con sensor
  c.restore();
}
function drawWorker(c,w){
  const t=T[clamp(Math.floor(w.x),0,W-1)][clamp(Math.floor(w.y),0,H-1)];const[p,q]=iso(w.x,w.y,t.h);
  c.save();c.translate(p,q);
  c.fillStyle="rgba(15,30,10,.3)";c.beginPath();c.ellipse(0,.3,3,1.2,0,0,7);c.fill();
  const sw=w.route?Math.sin(w.ph||0)*.9:0;
  c.fillStyle="#2c3b55";c.fillRect(-1.4+sw,-4,1.2,4);c.fillRect(.2-sw,-4,1.2,4);
  c.fillStyle=w.shirt;c.fillRect(-1.7,-8.4,3.4,4.6);
  c.fillStyle="#c79a78";c.beginPath();c.arc(0,-9.8,1.5,0,7);c.fill();
  c.fillStyle=w.hat;c.beginPath();c.ellipse(0,-10.8,3,.9,0,0,7);c.fill();c.fillRect(-1.3,-12.2,2.6,1.4);
  c.restore();
}
function drawFence(c,f,v){
  const brk=f.brk&&v.fence.broken&&v.fence.pad===f.pad;
  const a=iso(f.x1,f.y1,f.z),b=iso(f.x2,f.y2,f.z);
  if(brk){
    c.strokeStyle="#7a5a3a";c.lineWidth=1.1;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(a[0]-3,a[1]-5);c.moveTo(b[0],b[1]);c.lineTo(b[0]+4,b[1]-3);c.stroke();
    return;
  }
  const hs=8;
  c.strokeStyle="#e8e0cc";c.lineWidth=.45;c.globalAlpha=.8;
  c.beginPath();c.moveTo(a[0],a[1]-hs*.75);c.lineTo(b[0],b[1]-hs*.75);c.moveTo(a[0],a[1]-hs*.42);c.lineTo(b[0],b[1]-hs*.42);c.stroke();
  c.globalAlpha=1;
  c.strokeStyle="#6e5236";c.lineWidth=1;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(a[0],a[1]-hs);c.stroke();
}
function sensorStatus(sn,v){
  if(v.off[sn.id])return ST[4];return stOf(sensorScore(sn,v));
}
function sensorScore(sn,v){
  if(sn.pad){const z=v.pad[sn.pad];return .5*(100-z.comp)+.5*clamp(z.moist*1.5)}
  if(sn.seg)return segScore(v,sn.seg);
  if(sn.res)return clamp(v.res.level*1.3);
  if(sn.id==="EMA-1")return v.scores.clima;
  if(sn.id==="CT-1"||sn.id==="AC-1")return clamp(v.bio.birds*1.3);
  if(sn.id==="CT-2")return v.bio.corridor;
  if(sn.id==="TR-1")return v.bio.beetles;
  return 90;
}
const SENS_K={suelo:"suelo",agua:"agua",clima:"clima",bio:"bio",humano:"humano"};

/* Selección y hover */
let sel={type:"seg",id:"Q2"},hover=null,tab="detalle",logFilter="todo",openLot=null;
function tilesOf(s){
  if(!s)return[];
  if(s.type==="pad")return PADGEO[s.id].tiles;
  if(s.type==="seg")return tiles.filter(t=>t.seg===s.id&&(t.kind==="water"||t.kind==="ripar"));
  if(s.type==="res")return tiles.filter(t=>t.kind==="reservoir");
  if(s.type==="forest")return tiles.filter(t=>t.kind==="forest");
  if(s.type==="recovery")return tiles.filter(t=>t.kind==="recovery");
  if(s.type==="bld"){const b=BLD[s.id];return tiles.filter(t=>bldAt(t.x,t.y)===s.id)}
  return[];
}
const OUTLINE={};
function outlineOf(s){
  const key=s.type+":"+s.id;if(OUTLINE[key])return OUTLINE[key];
  const set=new Set(tilesOf(s));const segs=[];
  for(const t of set){
    for(const[a,b,ax,ay,bx,by]of[[1,0,1,0,1,1],[-1,0,0,0,0,1],[0,1,0,1,1,1],[0,-1,0,0,1,0]]){
      const q=T[t.x+a]&&T[t.x+a][t.y+b];if(!q||!set.has(q)){segs.push([iso(t.x+ax,t.y+ay,t.h),iso(t.x+bx,t.y+by,t.h)])}
    }
  }
  return OUTLINE[key]=segs;
}
function strokeOutline(c,s,col,w,dash,off){
  const seg=outlineOf(s);if(!seg.length)return;
  c.strokeStyle=col;c.lineWidth=w/cam.z;if(dash){c.setLineDash(dash.map(d=>d/cam.z));c.lineDashOffset=off/cam.z}
  c.beginPath();for(const[a,b]of seg){c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1])}c.stroke();c.setLineDash([]);
}
function pickAt(sx,sy){
  const v=viewState();
  // sensores (siempre encima)
  for(const sn of SENS){if(!pinVisible(sn))continue;const q=pinPos(sn);if(Math.hypot(sx-q[0],sy-q[1])<11)return{type:"sensor",id:sn.id}}
  const[wx,wy]=toWorld(sx,sy);
  // vacas
  let best=null,bd=11/Math.max(cam.z,.9);
  for(const m of VC){const[p,q]=iso(m.x,m.y,m.z);const d=Math.hypot(wx-p,wy-(q-5));if(d<bd){bd=d;best=m}}
  if(best)return{type:"cow",id:best.id};
  // celdas, de adelante hacia atrás
  for(let i=tiles.length-1;i>=0;i--){const t=tiles[i];const[p,q]=iso(t.x,t.y,t.h);const dx=wx-p,dy=wy-q-TH/2;if(Math.abs(dx)/(TW/2)+Math.abs(dy)/(TH/2)<=1)return selOfTile(t)}
  return null;
}
function selOfTile(t){
  const b=bldAt(t.x,t.y);if(b&&(t.kind==="yard"||t.kind==="corral"||t.kind==="forest"||t.kind==="ripar"))return{type:"bld",id:b};
  if(t.kind==="pad")return{type:"pad",id:t.zone};
  if(t.seg)return{type:"seg",id:t.seg};
  if(t.kind==="reservoir")return{type:"res",id:"res"};
  if(t.kind==="forest")return{type:"forest",id:"forest"};
  if(t.kind==="recovery")return{type:"recovery",id:"recovery"};
  return null;
}
const pinVisible=sn=>layer==="general"||SENS_K[sn.kind]===layer||(layer==="humano"&&sn.kind==="humano");
function pinPos(sn){const t=T[Math.floor(sn.x)][Math.floor(sn.y)];const[p,q]=iso(sn.x,sn.y,t.h);const[a,b]=toScreen(p,q);return[a,b-26]}

/* Luz del día */
function daylight(tf){
  if(SPEED>=12)return 1;                 // a alta velocidad no parpadea
  const h=hod(tf);const a=Math.sin(Math.PI*(h-5.6)/13);
  return clamp(a*1.6,0,1);
}
/* Bucle */
let SPEED=.5,last=performance.now(),acc=0,uiT=0,tlT=0;
function viewState(){return VIEW!==null?SNAP[VIEW]:S}
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.1,(now-last)/1000);last=now;
  if(VIEW===null&&SPEED>0){acc+=dt*SPEED;let n=0;while(acc>=1&&n<8){step();acc-=1;n++;uiDirty=true;terrDirty=true}}
  const v=viewState();
  updateVisual(dt,v);
  if(terrDirty&&now-lastTerr>(SPEED>=12?650:300)){paintTerrain(v);terrDirty=false;lastTerr=now}
  render(v,now,dt);
  if(now-uiT>700&&uiDirty&&!hold.left&&!hold.right){renderUI(v);uiT=now;uiDirty=false}
  if(now-tlT>900||tlNeedsDraw){drawTimeline(v);tlT=now;tlNeedsDraw=false}
}
function render(v,now,dt){
  const c=ctx,tf=VIEW!==null?v.t:v.t+acc;
  c.setTransform(dpr,0,0,dpr,0,0);
  if(!bgGrad||bgGrad.w!==cw||bgGrad.h!==ch){const g=c.createRadialGradient(cw/2,ch*.45,20,cw/2,ch*.45,Math.max(cw,ch)*.72);g.addColorStop(0,"#1f4a52");g.addColorStop(1,"#0e2127");bgGrad={g,w:cw,h:ch}}
  c.fillStyle=bgGrad.g;c.fillRect(0,0,cw,ch);
  c.setTransform(dpr*cam.z,0,0,dpr*cam.z,dpr*cam.x,dpr*cam.y);
  c.drawImage(terr,0,0,WORLD_W,WORLD_H);
  const phase=RM?0:now/1000;
  /* agua en movimiento */
  if(!RM){
    c.strokeStyle="rgba(255,255,255,.34)";c.lineWidth=.8;c.beginPath();
    for(const t of tiles){if(t.kind!=="water"&&t.kind!=="reservoir")continue;
      const f=(phase*.28+t.n*3)%1,u=t.kind==="water"?f:.5+.3*Math.sin(phase*.5+t.n*9);
      const[a,b]=iso(t.x+.15+u*.7,t.y+.2+t.n2*.6,t.h);c.moveTo(a-2,b);c.lineTo(a+2,b)}
    c.stroke();
  }
  /* cuerpos ordenados por profundidad */
  const dry=avgMoist(v)<26;
  const items=[];
  const treeAlpha=layer==="general"||layer==="bio"?1:.5;
  for(const tr of TREES){if(tr.plantedT==null||tr.plantedT<=v.t)items.push({d:tr.x+tr.y,k:0,o:tr})}
  for(const f of FENCES)items.push({d:f.d,k:1,o:f});
  for(const b of BLIST)items.push({d:b.d,k:2,o:b});
  VC.forEach((m,i)=>items.push({d:m.x+m.y,k:3,o:m,i}));
  for(const m of CALVES)items.push({d:m.x+m.y,k:4,o:m});
  for(const w of WORKERS)items.push({d:w.x+w.y,k:5,o:w});
  items.sort((a,b)=>a.d-b.d);
  for(const it of items){
    if(it.k===0){c.globalAlpha=treeAlpha;drawTree(c,it.o,v,dry);c.globalAlpha=1}
    else if(it.k===1)drawFence(c,it.o,v);
    else if(it.k===2)it.o.f(c,v);
    else if(it.k===3){const m=it.o,cw_=v.cow[it.i];drawCow(c,m.x,m.y,m.z,m.dir,m.ph,m.moving,cw_.coat,false,!m.moving&&!m.sick&&Math.sin(m.ph*.3+now/2600)>0)}
    else if(it.k===4){const m=it.o;drawCow(c,m.x,m.y,1,m.dir||1,m.ph,false,m.coat,true,false)}
    else drawWorker(c,it.o);
  }
  /* sombra de nubes */
  if(!RM&&v.w.cloud>.2){
    c.save();{const a=iso(0,0,1),b=iso(W,0,0),d=iso(W,H,0),e=iso(0,H,0);c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.lineTo(d[0],d[1]);c.lineTo(e[0],e[1]);c.closePath();c.clip()}c.globalCompositeOperation="multiply";
    for(let i=0;i<4;i++){const px=((phase*7+i*360)%(WORLD_W+400))-200,py=180+((i*137)%380);
      const g=c.createRadialGradient(px,py,10,px,py,130);g.addColorStop(0,`rgba(60,75,95,${.5*v.w.cloud})`);g.addColorStop(1,"rgba(60,75,95,0)");
      c.fillStyle=g;c.save();c.translate(px,py);c.scale(1,.5);c.translate(-px,-py);c.beginPath();c.arc(px,py,130,0,7);c.fill();c.restore()}
    c.restore();
  }
  /* selección y hover */
  if(hover&&(hover.type!=="cow"&&hover.type!=="sensor")&&!(sel&&hover.type===sel.type&&hover.id===sel.id))strokeOutline(c,hover,"rgba(255,255,255,.55)",1.5);
  if(sel&&sel.type!=="cow"&&sel.type!=="sensor"){strokeOutline(c,sel,"rgba(8,30,40,.6)",4);strokeOutline(c,sel,"#fff",2,[7,5],-phase*14)}
  if(sel&&sel.type==="cow"){const m=VC.find(q=>q.id===sel.id);if(m){const[a,b]=iso(m.x,m.y,m.z);c.strokeStyle="#fff";c.lineWidth=1.5/cam.z;c.beginPath();c.ellipse(a,b,11,5.4,0,0,7);c.stroke()}}
  /* aves */
  c.strokeStyle="rgba(25,35,40,.85)";c.lineWidth=.9;
  if(!RM)for(const b of BIRDS){for(let i=0;i<b.n;i++){const a=b.x-i*9,y=b.y+(i%2?1:-1)*i*4,fl=Math.sin(phase*9+i)*1.8;c.beginPath();c.moveTo(a-3.5,y-fl);c.lineTo(a,y);c.lineTo(a+3.5,y-fl);c.stroke()}}
  /* luz del día */
  const dl=daylight(tf);
  c.setTransform(dpr,0,0,dpr,0,0);
  const cloudDim=v.w.cloud*.25;
  if(dl<.98||cloudDim>.05){
    c.save();c.globalCompositeOperation="multiply";
    const night=mixA([112,128,178],[255,247,232],dl);const dim=1-cloudDim*dl*.6;
    c.fillStyle=rgb(night.map(q=>q*dim));c.fillRect(0,0,cw,ch);c.restore();
  }
  /* luces nocturnas */
  if(dl<.5){
    c.setTransform(dpr*cam.z,0,0,dpr*cam.z,dpr*cam.x,dpr*cam.y);c.save();c.globalCompositeOperation="lighter";
    for(const[x,y,z,r]of[[4.5,27,2.2,44],[14.5,28.5,2,52],[8.8,20.5,5,14]]){const[a,b]=iso(x,y,z);const g=c.createRadialGradient(a,b,1,a,b,r);g.addColorStop(0,`rgba(255,200,120,${.55*(1-dl*2)})`);g.addColorStop(1,"rgba(255,200,120,0)");c.fillStyle=g;c.beginPath();c.arc(a,b,r,0,7);c.fill()}
    c.restore();
  }
  c.setTransform(dpr,0,0,dpr,0,0);
  /* lluvia */
  if(v.w.rain>.2&&!RM){
    const n=Math.min(260,30+v.w.rain*14);c.strokeStyle="rgba(190,220,240,.42)";c.lineWidth=1;c.beginPath();
    for(let i=0;i<n;i++){const a=(i*97.13+phase*300)%(cw+40)-20,b=(i*53.77+phase*900)%(ch+40)-20;c.moveTo(a,b);c.lineTo(a-3,b+13)}c.stroke();
  }
  /* cerca rota: señal pulsante */
  if(v.fence.broken){const g=PADGEO[v.fence.pad].brk;if(g){const[a,b]=iso(g.t.x+.5,g.t.y+.5,g.t.h+1.2);const[sa,sb]=toScreen(a,b);const f=RM?.5:(phase%1.4)/1.4;
    c.strokeStyle=`rgba(244,112,107,${1-f})`;c.lineWidth=2;c.beginPath();c.arc(sa,sb,8+f*20,0,7);c.stroke();
    c.fillStyle="#180806";c.beginPath();c.arc(sa,sb,9,0,7);c.fill();drawMark(c,"crit",sa,sb,6,"#f4706b")}}
  /* paquetes de datos hacia la pasarela */
  if(!RM&&VIEW===null){
    if(vR()<dt*2.6){const a=SENS.filter(q=>q.id!=="GW-1"&&!v.off[q.id]);PACKETS.push({s:a[Math.floor(vR()*a.length)],t:0})}
    const[gx,gy]=pinPos(GW);
    PACKETS=PACKETS.filter(p=>p.t<1);
    for(const p of PACKETS){p.t+=dt*.55;const[a,b]=pinPos(p.s),mx=(a+gx)/2,my=Math.min(b,gy)-40*cam.z,u=p.t,x=(1-u)*(1-u)*a+2*u*(1-u)*mx+u*u*gx,y=(1-u)*(1-u)*b+2*u*(1-u)*my+u*u*gy;c.fillStyle=`rgba(143,216,247,${Math.sin(u*Math.PI)})`;c.beginPath();c.arc(x,y,2.2,0,7);c.fill()}
  }
  /* etiquetas y pines */
  drawLabels(c,v,phase);
  for(const sn of SENS)if(pinVisible(sn)){
    const st=sensorStatus(sn,v);const[a,b]=pinPos(sn);
    const pulse=st.k!=="good"&&st.k!=="off"&&!RM?(((phase*.8+a*.01)%1)+1)%1:0;
    c.strokeStyle="rgba(10,25,30,.75)";c.lineWidth=1.5;c.beginPath();c.moveTo(a,b+7);c.lineTo(a,b+26);c.stroke();
    if(pulse){c.strokeStyle=st.c;c.globalAlpha=1-pulse;c.lineWidth=1.3;c.beginPath();c.arc(a,b,8+pulse*10,0,7);c.stroke();c.globalAlpha=1}
    c.fillStyle="#0c1f25";c.beginPath();c.arc(a,b,8,0,7);c.fill();
    if(sel&&sel.type==="sensor"&&sel.id===sn.id){c.strokeStyle="#fff";c.lineWidth=2;c.stroke()}
    drawMark(c,st.k,a,b+(st.k==="warn"?.4:0),4.2,st.c);
  }
  /* vaca enferma o en foco */
  for(let i=0;i<VC.length;i++){const m=VC[i],cw_=v.cow[i];
    const show=m.sick||(layer==="animal");if(!show)continue;
    const[a,b]=iso(m.x,m.y,m.z);const[sa,sb]=toScreen(a,b-15);
    const st=m.sick?ST[2]:stOf(100-(cw_.stress||0)*95);
    c.fillStyle="#0c1f25";c.beginPath();c.arc(sa,sb,5.6,0,7);c.fill();drawMark(c,st.k,sa,sb,3.4,st.c);
  }
}
function pill(c,sx,sy,txt,stk,col){
  c.font='600 11px "IBM Plex Sans",sans-serif';
  const w=c.measureText(txt).width+(stk?20:12),h=19;
  c.fillStyle="rgba(10,27,33,.9)";c.beginPath();c.roundRect(sx-w/2,sy-h/2,w,h,5);c.fill();
  if(stk)drawMark(c,stk,sx-w/2+10,sy,3.6,col);
  c.fillStyle="#ebf3ef";c.textBaseline="middle";c.textAlign="left";c.fillText(txt,sx-w/2+(stk?17:6),sy+.5);
}
function drawLabels(c,v){
  const small=cam.z<.72||cw<620;
  for(const def of PADDEF){
    const g=PADGEO[def.id],z=v.pad[def.id];const[wx,wy]=iso(g.cx,g.cy,g.tiles[0].h+3);const[sx,sy]=toScreen(wx,wy);
    let text=def.id,stScore=z.score;
    if(layer!=="general"&&layer!=="humano"){
      const m={suelo:`compact. ${num(z.comp)}`,agua:`${num(z.moist)} % hum.`,veg:`${num(z.bio/1000,1)} t MS/ha`,animal:`THI ${num(v.w.thi-shadeK(z.trees))}`,clima:`THI ${num(v.w.thi-shadeK(z.trees))}`,bio:`${num(z.trees)} árb/ha`}[layer];
      text=small?def.id:`${def.id} · ${m}`;
    } else if(layer==="general"&&!small)text=`${def.id} · ${padState(z)}`;
    const st=stOf(stScore);
    pill(c,sx,sy,text,st.k,st.c);
  }
  // hatos
  for(const g in v.grp){
    const list=VC.filter((m,i)=>v.cow[i].grp===g);const mx=avg(list,m=>m.x),my=avg(list,m=>m.y);
    const inTransit=list.some(m=>m.route);
    if(!small||inTransit){const[a,b]=iso(mx,my,T[clamp(Math.floor(mx),0,W-1)][clamp(Math.floor(my),0,H-1)].h+4);const[sa,sb]=toScreen(a,b);
      pill(c,sa,sb-(inTransit?0:-40),(g==="G1"?"Ordeño ":"Levante ")+list.length+(inTransit?" · en camino":""),null)}
  }
  if(!small&&layer==="humano"){
    for(const def of[["Zona de conservación",5,5,4],["Zona de recuperación",32,23,1],["Núcleo productivo",9,24,3]]){const[a,b]=iso(def[1],def[2],def[3]+2);const[sa,sb]=toScreen(a,b);pill(c,sa,sb,def[0])}
  }
}


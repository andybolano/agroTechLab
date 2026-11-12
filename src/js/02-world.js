"use strict";
/* ==================================================================
   2. EL MUNDO: rejilla, zonas, relieve, árboles, cercas
   ================================================================== */
const W=40,H=30,TW=32,TH=16,LV=6,HA_TILE=.05;
const OX=H*TW/2+36,OY=120;
const WORLD_W=(W+H)*TW/2+72,WORLD_H=(W+H)*TH/2+240;
const iso=(x,y,z=0)=>[(x-y)*TW/2+OX,(x+y)*TH/2-z*LV+OY];

const STREAM=[[5,2],[9,6],[12,11],[18,13],[23,16],[26,21],[33,25],[40.5,28]];
function distStream(x,y){let m=1e9;for(let i=0;i<STREAM.length-1;i++){const[a,b]=STREAM[i],[c,d]=STREAM[i+1],dx=c-a,dy=d-b,t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1),e=Math.hypot(x-a-dx*t,y-b-dy*t);if(e<m)m=e}return m}

const PADDEF=[
 {id:"P1",name:"La Ceiba",r:[14,1,21,7],t:20,silvo:false},
 {id:"P2",name:"Los Campanos",r:[23,1,30,7],t:95,silvo:true},
 {id:"P3",name:"El Alto",r:[32,1,39,7],t:32,silvo:false},
 {id:"P4",name:"La Vega",r:[23,9,30,14],t:14,silvo:false},
 {id:"P5",name:"Matarratón",r:[32,9,39,16],t:72,silvo:true},
 {id:"P6",name:"Las Palmas",r:[1,12,9,19],t:44,silvo:false},
 {id:"P7",name:"El Guayacán",r:[11,16,21,22],t:85,silvo:true},
 {id:"P8",name:"La Represa",r:[20,24,29,29],t:26,silvo:false}];
const SEGNAME={Q1:"Quebrada alta",Q2:"Quebrada media",Q3:"Quebrada baja"};
const inR=(x,y,r)=>x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];
const isLane=(x,y)=>(y===8&&x>=13)||(x===22&&y<=23)||(x===31&&y<=16)||(y===23&&x>=10&&x<=26)||(x===10&&y>=13&&y<=26);

const T=[];                 // T[x][y]
const tiles=[];             // orden de pintado
const PADGEO={};            // geometría de cada potrero
const wrng=rng32(20261105);
function buildWorld(){
  for(let x=0;x<W;x++){T[x]=[];for(let y=0;y<H;y++){
    const cx=x+.5,cy=y+.5,d=distStream(cx,cy);
    const reservoir=((cx-34)/3.5)**2+((cy-19.5)/2.5)**2<1;
    let kind="savanna",zone=null;
    const lane=isLane(x,y);
    const pad=PADDEF.find(p=>inR(x,y,p.r));
    if(lane&&d<1)kind="bridge";
    else if(lane)kind="lane";
    else if(d<.95)kind="water";
    else if(reservoir)kind="reservoir";
    else if((x<=12&&y<=10)||(x<=13&&y<=7)||y===0)kind="forest";
    else if(d<2.6)kind="ripar";
    else if(pad){kind="pad";zone=pad.id}
    else if(inR(x,y,[1,21,9,29])||(x<=9&&y===20))kind="yard";
    else if(inR(x,y,[11,24,19,29]))kind="corral";
    else if(x>=27&&y>=17)kind="recovery";
    const seg=cy<11.6?"Q1":cx<27?"Q2":"Q3";
    let hr=5.5*Math.exp(-((x-4)**2+(y-3)**2)/70)+1.8*Math.exp(-((x-37)**2+(y-3)**2)/70)+1.2*Math.exp(-((x-5)**2+(y-26)**2)/70)+.9*Math.exp(-((x-16)**2+(y-20)**2)/40);
    hr+=(Math.sin(x*.55+y*.2)+Math.sin(y*.7-x*.13))*.13;
    hr*=Math.min(1,.42+d/7);
    let h=Math.round(hr*2)/2;
    T[x][y]={x,y,kind,zone,seg:(kind==="water"||kind==="ripar"||kind==="bridge")?seg:null,h,hr,n:wrng(),n2:wrng(),d,tuft:[0,1,2,3].map(()=>[wrng(),wrng(),wrng()]),shade:0};
    tiles.push(T[x][y]);
  }}
  // planos para construcciones y agua
  const flat=(pred,val)=>tiles.filter(pred).forEach(t=>t.h=val);
  for(const p of PADDEF){const l=tiles.filter(t=>t.zone===p.id),m=l.map(t=>t.h).sort((a,b)=>a-b)[l.length>>1];l.forEach(t=>t.h=m)}
  flat(t=>t.kind==="yard",1);
  flat(t=>t.kind==="corral",1);
  flat(t=>t.kind==="reservoir",0);
  tiles.filter(t=>t.kind==="water").forEach(t=>{t.h=Math.max(0,Math.floor(t.hr*2)/2-.5)});
  tiles.filter(t=>t.kind==="bridge").forEach(t=>{const n=nbrs(t).filter(q=>q.kind==="lane");t.h=n.length?Math.max(...n.map(q=>q.h)):t.h});
  tiles.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
  // geometría de potreros
  for(const p of PADDEF){
    const list=tiles.filter(t=>t.zone===p.id);
    const cx=list.reduce((s,t)=>s+t.x+.5,0)/list.length,cy=list.reduce((s,t)=>s+t.y+.5,0)/list.length;
    const gates=[];
    list.forEach(t=>nbrs(t).forEach(n=>{if(n.kind==="lane")gates.push({t,n,d:Math.hypot(t.x+.5-cx,t.y+.5-cy)})}));
    gates.sort((a,b)=>a.d-b.d);
    // punto de cerca que da a la ronda: donde se puede romper
    const brk=[];
    list.forEach(t=>nbrs(t).forEach(n=>{if(n.kind==="ripar")brk.push({t,n,d:n.d})}));
    brk.sort((a,b)=>a.d-b.d);
    PADGEO[p.id]={tiles:list,cx,cy,ha:list.length*HA_TILE,gate:gates[0],brk:brk[0]||null,def:p};
  }
}
function nbrs(t){const r=[];for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const q=T[t.x+a]&&T[t.x+a][t.y+b];if(q)r.push(q)}return r}
buildWorld();

/* Construcciones (huella en la rejilla) */
const BLD={
 casa:{name:"Casa y oficina de finca",x:2,y:23,w:5,d:4,sub:"Centro de operación"},
 ordeno:{name:"Sala de ordeño",x:12,y:25,w:5,d:3.5,sub:"Ordeño y tanque de frío"},
 terneros:{name:"Corral de terneros",x:17.3,y:25,w:2.3,d:3.5,sub:"Crianza"},
 tanque:{name:"Tanque elevado",x:7.5,y:21.5,w:1.6,d:1.6,sub:"Red a bebederos"},
 biodigestor:{name:"Biodigestor",x:1.5,y:27.5,w:3,d:2,sub:"Manejo del estiércol"},
 compost:{name:"Patio de compostaje",x:5.5,y:27.6,w:3.5,d:1.8,sub:"Abono orgánico"},
 apiario:{name:"Apiario",x:9.6,y:9.6,w:2.4,d:1.2,sub:"Polinizadores"}};
const bldAt=(x,y)=>Object.keys(BLD).find(k=>{const b=BLD[k];return x+.5>=b.x-.2&&x+.5<=b.x+b.w+.2&&y+.5>=b.y-.2&&y+.5<=b.y+b.d+.2});

/* Sensores */
const nearKind=(x,y,kinds)=>{let b=null,m=1e9;for(const t of tiles)if(kinds.includes(t.kind)){const d=Math.hypot(t.x-x,t.y-y);if(d<m){m=d;b=t}}return b};
const SENS=[];
for(const p of PADDEF){const g=PADGEO[p.id];const t=g.tiles.reduce((b,q)=>Math.hypot(q.x+.5-g.cx-2.6,q.y+.5-g.cy+2.6)<Math.hypot(b.x+.5-g.cx-2.6,b.y+.5-g.cy+2.6)?q:b);SENS.push({id:"SM-"+p.id,kind:"suelo",name:"Sonda de suelo "+p.id,x:t.x+.5,y:t.y+.5,pad:p.id})}
[["WQ-1","Q1",9.5,7],["WQ-2","Q2",20,15.5],["WQ-3","Q3",31,25.5]].forEach(([id,seg,x,y])=>{const t=nearKind(x,y,["ripar"]);SENS.push({id,kind:"agua",name:"Calidad de agua · "+SEGNAME[seg],x:t.x+.5,y:t.y+.5,seg})});
SENS.push({id:"LV-1",kind:"agua",name:"Nivel del reservorio",x:37.8,y:19.5,res:true});
SENS.push({id:"EMA-1",kind:"clima",name:"Estación meteorológica",x:2,y:21.5});
SENS.push({id:"CT-1",kind:"bio",name:"Cámara trampa · Bosque",x:6.5,y:7.5});
SENS.push({id:"CT-2",kind:"bio",name:"Cámara trampa · Ronda",x:24.5,y:19.5});
SENS.push({id:"AC-1",kind:"bio",name:"Monitor acústico de aves",x:3,y:5.5});
SENS.push({id:"TR-1",kind:"bio",name:"Trampa de escarabajos",x:27,y:4});
SENS.push({id:"GW-1",kind:"humano",name:"Pasarela LoRa",x:8.8,y:20.5});
const GW=SENS.find(s=>s.id==="GW-1");

/* Árboles */
const TREES=[],DRAWN=10;
const addTree=(x,y,type,size,plantedT=null,pad=null)=>TREES.push({x,y,type,size,plantedT,pad});
(function plantWorld(){
  const R=rng32(77);
  for(const t of tiles){
    const jx=()=>.2+R()*.6;
    if(t.kind==="forest"){
      if(t.d<1.7)continue;
      if(R()<.62)addTree(t.x+jx(),t.y+jx(),R()<.15?"palma":R()<.55?"roble":"ceiba",.62+R()*.3);
      if(R()<.14)addTree(t.x+jx(),t.y+jx(),"roble",.45+R()*.2);
    } else if(t.kind==="ripar"){
      if(t.d>1.45&&R()<.34)addTree(t.x+jx(),t.y+jx(),R()<.25?"palma":R()<.5?"roble":"campano",.46+R()*.24);
    } else if(t.kind==="savanna"){
      if(R()<.09)addTree(t.x+jx(),t.y+jx(),R()<.5?"campano":"roble",.45+R()*.22);
    } else if(t.kind==="recovery"){
      if(R()<.22)addTree(t.x+jx(),t.y+jx(),"plantula",.5+R()*.4);
    } else if(t.kind==="yard"&&!bldAt(t.x,t.y)){
      if(R()<.06)addTree(t.x+jx(),t.y+jx(),"palma",.7);
    }
  }
  for(const p of PADDEF){
    const g=PADGEO[p.id];const prob=p.t*HA_TILE/DRAWN; // cada árbol dibujado representa DRAWN árboles reales
    let i=0;
    for(const t of g.tiles){
      if(p.silvo){
        // franjas de arbustos forrajeros con árboles dispersos
        if((t.x-t.y+60)%5===0&&(t.x+t.y)%2===0&&R()<.8)addTree(t.x+.5,t.y+.5,R()<.5?"leucaena":"matarraton",.5+R()*.2,null,p.id);
        else if(R()<prob*.55)addTree(t.x+.5,t.y+.5,"campano",.52+R()*.22,null,p.id);
      } else if(R()<prob)addTree(t.x+.3+R()*.4,t.y+.3+R()*.4,R()<.6?"campano":"roble",.5+R()*.26,null,p.id);
      i++;
    }
  }
})();
/* Influencia de sombra por celda (se usa en las capas de clima y animal) */
(function(){for(const tr of TREES){const k=Math.round(tr.x),m=Math.round(tr.y);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const t=T[k+a]&&T[k+a][m+b];if(t)t.shade+=Math.max(0,1-Math.hypot(a,b)/2.6)*.4}}})();

/* Cercas: segmentos donde termina un potrero */
const FENCES=[];
for(const p of PADDEF){
  const g=PADGEO[p.id];
  for(const t of g.tiles){
    for(const[a,b,ax,ay,bx,by]of[[1,0,1,0,1,1],[-1,0,0,0,0,1],[0,1,0,1,1,1],[0,-1,0,0,1,0]]){
      const q=T[t.x+a]&&T[t.x+a][t.y+b];
      if(q&&q.zone===p.id)continue;
      const isGate=g.gate&&g.gate.t===t&&g.gate.n===q;
      const isBrk=g.brk&&g.brk.t===t&&g.brk.n===q;
      if(isGate)continue;
      const z=Math.max(t.h,q?q.h:t.h);
      FENCES.push({pad:p.id,x1:t.x+ax,y1:t.y+ay,x2:t.x+bx,y2:t.y+by,z,brk:isBrk,d:t.x+t.y+(ax+bx+ay+by)/2});
    }
  }
}
/* Grafo de caminos para mover el hato y a los trabajadores */
const pathCache={};
const walk=t=>t&&(t.kind==="lane"||t.kind==="bridge");
function bfs(sx,sy,ex,ey){
  const key=`${sx},${sy}>${ex},${ey}`;if(pathCache[key])return pathCache[key];
  const q=[[sx,sy]],prev={[`${sx},${sy}`]:null};
  while(q.length){const[x,y]=q.shift();if(x===ex&&y===ey)break;
    for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=T[x+a]&&T[x+a][y+b];const k=`${x+a},${y+b}`;
      if(n&&walk(n)&&!(k in prev)){prev[k]=[x,y];q.push([x+a,y+b])}}}
  const out=[];let c=[ex,ey];if(!(`${ex},${ey}` in prev))return null;
  while(c){out.unshift([c[0]+.5,c[1]+.5]);c=prev[`${c[0]},${c[1]}`]}
  return pathCache[key]=out;
}


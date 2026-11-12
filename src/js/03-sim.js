"use strict";
/* ==================================================================
   3. MODELO DE SIMULACIÓN (paso de 1 hora, determinista con semilla)
   ================================================================== */
let S,SNAP,LOG,LOTS,GRPLOG,ALERTS,simR,logN,VIEW=null,autoRot=true;
const BREEDS=[
 {n:"Gyrolando",base:11,coat:"pinta"},{n:"Romosinuano",base:7.5,coat:"roja"},
 {n:"Costeño con Cuernos",base:8,coat:"cuerno"},{n:"Cebú Brahman",base:5,coat:"cebu"}];

function newState(){
  simR=rng32(4210);logN=200;SNAP=[];LOG=[];LOTS=[];ALERTS={};
  const pad={};
  const init={P1:[2600,58,3.1,40],P2:[3000,70,4.1,24],P3:[2200,55,3.0,44],P4:[1900,62,2.4,58],P5:[2800,66,3.9,26],P6:[2100,52,3.3,36],P7:[2900,68,4.2,22],P8:[1800,60,2.8,48]};
  for(const p of PADDEF){const i=init[p.id];pad[p.id]={bio:i[0],cov:clamp(20+i[0]/40),moist:i[1],om:i[2],comp:i[3],para:18+simR()*12,trees:p.t,rest:120+simR()*200,occ:null,compostQ:0,water:90}}
  const q={Q1:{ntu:3,coli:60,ph:7.2,o2:8.2,flow:14},Q2:{ntu:6,coli:150,ph:7.1,o2:7.5,flow:22},Q3:{ntu:8,coli:240,ph:7.0,o2:7.1,flow:28}};
  const cow=[];const R=rng32(99);
  const mk=(g,n)=>{for(let i=0;i<n;i++){const b=g==="G1"?BREEDS[R()<.62?0:R()<.6?1:2]:BREEDS[R()<.5?3:R()<.6?1:2];cow.push({id:"EP-"+(100+cow.length*7+Math.floor(R()*6)),grp:g,breed:b.n,coat:b.coat,base:b.base*(.85+R()*.3),wt:g==="G1"?440+R()*90:260+R()*90,temp:38.6,rum:470,milk:g==="G1"?b.base:0,health:null,retiro:0,off:R()*.3})}};
  mk("G1",16);mk("G2",12);
  const grp={G1:{name:"Hato de ordeño",pad:"P7",since:0,lock:0},G2:{name:"Levante",pad:"P2",since:0,lock:0}};
  pad.P7.occ="G1";pad.P2.occ="G2";
  GRPLOG={G1:[{pad:"P7",from:13}],G2:[{pad:"P2",from:13}]};
  return{t:13,w:{temp:30,rh:70,rain:0,raining:false,wind:2,thi:80,thi24:78,cloud:.3,rain24:4,rain72:8},
    pad,q,res:{level:64},bio:{birds:48,beetles:62,poll:64,corridor:78,last:"Colibrí"},cow,grp,
    fence:{broken:false,pad:null,since:0,repairing:0},ev:{heat:0,drought:0,storm:0},off:{},
    inp:{conc:30000,med:4000,fert:8000},hum:{margin:130000,know:66,income:300000,cost:170000,resp:90,liters:130},scores:{},idx:70,thiMin:0,planted:0};
}
const padGeo=id=>PADGEO[id];
const avg=(arr,f)=>arr.reduce((s,a)=>s+f(a),0)/arr.length;
const padList=s=>PADDEF.map(p=>s.pad[p.id]);
const thiFn=(T_,RH)=>{const F=1.8*T_+32;return F-(.55-.0055*RH)*(F-58)};
const shadeK=tr=>Math.min(1,tr/90)*6.5;      // puntos de THI que quita la sombra

function step(){
  const s=S;s.t+=1;const h=hod(s.t),R=simR,m=dateOf(s.t).getUTCMonth();
  const wet=m>=3&&m<=10, dayS=Math.sin(2*Math.PI*(h-9)/24), dayF=Math.max(0,Math.sin(Math.PI*(h-6)/12));
  /* --- clima --- */
  let p=s.w.raining?.55:(wet?.028:.011)*(h>=13&&h<=19?2.4:.6);
  if(s.ev.drought>0)p*=.05;
  s.w.raining=R()<p;
  let rain=s.w.raining?.5+R()*R()*14:0;
  if(s.ev.storm>0){rain=14+R()*22;s.w.raining=true}
  s.w.rain=rain;
  s.w.rain24=s.w.rain24*(1-1/24)+rain;s.w.rain72=s.w.rain72*(1-1/72)+rain;
  s.w.cloud=lerp(s.w.cloud,s.w.raining?.95:clamp(.25+R()*.3-(s.ev.drought>0?.2:0),0,1),.2);
  s.w.temp=lerp(s.w.temp,27.5+5*dayS-(s.w.raining?2.5:0)+(s.ev.heat>0?4.5:0)+(s.ev.drought>0?1.6:0)-s.w.cloud*1.2,.5);
  s.w.rh=clamp(lerp(s.w.rh,78-16*dayS+(s.w.raining?14:0)-(s.ev.drought>0?14:0)-(s.ev.heat>0?6:0),.4),25,99);
  s.w.wind=clamp(s.w.wind+(R()-.5)*.6+(s.w.raining?.2:0),.5,9);
  s.w.thi=thiFn(s.w.temp,s.w.rh);s.w.thi24=lerp(s.w.thi24,s.w.thi,1/24);
  for(const k in s.ev)if(s.ev[k]>0)s.ev[k]-=1;

  /* --- potreros --- */
  const beetles=s.bio.beetles;
  for(const def of PADDEF){
    const z=s.pad[def.id],g=PADGEO[def.id],sh=Math.min(1,z.trees/100);
    const head=z.occ?s.cow.filter(c=>c.grp===z.occ).length:0,dens=head/g.ha/3;
    z.moist-=(.05+.3*dayF*(s.w.temp/29))*(1-.35*sh)*(s.ev.drought>0?1.35:1)*clamp(z.moist/38,.18,1);
    z.moist+=rain*.36*(1-z.comp/140)*(.6+z.om/10);
    z.moist=clamp(z.moist,5,96);
    const fm=clamp((z.moist-8)/40,.1,1)*(z.moist>86?.75:1),fo=.6+z.om/10,fc=1-z.comp/140,leg=def.silvo?1.2:1,fs=1-Math.max(0,z.trees-60)/500;
    const grow=11*fm*fo*fc*leg*fs*(1-z.bio/4800);
    const eat=z.occ?head*.75/(g.ha/3)*clamp(z.bio/1500,.25,1):0;
    z.bio=clamp(z.bio+grow-eat,120,4600);
    z.cov=lerp(z.cov,clamp(16+z.bio/48),.02);
    if(z.occ){z.comp+=dens*(z.moist>70?.055:.016);z.para+=.22*(z.moist>60?1.3:1);z.rest=0}
    else{z.comp-=.012*(1+beetles/120);z.para-=.1;z.rest+=1}
    z.comp=clamp(z.comp,10,92);z.para=clamp(z.para,2,100);
    z.om+=.00006*(z.trees/50)+.00004*(beetles/60)-.00003*(z.cov<55?3:1);
    if(z.compostQ>0){const q=Math.min(z.compostQ,.3/48);z.om+=q;z.compostQ-=q}
    z.om=clamp(z.om,1,7);
    z.water=clamp(z.water+(z.occ?-1:1)+(s.res.level>12?1.6:-.5),0,100);
    if(z.occ===null&&def.silvo)z.trees=Math.min(z.trees,180);
  }
  /* --- agua --- */
  const access=s.fence.broken&&s.pad[s.fence.pad]&&s.pad[s.fence.pad].occ?1:0;
  const mMoist=avg(padList(s),z=>z.moist),mCov=avg(padList(s),z=>z.cov);
  const erosion=s.w.rain24*.45*(1-mCov/110);
  let up={ntu:0,coli:0};
  for(const k of["Q1","Q2","Q3"]){
    const q=s.q[k],acc=(access&&k===s.fence.seg)?1:0;
    const base=k==="Q1"?2.5:k==="Q2"?4.5:6;
    const nt=base+(k==="Q1"?.25:1)*erosion+acc*62+up.ntu*.45;
    const cl=k==="Q1"?60:(120+s.w.rain24*6+acc*3400+up.coli*.5);
    q.ntu=lerp(q.ntu,nt,.16);q.coli=lerp(q.coli,cl,.14);
    q.o2=lerp(q.o2,clamp(8.6-q.ntu*.022-(s.w.temp-27)*.08-(k==="Q3"?.7:k==="Q2"?.35:0),2,9),.1);
    q.ph=lerp(q.ph,7.15-(acc?.25:0)-(k==="Q3"?.1:0)+(R()-.5)*.08,.1);
    const fT=(k==="Q1"?6:k==="Q2"?10:14)+s.w.rain72*.16+mMoist*.1-(s.ev.drought>0?5:0);
    q.flow=lerp(q.flow,Math.max(.8,fT),.06);
    up={ntu:q.ntu,coli:q.coli};
  }
  s.res.level=clamp(s.res.level+rain*.04+s.q.Q3.flow*.0024-.05-.035*dayF*(s.ev.drought>0?1.5:1),0,100);
  /* --- biodiversidad --- */
  const meanTrees=avg(padList(s),z=>z.trees),medPress=clamp(s.inp.med/5000,0,3);
  s.bio.corridor=lerp(s.bio.corridor,clamp(62+meanTrees*.28-(access?12:0)),.01);
  s.bio.birds=lerp(s.bio.birds,clamp(22+s.bio.corridor*.34+meanTrees*.12-(s.w.temp>33?2:0)),.02);
  s.bio.beetles=lerp(s.bio.beetles,clamp(32+meanTrees*.34+mCov*.18-medPress*9-(mMoist<20?12:0)),.015);
  s.bio.poll=lerp(s.bio.poll,clamp(30+meanTrees*.36+s.bio.corridor*.12-(s.inp.fert>12000?5:0)),.015);
  if(R()<.012){const sp=["Mono aullador","Ñeque","Oso hormiguero","Zorro cangrejero","Tigrillo","Pava congona","Babilla","Armadillo"][Math.floor(R()*8)],c=R()<.6?"CT-1":"CT-2";if(!s.off[c]){s.bio.last=sp;addLog("bio",ST[0],`${sp} registrado`,`Detección de la cámara trampa ${c}. Indica que el corredor sigue en uso.`,{type:"sensor",id:c},"Sensor "+c)}}
  /* --- animales --- */
  for(const c of s.cow){
    const gr=s.grp[c.grp],z=s.pad[gr.pad];
    const eff=s.w.thi-shadeK(z.trees);
    const stress=clamp((eff-72)/18,0,1);
    const stress24=clamp((s.w.thi24-shadeK(z.trees)-70)/18,0,1);
    const fI=clamp(z.bio/1800,.42,1)*(1-stress*.28);
    const sick=c.health&&!c.health.treated?.55:c.health?.8:1;
    c.temp=lerp(c.temp,38.5+stress*1.3+(c.health&&!c.health.treated?1.5:0)+(R()-.5)*.1,.25);
    c.rum=lerp(c.rum,500*fI*sick+(R()-.5)*14,.1);
    if(c.grp==="G1")c.milk=lerp(c.milk,c.base*fI*sick*(1-z.para*.002),.03);
    else c.wt+=(.55*fI*sick)/24;
    c.stress=stress24;
    if(!c.health&&R()<.00003+z.para*.000005+(access&&z.occ===c.grp?.00012:0)){
      const dx=z.para>55?"Parasitosis gastrointestinal":c.grp==="G1"&&R()<.6?"Mastitis subclínica":"Cojera";
      c.health={dx,since:s.t,treated:false};
      addLog("animal",ST[1],`${c.id}: ${dx}`,`Collar detecta ${num(c.temp,1)} °C y rumia de ${num(c.rum)} min/día en ${gr.pad}.`,{type:"cow",id:c.id},"Collar");
    }
    if(c.health&&!c.health.treated&&autoRot&&s.t-c.health.since>30)treat(c,"Automático");
    if(c.health&&c.health.treated&&s.t-c.health.tt>48){addLog("animal",ST[0],`${c.id} recuperada`,`Sigue en retiro de leche hasta ${fmtT(c.retiro)}.`,{type:"cow",id:c.id},"Veterinario");c.health=null}
  }
  /* --- economía e insumos --- */
  const G1=s.cow.filter(c=>c.grp==="G1"),inMilk=G1.filter(c=>c.retiro<=s.t);
  const liters=inMilk.reduce((a,c)=>a+c.milk,0);
  const gain=s.cow.filter(c=>c.grp==="G2").length*.5*6500;
  const forage=s.pad[s.grp.G1.pad].bio;
  s.inp.conc=lerp(s.inp.conc,clamp((1900-forage)/1000,.15,1.6)*G1.length*2.4*1700,.04);
  s.inp.med=lerp(s.inp.med,1500+s.cow.filter(c=>c.health).length*15000,.05);
  s.inp.fert=lerp(s.inp.fert,5000+clamp(3.4-avg(padList(s),z=>z.om),0,3)*6000,.02);
  s.hum.liters=lerp(s.hum.liters,liters,.15);
  s.hum.income=s.hum.liters*1950+gain;
  s.hum.cost=150000+s.inp.conc+s.inp.med+s.inp.fert;
  s.hum.margin=lerp(s.hum.margin,s.hum.income-s.hum.cost,.02);
  s.hum.resp=clamp(s.hum.resp+(Object.keys(ALERTS).filter(k=>ALERTS[k].sev>=2).length?-.35:.2),10,100);
  /* --- rotación --- */
  for(const g in s.grp){
    const gr=s.grp[g],z=s.pad[gr.pad],stay=s.t-gr.since;
    if(autoRot&&s.t>=gr.lock&&(stay>=84||(z.bio<1250&&stay>=24))){
      const cand=PADDEF.map(p=>({id:p.id,z:s.pad[p.id]})).filter(c=>!c.z.occ&&c.z.rest>=60).sort((a,b)=>b.z.bio-a.z.bio)[0];
      if(cand&&cand.z.bio>z.bio+(stay>=84?100:600))moveGroup(g,cand.id,"Automático");
    }
  }
  /* --- puntajes, alertas, lotes --- */
  computeScores(s);
  updateAlerts(s);
  if(h===18)makeLot(s,liters,inMilk.length);
  if(s.fence.repairing&&s.t>=s.fence.repairing){addLog("agua",ST[0],`Cerca de ${s.fence.pad} reparada`,`El ganado ya no llega a la quebrada. La turbidez bajará en las próximas horas.`,{type:"seg",id:s.fence.seg},"Operador");s.fence={broken:false,pad:null,since:0,repairing:0}}
  if(s.t%3===0)SNAP.push(JSON.parse(JSON.stringify(s)));
  if(SNAP.length>1200)SNAP.shift();
}
function computeScores(s){
  const L=padList(s);
  const suelo=avg(L,z=>.35*z.cov+.35*(100-z.comp)+.3*clamp(z.om/5*100));
  const qScore=k=>{const q=s.q[k];return clamp(100-q.ntu*1.1-q.coli/70-Math.max(0,6-q.o2)*10)};
  const flowS=clamp(s.q.Q3.flow/24*100);
  const qs=["Q1","Q2","Q3"].map(qScore);
  const agua=.3*(qs[0]+qs[1]+qs[2])/3+.3*Math.min(...qs)+.15*flowS+.25*clamp(s.res.level*1.25);
  const meanTrees=avg(L,z=>z.trees);
  const veg=.5*clamp(avg(L,z=>z.bio)/2800*100)+.25*avg(L,z=>z.cov)+.25*clamp(meanTrees/80*100);
  const cows=s.cow;
  const animal=clamp(100-avg(cows,c=>c.stress||0)*42-avg(L.filter(z=>z.occ),z=>z.para)*.35-cows.filter(c=>c.health).length/cows.length*150-(s.fence.broken?4:0));
  const clima=clamp(100-Math.max(0,s.w.thi24-70)*3.1-(s.w.rain72<2?12:0)-(s.ev.heat>0?6:0));
  const bio=.3*clamp(s.bio.birds*1.3)+.3*s.bio.beetles+.2*s.bio.poll+.2*s.bio.corridor;
  const offN=Object.keys(s.off).length;
  const humano=.45*clamp((s.hum.margin+60000)/2600)+.2*s.hum.know+.35*s.hum.resp-offN*2;
  const c={suelo,agua,veg,animal,clima,bio,humano};
  s.scores=c;const v=Object.values(c);
  s.idx=.7*v.reduce((a,b)=>a+b)/v.length+.3*Math.min(...v);
  // estado por potrero
  for(const def of PADDEF){const z=s.pad[def.id];z.score=.3*clamp(z.bio/2800*100)+.2*z.cov+.2*(100-z.comp)+.15*clamp(z.om/5*100)+.15*(100-z.para)}
}
const padState=z=>z.occ?"Pastoreo":z.bio<1300?"Recuperación":z.rest>=120&&z.bio>=2000?"Listo":"Descanso";
const segScore=(s,k)=>{const q=s.q[k];return clamp(100-q.ntu*1.1-q.coli/70-Math.max(0,6-q.o2)*10)};

function addLog(comp,st,title,detail,target,op){
  logN++;LOG.unshift({id:"EV-"+logN,t:S.t,comp,sev:ST.indexOf(st),title,detail,target,op});
  if(LOG.length>600)LOG.pop();
}
function moveGroup(g,padId,op){
  const s=S,gr=s.grp[g],from=gr.pad;if(from===padId||s.pad[padId].occ)return;
  s.pad[from].occ=null;s.pad[from].rest=0;s.pad[padId].occ=g;gr.pad=padId;gr.since=s.t;gr.lock=s.t+(op==="Operador"?72:24);
  GRPLOG[g].push({pad:padId,from:s.t});
  addLog("veg",ST[0],`Rotación: ${gr.name} a ${padId}`,`Sale de ${from} (${num(s.pad[from].bio)} kg MS/ha) y entra a ${padId} (${num(s.pad[padId].bio)} kg MS/ha). ${from} inicia descanso.`,{type:"pad",id:padId},op);
}
function treat(c,op){
  c.health.treated=true;c.health.tt=S.t;c.retiro=S.t+72;S.inp.med+=9000;
  addLog("animal",ST[0],`Tratamiento a ${c.id}`,`${c.health.dx}. Retiro de leche por 72 h: no entra a los lotes hasta ${fmtT(c.retiro)}.`,{type:"cow",id:c.id},op);
}
function breakFence(padId){
  const pid=padId||(PADGEO[S.grp.G1.pad].brk?S.grp.G1.pad:PADDEF.find(p=>PADGEO[p.id].brk).id);
  const g=PADGEO[pid];
  S.fence={broken:true,pad:pid,since:S.t,seg:g.brk.n.seg,repairing:0};
  addLog("agua",ST[2],`Cerca rota en ${pid}`,`Tramo hacia la ronda hídrica de la ${SEGNAME[g.brk.n.seg].toLowerCase()}. Detectado por el sensor de pérdida de tensión.`,{type:"seg",id:g.brk.n.seg},"Sensor cerca");
}
function updateAlerts(s){
  const act={};
  const add=(key,sev,comp,title,detail,target,act_)=>{act[key]={sev,comp,title,detail,target,act:act_}};
  if(s.fence.broken){const has=s.pad[s.fence.pad].occ;add("fence",has?3:2,"agua",`Ganado con acceso a la quebrada`,has?`La cerca de ${s.fence.pad} está rota y ${s.grp[has].name} entra al agua: turbidez ${num(s.q[s.fence.seg].ntu)} NTU.`:`La cerca de ${s.fence.pad} está rota. Aún no hay animales en ese potrero.`,{type:"seg",id:s.fence.seg},"fence")}
  for(const def of PADDEF){const z=s.pad[def.id];
    if(z.occ&&z.bio<1050)add("over-"+def.id,2,"veg",`Sobrepastoreo en ${def.id}`,`Quedan ${num(z.bio)} kg MS/ha con ${s.grp[z.occ].name} adentro.`,{type:"pad",id:def.id});
    if(z.occ&&z.para>66)add("para-"+def.id,2,"animal",`Carga parasitaria alta en ${def.id}`,`Índice ${num(z.para)}/100. Rotar corta el ciclo.`,{type:"pad",id:def.id});
    if(z.comp>66)add("comp-"+def.id,1,"suelo",`Suelo compactado en ${def.id}`,`Índice ${num(z.comp)}/100: entra menos agua y crece menos pasto.`,{type:"pad",id:def.id});
  }
  for(const k of["Q1","Q2","Q3"]){const q=s.q[k];if(q.ntu>35)add("ntu-"+k,q.ntu>55?3:2,"agua",`Turbidez alta en ${SEGNAME[k].toLowerCase()}`,`${num(q.ntu)} NTU y ${num(q.coli)} UFC/100 mL de coliformes.`,{type:"seg",id:k})}
  const worst=s.w.thi24-shadeK(s.pad[s.grp.G1.pad].trees);
  if(worst>79)add("thi",worst>83?2:1,"clima",`Estrés calórico sostenido`,`THI medio 24 h de ${num(s.w.thi24,1)}; con la sombra de ${s.grp.G1.pad} queda en ${num(worst,1)}.`,{type:"pad",id:s.grp.G1.pad});
  if(s.res.level<28)add("res",s.res.level<14?3:2,"agua","Reservorio bajo",`Nivel en ${num(s.res.level)} %.`,{type:"res",id:"res"});
  if(avg(padList(s),z=>z.moist)<22)add("dry",2,"suelo","Déficit de humedad del suelo",`Promedio de ${num(avg(padList(s),z=>z.moist))} %. El pasto casi no crece.`,{type:"pad",id:s.grp.G1.pad});
  if(s.bio.beetles<38)add("beet",1,"bio","Caen los escarabajos coprófagos",`Actividad ${num(s.bio.beetles)}/100. Revisa desparasitantes y cobertura.`,{type:"sensor",id:"TR-1"});
  for(const c of s.cow)if(c.health&&!c.health.treated)add("cow-"+c.id,2,"animal",`${c.id} requiere atención`,`${c.health.dx}, desde ${fmtT(c.health.since)}.`,{type:"cow",id:c.id},"treat");
  for(const id in s.off)add("off-"+id,1,"humano",`${id} sin señal`,`Hay un vacío de datos desde ${fmtT(s.off[id])}.`,{type:"sensor",id},"restart");
  for(const k in act)if(!ALERTS[k]){ALERTS[k]=Object.assign(act[k],{since:s.t,gone:0});addLog(act[k].comp,ST[act[k].sev],act[k].title,act[k].detail,act[k].target,"Regla")}
    else{Object.assign(ALERTS[k],act[k]);ALERTS[k].gone=0}
  for(const k in ALERTS)if(!act[k]){ALERTS[k].gone++;if(ALERTS[k].gone>=4){addLog(ALERTS[k].comp,ST[0],`Resuelta: ${ALERTS[k].title}`,`Duró ${s.t-ALERTS[k].since} h.`,ALERTS[k].target,"Regla");delete ALERTS[k]}}
}
function makeLot(s,L,head){
  const d=dateOf(s.t),id=`L-${String(d.getUTCMonth()+1).padStart(2,"0")}${String(d.getUTCDate()).padStart(2,"0")}`;
  const pid=s.grp.G1.pad,z=s.pad[pid],acc=s.fence.broken&&s.fence.pad===pid;
  const excl=s.cow.filter(c=>c.grp==="G1").length-head;
  const thi=s.w.thi24-shadeK(z.trees);
  const chain=[
   {k:"Suelo",sc:.5*(100-z.comp)+.5*clamp(z.om/5*100),tx:`${pid} ${PADGEO[pid].def.name}: compactación ${num(z.comp)}/100, MO ${num(z.om,1)} %`},
   {k:"Pasto",sc:clamp(z.bio/2600*100),tx:`${num(z.bio)} kg MS/ha, ${num(z.trees)} árboles/ha`},
   {k:"Agua",sc:acc?20:clamp(s.res.level*1.2),tx:acc?`Acceso directo a quebrada: ${num(s.q[s.fence.seg].ntu)} NTU`:`Bebedero desde reservorio, nivel ${num(s.res.level)} %`},
   {k:"Animal",sc:clamp(100-Math.max(0,thi-70)*3-excl*5),tx:`${head} vacas en lote, ${excl} en retiro. THI con sombra ${num(thi,1)}`},
   {k:"Tanque",sc:88,tx:`${num(L)} L a 4 °C. Precio $1.950/L`}];
  const obs=chain.some(c=>c.sc<34);
  LOTS.unshift({id,t:s.t,L,head,excl,pid,obs,chain,idx:s.idx});
  if(LOTS.length>45)LOTS.pop();
}

/* Acciones del usuario y eventos provocados */
function act(a,arg){
  const s=S;if(VIEW!==null)return;
  if(a==="fence"){if(s.fence.broken&&!s.fence.repairing){s.fence.repairing=s.t+3;addLog("agua",ST[0],`Cuadrilla enviada a ${s.fence.pad}`,`Reparación estimada: 3 h.`,{type:"seg",id:s.fence.seg},"Operador");dispatchWorker(s.fence.pad)}}
  if(a==="plant"){const z=s.pad[arg],g=PADGEO[arg];const add=Math.round(g.ha*20);z.trees+=20;s.inp.fert+=2000;s.planted+=add;s.hum.know=clamp(s.hum.know+.8);
    const R=simR;for(let i=0,n=Math.max(1,Math.round(add/DRAWN));i<n;i++){const t=g.tiles[Math.floor(R()*g.tiles.length)];addTree(t.x+.2+R()*.6,t.y+.2+R()*.6,R()<.5?"matarraton":"leucaena",.62,s.t,arg)}
    terrDirty=true;addLog("veg",ST[0],`Siembra en ${arg}`,`${add} árboles forrajeros más (+20 árboles/ha). Más sombra y hojarasca conforme crezcan.`,{type:"pad",id:arg},"Operador")}
  if(a==="compost"){s.pad[arg].compostQ+=.3;s.inp.fert=Math.max(3000,s.inp.fert-1500);addLog("suelo",ST[0],`Compost aplicado en ${arg}`,`Sube la materia orgánica en las próximas 48 h y baja el uso de fertilizante.`,{type:"pad",id:arg},"Operador")}
  if(a==="move"){moveGroup(arg[0],arg[1],"Operador")}
  if(a==="treat"){const c=s.cow.find(c=>c.id===arg);if(c&&c.health&&!c.health.treated)treat(c,"Operador")}
  if(a==="restart"){if(s.off[arg]){addLog("humano",ST[0],`${arg} en línea`,`Vacío de datos de ${s.t-s.off[arg]} h registrado.`,{type:"sensor",id:arg},"Operador");delete s.off[arg]}}
  computeScores(s);updateAlerts(s);uiDirty=true;
}
function provoke(e){
  if(VIEW!==null)goLive();
  const s=S;
  if(e==="heat"){s.ev.heat=72;addLog("clima",ST[2],"Ola de calor","+4,5 °C durante 72 h. Observa dónde hay sombra y dónde no.",{type:"pad",id:s.grp.G1.pad},"Escenario")}
  if(e==="drought"){s.ev.drought=240;addLog("clima",ST[2],"Sequía","Casi sin lluvia por 10 días.",{type:"res",id:"res"},"Escenario")}
  if(e==="storm"){s.ev.storm=9;addLog("clima",ST[1],"Aguacero","Lluvia fuerte por 9 h. Los suelos con poca cobertura se erosionan más.",{type:"seg",id:"Q3"},"Escenario")}
  if(e==="fence"){if(!s.fence.broken)breakFence()}
  if(e==="para"){for(const def of PADDEF)if(s.pad[def.id].occ)s.pad[def.id].para=clamp(s.pad[def.id].para+45);addLog("animal",ST[1],"Brote de parásitos","Sube la carga en los potreros ocupados. Rotar y dejar descansar corta el ciclo.",{type:"pad",id:s.grp.G1.pad},"Escenario")}
  if(e==="sensor"){const c=SENS.filter(x=>!s.off[x.id]&&x.id!=="GW-1");if(c.length){const x=c[Math.floor(simR()*c.length)];s.off[x.id]=s.t;selectE({type:"sensor",id:x.id})}}
  computeScores(s);updateAlerts(s);uiDirty=true;terrDirty=true;
}

/* Arranque: 30 días previos con eventos, para abrir con historia real de la simulación */
function bootSim(){
  S=newState();computeScores(S);
  const end=13+24*30;
  while(S.t<end){
    const left=end-S.t;
    if(left===24*23)S.ev.storm=8,addLog("clima",ST[1],"Aguacero","Lluvia fuerte por 8 h.",{type:"seg",id:"Q3"},"Escenario");
    if(left===24*15)S.ev.heat=72,addLog("clima",ST[2],"Ola de calor","+4,5 °C durante 72 h.",{type:"pad",id:S.grp.G1.pad},"Escenario");
    if(left===70){for(const g of["G1","G2"])if(S.grp[g].pad==="P4")moveGroup(g,PADDEF.find(p=>!S.pad[p.id].occ&&p.id!=="P4").id,"Automático");S.pad.P4.bio=Math.max(S.pad.P4.bio,2500);moveGroup("G1","P4","Operador");S.grp.G1.lock=end+30}
    if(left===9)breakFence("P4");
    if(left===22){const c=S.cow.filter(c=>c.grp==="G1"&&!c.health)[3];c.health={dx:"Mastitis subclínica",since:S.t,treated:false};addLog("animal",ST[1],`${c.id}: Mastitis subclínica`,`Collar detecta rumia baja y conductividad alta en la leche.`,{type:"cow",id:c.id},"Collar")}
    if(left===5){S.off["WQ-3"]=S.t}
    step();
  }
}


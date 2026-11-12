"use strict";
/* ==================================================================
   6. PANELES
   ================================================================== */
function series(fn,n=240){
  const end=VIEW!==null?VIEW:SNAP.length-1,start=Math.max(0,end-n+1),stride=Math.max(1,Math.floor((end-start+1)/64));
  const v=[],ts=[];for(let i=start;i<=end;i+=stride){const q=fn(SNAP[i]);v.push(q);ts.push(SNAP[i].t)}
  return{v,ts};
}
function spark(fn,o={}){
  const{v,ts}=series(fn,o.n),w=o.w||92,h=o.h||26,pad=2.5;
  if(v.length<2)return"";
  let mi=o.min??Math.min(...v),ma=o.max??Math.max(...v);if(ma-mi<1e-6){ma+=1;mi-=1}
  const X=i=>pad+i/(v.length-1)*(w-pad*2),Y=y=>h-pad-(clamp(y,mi,ma)-mi)/(ma-mi)*(h-pad*2);
  const line=v.map((y,i)=>`${X(i).toFixed(1)},${Y(y).toFixed(1)}`).join(" ");
  const col=o.c||"#b1c8c5";
  const d=(o.d??1);
  return`<svg class="spark" width="${o.fluid?"100%":w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" data-vals="${v.map(x=>+x.toFixed(d+1)).join(",")}" data-ts="${ts[0]},${ts[ts.length-1]}" data-u="${esc(o.u||"")}" data-d="${d}" aria-hidden="true">
  <polygon points="${pad},${h} ${line} ${(w-pad).toFixed(1)},${h}" fill="${col}" opacity=".13"/><polyline points="${line}" fill="none" stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"/><circle cx="${X(v.length-1).toFixed(1)}" cy="${Y(v[v.length-1]).toFixed(1)}" r="2.2" fill="${col}"/></svg>`;
}
function mrow(label,val,unit,score,fn,o={}){
  const st=score==null?null:stOf(score);
  return`<div class="mrow"><div class="ml">${st?mark(st):""}<span>${label}</span></div><div class="mv">${val}${unit?` <small>${unit}</small>`:""}</div>${fn?spark(fn,Object.assign({u:unit},o)):"<span></span>"}</div>`;
}
function renderLeft(v){
  const st=stOf(v.idx),a=SNAP[Math.max(0,(VIEW??SNAP.length-1)-56)],dlt=v.idx-(a?a.idx:v.idx);
  const R=46,C=2*Math.PI*R,arc=.75,val=clamp(v.idx)/100;
  const gauge=`<svg width="112" height="104" viewBox="0 0 112 104" role="img" aria-label="Índice de integralidad: ${num(v.idx)} de 100, ${st.name}">
   <g transform="rotate(135 56 56)"><circle cx="56" cy="56" r="${R}" fill="none" stroke="#2a4a54" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C*arc} ${C}"/>
   <circle cx="56" cy="56" r="${R}" fill="none" stroke="${st.c}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C*arc*val} ${C}"/></g>
   <text x="56" y="62" text-anchor="middle" fill="#ebf3ef" font-family="Bricolage Grotesque,sans-serif" font-weight="700" font-size="34">${num(v.idx)}</text>
   <text x="56" y="80" text-anchor="middle" fill="#86a2a2" font-size="11">de 100</text></svg>`;
  const comps=Object.keys(COMP).map(k=>{const sc=v.scores[k],s=stOf(sc);return`<button class="comp" data-layer="${k}" data-fk="comp-${k}" aria-pressed="${layer===k}">${icon(k)}<span><span class="nm">${COMP[k].n}</span><span class="sb">${mark(s)}${s.name}</span></span>${spark(q=>q.scores[k],{w:72,h:24,min:20,max:100,u:"/100",d:0})}<span class="sc">${num(sc)}</span></button>`}).join("");
  const L=padList(v),pastHa=PADDEF.reduce((a,p)=>a+PADGEO[p.id].ha,0);
  const kp=(l,val,u,fn,o)=>`<div class="kpi"><span class="l">${l}</span><span class="v">${val}${u?` <small>${u}</small>`:""}</span>${spark(fn,Object.assign({w:256,h:20,fluid:true,u},o))}</div>`;
  const totalIn=v.inp.conc+v.inp.med+v.inp.fert;
  $("left").innerHTML=`
  <div class="gauge">${gauge}<div><h2>Índice de integralidad</h2><p><span style="white-space:nowrap">${mark(st)} ${st.name}.</span> ${dlt>=0?"Sube":"Baja"} ${num(Math.abs(dlt),1)} puntos en 7 días.</p></div></div>
  <p class="note" style="margin:-8px 0 0">Pesa el 70 % del promedio y el 30 % del componente más débil: una sola parte mal manejada arrastra al sistema.</p>
  <div><p class="section-t">Componentes del entorno · clic para ver la capa</p>${comps}</div>
  <div><p class="section-t">Indicadores de la finca · 30 días</p>
  ${kp("Producción por hectárea",num(v.hum.liters/pastHa,1),"L/ha/día",q=>q.hum.liters/pastHa,{d:1})}
  ${kp("Cobertura vegetal",num(avg(L,z=>z.cov)),"%",q=>avg(padList(q),z=>z.cov))}
  ${kp("Materia orgánica",num(avg(L,z=>z.om),2),"%",q=>avg(padList(q),z=>z.om),{d:2})}
  ${kp("Calidad del agua",num(avg(["Q1","Q2","Q3"],k=>segScore(v,k))),"/100",q=>avg(["Q1","Q2","Q3"],k=>segScore(q,k)))}
  ${kp("Árboles en potreros",num(avg(L,z=>z.trees)),"por ha",q=>avg(padList(q),z=>z.trees))}
  ${kp("Insumos externos",cop(totalIn),"por día",q=>q.inp.conc+q.inp.med+q.inp.fert,{u:"COP/día"})}
  ${kp("Margen de la familia",cop(v.hum.margin),"por día",q=>q.hum.margin,{u:"COP/día"})}
  </div>`;
}
const NAVS=[...PADDEF.map(p=>({type:"pad",id:p.id,l:p.id})),{type:"seg",id:"Q1",l:"Q alta"},{type:"seg",id:"Q2",l:"Q media"},{type:"seg",id:"Q3",l:"Q baja"},{type:"res",id:"res",l:"Reservorio"},{type:"forest",id:"forest",l:"Bosque"},{type:"recovery",id:"recovery",l:"Recuperación"},{type:"bld",id:"ordeno",l:"Ordeño"},{type:"bld",id:"biodigestor",l:"Biodigestor"}];
function navHtml(){return`<div class="nav" aria-label="Ir a una zona">${NAVS.map(n=>`<button data-sel="${n.type}:${n.id}" data-fk="nav-${n.type}-${n.id}" aria-current="${sel&&sel.type===n.type&&sel.id===n.id}">${n.l}</button>`).join("")}</div>`}
const head=(eb,name,st,txt)=>`<div class="eyebrow">${eb}</div><div class="dh"><h2>${name}</h2>${st?`<span class="pill">${mark(st)}${txt||st.name}</span>`:""}</div>`;
const live=()=>VIEW===null;
function detailPad(v,id){
  const z=v.pad[id],g=PADGEO[id],def=g.def,st=stOf(z.score),state=padState(z);
  const headN=z.occ?v.cow.filter(c=>c.grp===z.occ).length:0;
  const carga=z.occ?headN*(z.occ==="G1"?1:.65)/g.ha:0;
  const fc=Math.round((1-z.comp/140)*100),eff=v.w.thi-shadeK(z.trees);
  const why=[];
  why.push({c:z.comp>50?"neg":"pos",t:`Compactación ${num(z.comp)}/100: el pasto crece al ${fc} % de su potencial por el suelo.`});
  why.push({c:z.trees>=50?"pos":"neg",t:`${num(z.trees)} árboles/ha bajan el THI en ${num(shadeK(z.trees),1)} puntos: ${num(v.w.thi,1)} al sol, ${num(eff,1)} aquí.`});
  if(z.occ)why.push({c:z.para>50?"neg":"",t:`Lleva ${v.t-v.grp[z.occ].since} h ocupado. Los parásitos suben mientras haya animales.`});
  else why.push({c:"pos",t:`Lleva ${num(z.rest/24,1)} días en descanso: el pasto se recupera y baja la carga de parásitos.`});
  if(def.silvo)why.push({c:"pos",t:"Sistema silvopastoril: las leguminosas fijan nitrógeno y dan +20 % de forraje."});
  if(v.fence.broken&&v.fence.pad===id)why.push({c:"neg",t:`Cerca rota hacia la ronda de la ${SEGNAME[v.fence.seg].toLowerCase()}.`});
  const moves=Object.keys(v.grp).map(g_=>`<button class="btn${g_==="G1"?"":" alt"}" data-act="move" data-a="${g_},${id}" data-fk="mv-${g_}" ${!live()||z.occ?"disabled":""}>Mover ${v.grp[g_].name.toLowerCase()} aquí</button>`).join("");
  return head(`Potrero ${id} · ${num(g.ha,1)} ha`,def.name,st,state)+
  `<p class="lead">${z.occ?`${v.grp[z.occ].name} adentro, ${headN} animales, ${num(carga,1)} UGG/ha.`:`Sin animales.`} Puntaje ${num(z.score)}/100.</p>`+
  mrow("Forraje",num(z.bio),"kg MS/ha",clamp(z.bio/2800*100),q=>q.pad[id].bio,{u:"kg MS/ha"})+
  mrow("Cobertura",num(z.cov),"%",z.cov,q=>q.pad[id].cov,{u:"%"})+
  mrow("Humedad del suelo",num(z.moist),"%",clamp(z.moist*1.5),q=>q.pad[id].moist,{u:"%"})+
  mrow("Compactación",num(z.comp),"/100",100-z.comp,q=>q.pad[id].comp,{u:"/100"})+
  mrow("Materia orgánica",num(z.om,2),"%",clamp(z.om/5*100),q=>q.pad[id].om,{u:"%",d:2})+
  mrow("Parásitos",num(z.para),"/100",100-z.para,q=>q.pad[id].para,{u:"/100"})+
  mrow("Bebedero",num(z.water),"%",z.water,q=>q.pad[id].water,{u:"%"})+
  `<h3 class="sub">Qué lo está afectando</h3><ul class="why">${why.map(w=>`<li class="${w.c}">${w.t}</li>`).join("")}</ul>
  <div class="acts">${moves}<button class="btn alt" data-act="plant" data-a="${id}" data-fk="plant" ${live()?"":"disabled"}>Sembrar árboles (+20/ha)</button><button class="btn alt" data-act="compost" data-a="${id}" data-fk="comp" ${live()?"":"disabled"}>Aplicar compost</button></div>`;
}
function detailSeg(v,id){
  const q=v.q[id],sc=segScore(v,id),st=stOf(sc),br=v.fence.broken&&v.fence.seg===id,occ=br&&v.pad[v.fence.pad].occ;
  const why=[];
  if(br)why.push({c:"neg",t:occ?`El ${v.grp[occ].name.toLowerCase()} entra por la cerca rota de ${v.fence.pad}: pisotea la orilla y contamina el agua.`:`La cerca de ${v.fence.pad} está rota. Si entran animales, el agua se contamina.`});
  else why.push({c:"pos",t:"Ronda hídrica cercada y bebederos alejados: el ganado no toca el agua."});
  if(v.w.rain24>25)why.push({c:"neg",t:`${num(v.w.rain24)} mm en 24 h arrastran suelo donde hay poca cobertura.`});
  const up=id==="Q2"?"Q1":id==="Q3"?"Q2":null;
  if(up)why.push({c:"",t:`Recibe el agua de la ${SEGNAME[up].toLowerCase()} (${num(v.q[up].ntu)} NTU). Lo que pase aquí baja a los tramos siguientes.`});
  const unsafe=q.coli>1000;
  return head("Quebrada · Ronda hídrica",SEGNAME[id],st)+
  `<p class="lead">${unsafe?"No apta para consumo animal directo.":"Agua dentro de los rangos esperados para este tramo."}</p>`+
  (br?`<div class="acts"><button class="btn" data-act="fence" data-fk="fence" ${live()&&!v.fence.repairing?"":"disabled"}>${v.fence.repairing?"Cuadrilla en camino":"Reparar cerca de "+v.fence.pad}</button></div>`:"")+
  mrow("Turbidez",num(q.ntu,1),"NTU",clamp(100-q.ntu*1.8),s=>s.q[id].ntu,{u:"NTU"})+
  mrow("Coliformes",num(q.coli),"UFC/100 mL",clamp(100-q.coli/30),s=>s.q[id].coli,{u:"UFC/100 mL",d:0})+
  mrow("Oxígeno disuelto",num(q.o2,1),"mg/L",clamp((q.o2-3)*22),s=>s.q[id].o2,{u:"mg/L"})+
  mrow("pH",num(q.ph,2),"",clamp(100-Math.abs(q.ph-7.2)*50),s=>s.q[id].ph,{u:"",d:2})+
  mrow("Caudal",num(q.flow,1),"L/s",clamp(q.flow*4),s=>s.q[id].flow,{u:"L/s"})+
  `<h3 class="sub">Qué lo está afectando</h3><ul class="why">${why.map(w=>`<li class="${w.c}">${w.t}</li>`).join("")}</ul>`;
}
function detailCow(v,id){
  const c=v.cow.find(q=>q.id===id);if(!c)return"";
  const i=v.cow.indexOf(c),gr=v.grp[c.grp],z=v.pad[gr.pad],eff=v.w.thi-shadeK(z.trees);
  const score=c.health&&!c.health.treated?30:clamp(100-(c.stress||0)*70);const st=stOf(score);
  const route=GRPLOG[c.grp].filter(r=>r.from<=v.t).slice(-5).reverse();
  return head(`${gr.name} · ${c.breed}`,c.id,st,c.health?c.health.dx.split(" ")[0]:st.name)+
  `<p class="lead">${c.health?(c.health.treated?`En tratamiento por ${c.health.dx.toLowerCase()}.`:`${c.health.dx}: sin tratar desde ${fmtT(c.health.since)}.`):"Sin eventos de salud abiertos."}${c.retiro>v.t?` Leche en retiro hasta ${fmtT(c.retiro)}.`:""}</p>`+
  (c.health&&!c.health.treated?`<div class="acts"><button class="btn" data-act="treat" data-a="${c.id}" data-fk="treat" ${live()?"":"disabled"}>Registrar tratamiento</button></div>`:"")+
  mrow("Temperatura",num(c.temp,1),"°C",clamp(100-(c.temp-38.5)*45),s=>s.cow[i].temp,{u:"°C"})+
  mrow("Rumia",num(c.rum),"min/día",clamp(c.rum/4.6),s=>s.cow[i].rum,{u:"min/día",d:0})+
  (c.grp==="G1"?mrow("Leche",num(c.milk,1),"L/día",clamp(c.milk/c.base*100),s=>s.cow[i].milk,{u:"L/día"}):mrow("Peso",num(c.wt),"kg",85,s=>s.cow[i].wt,{u:"kg",d:0}))+
  mrow("THI con sombra",num(eff,1),"",clamp(100-(eff-68)*4.2),s=>s.w.thi-shadeK(s.pad[s.grp[c.grp].pad].trees),{d:1})+
  `<h3 class="sub">Recorrido</h3><ul class="chain">${route.map((r,idx)=>`<li>${mark(ST[0])}<b>${r.pad}</b><span>${idx===0?"Desde":"Entró"} ${fmtT(r.from)} · ${PADGEO[r.pad].def.name}</span></li>`).join("")}</ul>`;
}
function detailSensor(v,id){
  const sn=SENS.find(q=>q.id===id),off=v.off[id],st=sensorStatus(sn,v);
  let rows="";
  if(sn.pad){const z=v.pad[sn.pad];rows=mrow("Humedad",num(z.moist),"%",clamp(z.moist*1.5),q=>q.pad[sn.pad].moist,{u:"%"})+mrow("Compactación",num(z.comp),"/100",100-z.comp,q=>q.pad[sn.pad].comp,{u:"/100"})+mrow("Materia orgánica",num(z.om,2),"%",clamp(z.om/5*100),q=>q.pad[sn.pad].om,{u:"%",d:2})}
  else if(sn.seg){const q_=v.q[sn.seg];rows=mrow("Turbidez",num(q_.ntu,1),"NTU",clamp(100-q_.ntu*1.8),q=>q.q[sn.seg].ntu,{u:"NTU"})+mrow("Oxígeno disuelto",num(q_.o2,1),"mg/L",clamp((q_.o2-3)*22),q=>q.q[sn.seg].o2,{u:"mg/L"})}
  else if(sn.res)rows=mrow("Nivel",num(v.res.level),"%",clamp(v.res.level*1.3),q=>q.res.level,{u:"%"});
  else if(id==="EMA-1")rows=mrow("Temperatura",num(v.w.temp,1),"°C",clamp(100-(v.w.temp-26)*7),q=>q.w.temp,{u:"°C"})+mrow("Humedad relativa",num(v.w.rh),"%",null,q=>q.w.rh,{u:"%"})+mrow("THI",num(v.w.thi,1),"",clamp(100-(v.w.thi-68)*4),q=>q.w.thi,{d:1})+mrow("Lluvia 24 h",num(v.w.rain24),"mm",null,q=>q.w.rain24,{u:"mm"})+mrow("Viento",num(v.w.wind,1),"m/s",null,q=>q.w.wind,{u:"m/s"});
  else if(id==="CT-1"||id==="CT-2")rows=mrow("Corredor biológico",num(v.bio.corridor),"/100",v.bio.corridor,q=>q.bio.corridor,{u:"/100"})+`<p class="note">Última detección: ${esc(v.bio.last)}.</p>`;
  else if(id==="AC-1")rows=mrow("Especies de aves",num(v.bio.birds),"",clamp(v.bio.birds*1.3),q=>q.bio.birds,{u:"especies"});
  else if(id==="TR-1")rows=mrow("Escarabajos coprófagos",num(v.bio.beetles),"/100",v.bio.beetles,q=>q.bio.beetles,{u:"/100"})+`<p class="note">Entierran el estiércol: bajan la compactación y aportan materia orgánica.</p>`;
  else{const on=SENS.length-Object.keys(v.off).length;rows=mrow("Sensores en línea",`${on} de ${SENS.length}`,"",on/SENS.length*100,null)+`<p class="note">Recibe por LoRa los datos de sondas, cámaras y collares.</p>`}
  return head(`Sensor ${id}`,sn.name,st)+
  (off?`<p class="lead">Sin señal desde ${fmtT(off)}. Los valores mostrados son del modelo: el vacío queda registrado en la bitácora.</p><div class="acts"><button class="btn" data-act="restart" data-a="${id}" data-fk="rs" ${live()?"":"disabled"}>Reiniciar sensor</button></div>`:`<p class="lead">Enviando datos a la pasarela GW-1.</p>`)+rows;
}
function detailRes(v){const st=stOf(clamp(v.res.level*1.3));const days=v.res.level/(.055*24+1.2);
  return head("Agua almacenada","Reservorio de lluvia",st)+`<p class="lead">Alimenta el tanque elevado y los bebederos. Reserva para unos ${num(days*3,0)} días sin lluvia.</p>`+
  mrow("Nivel",num(v.res.level),"%",clamp(v.res.level*1.3),q=>q.res.level,{u:"%"})+mrow("Lluvia 72 h",num(v.w.rain72),"mm",null,q=>q.w.rain72,{u:"mm"})+mrow("Caudal de entrada",num(v.q.Q3.flow,1),"L/s",clamp(v.q.Q3.flow*4),q=>q.q.Q3.flow,{u:"L/s"})}
function detailForest(v){const st=stOf(v.scores.bio);
  return head("Zona de conservación","Bosque y corredor biológico",st)+`<p class="lead">Protege el nacimiento de la quebrada y conecta el hábitat con la ronda hídrica. Última detección: ${esc(v.bio.last)}.</p>`+
  mrow("Especies de aves",num(v.bio.birds),"",clamp(v.bio.birds*1.3),q=>q.bio.birds,{u:"especies"})+mrow("Escarabajos coprófagos",num(v.bio.beetles),"/100",v.bio.beetles,q=>q.bio.beetles,{u:"/100"})+mrow("Polinizadores",num(v.bio.poll),"/100",v.bio.poll,q=>q.bio.poll,{u:"/100"})+mrow("Corredor biológico",num(v.bio.corridor),"/100",v.bio.corridor,q=>q.bio.corridor,{u:"/100"})}
function detailRec(v){const n=TREES.filter(t=>t.type==="plantula").length;const f=clamp(30+(v.t-13)*.012);
  return head("Planificación predial","Zona de recuperación",stOf(f+10),"En progreso")+`<p class="lead">Área degradada aislada del ganado. Hay ${n} plántulas protegidas con cerco individual.</p>`+
  mrow("Avance de recuperación",num(f),"%",f+10,q=>clamp(30+(q.t-13)*.012),{u:"%"})+mrow("Cobertura vegetal media finca",num(avg(padList(v),z=>z.cov)),"%",avg(padList(v),z=>z.cov),q=>avg(padList(q),z=>z.cov),{u:"%"})}
function detailBld(v,id){
  const b=BLD[id];let body="";const G1=v.cow.filter(c=>c.grp==="G1"),excl=G1.filter(c=>c.retiro>v.t).length,head_=v.cow.length;
  if(id==="ordeno")body=`<p class="lead">${G1.length-excl} vacas en ordeño y ${excl} en retiro. La leche se guarda a 4 °C.</p>`+mrow("Leche",num(v.hum.liters),"L/día",clamp(v.hum.liters/1.6),q=>q.hum.liters,{u:"L/día"})+mrow("Ingresos",cop(v.hum.income),"por día",null,q=>q.hum.income,{u:"COP/día"});
  else if(id==="casa")body=`<p class="lead">Dos trabajadores en turno. Aquí se toman las decisiones de manejo.</p>`+mrow("Capacidad de respuesta",num(v.hum.resp),"/100",v.hum.resp,q=>q.hum.resp,{u:"/100"})+mrow("Práctica y conocimiento",num(v.hum.know),"/100",v.hum.know,q=>q.hum.know,{u:"/100"})+mrow("Margen",cop(v.hum.margin),"por día",clamp((v.hum.margin+60000)/2600),q=>q.hum.margin,{u:"COP/día"})+mrow("Costos",cop(v.hum.cost),"por día",null,q=>q.hum.cost,{u:"COP/día"});
  else if(id==="tanque")body=`<p class="lead">Se llena desde el reservorio y baja por gravedad a los bebederos de cada potrero.</p>`+mrow("Nivel del reservorio",num(v.res.level),"%",clamp(v.res.level*1.3),q=>q.res.level,{u:"%"});
  else if(id==="biodigestor")body=`<p class="lead">Convierte el estiércol del corral en biogás para la cocina y en biol para los potreros.</p>`+mrow("Biogás estimado",num(head_*.09,1),"m³/día",80,null)+mrow("Fertilizante",cop(v.inp.fert),"por día",clamp(100-v.inp.fert/200),q=>q.inp.fert,{u:"COP/día"});
  else if(id==="compost")body=`<p class="lead">Tres pilas en distinta madurez. Se aplica en los potreros con menos materia orgánica.</p>`+mrow("Materia orgánica media",num(avg(padList(v),z=>z.om),2),"%",clamp(avg(padList(v),z=>z.om)/5*100),q=>avg(padList(q),z=>z.om),{u:"%",d:2});
  else if(id==="apiario")body=`<p class="lead">Seis colmenas en el borde del bosque. Las abejas polinizan los árboles forrajeros.</p>`+mrow("Polinizadores",num(v.bio.poll),"/100",v.bio.poll,q=>q.bio.poll,{u:"/100"});
  else body=`<p class="lead">Cuatro terneros en crianza junto a la sala de ordeño.</p>`;
  return head(b.sub,b.name,null)+body;
}
function detailHtml(v){
  if(!sel)return navHtml()+`<p class="lead">Haz clic en una zona, un animal o un sensor del mapa.</p>`;
  const t=sel.type,id=sel.id;
  const body=t==="pad"?detailPad(v,id):t==="seg"?detailSeg(v,id):t==="cow"?detailCow(v,id):t==="sensor"?detailSensor(v,id):t==="res"?detailRes(v):t==="forest"?detailForest(v):t==="recovery"?detailRec(v):detailBld(v,id);
  return navHtml()+body;
}
function alertsHtml(v){
  const al=VIEW===null?Object.entries(ALERTS).sort((a,b)=>b[1].sev-a[1].sev):[];
  const logs=LOG.filter(l=>l.t<=v.t&&(logFilter==="todo"||l.comp===logFilter)).slice(0,60);
  const row=(a,key)=>{const st=ST[a.sev];const tg=`${a.target.type}:${a.target.id}`;return`<button class="alert" data-sel="${tg}" data-fk="al-${key}">${mark(st)}<div><b>${esc(a.title)}</b><span>${esc(a.detail)}</span><em>${key?"Abierta desde "+fmtT(a.since):""}</em></div></button>`};
  return`<h3 class="sub" style="margin-top:0">Alertas abiertas</h3>${al.length?al.map(([k,a])=>row(a,k)).join(""):`<p class="note">${VIEW===null?"Sin alertas abiertas.":"Las alertas se muestran solo en vivo. Abajo está el registro de ese momento."}</p>`}
  <h3 class="sub">Bitácora de trazabilidad</h3>
  <div class="filters">${["todo",...Object.keys(COMP)].map(k=>`<button data-filter="${k}" data-fk="fl-${k}" aria-pressed="${logFilter===k}">${k==="todo"?"Todo":COMP[k].n.replace("Dimensión humana","Humano")}</button>`).join("")}</div>
  ${logs.map(l=>{const st=ST[l.sev];return`<button class="alert" data-sel="${l.target.type}:${l.target.id}" data-log="${l.t}" data-fk="lg-${l.id}">${mark(st)}<div><b>${esc(l.title)}</b><span>${esc(l.detail)}</span><em>${l.id} · ${fmtT(l.t)} · ${esc(l.op)} · ${COMP[l.comp].n}</em></div></button>`}).join("")||`<p class="note">Sin registros con este filtro.</p>`}`;
}
/* Relaciones vivas entre componentes */
function relations(v){
  const L=padList(v),z=v.pad[v.grp.G1.pad],mt=avg(L,q=>q.trees),mc=avg(L,q=>q.comp),acc=v.fence.broken&&v.pad[v.fence.pad].occ;
  const k=shadeK(z.trees),ntu=v.q.Q2.ntu;
  return[
   {a:"clima",b:"animal",p:v.w.thi24>76?-1:1,s:clamp((v.w.thi24-68)/18,.15,1),t:`THI medio de ${num(v.w.thi24,1)}: ${v.w.thi24>76?"el calor reduce consumo y leche":"el clima no presiona al hato"}.`},
   {a:"veg",b:"animal",p:1,s:clamp(k/6.5,.15,1),t:`Los ${num(z.trees)} árboles/ha de ${v.grp.G1.pad} bajan el THI ${num(k,1)} puntos para el hato de ordeño.`},
   {a:"veg",b:"suelo",p:1,s:clamp(mt/90,.15,1),t:`La hojarasca de ${num(mt)} árboles/ha en promedio aporta materia orgánica.`},
   {a:"suelo",b:"veg",p:mc>50?-1:1,s:clamp(Math.abs(mc-45)/30+.2,.15,1),t:`Compactación media de ${num(mc)}/100: el pasto crece al ${num((1-mc/140)*100)} % por suelo.`},
   {a:"animal",b:"suelo",p:-1,s:clamp(z.comp/80,.15,1),t:`El pisoteo sube la compactación en ${v.grp.G1.pad} (${num(z.comp)}/100) mientras el hato siga allí.`},
   {a:"animal",b:"agua",p:acc?-1:1,s:acc?1:.3,t:acc?`Animales en la quebrada por la cerca rota: ${num(v.q[v.fence.seg].ntu)} NTU.`:`Con la ronda cercada, el ganado bebe en bebederos y la quebrada queda en ${num(ntu)} NTU.`},
   {a:"agua",b:"animal",p:v.q.Q2.coli>800?-1:1,s:clamp(v.q.Q2.coli/2500,.2,1),t:v.q.Q2.coli>800?`Coliformes en ${num(v.q.Q2.coli)} UFC/100 mL: sube el riesgo de enfermedad.`:`Agua limpia de bebedero: menos enfermedades.`},
   {a:"bio",b:"suelo",p:1,s:clamp(v.bio.beetles/90,.15,1),t:`Escarabajos en ${num(v.bio.beetles)}/100: entierran estiércol, ablandan el suelo y lo fertilizan.`},
   {a:"veg",b:"bio",p:1,s:clamp(v.bio.corridor/95,.15,1),t:`Árboles y corredor en ${num(v.bio.corridor)}/100 sostienen ${num(v.bio.birds)} especies de aves.`},
   {a:"clima",b:"agua",p:v.w.rain72<8?-1:1,s:clamp(v.w.rain72/40,.2,1),t:`${num(v.w.rain72)} mm en 72 h ${v.w.rain72<8?"no alcanzan para recargar":"recargan"} el reservorio (${num(v.res.level)} %).`},
   {a:"clima",b:"veg",p:avgMoist(v)<30?-1:1,s:clamp(Math.abs(avgMoist(v)-40)/35+.2,.2,1),t:`Humedad del suelo en ${num(avgMoist(v))} %: ${avgMoist(v)<30?"se frena el pasto":"el pasto puede crecer"}.`},
   {a:"animal",b:"humano",p:1,s:clamp(v.hum.liters/160,.2,1),t:`${num(v.hum.liters)} L/día generan ${cop(v.hum.income)} diarios para la familia.`},
   {a:"humano",b:"veg",p:autoRot?1:-1,s:autoRot?.7:.9,t:autoRot?`La rotación da descanso a los potreros: hoy descansan ${L.filter(q=>!q.occ).length} de ${L.length}.`:`Sin rotación, el hato se queda hasta agotar el potrero.`},
  ];
}
let relSel=null;
function relationsHtml(v){
  const rels=relations(v),keys=Object.keys(COMP),cx=170,cy=150,R=104;
  const pos={};keys.forEach((k,i)=>{const a=-Math.PI/2+i/keys.length*Math.PI*2;pos[k]=[cx+Math.cos(a)*R,cy+Math.sin(a)*R]});
  const edges=rels.map((r,i)=>{
    const[a,b]=[pos[r.a],pos[r.b]],dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
    const off=rels.some(q=>q.a===r.b&&q.b===r.a)?7:0;
    const x1=a[0]+nx*21-ny*off,y1=a[1]+ny*21+nx*off,x2=b[0]-nx*25-ny*off,y2=b[1]-ny*25+nx*off;
    const dim=relSel&&r.a!==relSel&&r.b!==relSel;
    const col=r.p>0?"#57c98f":"#f28f45";
    const ax=x2-nx*0,ay=y2-ny*0;
    return`<g opacity="${dim?.14:.9}"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${col}" stroke-width="${(1+r.s*2).toFixed(1)}" ${r.p<0?'stroke-dasharray="5 3"':""}/><path d="M${(ax+nx*5).toFixed(1)} ${(ay+ny*5).toFixed(1)}L${(ax-ny*4).toFixed(1)} ${(ay+nx*4).toFixed(1)}L${(ax+ny*4).toFixed(1)} ${(ay-nx*4).toFixed(1)}Z" fill="${col}"/></g>`}).join("");
  const nodes=keys.map(k=>{const[p,q]=pos[k],st=stOf(v.scores[k]);const on=relSel===k;return`<g class="rn" data-rel="${k}" tabindex="0" role="button" aria-label="${COMP[k].n}, ${num(v.scores[k])} de 100" style="cursor:pointer"><circle cx="${p}" cy="${q}" r="20" fill="#14384a" stroke="${on?"#fff":st.c}" stroke-width="${on?2.4:2}"/><text x="${p}" y="${q+4.500}" text-anchor="middle" fill="#ebf3ef" font-weight="600" font-size="13">${num(v.scores[k])}</text><text x="${p}" y="${q+(q<cy-30?-26:q>cy+30?34:33)}" text-anchor="middle" fill="#b1c8c5" font-size="11">${COMP[k].n.replace("Dimensión humana","Humano")}</text></g>`}).join("");
  const shown=rels.filter(r=>!relSel||r.a===relSel||r.b===relSel).sort((a,b)=>(a.p-b.p)||(b.s-a.s));
  return`<div class="eyebrow">La finca como sistema</div><div class="dh"><h2>Cómo se afectan entre sí</h2></div>
  <p class="lead">Cada flecha se calcula con los datos de este momento. Toca un componente para aislar sus relaciones.</p>
  <svg viewBox="0 0 340 296" width="100%" role="img" aria-label="Red de relaciones entre los siete componentes">${edges}${nodes}</svg>
  <div class="filters" style="margin:0 0 8px"><span class="note" style="margin:0"><svg width="26" height="8" aria-hidden="true"><line y1="4" x2="26" y2="4" stroke="#57c98f" stroke-width="2.4"/></svg> Refuerza &nbsp;&nbsp;<svg width="26" height="8" aria-hidden="true"><line y1="4" x2="26" y2="4" stroke="#f28f45" stroke-width="2.4" stroke-dasharray="5 3"/></svg> Presiona</span></div>
  <ul class="why">${shown.map(r=>`<li class="${r.p>0?"pos":"neg"}"><b style="color:var(--ink);font-weight:500">${COMP[r.a].n.replace("Dimensión humana","Humano")} → ${COMP[r.b].n.replace("Dimensión humana","Humano")}.</b> ${r.t}</li>`).join("")}</ul>`;
}
function lotsHtml(v){
  const list=LOTS.filter(l=>l.t<=v.t).slice(0,14);
  return`<div class="eyebrow">De la leche al potrero</div><div class="dh"><h2>Lotes de leche</h2></div>
  <p class="lead">Un lote por día. Ábrelo para ver de qué suelo, pasto, agua y animales viene.</p>
  ${list.map(l=>{const st=l.obs?ST[2]:ST[0];const open=openLot===l.id;return`<button class="lot" data-lot="${l.id}" data-fk="lot-${l.id}" aria-expanded="${open}"><b>${l.id}</b><b>${num(l.L)} L</b><span>${fmtD(l.t)} · ${l.head} vacas · ${l.pid}</span><span style="display:flex;gap:5px;align-items:center;justify-content:flex-end">${mark(st)}${l.obs?"Observado":"Conforme"}</span></button>
    ${open?`<ul class="chain">${l.chain.map(c=>`<li>${mark(stOf(c.sc))}<b>${c.k}</b><span>${esc(c.tx)}</span></li>`).join("")}</ul>${l.excl?`<p class="note" style="margin:0 0 8px">${l.excl} vaca(s) en retiro quedaron fuera de este lote.</p>`:""}`:""}`}).join("")||`<p class="note">Aún no hay lotes en este punto del tiempo.</p>`}`;
}
function renderUI(v){
  renderTop(v);
  if(!hold.left)keepFocus($("left"),()=>renderLeft(v));
  if(!hold.right)renderRight(v);
  renderLegend();
  $("auto").setAttribute("aria-pressed",autoRot);
}
function keepFocus(el,fn){const a=document.activeElement,fk=a&&el.contains(a)&&a.dataset?a.dataset.fk:null,top=el.scrollTop;fn();el.scrollTop=top;if(fk){const n=el.querySelector(`[data-fk="${fk}"]`);if(n)n.focus({preventScroll:true})}}
function renderTop(v){
  $("clock").textContent=fmtT(v.t);
  const thi=stOf(100-(v.w.thi-68)*3.4);
  $("wx").innerHTML=`<span><b>${num(v.w.temp,1)} °C</b> aire</span><span><b>${num(v.w.rh)} %</b> HR</span><span><b>${num(v.w.rain24)} mm</b> en 24 h</span><span>${mark(thi)} <b>THI ${num(v.w.thi)}</b></span>`;
  const e=[];if(v.ev.heat>0)e.push(`Ola de calor · ${v.ev.heat} h`);if(v.ev.drought>0)e.push(`Sequía · ${Math.ceil(v.ev.drought/24)} días`);if(v.ev.storm>0)e.push(`Aguacero · ${v.ev.storm} h`);
  $("evchips").innerHTML=e.map(x=>`<span class="evchip">${x}</span>`).join("");
  document.querySelectorAll("#speed button").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.sp===SPEED)));
}
function renderRight(v){
  const n=Object.keys(ALERTS).length;
  const T_=[["detalle","Detalle"],["alertas","Alertas"],["relaciones","Relaciones"],["lotes","Lotes"]];
  const tb=$("tabs");
  const htmlTabs=T_.map(([k,l])=>`<button role="tab" data-tab="${k}" data-fk="tab-${k}" aria-selected="${tab===k}">${l}${k==="alertas"&&n&&VIEW===null?`<span class="count">${n}</span>`:""}</button>`).join("");
  keepFocus(tb,()=>{tb.innerHTML=htmlTabs});
  const p=$("panel");
  keepFocus(p,()=>{p.innerHTML=tab==="detalle"?detailHtml(v):tab==="alertas"?alertsHtml(v):tab==="relaciones"?relationsHtml(v):lotsHtml(v)});
}
function renderLegend(){
  const l=LAYERS.find(q=>q.k===layer),el=$("legend");
  if(layer==="general"){
    el.innerHTML=`<b>Estado</b>${ST.slice(0,4).map(s=>`<div class="cat">${mark(s)}${s.name}</div>`).join("")}<div class="cat">${mark(ST[4])}Sin señal</div>`;
  } else if(layer==="humano"){
    el.innerHTML=`<b>${l.leg}</b>${Object.values(CATS).map(c=>`<div class="cat"><i style="background:${c[1]}"></i>${c[0]}</div>`).join("")}`;
  } else {
    el.innerHTML=`<b>${l.leg}</b><div class="ramp" style="background:linear-gradient(90deg,${rgb(RL)},${rgb(RM_)},${rgb(RH)})"></div><div class="rl"><span>${l.lo}</span><span>${l.hi}</span></div>`;
  }
  document.querySelectorAll("#layers button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.layer===layer)));
}
$("layers").innerHTML=LAYERS.map(l=>`<button class="chip" data-layer="${l.k}">${l.n}</button>`).join("");


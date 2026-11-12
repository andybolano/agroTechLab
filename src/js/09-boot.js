"use strict";
/* ==================================================================
   9. ARRANQUE
   ================================================================== */
function boot(){
  VIEW=null;$("review").style.display="none";
  TREES.splice(0,TREES.length,...TREES.filter(t=>t.plantedT==null));
  autoRot=true;bootSim();initVisual();sel={type:"seg",id:"Q2"};tab="detalle";relSel=null;openLot=null;
  terrDirty=true;uiDirty=true;tlNeedsDraw=true;
}
boot();
if(RM)SPEED=0;
resize();
paintTerrain(S);terrDirty=false;
renderUI(S);uiDirty=false;
requestAnimationFrame(frame);
document.fonts&&document.fonts.ready.then(()=>{uiDirty=true;tlNeedsDraw=true});
window.__finca={cam,get S(){return S},get SNAP(){return SNAP},get LOG(){return LOG},get LOTS(){return LOTS},get ALERTS(){return ALERTS},step,act,provoke};

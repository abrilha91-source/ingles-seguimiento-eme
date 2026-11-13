/* Seguimiento de inglés · réplica local v1.1. Código del artefacto original con parches de tools/build.py */

const $=s=>document.querySelector(s), VW=$("#view");
const ANIO={"1":"1/er.","2":"2/o.","3":"3/er.","4":"4/o."};
const YRS=()=>{const h=new Set([...S.items.values()].filter(o=>!o.eg).map(o=>o.a));const y=["1","2","3","4"].filter(a=>h.has(a));return y.length?y:YRS()};
const MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const PARC=[["p1","1/er. parcial"],["p2","2/o. parcial"],["p3","3/er. parcial"]];
const CAUSAS=[["medica","Situación médica"],["tesis","Asesorías de tesis"],["servicio","Servicios"],["comision","Comisiones"],["otros","Otros"]];
const CAUSA_TXT=Object.fromEntries(CAUSAS), CAUSA_INI={medica:"M",tesis:"T",servicio:"S",comision:"C",otros:"O"};
const S={items:new Map(),cfg:{sesiones:[],minimo:6,riesgo:2},db:null,canWrite:true,view:"pan",
  f:{q:"",a:"",g:"",est:"",rem:""},cap:{a:"4",g:"",p:"p1"},rf:{q:"",grp:""},pp:"p1",sel:new Set()};
const norm=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtD=iso=>{const [y,m,d]=iso.split("-");return {d:+d,m:MESES[+m-1]}};
const n2=v=>v==null||v===""||isNaN(v)?"—":Number(v).toFixed(1);
const num=v=>v===""||v==null?null:Number(v);
let tT;function toast(m){const t=$("#toast");t.textContent=m;t.classList.add("on");clearTimeout(tT);tT=setTimeout(()=>t.classList.remove("on"),2300)}
function ask(t,m,ok,danger){return new Promise(res=>{const d=$("#dAsk");$("#askT").textContent=t;$("#askM").textContent=m||"";const b=$("#askOk");b.textContent=ok||"Confirmar";b.className="btn"+(danger?" danger solid":"");
  d.returnValue="";d.onclose=()=>res(d.returnValue==="ok");d.showModal()})}
function notice(m){const n=$("#notice");n.textContent=m||"";n.hidden=!m}

/* ---------- derivados ---------- */
function ptot(c){if(!c)return null;const e=num(c.e);if(e==null)return null;return Math.round((e*0.6+(num(c.pt)||0)+(num(c.pa)||0))*100)/100}
function parts(o){return PARC.map(([k])=>ptot(o.cal&&o.cal[k]))}
function prom(o){const v=parts(o).filter(x=>x!=null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*100)/100:null}
function lastPart(o){const v=parts(o);for(let i=v.length-1;i>=0;i--)if(v[i]!=null)return {k:PARC[i][0],v:v[i]};return null}
function lastAl(o){const a=o.alcpt||[];return a.length?a[a.length-1]:null}
function prevAl(o){const a=o.alcpt||[];return a.length>1?a[a.length-2]:null}
function estAc(o){if(o.ex)return "ex";const p=prom(o);if(p==null)return "sc";return p>=S.cfg.minimo?"ok":"bad"}
const EST_TXT={ex:"Exento",sc:"Sin calificación",ok:"Aprobado",bad:"Reprobado"};
function faltas(o){return S.cfg.sesiones.filter(s=>o.asis&&o.asis[s]==="F").length}
function inRem(o){return !!(o.rem&&o.rem.on)}
function puedeSalir(o){if(!inRem(o))return false;const lp=lastPart(o);return !!(lp&&lp.v>=S.cfg.minimo&&(!o.rem.desde||PARC.findIndex(p=>p[0]===lp.k)>PARC.findIndex(p=>p[0]===o.rem.desde)))}
function enRiesgo(o){return inRem(o)&&faltas(o)>=S.cfg.riesgo}
function badges(o){let h="";if(o.ex)h+=`<span class="badge b-ex">Exento</span>`;
  if(inRem(o))h+=`<span class="badge b-rem">Remedial${o.rem.grupo?" · "+esc(o.rem.grupo):""}</span>`;
  if(puedeSalir(o))h+=`<span class="badge b-out">Puede salir del remedial</span>`;
  if(enRiesgo(o))h+=`<span class="badge b-risk">${faltas(o)} faltas</span>`;
  if(estAc(o)==="bad"&&!inRem(o))h+=`<span class="badge b-bad">Reprobado sin remedial</span>`;
  if((o.evid||[]).length)h+=`<span class="badge b-ev">${o.evid.length} evidencia${o.evid.length===1?"":"s"}</span>`;return h}
function grpLabel(o){return `${ANIO[o.a]} año · Grupo ${esc(o.g)}${o.c?` · Cía. ${esc(o.c)}`:""}`}
function groups(a){return [...new Set(all().filter(o=>!a||o.a===a).map(o=>String(o.g)))].sort()}
function all(){return [...S.items.values()].filter(o=>!o.eg)}

/* ---------- escritura ---------- */
const Q=new Map();
function write(id,fn){const p=(Q.get(id)||Promise.resolve()).then(fn).catch(e=>{console.error(e);
  if(e&&(e.code==="not_granted"||e.code==="permission_denied"||e.code==="invalid_argument")){S.canWrite=false;conn("Solo lectura","Los cambios no se guardan",true);notice("Esta vista es de solo lectura: los cambios no se guardaron.")}
  else toast("No se pudo guardar. Revisa tu conexión e inténtalo otra vez.")});Q.set(id,p);return p}
function saveItem(o,silent){S.items.set(o.id,o);if(!silent)render();if(!S.db)return;const b={...o};delete b.id;
  return write(o.id,()=>S.db.collection("alumnos").doc(o.id).set(b))}
function saveCfg(){render();if(!S.db)return;return write("__cfg",()=>S.db.doc("ajustes/general").set({...S.cfg}))}
function clone(o){return JSON.parse(JSON.stringify(o))}

/* ---------- vistas ---------- */
function render(){
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v===S.view));
  const cr=$("#cntRem");if(cr){const n=all().filter(inRem).length;cr.textContent=n||"";cr.hidden=!n}
  const VIEWS={pan:vPan,cad:vCad,cal:vCal,alc:window.vAlc,rem:window.vRem,eme:window.vEme,est:window.vEst,imp:vImp,cfg:window.vCfg};
  if(!S.items.size&&S.loaded&&S.view!=="cfg"){VW.dataset.v=S.view;VW.innerHTML=`<div class="empty"><strong>Todavía no hay cadetes cargados</strong>La app se publica vacía. Carga tu respaldo JSON o una lista de cadetes en Ajustes; los datos se quedan solo en este dispositivo.<p style="margin-top:12px"><button class="btn" id="goCfg">Ir a Ajustes</button></p></div>`;const b=document.getElementById("goCfg");if(b)b.onclick=()=>{S.view="cfg";render()};return}
  if(!S.items.size&&S.view!=="cfg"){return}
  VW.dataset.v=S.view;(VIEWS[S.view]||vPan)()}
document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>{if(S.view===b.dataset.v)return;S.view=b.dataset.v;VW.style.animation="none";VW.offsetHeight;VW.style.animation="";render();window.scrollTo(0,0)});
/* saludo y fecha */
(function(){const d=new Date(),h=d.getHours();$("#gDate").textContent=d.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/^./,c=>c.toUpperCase());
  $("#gHi").textContent=h<12?"Buenos días":h<19?"Buenas tardes":"Buenas noches"})();
function conn(t,sub,ro){const st=$("#connSt");st.classList.toggle("ro",!!ro);st.querySelector("span").textContent=t;if(sub)$("#connSub").textContent=sub}
/* tema */
(function(){let t=null;try{t=localStorage.getItem("seg-tema")}catch(e){}if(t)document.documentElement.dataset.theme=t;
  $("#thm").onclick=()=>{const cur=document.documentElement.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"),n=cur==="dark"?"light":"dark";document.documentElement.dataset.theme=n;try{localStorage.setItem("seg-tema",n)}catch(e){}}})();
/* búsqueda global */
const ini=n=>{const p=String(n||"").trim().split(/\s+/);return ((p[0]||"")[0]||"")+((p.length>2?p[p.length-2]:p[1]||"")[0]||"")};
let GI=0;function gsearch(){const q=norm($("#gq").value.trim()),box=$("#gres");if(q.length<2){box.hidden=true;return}
  const L=all().filter(o=>norm(o.n).includes(q)||norm(o.m).includes(q)).slice(0,8);GI=0;
  box.innerHTML=L.length?L.map((o,i)=>`<button type="button" data-gid="${o.id}" class="${i?"":"on"}"><span class="av s-${estAc(o)}">${esc(ini(o.n))}</span><span>${esc(o.n)}<small>${grpLabel(o)}${prom(o)!=null?" · promedio "+prom(o).toFixed(2):""}${inRem(o)?" · remedial":""}</small></span></button>`).join(""):`<div class="none">Ningún cadete coincide con “${esc($("#gq").value.trim())}”.</div>`;box.hidden=false}
$("#gq").addEventListener("input",gsearch);$("#gq").addEventListener("focus",gsearch);
$("#gq").addEventListener("keydown",e=>{const bs=[...$("#gres").querySelectorAll("button")];if(e.key==="Escape"){$("#gres").hidden=true;$("#gq").blur();return}
  if(!bs.length)return;if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();GI=(GI+(e.key==="ArrowDown"?1:-1)+bs.length)%bs.length;bs.forEach((b,i)=>b.classList.toggle("on",i===GI))}
  if(e.key==="Enter"){e.preventDefault();bs[GI].click()}});
$("#gres").addEventListener("click",e=>{const b=e.target.closest("[data-gid]");if(!b)return;$("#gres").hidden=true;$("#gq").value="";openFicha(b.dataset.gid)});
document.addEventListener("click",e=>{if(!e.target.closest(".gsearch"))$("#gres").hidden=true});
document.addEventListener("keydown",e=>{if(e.key==="/"&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)&&!document.querySelector("dialog[open]")){e.preventDefault();$("#gq").focus()}});
/* etiqueta flotante del mapa */
function showTip(t){const o=S.items.get(t.dataset.id);if(!o)return;const tp=$("#tip"),v=t.dataset.v;
  tp.innerHTML=`<b>${esc(o.n)}</b>${grpLabel(o)}<br>${o.ex?"Exento":v?`${t.dataset.lab}: ${v}`:"Sin calificación"}${inRem(o)?" · en remedial":""}${enRiesgo(o)?` · ${faltas(o)} faltas`:""}`;
  const r=t.getBoundingClientRect();tp.classList.add("on");const w=tp.offsetWidth,h=tp.offsetHeight;let x=Math.min(window.innerWidth-w-8,Math.max(8,r.left+r.width/2-w/2)),y=r.top-h-10;if(y<8)y=r.bottom+10;tp.style.left=x+"px";tp.style.top=y+"px"}
function hideTip(){$("#tip").classList.remove("on")}
document.addEventListener("mouseover",e=>{const t=e.target.closest(".tile");if(t)showTip(t);else hideTip()});
document.addEventListener("focusin",e=>{const t=e.target.closest&&e.target.closest(".tile");if(t)showTip(t);else hideTip()});
window.addEventListener("scroll",hideTip,{passive:true});

function isoL(d){return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)}
function proxSab(){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+((6-d.getDay()+7)%7));return isoL(d)}
function countUp(root){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;root.querySelectorAll("[data-count]").forEach(el=>{const t=parseFloat(el.dataset.count),dec=+(el.dataset.dec||0);if(isNaN(t))return;const t0=performance.now(),D=900;
  const step=now=>{const k=Math.min(1,(now-t0)/D),e=1-Math.pow(1-k,3);el.textContent=(t*e).toFixed(dec);if(k<1)requestAnimationFrame(step);else el.textContent=t.toFixed(dec)};requestAnimationFrame(step)})}
function ring(segs,total){const R=54,C=2*Math.PI*R;let off=0;return `<svg viewBox="0 0 140 140" class="ring" role="img" aria-label="${segs.map(s=>`${s.l}: ${s.n}`).join(", ")}"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="16"/>
  ${segs.filter(s=>s.n).map(s=>{const L=C*s.n/total,h=`<circle cx="70" cy="70" r="${R}" fill="none" stroke="${s.c}" stroke-width="16" stroke-dasharray="${Math.max(0,L-2)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 70 70)" class="seg"/>`;off+=L;return h}).join("")}</svg>`}
function chartAlcpt(A){const yrs=YRS(),labs=[...new Set(A.flatMap(o=>(o.alcpt||[]).map(x=>x[0])))];const ord=l=>{const m=MESES.findIndex(x=>norm(l).startsWith(x));const y=(l.match(/\d{4}/)||["0"])[0];return +y*12+m};labs.sort((a,b)=>ord(a)-ord(b));
  const ser=[...labs.slice(-2).map(l=>({l:"ALCPT "+l,k:l})),{l:"Diagnóstico",k:"__d"}];const COL=["var(--olive-2)","var(--olive)","var(--brass)"];
  const av=(L,k)=>{const v=L.map(o=>k==="__d"?o.diag:((o.alcpt||[]).find(x=>x[0]===k)||[])[1]).filter(x=>x!=null&&x!=="");return v.length?v.reduce((a,b)=>a+Number(b),0)/v.length:null};
  const W=420,H=210,pl=34,pb=30,pt=14,cw=(W-pl-8)/yrs.length,bw=Math.min(30,(cw-22)/ser.length),y=v=>pt+(H-pt-pb)*(1-v/100);
  let g=[0,25,50,75,100].map(v=>`<line x1="${pl}" x2="${W-6}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl-6}" y="${y(v)+4}" class="ax" text-anchor="end">${v}</text>`).join("");
  yrs.forEach((a,i)=>{const L=A.filter(o=>o.a===a&&!o.ex),x0=pl+i*cw+(cw-bw*ser.length-4*(ser.length-1))/2;
    ser.forEach((s,j)=>{const v=av(L,s.k);if(v==null)return;const x=x0+j*(bw+4);g+=`<rect x="${x}" y="${y(v)}" width="${bw}" height="${H-pb-y(v)}" rx="5" fill="${COL[j]}" class="bar"><title>${ANIO[a]} año · ${s.l}: ${v.toFixed(1)}</title></rect><text x="${x+bw/2}" y="${y(v)-5}" class="vl" text-anchor="middle">${Math.round(v)}</text>`});
    g+=`<text x="${pl+i*cw+cw/2}" y="${H-8}" class="ax xl" text-anchor="middle">${ANIO[a]} año</text>`});
  return `<div class="chart"><div class="chh"><h3><em>ALCPT</em>Puntaje por año</h3><div class="lg">${ser.map((s,j)=>`<span><i style="background:${COL[j]}"></i>${esc(s.l)}</span>`).join("")}</div></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Promedio ALCPT por año">${g}</svg><p class="hint">Promedio de puntaje (0–100), sin exentos.</p></div>`}
function chartDist(A,val){const v=A.filter(o=>!o.ex).map(val).filter(x=>x!=null),B=[[0,5,"0–4.9"],[5,6,"5–5.9"],[6,7,"6–6.9"],[7,8,"7–7.9"],[8,9,"8–8.9"],[9,10.01,"9–10"]];
  const c=B.map(([a,b])=>v.filter(x=>x>=a&&x<b).length),mx=Math.max(1,...c),W=420,H=210,pl=10,pb=30,pt=18,cw=(W-pl*2)/B.length;
  let g="";B.forEach(([a,,l],i)=>{const h=(H-pt-pb)*c[i]/mx,x=pl+i*cw+6,bad=a<S.cfg.minimo&&B[i][1]<=S.cfg.minimo+0.001;
    g+=`<rect x="${x}" y="${H-pb-h}" width="${cw-12}" height="${Math.max(h,c[i]?2:0)}" rx="7" fill="${bad?"var(--bad)":"var(--ok)"}" class="bar" opacity="${bad?.85:.9}"><title>${l}: ${c[i]} cadetes</title></rect>
    <text x="${x+(cw-12)/2}" y="${H-pb-h-6}" class="vl" text-anchor="middle">${c[i]}</text><text x="${x+(cw-12)/2}" y="${H-10}" class="ax xl" text-anchor="middle">${l}</text>`});
  return `<div class="chart"><div class="chh"><h3><em>Calificaciones</em>Distribución de calificaciones</h3><div class="lg"><span><i style="background:var(--bad)"></i>Debajo de ${S.cfg.minimo}</span><span><i style="background:var(--ok)"></i>Aprobatoria</span></div></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribución de calificaciones">${g}<line x1="${pl}" x2="${W-pl}" y1="${H-pb}" y2="${H-pb}" class="gl"/></svg><p class="hint">${v.length} cadetes con calificación capturada.</p></div>`}
function chartAsis(A){const R=A.filter(o=>o.remHist&&o.remHist.length||inRem(o)),ses=S.cfg.sesiones;if(!ses.length)return "";
  const pts=ses.map(s=>{const m=R.filter(o=>o.asis&&o.asis[s]);const p=m.filter(o=>o.asis[s]==="P").length;return {s,n:m.length,p,pc:m.length?p*100/m.length:null}});
  const W=420,H=210,pl=34,pr=14,pb=30,pt=18,x=i=>pl+(ses.length===1?(W-pl-pr)/2:i*(W-pl-pr)/(ses.length-1)),y=v=>pt+(H-pt-pb)*(1-v/100);const P=pts.map((p,i)=>p.pc==null?null:[x(i),y(p.pc)]).filter(Boolean);
  let g=[0,50,100].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl-6}" y="${y(v)+4}" class="ax" text-anchor="end">${v}%</text>`).join("");
  if(P.length>1)g+=`<path d="M${P.map(p=>p.join(",")).join("L")}L${P[P.length-1][0]},${H-pb}L${P[0][0]},${H-pb}Z" fill="var(--olive)" opacity=".12"/><path d="M${P.map(p=>p.join(",")).join("L")}" fill="none" stroke="var(--olive)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="ln"/>`;
  pts.forEach((p,i)=>{const d=fmtD(p.s);g+=`<text x="${x(i)}" y="${H-10}" class="ax xl" text-anchor="middle">${d.d} ${d.m}</text>`;if(p.pc!=null)g+=`<circle cx="${x(i)}" cy="${y(p.pc)}" r="${i===pts.length-1?6:4}" fill="${i===pts.length-1?"var(--brass)":"var(--surface)"}" stroke="var(--olive)" stroke-width="2.5"><title>${d.d} ${d.m}: ${Math.round(p.pc)}% (${p.p} de ${p.n})</title></circle><text x="${x(i)}" y="${y(p.pc)-10}" class="vl" text-anchor="middle">${Math.round(p.pc)}%</text>`});
  return `<div class="chart"><div class="chh"><h3><em>Asistencia</em>Asistencia al remedial</h3></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Porcentaje de asistencia por sábado">${g}</svg><p class="hint">Porcentaje de asistencia sobre los cadetes con registro cada sábado.</p></div>`}
function pendientes(A){const P=[],rem=A.filter(inRem),last=S.cfg.sesiones[S.cfg.sesiones.length-1];
  const sinRem=A.filter(o=>estAc(o)==="bad"&&!inRem(o)),sal=A.filter(puedeSalir),risk=A.filter(enRiesgo);
  const sinCausa=rem.filter(o=>S.cfg.sesiones.some(s=>o.asis&&(o.asis[s]==="F"||o.asis[s]==="J")&&!(o.causa&&o.causa[s])));
  const sinLista=last?rem.filter(o=>!(o.asis&&o.asis[last])):[];
  if(sinRem.length)P.push({t:"bad",n:sinRem.length,l:"Reprobados sin inscribir al remedial",go:"f:sinrem"});
  if(sal.length)P.push({t:"ok",n:sal.length,l:"Pueden salir del remedial",go:"f:salir"});
  if(risk.length)P.push({t:"bad",n:risk.length,l:`En riesgo por ${S.cfg.riesgo} o más faltas`,go:"f:riesgo"});
  if(sinLista.length){const d=fmtD(last);P.push({t:"warn",n:sinLista.length,l:`Sin asistencia del sábado ${d.d} ${d.m}`,go:"v:rem"})}
  if(sinCausa.length)P.push({t:"warn",n:sinCausa.length,l:"Inasistencias sin causa clasificada",go:"v:rem"});
  const pk=[...PARC].reverse().find(([k])=>A.some(o=>o.cal&&ptot(o.cal[k])!=null));
  if(pk){YRS().forEach(a=>groups(a).forEach(g=>{const L=A.filter(o=>o.a===a&&String(o.g)===g&&!o.ex),f=L.filter(o=>ptot(o.cal&&o.cal[pk[0]])==null).length;
    if(f)P.push({t:"info",n:f,l:`${ANIO[a]} año · Grupo ${g}: falta capturar el ${pk[1]}`,go:`c:${a}|${g}|${pk[0]}`})}))}
  return P}
/* trazos del monitor: cada canal dibuja su onda característica */
function onda(tipo,amp){const W=400,H=60,m=H/2;let d=`M0 ${m}`;const a=Math.max(.25,Math.min(1,amp));
  for(let x0=0;x0<W;x0+=100){
    if(tipo==="ecg")d+=` L${x0+18} ${m} Q${x0+24} ${m-7*a} ${x0+30} ${m} L${x0+40} ${m} L${x0+43} ${m+6} L${x0+48} ${m-26*a} L${x0+53} ${m+12} L${x0+57} ${m} L${x0+70} ${m} Q${x0+79} ${m-11*a} ${x0+88} ${m} L${x0+100} ${m}`;
    else if(tipo==="pleth")d+=` C${x0+12} ${m} ${x0+16} ${m-22*a} ${x0+30} ${m-22*a} C${x0+40} ${m-22*a} ${x0+44} ${m-4} ${x0+50} ${m-6} C${x0+56} ${m-8} ${x0+62} ${m+8} ${x0+100} ${m+10}`;
    else d+=` C${x0+25} ${m-20*a} ${x0+25} ${m-20*a} ${x0+50} ${m} C${x0+75} ${m+20*a} ${x0+75} ${m+20*a} ${x0+100} ${m}`}
  return `<svg class="tr" viewBox="0 0 800 60" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/><path d="${d}" transform="translate(400 0)"/></svg>`}
function vPan(){
  const A=all(),act=A.filter(o=>!o.ex),pk=S.pp;
  const val=o=>pk==="prom"?prom(o):ptot(o.cal&&o.cal[pk]);
  const cap=act.filter(o=>val(o)!=null),rep=cap.filter(o=>val(o)<S.cfg.minimo);
  const avg=cap.length?cap.reduce((a,o)=>a+val(o),0)/cap.length:null;
  const rem=A.filter(inRem),risk=A.filter(enRiesgo);
  const rows=[];YRS().forEach(a=>{groups(a).forEach(g=>{const L=A.filter(o=>o.a===a&&String(o.g)===g);rows.push(rowStats(`${ANIO[a]} año`,`Grupo ${g}`,L,val,(L.find(o=>!o.ex)||L[0]||{}).d))});
    const L=A.filter(o=>o.a===a);rows.push({...rowStats(`${ANIO[a]} año`,"Total",L,val,""),total:true})});
  const lab=pk==="prom"?"Promedio":PARC.find(p=>p[0]===pk)[1];
  const stOf=o=>{if(o.ex)return "ex";const v=val(o);return v==null?"sc":v<S.cfg.minimo?"bad":"ok"};
  const cnt={ok:0,bad:0,sc:0,ex:0};A.forEach(o=>cnt[stOf(o)]++);let ti=0;
  const LEG=[["ok","Aprobados","var(--ok)",cnt.ok],["bad","Reprobados","var(--bad)",cnt.bad],["sc","Sin calificación","var(--sc)",cnt.sc],["ex","Exentos","var(--just)",cnt.ex],["rem","En remedial","transparent",rem.length],["risk","En riesgo","var(--ink)",risk.length]];
  const mapa=`<section class="map ${S.animMap?"":"anim"}" aria-label="Censo de cadetes">
    <div class="maph"><h3><em>Censo</em>Censo de cadetes</h3><p class="hint">Cada cuadro es un cadete, coloreado por su ${lab.toLowerCase()}. El contorno ámbar indica remedial y el punto, riesgo por faltas. Toca un cuadro para abrir su expediente.</p></div>
    <div class="mleg" role="group" aria-label="Resaltar en el censo">${LEG.map(([k,t,c,n])=>`<button type="button" data-mf="${k}" aria-pressed="${S.mf===k}"><i style="background:${c};${k==="rem"?"box-shadow:inset 0 0 0 3px var(--brass)":""}"></i><b>${n}</b><span>${t}</span></button>`).join("")}</div>
    <div class="myears" ${S.mf?`data-f="${S.mf}"`:""}>${YRS().map(a=>{const Y=A.filter(o=>o.a===a);return `<div class="myear"><b>${ANIO[a]}<small>${Y.length} cadetes</small></b><div class="mgrps">${groups(a).map(g=>{const G=Y.filter(o=>String(o.g)===g).sort((x,y)=>x.n.localeCompare(y.n,"es"));
      return `<div class="mgrp"><span>Grupo ${esc(g)}</span><div class="tiles" style="--cols:${Math.min(8,Math.max(4,Math.ceil(Math.sqrt(G.length*1.6))))}">${G.map(o=>{const st=stOf(o),v=val(o);return `<button type="button" class="tile s-${st}${inRem(o)?" r":""}${enRiesgo(o)?" k":""}" data-id="${o.id}" data-v="${v==null?"":v.toFixed(2)}" data-lab="${esc(lab)}" style="--i:${ti++}" aria-label="${esc(o.n)}: ${o.ex?"exento":v==null?"sin calificación":v.toFixed(2)}"></button>`}).join("")}</div></div>`}).join("")}</div></div>`}).join("")}</div></section>`;
  const first=!S.animMap;S.animMap=true;
  const ps=proxSab(),pd=fmtD(ps),hoy=isoL(new Date()),dias=Math.round((new Date(ps+"T12:00:00")-new Date(hoy+"T12:00:00"))/864e5),reg=S.cfg.sesiones.includes(ps);
  const P=pendientes(A),pct=cap.length?Math.round((cap.length-rep.length)*100/cap.length):null;
  const ses=S.cfg.sesiones,last=ses[ses.length-1],mk=last?rem.filter(o=>o.asis&&o.asis[last]):[],asis=mk.length?Math.round(mk.filter(o=>o.asis[last]==="P").length*100/mk.length):null;
  const alv=act.map(o=>(lastAl(o)||[])[1]).filter(x=>x!=null),alA=alv.length?Math.round(alv.reduce((s,b)=>s+b,0)/alv.length):null;
  const alta=P.filter(p=>p.t==="bad").length,ld=last?fmtD(last):null;
  const CH=[{c:"hr",e:"APROB",s:`% aprobados · ${lab.toLowerCase()}`,v:pct,u:"%",w:"ecg",a:(pct??50)/100,go:"f:ok",lim:`mín. ${S.cfg.minimo}`},
    {c:"sp",e:"PROM",s:`promedio · ${cap.length} capturados`,v:avg,d:2,u:"/10",w:"pleth",a:(avg??5)/10,go:"f:bad",lim:avg!=null&&avg<S.cfg.minimo?"bajo el mínimo":"en rango"},
    {c:"rr",e:"ASIST",s:ld?`remedial · sáb ${ld.d} ${ld.m}`:"remedial · sin sábados",v:asis,u:"%",w:"resp",a:(asis??50)/100,go:"v:rem",lim:`${rem.length} inscritos`},
    {c:"bp",e:"ALCPT",s:"último examen · promedio",v:alA,u:"pts",w:"pleth",a:(alA??50)/100,go:"f:",lim:"escala 0–100"}];
  VW.innerHTML=`<section class="mon" aria-label="Monitor del ciclo">
    <header class="mon-h"><span class="beat" aria-hidden="true"></span><b>Monitor del ciclo</b><span class="mon-s">Inglés · ${act.length} cadetes en curso · ${YRS().reduce((n,a)=>n+groups(a).length,0)} grupos</span>
      <span class="mon-al ${alta?"on":""}">${P.length?`${P.length} alarma${P.length===1?"":"s"}${alta?` · ${alta} alta${alta===1?"":"s"}`:""}`:"Sin alarmas"}</span></header>
    <div class="mon-g">${CH.map(ch=>`<button type="button" class="ch ch-${ch.c}" data-go="${ch.go}" aria-label="${ch.e}: ${ch.v==null?"sin dato":(ch.d?ch.v.toFixed(ch.d):ch.v)+" "+ch.u}">
      <span class="ch-l"><em>${ch.e}</em><small>${esc(ch.s)}</small></span>
      <span class="ch-v"><b data-count="${ch.v??0}" data-dec="${ch.d||0}">${ch.v==null?"--":ch.d?ch.v.toFixed(ch.d):ch.v}</b><i>${ch.u}</i></span>
      <span class="ch-w">${onda(ch.w,ch.a)}</span><span class="ch-f">${esc(ch.lim)}</span></button>`).join("")}</div>
    <footer class="mon-f">
      <div class="nx"><span class="cal"><b>${pd.d}</b><small>${pd.m}</small></span><div><strong>${dias===0?"Hoy hay asesoría sabatina":dias===1?"Mañana hay asesoría sabatina":`Próxima asesoría sabatina en ${dias} días`}</strong><span>${rem.length} cadetes inscritos · ${reg?"sábado registrado":"sábado sin registrar"}</span></div>
        ${reg?`<button class="btn small" id="goRem">Pasar lista</button>`:`<button class="btn small" id="addNext">Registrar sábado ${pd.d} ${pd.m}</button>`}</div>
      <div class="prm">${[["f:","En curso",act.length],["f:bad","Reprobados",rep.length],["v:rem","Remedial",rem.length],["f:riesgo","Riesgo",risk.length],["f:ex","Exentos",A.length-act.length]].map(([g,l,n])=>`<button type="button" data-go="${g}"><b data-count="${n}">${n}</b><span>${l}</span></button>`).join("")}</div>
    </footer>
  </section>
  <div class="bar"><label class="hint" for="pp">Calificación que lee el monitor</label><select id="pp">${PARC.map(([k,t])=>`<option value="${k}" ${pk===k?"selected":""}>${t}</option>`).join("")}<option value="prom" ${pk==="prom"?"selected":""}>Promedio de parciales</option></select></div>
  <div class="duo">
    <section class="todo"><div class="chh"><h3><em>Alarmas</em>Pendientes por atender</h3><span class="hint">${P.length?`${P.length} activas`:"Todo al día"}</span></div>
      ${P.length?`<ul>${P.slice(0,8).map(p=>`<li><button type="button" data-go="${esc(p.go)}" class="pt-${p.t}"><b>${p.n}</b><span>${esc(p.l)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button></li>`).join("")}</ul>${P.length>8?`<p class="hint">Y ${P.length-8} pendientes más de captura.</p>`:""}`:`<div class="done"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><span>No hay alarmas. Todo el seguimiento está al día.</span></div>`}</section>
    ${chartDist(A,val)}
  </div>
  ${mapa}
  <div class="duo">${chartAlcpt(A)}${chartAsis(A)||causesHTML(rem,"Causas de inasistencia al remedial")}</div>
  <h2 class="sec"><em>Por grupo</em>Resumen por grupo</h2>
  <div class="tscroll"><table class="tbl"><thead><tr><th>Año</th><th>Grupo</th><th>Docente</th><th class="num">Cadetes</th><th class="num">ALCPT</th><th class="num">Diagnóstico</th><th class="num">Promedio</th><th class="num">Capturados</th><th class="num">Reprobados</th><th class="num">En remedial</th></tr></thead>
  <tbody>${rows.map(r=>`<tr class="${r.total?"total":""}"><td>${r.a}</td><td>${r.g}</td><td>${esc(r.d||"")}</td><td class="num">${r.n}</td><td class="num">${n2(r.al)}</td><td class="num">${n2(r.dg)}</td><td class="num ${r.avg!=null&&r.avg<S.cfg.minimo?"lo":""}">${r.avg==null?"—":r.avg.toFixed(2)}</td><td class="num">${r.cap}</td><td class="num ${r.rep?"lo":""}">${r.rep}</td><td class="num">${r.rem}</td></tr>`).join("")}</tbody></table></div>
  <p class="hint" style="margin-top:6px">Promedios sin exentos. ALCPT: último examen registrado. El diagnóstico del 21 sep. 2026 solo se aplicó a 3/er. y 4/o. año.</p>
  ${chartAsis(A)?causesHTML(rem,"Causas de inasistencia al remedial sabatino"):""}`;
  if(first)countUp(VW);
  $("#pp").onchange=e=>{S.pp=e.target.value;render()};
  const gr=$("#goRem");if(gr)gr.onclick=()=>{go("v:rem");openLista()};
  const an=$("#addNext");if(an)an.onclick=()=>{if(!S.cfg.sesiones.includes(ps)){S.cfg.sesiones=[...S.cfg.sesiones,ps].sort();saveCfg();toast(`Sábado ${pd.d} ${pd.m} registrado`)}};
  VW.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
  VW.querySelectorAll("[data-mf]").forEach(b=>b.onclick=()=>{S.mf=S.mf===b.dataset.mf?"":b.dataset.mf;const y=VW.querySelector(".myears");if(S.mf)y.dataset.f=S.mf;else delete y.dataset.f;
    VW.querySelectorAll("[data-mf]").forEach(x=>x.setAttribute("aria-pressed",x.dataset.mf===S.mf))})}
function go(t){const [k,v]=[t.slice(0,1),t.slice(2)];
  if(k==="f"){S.f={q:"",a:"",g:"",est:v,rem:""};S.view="cad"}
  else if(k==="v")S.view=v;
  else if(k==="c"){const [a,g,p]=v.split("|");S.cap={a,g,p};S.view="cal"}
  VW.style.animation="none";VW.offsetHeight;VW.style.animation="";render();window.scrollTo(0,0)}

function rowStats(a,g,L,val,d){const act=L.filter(o=>!o.ex);const av=x=>{const v=x.filter(v=>v!=null);return v.length?v.reduce((s,b)=>s+b,0)/v.length:null};
  const cap=act.filter(o=>val(o)!=null);return {a,g,d,n:L.length,al:av(act.map(o=>(lastAl(o)||[])[1])),dg:av(act.map(o=>o.diag)),
  avg:av(cap.map(val)),cap:cap.length,rep:cap.filter(o=>val(o)<S.cfg.minimo).length,rem:L.filter(inRem).length}}
function causesHTML(L,title){const aus=[];L.forEach(o=>S.cfg.sesiones.forEach(s=>{const v=o.asis&&o.asis[s];if(v==="F"||v==="J")aus.push((o.causa&&o.causa[s])||"")}));
  const tot=aus.length;if(!tot)return `<section class="causes"><h3>${title}</h3><p class="hint">Sin inasistencias registradas.</p></section>`;
  const c={};aus.forEach(k=>c[k]=(c[k]||0)+1);
  const line=(k,l,cl="")=>{const n=c[k]||0,p=Math.round(n*1000/tot)/10;return `<div class="crow ${cl}"><span>${l}</span><div class="track" role="img" aria-label="${l}: ${p}%"><div class="fill" style="width:${p}%"></div></div><b>${p}%<small>${n}</small></b></div>`};
  return `<section class="causes"><h3>${title}</h3><p class="hint" style="margin-bottom:8px">${tot} inasistencias en ${S.cfg.sesiones.length} sábados registrados.</p>${CAUSAS.map(([k,l])=>line(k,l)).join("")}${c[""]?line("","Sin clasificar","unc"):""}</section>`}

function filtered(){const f=S.f,q=norm(f.q.trim());return all().filter(o=>(!q||norm(o.n).includes(q)||norm(o.m).includes(q))&&(!f.a||o.a===f.a)&&(!f.g||String(o.g)===f.g)
  &&(!f.est||(f.est==="sinrem"?estAc(o)==="bad"&&!inRem(o):f.est==="salir"?puedeSalir(o):f.est==="riesgo"?enRiesgo(o):estAc(o)===f.est))
  &&(!f.rem||(f.rem==="si")===inRem(o))).sort((x,y)=>x.a.localeCompare(y.a)||String(x.g).localeCompare(String(y.g))||x.n.localeCompare(y.n,"es"))}
/* ---------- v14: tarjetas, monitor de grupo, pase de lista ---------- */
function spark(o){const h=(o.alcpt||[]).map(x=>x[1]);if(o.diag!=null)h.push(o.diag);if(h.length<2)return "";const W=96,H=30,lo=Math.min(...h)-4,hi=Math.max(...h)+4,x=i=>4+i*(W-8)/(h.length-1),y=v=>H-4-(H-8)*(v-lo)/(hi-lo);
  return `<svg class="spk" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M${h.map((v,i)=>x(i).toFixed(1)+","+y(v).toFixed(1)).join("L")}"/><circle cx="${x(h.length-1).toFixed(1)}" cy="${y(h[h.length-1]).toFixed(1)}" r="3"/></svg>`}
function cardHTML(o,i){const st=estAc(o),p=prom(o),la=lastAl(o),pa=prevAl(o),dl=la&&pa?la[1]-pa[1]:null,sel=S.sel.has(o.id);
  return `<article class="ccard s-${st}${sel?" seld":""}" style="--i:${Math.min(i,40)}"><label class="cck"><input type="checkbox" data-sel="${o.id}" ${sel?"checked":""} aria-label="Seleccionar a ${esc(o.n)}"></label>
  <div class="cc-top"><span class="av s-${st}">${esc(ini(o.n))}</span><div><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}</span></div></div>
  <div class="cc-mid"><div class="cc-p"><b class="${p!=null&&p<S.cfg.minimo?"lo":""}">${o.ex?"EX":p==null?"—":p.toFixed(2)}</b><span>${o.ex?"Exento":"Promedio"}</span></div>
    <div class="cc-al"><div><b>${la?la[1]:"—"}</b>${dl!=null?`<i class="${dl<0?"lo":"hi"}">${dl>0?"+":""}${dl}</i>`:""}<span>ALCPT${o.diag!=null?` · diag. ${o.diag}`:""}</span></div>${spark(o)}</div></div>
  ${o.ex?"":`<div class="cc-parts">${parts(o).map((v,k)=>`<span class="${v==null?"nil":v<S.cfg.minimo?"lo":"okp"}"><small>${k+1}/P</small>${v==null?"—":v.toFixed(1)}</span>`).join("")}</div>`}
  <div class="cc-b">${o.ex?"":`<span class="st">${EST_TXT[st]}</span>`}${badges(o)}</div></article>`}
function gmonHTML(L,pk){const A=L.filter(o=>!o.ex),v=A.map(o=>ptot(o.cal&&o.cal[pk])).filter(x=>x!=null),cap=v.length,ap=v.filter(x=>x>=S.cfg.minimo).length,avg=cap?v.reduce((a,b)=>a+b,0)/cap:null;
  const bins=Array.from({length:10},(_,i)=>v.filter(x=>x>=i&&(i===9?x<=10:x<i+1)).length),mx=Math.max(1,...bins);
  return `<div class="gm-k"><em>Promedio del grupo</em><b class="${avg!=null&&avg<S.cfg.minimo?"lo":""}">${avg==null?"—":avg.toFixed(2)}</b></div>
  <div class="gm-k"><em>Aprobados</em><b>${ap}<small>/${cap}</small></b></div>
  <div class="gm-k"><em>Capturados</em><b>${cap}<small>/${A.length}</small></b><span class="gm-bar"><i style="width:${A.length?cap*100/A.length:0}%"></i></span></div>
  <div class="gm-h" aria-label="Distribución del parcial">${bins.map((n,i)=>`<span class="${i<S.cfg.minimo?"lo":""}" title="${i}–${i===9?10:i+0.9}: ${n}"><i style="height:${n?Math.max(8,n*100/mx):0}%"></i><small>${i}</small></span>`).join("")}</div>`}
function totHTML(t){return `<b>${t==null?"—":t.toFixed(2)}</b><span class="gauge"><i style="width:${t==null?0:t*10}%"></i><u style="left:${S.cfg.minimo*10}%"></u></span>`}
function trendHTML(o){const al=o.alcpt||[];const P=al.map(([l,v])=>({l:"ALCPT "+l,v}));const W=560,H=170,pl=62,pr=52,pt=24,pb=34,n=P.length+(o.diag!=null?1:0);if(!n)return `<p class="hint">Sin exámenes registrados.</p>`;
  const x=i=>pl+(n===1?(W-pl-pr)/2:i*(W-pl-pr)/(n-1)),y=v=>pt+(H-pt-pb)*(1-v/100);let g=[0,50,100].map(v=>`<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl-34}" y="${y(v)+4}" class="ax" text-anchor="end">${v}</text>`).join("");
  if(P.length>1)g+=`<path d="M${P.map((p,i)=>x(i)+","+y(p.v)).join("L")}L${x(P.length-1)},${H-pb}L${x(0)},${H-pb}Z" fill="var(--olive)" opacity=".1"/><path class="ln" d="M${P.map((p,i)=>x(i)+","+y(p.v)).join("L")}" fill="none" stroke="var(--olive)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  P.forEach((p,i)=>{g+=`<circle cx="${x(i)}" cy="${y(p.v)}" r="5" fill="var(--surface)" stroke="var(--olive)" stroke-width="3"/><text x="${x(i)}" y="${y(p.v)-12}" class="vl" text-anchor="middle">${p.v}</text><text x="${x(i)}" y="${H-12}" class="ax xl" text-anchor="middle">${esc(p.l)}</text>`});
  if(o.diag!=null){const i=n-1,X=x(i),Y=y(o.diag);g+=`<path d="M${X},${Y-8}L${X+8},${Y}L${X},${Y+8}L${X-8},${Y}Z" fill="var(--brass)"/><text x="${X}" y="${Y-14}" class="vl" text-anchor="middle">${o.diag}</text><text x="${X}" y="${H-12}" class="ax xl" text-anchor="middle">Diagnóstico</text>`}
  return `<div class="chart flat"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Historial ALCPT y diagnóstico">${g}</svg></div>`}
/* pase de lista */
const LS={s:"",ids:[],i:0,done:false};
function openLista(ids){const ses=S.cfg.sesiones;if(!ses.length){toast("Primero agrega un sábado");openSat();return}
  const hoy=isoL(new Date()),past=ses.filter(s=>s<=hoy);LS.s=past.length?past[past.length-1]:ses[0];
  LS.ids=ids||all().filter(inRem).sort((x,y)=>x.a.localeCompare(y.a)||String(x.rem.grupo||"").localeCompare(String(y.rem.grupo||""))||x.n.localeCompare(y.n,"es")).map(o=>o.id);
  if(!LS.ids.length){toast("No hay cadetes inscritos al remedial");return}
  const k=LS.ids.findIndex(id=>!((S.items.get(id).asis||{})[LS.s]));LS.i=k<0?0:k;LS.done=false;renderLista();$("#dLista").showModal();$("#lsBody").focus()}
function lsCount(){const c={P:0,F:0,J:0,"":0};LS.ids.forEach(id=>{const o=S.items.get(id);c[(o&&o.asis&&o.asis[LS.s])||""]++});return c}
function renderLista(anim){const B=$("#lsBody"),n=LS.ids.length,c=lsCount(),mk=n-c[""],d=fmtD(LS.s);
  const head=`<header class="ls-h"><div><em>Pase de lista · asesoría sabatina</em><label class="ls-s">Sábado<select id="lsS">${S.cfg.sesiones.map(s=>{const f=fmtD(s);return `<option value="${s}" ${s===LS.s?"selected":""}>${f.d} ${f.m}</option>`}).join("")}</select></label></div>
    <span class="ls-c"><b>${LS.done?n:LS.i+1}</b>/${n}</span><button class="fx" type="button" id="lsX" aria-label="Cerrar pase de lista">×</button></header>
    <div class="ls-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${mk}"><i class="P" style="width:${c.P*100/n}%"></i><i class="J" style="width:${c.J*100/n}%"></i><i class="F" style="width:${c.F*100/n}%"></i></div>`;
  if(LS.done){B.innerHTML=head+`<div class="ls-card ls-end"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><h2>Lista del ${d.d} ${d.m} ${c[""]?"casi completa":"completa"}</h2>
    <div class="ls-sum"><span class="P"><b>${c.P}</b>Asistieron</span><span class="F"><b>${c.F}</b>Faltaron</span><span class="J"><b>${c.J}</b>Justificadas</span><span><b>${c[""]}</b>Sin marcar</span></div>
    <div class="acts" style="justify-content:center">${c[""]?`<button class="btn ghost" id="lsPend">Ir al primer pendiente</button>`:""}<button class="btn" id="lsEnd">Terminar</button></div></div>`;bindLista();return}
  const o=S.items.get(LS.ids[LS.i]);if(!o){LS.done=true;return renderLista()}const v=(o.asis&&o.asis[LS.s])||"",cz=(o.causa&&o.causa[LS.s])||"",st=estAc(o),lp=lastPart(o);
  B.innerHTML=head+`<div class="ls-card${anim?" in-"+anim:""}">
    <span class="av big s-${st}">${esc(ini(o.n))}</span><h2>${esc(o.n)}</h2><p class="hint">${grpLabel(o)} · asesoría ${o.rem&&o.rem.grupo?"grupo "+esc(o.rem.grupo):"sin grupo"}</p>
    <div class="ls-meta"><span><b class="${lp&&lp.v<S.cfg.minimo?"lo":""}">${lp?lp.v.toFixed(2):"—"}</b>último parcial</span><span><b class="${enRiesgo(o)?"lo":""}">${faltas(o)}</b>faltas</span>
      <span class="ls-tl">${S.cfg.sesiones.map(s=>{const x=(o.asis&&o.asis[s])||"",f=fmtD(s);return `<i class="${x}${s===LS.s?" cur":""}" title="${f.d} ${f.m}">${x==="P"?"A":x||"·"}</i>`}).join("")}</span></div>
    <div class="ls-acts" role="group" aria-label="Asistencia">${[["P","A","Asistió"],["F","F","Faltó"],["J","J","Justificada"]].map(([k,l,t])=>`<button type="button" data-m="${k}" class="m-${k}${v===k?" on":""}" aria-pressed="${v===k}"><b>${l}</b>${t}<kbd>${l}</kbd></button>`).join("")}</div>
    ${v==="F"||v==="J"?`<div class="ls-cz" role="group" aria-label="Causa"><span>Causa de la inasistencia</span>${CAUSAS.map(([k,l],i)=>`<button type="button" data-cz="${k}" class="${cz===k?"on":""}">${l}<kbd>${i+1}</kbd></button>`).join("")}</div>`:`<p class="hint ls-k">Teclas: A, F o J para marcar · flechas para moverte</p>`}
  </div>
  <footer class="ls-f"><button class="btn ghost" id="lsPrev" ${LS.i?"":"disabled"}>Anterior</button><span>${c.P} A · ${c.F} F · ${c.J} J · ${c[""]} sin marcar</span><button class="btn" id="lsNext">${LS.i===n-1?"Ver resumen":"Siguiente"}</button></footer>`;bindLista()}
function lsFocus(){const a=document.activeElement;if(!a||a===document.body||!$("#dLista").contains(a))$("#lsBody").focus({preventScroll:true})}
function lsMove(k){const n=LS.ids.length;if(LS.done){LS.done=false;LS.i=n-1;renderLista("l");return}const j=LS.i+k;if(j<0)return;if(j>=n){LS.done=true;renderLista();return}LS.i=j;renderLista(k>0?"r":"l")}
function lsMark(m){const o=clone(S.items.get(LS.ids[LS.i]));o.asis=o.asis||{};o.causa=o.causa||{};o.asis[LS.s]=m;if(m==="P")delete o.causa[LS.s];saveItem(o,true);
  if(m==="P"){renderLista();setTimeout(()=>lsMove(1),220)}else renderLista()}
function lsCause(k){const o=clone(S.items.get(LS.ids[LS.i]));o.causa={...(o.causa||{}),[LS.s]:k};saveItem(o,true);renderLista();setTimeout(()=>lsMove(1),220)}
function bindLista(){const B=$("#lsBody");$("#lsX").onclick=()=>$("#dLista").close();$("#lsS").onchange=e=>{LS.s=e.target.value;LS.done=false;const k=LS.ids.findIndex(id=>!((S.items.get(id).asis||{})[LS.s]));LS.i=k<0?0:k;renderLista()};
  B.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>lsMark(b.dataset.m));lsFocus();B.querySelectorAll("[data-cz]").forEach(b=>b.onclick=()=>lsCause(b.dataset.cz));
  const pv=$("#lsPrev"),nx=$("#lsNext"),en=$("#lsEnd"),pe=$("#lsPend");if(pv)pv.onclick=()=>lsMove(-1);if(nx)nx.onclick=()=>lsMove(1);if(en)en.onclick=()=>$("#dLista").close();
  if(pe)pe.onclick=()=>{LS.done=false;LS.i=Math.max(0,LS.ids.findIndex(id=>!((S.items.get(id).asis||{})[LS.s])));renderLista()}}
document.addEventListener("keydown",e=>{const d=$("#dLista");if(!d||!d.open||/SELECT|INPUT/.test(document.activeElement.tagName))return;const k=e.key.toLowerCase();
  if(LS.done){if(k==="arrowleft")lsMove(-1);return}
  if(k==="a"){e.preventDefault();lsMark("P")}else if(k==="f"){e.preventDefault();lsMark("F")}else if(k==="j"){e.preventDefault();lsMark("J")}
  else if(/^[1-5]$/.test(k)&&$("#lsBody [data-cz]")){e.preventDefault();lsCause(CAUSAS[+k-1][0])}else if(k==="arrowright"){e.preventDefault();lsMove(1)}else if(k==="arrowleft"){e.preventDefault();lsMove(-1)}});

function vCad(){const f=S.f,L=filtered(),cv=S.cv||"cards";
  VW.innerHTML=`<h2>Cadetes</h2>
  <div class="bar"><input type="search" id="fq" placeholder="Buscar por nombre o matrícula" value="${esc(f.q)}" aria-label="Buscar">
  <select id="fa" aria-label="Año"><option value="">Todos los años</option>${YRS().map(a=>`<option value="${a}" ${f.a===a?"selected":""}>${ANIO[a]} año</option>`).join("")}</select>
  <select id="fg" aria-label="Grupo"><option value="">Todos los grupos</option>${groups(f.a).map(g=>`<option ${f.g===g?"selected":""}>${esc(g)}</option>`).join("")}</select>
  <select id="fe" aria-label="Estado"><option value="">Cualquier estado</option>${[["ok","Aprobado"],["bad","Reprobado"],["sc","Sin calificación"],["ex","Exento"],["sinrem","Reprobado sin remedial"],["salir","Puede salir del remedial"],["riesgo","En riesgo por faltas"]].map(([k,t])=>`<option value="${k}" ${f.est===k?"selected":""}>${t}</option>`).join("")}</select>
  <select id="fr" aria-label="Remedial"><option value="">Con y sin remedial</option><option value="si" ${f.rem==="si"?"selected":""}>En remedial</option><option value="no" ${f.rem==="no"?"selected":""}>Sin remedial</option></select>
  </div>
  <div class="bar selbar"><span class="hint" id="selInfo">${L.length} cadete${L.length===1?"":"s"} · ${S.sel.size} seleccionado${S.sel.size===1?"":"s"}</span>
  <button class="btn small" id="dlSel" ${S.sel.size?"":"disabled"}>Descargar selección (${S.sel.size})</button>
  <button class="btn small ghost" id="dlAll">Descargar lo filtrado (${L.length})</button>
  ${S.sel.size?`<button class="btn small ghost" id="selClr">Limpiar selección</button>`:""}<span style="flex:1"></span>
  <div class="seg2" role="group" aria-label="Vista"><button type="button" data-cv="cards" aria-pressed="${cv==="cards"}">Tarjetas</button><button type="button" data-cv="table" aria-pressed="${cv==="table"}">Tabla</button></div></div>
  ${L.length&&cv==="cards"?`<label class="chk selall"><input type="checkbox" id="selAll" ${L.every(o=>S.sel.has(o.id))?"checked":""}>Seleccionar los ${L.length} mostrados</label><div class="cgrid">${L.map(cardHTML).join("")}</div>`:L.length?`<div class="tscroll"><table class="tbl"><thead><tr><th class="ck"><input type="checkbox" id="selAll" aria-label="Seleccionar todos los mostrados" ${L.length&&L.every(o=>S.sel.has(o.id))?"checked":""}></th><th>Cadete</th><th class="num">ALCPT</th><th class="num">Diag.</th>${PARC.map(([,t])=>`<th class="num">${t.replace(" parcial","")}</th>`).join("")}<th class="num">Promedio</th><th>Estado</th></tr></thead><tbody>
  ${L.map(o=>{const la=lastAl(o),pa=prevAl(o),ps=parts(o),p=prom(o),dl=la&&pa?la[1]-pa[1]:null;return `<tr class="${S.sel.has(o.id)?"seld":""}"><td class="ck"><input type="checkbox" data-sel="${o.id}" ${S.sel.has(o.id)?"checked":""} aria-label="Seleccionar a ${esc(o.n)}"></td><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}${o.m?" · "+esc(o.m):""}</span></td>
  <td class="num">${la?la[1]:"—"}${dl!=null?`<span class="delta ${dl<0?"lo":"hi"}">${dl>0?"+":""}${dl}</span>`:""}</td><td class="num">${o.diag??"—"}</td>
  ${ps.map(v=>`<td class="num ${v!=null&&v<S.cfg.minimo?"lo":""}">${v==null?"—":v.toFixed(2)}</td>`).join("")}<td class="num ${p!=null&&p<S.cfg.minimo?"lo":""}"><b>${p==null?"—":p.toFixed(2)}</b></td>
  <td><span class="sub" style="color:inherit">${o.ex?"":EST_TXT[estAc(o)]}</span>${badges(o)}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty"><strong>Sin resultados</strong>Ningún cadete coincide con los filtros.</div>`}`;
  const on=(id,k)=>$(id).oninput=e=>{S.f[k]=e.target.value;if(k==="a")S.f.g="";vCad();if(k==="q"){const i=$("#fq");i.focus();i.setSelectionRange(i.value.length,i.value.length)}};
  on("#fq","q");on("#fa","a");on("#fg","g");on("#fe","est");on("#fr","rem");
  const upd=()=>{$("#selInfo").textContent=`${L.length} cadete${L.length===1?"":"s"} · ${S.sel.size} seleccionado${S.sel.size===1?"":"s"}`;const b=$("#dlSel");b.disabled=!S.sel.size;b.textContent=`Descargar selección (${S.sel.size})`};
  VW.querySelectorAll("[data-sel]").forEach(c=>c.onchange=()=>{c.checked?S.sel.add(c.dataset.sel):S.sel.delete(c.dataset.sel);c.closest("tr,.ccard").classList.toggle("seld",c.checked);upd()});
  VW.querySelectorAll("[data-cv]").forEach(b=>b.onclick=()=>{S.cv=b.dataset.cv;vCad()});
  const sa=$("#selAll");if(sa)sa.onchange=()=>{L.forEach(o=>sa.checked?S.sel.add(o.id):S.sel.delete(o.id));vCad()};
  $("#dlSel").onclick=()=>openDl(all().filter(o=>S.sel.has(o.id)).sort((x,y)=>x.a.localeCompare(y.a)||String(x.g).localeCompare(String(y.g))||x.n.localeCompare(y.n,"es")),"Descargar selección");
  $("#dlAll").onclick=()=>openDl(L.map(o=>S.items.get(o.id)).filter(Boolean),"Descargar lo filtrado");const sc=$("#selClr");if(sc)sc.onclick=()=>{S.sel.clear();vCad()}}

function vCal(){const c=S.cap;if(!c.g)c.g=groups(c.a)[0]||"";
  const L=all().filter(o=>o.a===c.a&&String(o.g)===c.g).sort((x,y)=>(x.ex-y.ex)||x.n.localeCompare(y.n,"es"));
  const doc=(L.find(o=>!o.ex)||{}).d||"";
  VW.innerHTML=`<h2>Captura de calificaciones</h2>
  <p class="lead">Calificación del parcial = examen × 0.6 + portafolio de evidencias (hasta 3) + participación (hasta 1). Cada cambio se guarda al salir de la casilla.</p>
  <div class="bar"><select id="ca" aria-label="Año">${YRS().map(a=>`<option value="${a}" ${c.a===a?"selected":""}>${ANIO[a]} año</option>`).join("")}</select>
  <select id="cg" aria-label="Grupo">${groups(c.a).map(g=>`<option value="${esc(g)}" ${c.g===g?"selected":""}>Grupo ${esc(g)}</option>`).join("")}</select>
  <select id="cp" aria-label="Parcial">${PARC.map(([k,t])=>`<option value="${k}" ${c.p===k?"selected":""}>${t}</option>`).join("")}</select>
  <span class="hint">${esc(doc)}</span><span class="sp" style="flex:1"></span><button class="btn ghost" id="bulk">Inscribir reprobados al remedial</button></div>
  <section class="gmon" id="gmon" aria-live="polite">${gmonHTML(L,c.p)}</section>
  <div class="tscroll"><table class="tbl cap"><thead><tr><th>Cadete</th><th class="num">ALCPT</th><th class="num">Examen (0–10)</th><th class="num">Portafolio (0–3)</th><th class="num">Particip. (0–1)</th><th class="num">Total</th><th>Remedial</th></tr></thead><tbody>
  ${L.map(o=>{const k=(o.cal&&o.cal[c.p])||{},t=ptot(k),la=lastAl(o);return o.ex?`<tr><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">Cía. ${esc(o.c||"—")}</span></td><td class="num">${la?la[1]:"—"}</td><td colspan="5"><span class="badge b-ex">Exento · monitor</span></td></tr>`:
  `<tr data-row="${o.id}"><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">Cía. ${esc(o.c||"—")}${o.m?" · "+esc(o.m):""}</span></td><td class="num">${la?la[1]:"—"}</td>
  <td class="num"><input type="number" inputmode="decimal" step="0.1" min="0" max="10" data-f="e" value="${k.e??""}" aria-label="Examen de ${esc(o.n)}"></td>
  <td class="num"><input type="number" inputmode="decimal" step="0.1" min="0" max="3" data-f="pt" value="${k.pt??""}" aria-label="Portafolio de ${esc(o.n)}"></td>
  <td class="num"><input type="number" inputmode="decimal" step="0.05" min="0" max="1" data-f="pa" value="${k.pa??""}" aria-label="Participación de ${esc(o.n)}"></td>
  <td class="num tot ${t!=null&&t<S.cfg.minimo?"lo":""}">${totHTML(t)}</td><td>${inRem(o)?`<span class="badge b-rem">En remedial</span>${puedeSalir(o)?`<span class="badge b-out">Puede salir</span>`:""}`:t!=null&&t<S.cfg.minimo?`<button class="btn small ghost" data-inscr="${o.id}">Inscribir</button>`:""}</td></tr>`}).join("")}
  </tbody></table></div>`;
  $("#ca").onchange=e=>{c.a=e.target.value;c.g="";vCal()};$("#cg").onchange=e=>{c.g=e.target.value;vCal()};$("#cp").onchange=e=>{c.p=e.target.value;vCal()};
  VW.querySelectorAll("tr[data-row] input").forEach(inp=>inp.onchange=()=>{const tr=inp.closest("tr"),o=clone(S.items.get(tr.dataset.row));
    const mx={e:10,pt:3,pa:1}[inp.dataset.f],v=inp.value===""?"":Math.min(mx,Math.max(0,Number(inp.value)));if(inp.value!==""&&isNaN(v))return;inp.value=v;
    o.cal=o.cal||{};o.cal[c.p]={...(o.cal[c.p]||{}),[inp.dataset.f]:v};const t=ptot(o.cal[c.p]);
    const td=tr.querySelector(".tot");td.innerHTML=totHTML(t);td.classList.toggle("lo",t!=null&&t<S.cfg.minimo);saveItem(o,true);$("#gmon").innerHTML=gmonHTML(L.map(x=>S.items.get(x.id)).filter(Boolean),c.p)});
  $("#bulk").onclick=()=>{const R=L.map(o=>S.items.get(o.id)).filter(o=>o&&!o.ex&&!inRem(o)&&ptot(o.cal&&o.cal[c.p])!=null&&ptot(o.cal[c.p])<S.cfg.minimo);
    if(!R.length){toast("No hay reprobados de este parcial fuera del remedial");return}
    ask("Inscribir al remedial",`Se inscriben ${R.length} cadete${R.length>1?"s":""} al remedial sabatino por el ${PARC.find(p=>p[0]===c.p)[1]}.`,`Inscribir ${R.length}`).then(ok=>{if(!ok)return;
    R.forEach(o=>inscribir(o,c.p,true));render();toast(`${R.length} inscrito${R.length>1?"s":""} al remedial`)})}}
function inscribir(o0,pk,silent){const o=clone(o0);const t=pk?ptot(o.cal&&o.cal[pk]):null;
  o.rem={...(o.rem||{}),on:true,alta:new Date().toISOString().slice(0,10),desde:pk||(lastPart(o)||{}).k||"",motivo:pk?`${PARC.find(p=>p[0]===pk)[1]}: ${t.toFixed(2)}`:"Inscripción manual",baja:null};
  o.remHist=[...(o.remHist||[]),{alta:o.rem.alta,motivo:o.rem.motivo}];saveItem(o,silent)}
function baja(o0,motivo){const o=clone(o0);o.rem={...o.rem,on:false,baja:new Date().toISOString().slice(0,10),motivoBaja:motivo};
  const h=o.remHist||[];if(h.length)h[h.length-1]={...h[h.length-1],baja:o.rem.baja,motivoBaja:motivo};o.remHist=h;saveItem(o)}

const CYCLE={"":"P","P":"F","F":"J","J":""};
function vRem(){const f=S.rf,q=norm(f.q.trim());
  const R=all().filter(inRem),grps=[...new Set(R.map(o=>o.rem.grupo?`${o.a}|${o.rem.grupo}`:`${o.a}|`))].sort();
  const L=R.filter(o=>(!q||norm(o.n).includes(q))&&(!f.grp||`${o.a}|${o.rem.grupo||""}`===f.grp)).sort((x,y)=>x.a.localeCompare(y.a)||String(x.rem.grupo||"").localeCompare(String(y.rem.grupo||""))||x.n.localeCompare(y.n,"es"));
  const chips=S.cfg.sesiones.map(s=>{const d=fmtD(s);return `<span class="chip">Sáb ${d.d} ${d.m}<button type="button" aria-label="Quitar sábado ${d.d} ${d.m}" data-rmsat="${s}">×</button></span>`}).join("");
  VW.innerHTML=`<h2>Remedial sabatino</h2>
  <p class="lead">${R.length} cadetes inscritos. Toca cada sábado para marcar asistencia; al marcar F se pide la causa.</p>
  <div class="bar"><input type="search" id="rq" placeholder="Buscar cadete del remedial" value="${esc(f.q)}" aria-label="Buscar">
  <select id="rg" aria-label="Grupo de asesoría"><option value="">Todos los grupos de asesoría</option>${grps.map(k=>{const [a,g]=k.split("|");return `<option value="${esc(k)}" ${f.grp===k?"selected":""}>${ANIO[a]} año · ${g?"Grupo "+esc(g):"Sin grupo"}</option>`}).join("")}</select>
  <button class="btn ghost" id="addRem">Inscribir cadete</button><button class="btn big" id="lista"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/></svg>Pase de lista</button></div>
  <div class="sessions"><span>Sábados registrados:</span>${chips||"<span>ninguno</span>"}<button type="button" class="addsat" id="btnSat">+ Agregar sábado</button></div>
  <p class="legend"><span><i style="background:var(--ok-bg);color:var(--ok)">A</i>Asistió</span><span><i style="background:var(--bad-bg);color:var(--bad)">F</i>Faltó</span><span><i style="background:var(--just-bg);color:var(--just)">J</i>Justificada</span></p>
  ${L.length?`<div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th class="num">Último parcial</th><th>Asistencia sabatina</th><th>Estado</th></tr></thead><tbody>
  ${L.map(o=>{const lp=lastPart(o);return `<tr><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}</span><span class="sub">Asesoría: ${o.rem.grupo?"grupo "+esc(o.rem.grupo):"sin grupo"}${o.rem.docente?" · "+esc(o.rem.docente):""}</span></td>
  <td class="num ${lp&&lp.v<S.cfg.minimo?"lo":""}">${lp?lp.v.toFixed(2):"—"}</td>
  <td><div class="dots">${S.cfg.sesiones.map(s=>{const v=(o.asis&&o.asis[s])||"",d=fmtD(s),cz=(v==="F"||v==="J")&&o.causa?o.causa[s]:"";
    return `<button type="button" class="dot ${v}" data-id="${o.id}" data-s="${s}" aria-label="${esc(o.n)}, ${d.d} ${d.m}: ${{P:"asistió",F:"faltó",J:"justificada","":"sin registro"}[v]}${cz?", "+CAUSA_TXT[cz]:""}" title="${cz?CAUSA_TXT[cz]:""}">${cz?`<i>${CAUSA_INI[cz]}</i>`:""}${v==="P"?"A":v||"·"}<em>${d.d}/${d.m}</em></button>`}).join("")}</div></td>
  <td>${badges(o).replace(/<span class="badge b-rem">[^<]*<\/span>/,"")||`<span class="sub">En curso</span>`}</td></tr>`}).join("")}</tbody></table></div>`:`<div class="empty"><strong>Sin cadetes en el remedial</strong>Inscríbelos desde Calificaciones o con “Inscribir cadete”.</div>`}
  ${causesHTML(R,"Causas de inasistencia")}`;
  $("#rq").oninput=e=>{f.q=e.target.value;vRem();const i=$("#rq");i.focus();i.setSelectionRange(i.value.length,i.value.length)};
  $("#rg").onchange=e=>{f.grp=e.target.value;vRem()};$("#btnSat").onclick=openSat;$("#addRem").onclick=openAddRem;$("#lista").onclick=()=>openLista(L.map(o=>o.id))}

function vCfg(){VW.innerHTML=`<h2>Ajustes</h2>
  <div class="g2" style="max-width:520px"><label class="hint">Calificación mínima aprobatoria<input id="cMin" type="number" step="0.1" min="0" max="10" value="${S.cfg.minimo}" style="padding:9px;border:1px solid var(--line);border-radius:6px;background:var(--surface)"></label>
  <label class="hint">Faltas sabatinas para marcar en riesgo<input id="cRisk" type="number" step="1" min="1" max="10" value="${S.cfg.riesgo}" style="padding:9px;border:1px solid var(--line);border-radius:6px;background:var(--surface)"></label></div>
  <p style="margin-top:12px"><button class="btn" id="cSave">Guardar ajustes</button></p>
  <h2>Reglas que aplica el seguimiento</h2>
  <ul class="lead" style="padding-left:20px"><li>Calificación del parcial: examen × 0.6 + portafolio (hasta 3) + participación (hasta 1).</li><li>Promedio: media de los parciales capturados. Los exentos no cuentan en los promedios.</li><li>Un cadete con parcial reprobado puede inscribirse al remedial desde Calificaciones.</li><li>Un cadete del remedial que aprueba el parcial siguiente aparece como “Puede salir del remedial”; la baja se da en su ficha.</li><li>Las faltas justificadas (J) no cuentan para el riesgo.</li></ul>`;
  $("#cSave").onclick=()=>{const m=parseFloat($("#cMin").value),r=parseInt($("#cRisk").value,10);if(!isNaN(m))S.cfg.minimo=m;if(!isNaN(r)&&r>0)S.cfg.riesgo=r;saveCfg();toast("Ajustes guardados")}}

/* ---------- ficha ---------- */
let FID=null;
function openFicha(id){FID=id;const o=S.items.get(id);if(!o)return;const al=o.alcpt||[],mx=100;
  const hist=al.map(([l,v])=>({l:"ALCPT "+l,v,d:false}));if(o.diag!=null)hist.push({l:"Diagnóstico 21 sep. 2026",v:o.diag,d:true});
  const aus=S.cfg.sesiones.filter(s=>o.asis&&(o.asis[s]==="F"||o.asis[s]==="J"));
  const pr=prom(o),la=lastAl(o),st=estAc(o);
  $("#fichaBody").innerHTML=`<div class="fhead"><span class="av s-${st}">${esc(ini(o.n))}</span><div><h2>${esc(o.n)}</h2><p class="hint">${grpLabel(o)}${o.m?" · "+esc(o.m):""} · Docente: ${esc(o.d||"—")}</p><div>${badges(o)||""}</div></div>
    <div class="fkpi"><div><b class="${pr!=null&&pr<S.cfg.minimo?"lo":""}">${pr==null?"—":pr.toFixed(2)}</b><span>${o.ex?"Exento":"Promedio · "+EST_TXT[st].toLowerCase()}</span></div><div><b>${la?la[1]:"—"}</b><span>ALCPT ${la?esc(la[0]):""}</span></div><div><b>${o.diag??"—"}</b><span>Diagnóstico</span></div><div><b class="${enRiesgo(o)?"lo":""}">${inRem(o)?faltas(o):"—"}</b><span>${inRem(o)?"Faltas sabatinas":"Sin remedial"}</span></div></div>
    <button class="fx" type="button" id="fX" aria-label="Cerrar ficha">×</button></div>
  <h3>Historial ALCPT y diagnóstico</h3>
  ${trendHTML(o)}
  ${o.ex?"":`<h3>Calificaciones</h3>
  <div class="tscroll"><table class="tbl cap"><thead><tr><th>Parcial</th><th class="num">Examen</th><th class="num">Portafolio</th><th class="num">Particip.</th><th class="num">Total</th></tr></thead><tbody>
  ${PARC.map(([k,t])=>{const c=(o.cal&&o.cal[k])||{},v=ptot(c);return `<tr data-p="${k}"><td>${t}</td><td class="num"><input type="number" step="0.1" min="0" max="10" data-f="e" value="${c.e??""}" aria-label="${t} examen"></td><td class="num"><input type="number" step="0.1" min="0" max="3" data-f="pt" value="${c.pt??""}" aria-label="${t} portafolio"></td><td class="num"><input type="number" step="0.05" min="0" max="1" data-f="pa" value="${c.pa??""}" aria-label="${t} participación"></td><td class="num tot ${v!=null&&v<S.cfg.minimo?"lo":""}">${v==null?"—":v.toFixed(2)}</td></tr>`}).join("")}
  <tr class="total"><td>Promedio</td><td colspan="3"></td><td class="num" id="fProm">${prom(o)==null?"—":prom(o).toFixed(2)}</td></tr></tbody></table></div>`}
  <h3>Remedial sabatino</h3>
  ${inRem(o)?`<p class="hint">Inscrito desde ${esc(o.rem.alta||"—")} · ${esc(o.rem.motivo||"")}</p>
    <div class="g3"><label>Grupo de asesoría<input id="fRg" value="${esc(o.rem.grupo||"")}"></label><label>Docente de asesoría<input id="fRd" value="${esc(o.rem.docente||"")}"></label>
    <label>Examen de recuperación (0–10)<input id="fRec" type="number" step="0.1" min="0" max="10" value="${o.recup??""}"></label></div>
    ${aus.length?`<div class="ecaus"><span class="hint">Causa de cada inasistencia</span>${aus.map(s=>{const d=fmtD(s);return `<label>Sáb ${d.d} ${d.m} (${o.asis[s]})<select data-cs="${s}"><option value="">Sin clasificar</option>${CAUSAS.map(([k,l])=>`<option value="${k}" ${o.causa&&o.causa[s]===k?"selected":""}>${l}</option>`).join("")}</select></label>`}).join("")}</div>`:`<p class="hint">${faltas(o)} faltas registradas.</p>`}
    <div class="acts" style="justify-content:flex-start"><button class="btn danger small" id="fBaja">${puedeSalir(o)?"Dar de baja: aprobó el parcial":"Dar de baja del remedial"}</button></div>`
  :`<p class="hint">${(o.remHist||[]).length?`Estuvo en el remedial: ${(o.remHist||[]).map(h=>`${esc(h.alta)} a ${esc(h.baja||"—")}${h.motivoBaja?" ("+esc(h.motivoBaja)+")":""}`).join("; ")}.`:"No ha estado en el remedial."}</p>
    ${o.ex?"":`<div class="acts" style="justify-content:flex-start"><button class="btn ghost small" id="fAlta">Inscribir al remedial</button></div>`}`}
  <h3>Evidencias y bitácoras</h3><div id="fEv"></div>
  <h3>Observaciones</h3><label>Temas a reforzar, conducta, acuerdos y seguimiento<textarea id="fObs">${esc(o.obs||"")}</textarea></label>
  <div class="acts"><button class="btn ghost" id="fClose">Cerrar</button><button class="btn" id="fSave">Guardar cambios</button></div>`;
  const fb=$("#fichaBody");
  fb.querySelectorAll("tr[data-p] input").forEach(inp=>inp.oninput=()=>{const tr=inp.closest("tr"),c={};tr.querySelectorAll("input").forEach(i=>c[i.dataset.f]=i.value);
    const v=ptot(c),td=tr.querySelector(".tot");td.textContent=v==null?"—":v.toFixed(2);td.classList.toggle("lo",v!=null&&v<S.cfg.minimo)});
  $("#fClose").onclick=()=>$("#dFicha").close();$("#fX").onclick=()=>$("#dFicha").close();
  $("#fSave").onclick=()=>{const o2=clone(S.items.get(id));
    fb.querySelectorAll("tr[data-p]").forEach(tr=>{const c={};tr.querySelectorAll("input").forEach(i=>{const mx={e:10,pt:3,pa:1}[i.dataset.f];c[i.dataset.f]=i.value===""?"":Math.min(mx,Math.max(0,Number(i.value)))});o2.cal=o2.cal||{};o2.cal[tr.dataset.p]=c});
    if(inRem(o2)){o2.rem.grupo=$("#fRg").value.trim();o2.rem.docente=$("#fRd").value.trim();const r=$("#fRec").value;o2.recup=r===""?"":Number(r);
      o2.causa={...(o2.causa||{})};fb.querySelectorAll("select[data-cs]").forEach(s=>{if(s.value)o2.causa[s.dataset.cs]=s.value;else delete o2.causa[s.dataset.cs]})}
    o2.obs=$("#fObs").value.trim();saveItem(o2);$("#dFicha").close();toast("Ficha guardada")};
  const fbj=$("#fBaja");if(fbj)fbj.onclick=()=>{if(puedeSalir(o)){baja(o,`Aprobó el ${PARC.find(p=>p[0]===lastPart(o).k)[1]} (${lastPart(o).v.toFixed(2)})`);$("#dFicha").close();toast("Baja del remedial registrada");return}
    if($("#fBm"))return;fbj.insertAdjacentHTML("afterend",`<label style="flex:1;min-width:220px">Motivo de la baja<input id="fBm" placeholder="Ej.: cambio de grupo"></label><button class="btn danger small" id="fBok">Confirmar baja</button>`);$("#fBm").focus();
    $("#fBok").onclick=()=>{baja(o,$("#fBm").value.trim()||"Sin motivo");$("#dFicha").close();toast("Baja del remedial registrada")}};
  const fa=$("#fAlta");if(fa)fa.onclick=()=>{const lp=lastPart(o);inscribir(o,lp&&lp.v<S.cfg.minimo?lp.k:null);openFicha(id);toast("Inscrito al remedial")};
  renderEvid(id);
  if(!$("#dFicha").open)$("#dFicha").showModal()}
const MAXB=20*1024*1024,MAXDB=8*1024*1024,CH=180000,EVI={busy:false,msg:"",del:null};
const MIME={pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",csv:"text/csv",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xls:"application/vnd.ms-excel",doc:"application/msword",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",ogg:"audio/ogg"};
const hoyL=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
async function getAssets(){if(ASSETS)return ASSETS;try{ASSETS=await window.claude.use("assets")}catch(e){}return ASSETS}
async function b64(blob){const u8=new Uint8Array(await blob.arrayBuffer());let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
async function guardarDb(f,mime){if(!S.db)throw {code:"no_db"};if(f.size>MAXDB)throw {code:"big_db"};const s=await b64(f),n=Math.max(1,Math.ceil(s.length/CH)),fid="f"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  for(let k=0;k<n;k++)await S.db.collection("archivos").doc(`${fid}-${k}`).set({i:k,n,nombre:f.name,type:mime,b:s.slice(k*CH,(k+1)*CH)});return {fid,n,mime}}
async function leerDb(e){let s="";for(let k=0;k<e.n;k++){const d=await S.db.collection("archivos").doc(`${e.fid}-${k}`).get(),x=d&&d.data&&d.data();if(!x)throw {code:"missing"};s+=x.b}
  const bin=atob(s),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);return new Blob([u8],{type:e.mime||""})}
async function borrarDb(e){if(!e.fid||!S.db)return;for(let k=0;k<e.n;k++){try{await S.db.collection("archivos").doc(`${e.fid}-${k}`).delete()}catch(x){console.warn(x)}}}
/* guarda el archivo original: imágenes y PDF en el almacén de archivos; Word y Excel (o si el almacén falla) en la base de datos */
async function guardarArchivo(f0){let f=f0;if(isImg(f)){try{f=await normImg(f)}catch(e){throw {code:"img_bad"}}}const x=extOf(f),mime=MIME[x]||f.type||"application/octet-stream";let fallo="";
  if(x==="doc")throw {code:"doc_old"};if(!MIME[x]&&!isImg(f))throw {code:"unsupported"};
  if(f.size>MAXB)throw {code:"big"};
  if(!["docx","xlsx","xls","pptx"].includes(x)){const A=await getAssets();if(A){try{const u=await A.upload(f,{type:isImg(f)?(f.type==="image/png"||x==="png"?"image/png":"image/jpeg"):mime});return {id:u.id,url:u.url}}catch(e){console.warn("assets",e);fallo=e&&e.code||"error"}}else fallo="sin_almacen"}
  try{return await guardarDb(f,mime)}catch(e){console.warn("db",e);
    if(e.code==="big_db")throw {code:fallo?"big_db":"big_office"};throw {code:"save_fail",det:fallo||e.code||"error"}}}
function errGuardar(x){return x.code==="img_bad"?"la imagen no se pudo abrir; tómale captura de pantalla o guárdala como JPG":x.code==="big"?"supera 20 MB":x.code==="big_db"?"no se pudo guardar en el almacén y supera 8 MB; redúcelo o divídelo":x.code==="big_office"?"los archivos Word y Excel pueden pesar hasta 8 MB":x.code==="save_fail"?`no se pudo guardar (${x.det})`:errMsg(x)||"no se pudo guardar"}
async function abrirArchivo(e){if(e.url&&!e.fid){window.open(e.url,"_blank","noopener");return}
  try{toast("Preparando archivo…");const blob=await leerDb(e);const dl=await window.claude.use("downloads").catch(()=>null);
    if(dl){try{await dl.save({filename:e.nombre,data:blob})}catch(x){if(x.code!=="declined")throw x}}
    else{const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=e.nombre;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6e4)}}
  catch(x){console.warn(x);toast("No se pudo abrir el archivo")}}
function renderEvid(id){const o=S.items.get(id),box=$("#fEv");if(!o||!box)return;const L=o.evid||[],w=S.canWrite&&!!S.db;
  box.innerHTML=`${L.length?`<ul class="evl">${L.map((e,i)=>`<li><span class="evt">${esc(e.tipo)}</span>${e.url&&!e.fid?`<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.nombre)}</a>`:`<a href="#" data-evopen="${i}">${esc(e.nombre)}</a>`}${e.conv?`<span class="sub">guardado como texto</span>`:""}
    <span class="sub">${esc(e.fecha||"")}${e.nota?" · "+esc(e.nota):""}</span>${w?(EVI.del===i?`<span class="evconf"><button class="btn danger small" data-evok="${i}">Sí, quitar</button><button class="btn ghost small" data-evno>Cancelar</button></span>`:`<button class="btn ghost small" data-evdel="${i}" aria-label="Quitar ${esc(e.nombre)}">Quitar</button>`):""}</li>`).join("")}</ul>`:`<p class="hint">Sin evidencias adjuntas.</p>`}
  ${w?`<div class="evadd"><label>Nota (opcional)<input id="evNota" placeholder="Ej.: bitácora de asesoría del 7 nov."></label>
    <label class="btn small evbtn ${EVI.busy?"dis":""}">${EVI.busy?"Subiendo…":"Adjuntar archivos"}<input type="file" id="evFile" multiple accept="${ACCEPT}" hidden ${EVI.busy?"disabled":""}></label></div>
    <p class="hint">JPG, PNG, PDF, MP3 y WAV hasta 20 MB; Word, Excel y PowerPoint hasta 8 MB. Se guarda el archivo original en este dispositivo.</p>${EVI.msg?`<p class="notice">${esc(EVI.msg)}</p>`:""}`:""}`;
  const fi=$("#evFile");if(fi)fi.onchange=async e=>{const fs=[...e.target.files];if(!fs.length)return;EVI.busy=true;EVI.msg="";const nota=($("#evNota")||{}).value||"";renderEvid(id);
    const nuevos=[],err=[];for(const f of fs){try{const r=await guardarArchivo(f);nuevos.push({...r,nombre:f.name,tipo:TIPO_EV(f),fecha:hoyL(),nota:nota.trim()})}
      catch(x){console.warn(x);err.push(`${f.name}: ${errGuardar(x)}`)}}
    if(nuevos.length){const o2=clone(S.items.get(id));o2.evid=[...(o2.evid||[]),...nuevos];saveItem(o2,true);toast(`${nuevos.length} evidencia${nuevos.length===1?"":"s"} adjunta${nuevos.length===1?"":"s"}`)}
    EVI.busy=false;EVI.msg=err.join(" · ");renderEvid(id)};
  box.querySelectorAll("[data-evopen]").forEach(a=>a.onclick=ev=>{ev.preventDefault();abrirArchivo(L[+a.dataset.evopen])});
  box.querySelectorAll("[data-evdel]").forEach(b=>b.onclick=()=>{EVI.del=+b.dataset.evdel;renderEvid(id)});
  box.querySelectorAll("[data-evno]").forEach(b=>b.onclick=()=>{EVI.del=null;renderEvid(id)});
  box.querySelectorAll("[data-evok]").forEach(b=>b.onclick=async()=>{const o2=clone(S.items.get(id)),i=+b.dataset.evok,e=o2.evid[i];EVI.del=null;if(!e)return;
    o2.evid.splice(i,1);saveItem(o2,true);renderEvid(id);try{if(e.id&&ASSETS&&ASSETS.delete)await ASSETS.delete(e.id)}catch(x){console.warn(x)}await borrarDb(e);toast("Evidencia quitada")})}

/* ---------- remedial: asistencia, sábados, alta ---------- */
let CT=null;
document.addEventListener("click",e=>{
  const nb=e.target.closest(".nameb,.tile");if(nb){hideTip();openFicha(nb.dataset.id);return}
  const d=e.target.closest(".dot");if(d){const o=clone(S.items.get(d.dataset.id)),s=d.dataset.s;o.asis=o.asis||{};o.causa=o.causa||{};
    const nv=CYCLE[o.asis[s]||""];o.asis[s]=nv;if(nv!=="F"&&nv!=="J")delete o.causa[s];saveItem(o);const nd=VW.querySelector(`.dot[data-id="${o.id}"][data-s="${s}"]`);if(nd)nd.classList.add("pop");if(nv==="F"&&S.canWrite)askCause(o.id,s);return}
  const rm=e.target.closest("[data-rmsat]");if(rm){const s=rm.dataset.rmsat,f=fmtD(s);ask(`Quitar el sábado ${f.d} ${f.m}`,"La asistencia de ese día deja de contar en faltas y porcentajes.","Quitar sábado",true).then(ok=>{if(ok){S.cfg.sesiones=S.cfg.sesiones.filter(x=>x!==s);saveCfg();toast("Sábado quitado")}});return}
  const ins=e.target.closest("[data-inscr]");if(ins){const c=S.cap;inscribir(S.items.get(ins.dataset.inscr),c.p);toast("Inscrito al remedial");return}
});
function askCause(id,s){CT={id,s};const o=S.items.get(id),f=fmtD(s);$("#cWho").textContent=`${o.n} · sábado ${f.d} ${f.m}`;
  $("#cBtns").innerHTML=CAUSAS.map(([k,l])=>`<button class="btn ghost" value="${k}">${l}</button>`).join("");$("#dCause").returnValue="";$("#dCause").showModal()}
$("#dLista").addEventListener("close",()=>{if(!typing())render()});
$("#dCause").addEventListener("close",()=>{const v=$("#dCause").returnValue;if(!CT||!CAUSA_TXT[v])return;const o=clone(S.items.get(CT.id));o.causa={...(o.causa||{}),[CT.s]:v};saveItem(o);toast("Causa: "+CAUSA_TXT[v])});
function openSat(){const last=S.cfg.sesiones.length?new Date(S.cfg.sesiones[S.cfg.sesiones.length-1]+"T12:00:00"):new Date();const d=new Date(last);
  d.setDate(d.getDate()+(S.cfg.sesiones.length?7:((6-d.getDay()+7)%7)));$("#sDate").value=d.toISOString().slice(0,10);$("#sHint").textContent="";$("#dSat").returnValue="";$("#dSat").showModal()}
$("#sDate").addEventListener("input",()=>{const v=$("#sDate").value;$("#sHint").textContent=v&&new Date(v+"T12:00:00").getDay()!==6?"Esa fecha no cae en sábado.":""});
$("#dSat").addEventListener("close",()=>{if($("#dSat").returnValue!=="ok")return;const v=$("#sDate").value;if(!v)return;if(S.cfg.sesiones.includes(v)){toast("Ese sábado ya está registrado");return}S.cfg.sesiones=[...S.cfg.sesiones,v].sort();saveCfg();toast("Sábado agregado")});
function openAddRem(){$("#arQ").value="";$("#arRes").hidden=true;$("#dAddRem").showModal();$("#arQ").focus()}
$("#arClose").onclick=()=>$("#dAddRem").close();
$("#arQ").oninput=()=>{const q=norm($("#arQ").value.trim()),b=$("#arRes");if(q.length<3){b.hidden=true;return}const w=q.split(/\s+/);
  const H=all().filter(o=>!o.ex&&!inRem(o)&&w.every(x=>norm(o.n).includes(x)||norm(o.m).includes(x))).slice(0,25);b.hidden=false;
  b.innerHTML=H.length?H.map(o=>{const lp=lastPart(o);return `<button type="button" data-add="${o.id}">${esc(o.n)}<br><span class="sub">${grpLabel(o)} · último parcial ${lp?lp.v.toFixed(2):"sin captura"}</span></button>`}).join(""):`<p class="hint" style="padding:8px 10px">Sin coincidencias fuera del remedial.</p>`};
$("#arRes").onclick=e=>{const b=e.target.closest("[data-add]");if(!b)return;const o=S.items.get(b.dataset.add),lp=lastPart(o);inscribir(o,lp&&lp.v<S.cfg.minimo?lp.k:null);$("#dAddRem").close();toast("Inscrito al remedial")};

/* ---------- CSV ---------- */
async function csv(L,secs){secs=secs||SECS.map(s=>s[0]);const ses=S.cfg.sesiones,has=k=>secs.includes(k);
  const AL=["Sep 2024","Feb 2025","Mar 2026","Jun 2025","Feb 2026","Jul 2026",...new Set(L.flatMap(o=>(o.alcpt||[]).map(x=>x[0])))].filter((v,i,a)=>a.indexOf(v)===i);
  const ALU=AL.filter(k=>L.some(o=>(o.alcpt||[]).some(x=>x[0]===k)));
  const head=["Año","Grupo","Nombre"];if(has("datos"))head.push("Compañía","Matrícula","Docente","Exento");
  if(has("alcpt"))head.push(...ALU.map(x=>"ALCPT "+x),"Diagnóstico 21 sep 2026");
  if(has("cal"))head.push(...PARC.flatMap(([,t])=>[t+" examen",t+" portafolio",t+" participación",t+" total"]),"Promedio","Estado");
  if(has("rem"))head.push("En remedial","Grupo asesoría","Docente asesoría","Alta remedial","Motivo","Recuperación");
  if(has("asis"))head.push(...ses.map(s=>"Sáb "+s),"Faltas","Causas");
  if(has("obs"))head.push("Observaciones");
  const rows=L.map(o=>{const al=Object.fromEntries(o.alcpt||[]),r=[ANIO[o.a],o.g,o.n];if(has("datos"))r.push(o.c,o.m,o.d,o.ex?"Sí":"");
    if(has("alcpt"))r.push(...ALU.map(k=>al[k]??""),o.diag??"");
    if(has("cal"))r.push(...PARC.flatMap(([k])=>{const c=(o.cal&&o.cal[k])||{},t=ptot(c);return [c.e??"",c.pt??"",c.pa??"",t==null?"":t.toFixed(2)]}),prom(o)==null?"":prom(o).toFixed(2),o.ex?"Exento":EST_TXT[estAc(o)]);
    if(has("rem"))r.push(inRem(o)?"Sí":"",o.rem?o.rem.grupo||"":"",o.rem?o.rem.docente||"":"",o.rem?o.rem.alta||"":"",o.rem?o.rem.motivo||"":"",o.recup??"");
    if(has("asis"))r.push(...ses.map(s=>({P:"A",F:"F",J:"J"}[o.asis&&o.asis[s]]||"")),faltas(o),ses.filter(s=>o.causa&&o.causa[s]).map(s=>{const f=fmtD(s);return `${f.d} ${f.m}: ${CAUSA_TXT[o.causa[s]]}`}).join("; "));
    if(has("obs"))r.push(o.obs||"");return r});
  const txt="﻿"+[head,...rows].map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const dl=window.claude&&window.claude.use?await window.claude.use("downloads").catch(()=>null):null;
  if(!dl){toast("La descarga no está disponible en esta vista");return}
  try{await dl.save({filename:`seguimiento-ingles-${L.length}cadetes-${new Date().toISOString().slice(0,10)}.csv`,data:txt});toast("Archivo descargado")}catch(e){if(e.code!=="declined")toast("No se pudo descargar el archivo")}}

/* ---------- importar desde imágenes o archivos ---------- */
const IMP={tipo:"asis",fecha:"",grp:"",a:"4",g:"",p:"p1",lab:"",files:[],rows:null,busy:false,msg:"",log:[]};
const TIPOS=[["asis","Lista de asistencia sabatina"],["cal","Calificaciones de un parcial"],["alcpt","Resultados ALCPT o diagnóstico"]];
let SAMPLE=null,ASSETS=null,SAMPLE_LIM=null;
function toks(s){return norm(s).replace(/\(.*?\)/g," ").replace(/\b(jefe|subjefe|de grupo|exent[ao]|j\.?g\.?|sub\.?)\b/g," ").replace(/[^a-z ]/g," ").split(/\s+/).filter(w=>w.length>1&&!["de","del","la","las","los","y"].includes(w))}
function sim(a,b){const A=new Set(toks(a)),B=new Set(toks(b));if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/Math.max(A.size,B.size)}
function candidatos(){const A=all();
  if(IMP.tipo==="asis")return A.filter(o=>inRem(o)&&(!IMP.grp||`${o.a}|${o.rem.grupo||""}`===IMP.grp));
  if(IMP.tipo==="cal")return A.filter(o=>o.a===IMP.a&&(!IMP.g||String(o.g)===IMP.g)&&!o.ex);
  return A.filter(o=>o.a===IMP.a)}
function match(nombre,mat,C){if(mat){const m=String(mat).replace(/-/g,"").toUpperCase();const h=C.find(o=>o.m&&o.m.replace(/-/g,"").toUpperCase()===m);if(h)return {o:h,s:1}}
  let best=null,bs=0,second=0;C.forEach(o=>{const s=sim(nombre,o.n);if(s>bs){second=bs;bs=s;best=o}else if(s>second)second=s});
  return bs>=0.55&&bs-second>0.05?{o:best,s:bs}:{o:null,s:bs,sug:best}}
async function loadXLSX(){if(window.XLSX)return window.XLSX;await new Promise((res,rej)=>{const s=document.createElement("script");s.src="vendor/xlsx.bundle.js";s.onload=res;s.onerror=()=>rej(new Error("xlsx"));document.head.appendChild(s)});return window.XLSX}
/* ---------- lectura de archivos: Excel, Word y PDF ---------- */
const ACCEPT="image/*,audio/*,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx,.mp3,.wav,.m4a,.ogg";
const extOf=f=>(f.name.split(".").pop()||"").toLowerCase();
const IMG_EXT=["jpg","jpeg","png","heic","heif","webp","gif","bmp","jfif"];
const isImg=f=>(/^image\//.test(f.type)&&!/svg/.test(f.type))||IMG_EXT.includes(extOf(f));
/* convierte cualquier foto (HEIC de iPhone, WebP, etc.) a JPEG o PNG */
async function decodeImg(f){try{return await createImageBitmap(f,{imageOrientation:"from-image"})}catch(e){}
  try{const u=URL.createObjectURL(f);const im=new Image();im.src=u;await im.decode();URL.revokeObjectURL(u);return im}catch(e){}
  if(/hei[cf]/i.test(f.type)||/^hei[cf]$/.test(extOf(f))){if(!window.heic2any)await loadScript("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js");
    let b=await window.heic2any({blob:f,toType:"image/jpeg",quality:0.92});if(Array.isArray(b))b=b[0];return await createImageBitmap(b)}
  throw {code:"img_bad"}}
async function normImg(f){if(/^image\/(jpeg|png)$/.test(f.type))return f;const bmp=await decodeImg(f),c=document.createElement("canvas");c.width=bmp.width;c.height=bmp.height;c.getContext("2d").drawImage(bmp,0,0);
  const b=await new Promise(r=>c.toBlob(r,"image/jpeg",0.92));if(!b)throw {code:"img_bad"};return new File([b],f.name.replace(/\.[^.]+$/,"")+".jpg",{type:"image/jpeg"})}
/* divide una hoja vertical en franjas traslapadas para que Claude lea los renglones con más detalle */
async function franjas(f,n){const bmp=await decodeImg(f),W=bmp.width,H=bmp.height;if(n<2||H<W*1.15||H<1400){return [await toJpeg(bmp,0,0,W,H)]}
  const ov=Math.round(H*0.06),h=Math.ceil((H+ov*(n-1))/n),out=[];for(let i=0;i<n;i++){const y=Math.max(0,Math.min(H-h,i*(h-ov)));out.push(await toJpeg(bmp,0,y,W,h))}return out}
async function toJpeg(bmp,x,y,w,h){const k=Math.min(1,2400/Math.max(w,h)),c=document.createElement("canvas");c.width=Math.round(w*k);c.height=Math.round(h*k);
  c.getContext("2d").drawImage(bmp,x,y,w,h,0,0,c.width,c.height);return await new Promise(r=>c.toBlob(b=>r(b),"image/jpeg",0.9))}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("script "+src));document.head.appendChild(s)})}
async function unzip(buf){const u8=new Uint8Array(buf),dv=new DataView(buf),dec=new TextDecoder();let e=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw {code:"bad_file"};const n=dv.getUint16(e+10,true),files=new Map();let p=dv.getUint32(e+16,true);
  for(let k=0;k<n&&dv.getUint32(p,true)===0x02014b50;k++){const nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true);
    files.set(dec.decode(u8.subarray(p+46,p+46+nl)),{m:dv.getUint16(p+10,true),cs:dv.getUint32(p+20,true),lh:dv.getUint32(p+42,true)});p+=46+nl+el+cl}
  return {has:nm=>files.has(nm),names:()=>[...files.keys()],async read(nm){const f=files.get(nm);if(!f)return null;
    const st=f.lh+30+dv.getUint16(f.lh+26,true)+dv.getUint16(f.lh+28,true),d=u8.subarray(st,st+f.cs);if(f.m===0)return dec.decode(d);
    return await new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()}}}
const xml=s=>new DOMParser().parseFromString(s,"application/xml");
const kids=(el,ln)=>[...el.children].filter(c=>c.localName===ln);
const qcsv=cells=>cells.map(c=>`"${String(c??"").replace(/"/g,'""').replace(/\s+/g," ").trim()}"`).join(",");
async function readXlsx(f){const z=await unzip(await f.arrayBuffer());const ss=[];
  const sx=await z.read("xl/sharedStrings.xml");if(sx)[...xml(sx).getElementsByTagName("si")].forEach(si=>ss.push([...si.getElementsByTagName("t")].map(t=>t.textContent).join("")));
  const wb=xml(await z.read("xl/workbook.xml")),rels=xml(await z.read("xl/_rels/workbook.xml.rels")||"<x/>"),rmap={};
  [...rels.getElementsByTagName("Relationship")].forEach(r=>rmap[r.getAttribute("Id")]=r.getAttribute("Target"));
  const col=r=>{let n=0;for(const ch of r.replace(/\d+/g,""))n=n*26+ch.charCodeAt(0)-64;return n-1};const out=[];
  for(const sh of [...wb.getElementsByTagName("sheet")]){let tg=rmap[sh.getAttribute("r:id")]||"";tg=tg.replace(/^\/?xl\//,"");const path="xl/"+tg;if(!z.has(path))continue;
    const doc=xml(await z.read(path)),lines=[];
    [...doc.getElementsByTagName("row")].forEach(row=>{const cells=[];[...row.getElementsByTagName("c")].forEach(c=>{const t=c.getAttribute("t"),v=c.getElementsByTagName("v")[0];
      let val=t==="s"?ss[+(v&&v.textContent)]:t==="inlineStr"?[...c.getElementsByTagName("t")].map(x=>x.textContent).join(""):v?v.textContent:"";
      if(t!=="s"&&t!=="inlineStr"&&t!=="str"&&/^-?\d+\.\d{6,}$/.test(val))val=String(Math.round(Number(val)*100)/100);cells[col(c.getAttribute("r")||"A")]=val});
      if(cells.some(x=>x!==undefined&&x!==""))lines.push(qcsv([...cells].map(x=>x??"")))});
    out.push(`## Hoja: ${sh.getAttribute("name")}\n`+lines.join("\n"))}
  return out.join("\n\n")}
async function readDocx(f){const z=await unzip(await f.arrayBuffer());const d=await z.read("word/document.xml");if(!d)throw {code:"bad_file"};
  const body=xml(d).getElementsByTagName("w:body")[0],lines=[];const txt=el=>[...el.getElementsByTagName("w:t")].map(t=>t.textContent).join("");
  const walk=el=>{[...el.children].forEach(c=>{if(c.localName==="p"){const t=txt(c).trim();if(t)lines.push(t)}else if(c.localName==="tbl"){
    kids(c,"tr").forEach(tr=>{const cells=kids(tr,"tc").map(tc=>kids(tc,"p").map(txt).join(" ").trim());if(cells.some(Boolean))lines.push(qcsv(cells))})}else if(c.localName==="sdt"||c.localName==="sdtContent")walk(c)})};
  walk(body);return lines.join("\n")}
async function loadPdf(){if(window.pdfjsLib)return window.pdfjsLib;const B="vendor/";
  await loadScript(B+"pdf.min.js");const L=window.pdfjsLib;if(!L)throw {code:"pdf_lib"};L.GlobalWorkerOptions.workerSrc=B+"pdf.worker.min.js";return L}
async function readPdf(f,maxImgs){const L=await loadPdf();const pdf=await L.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;const N=Math.min(pdf.numPages,12),parts=[];
  for(let i=1;i<=N;i++){const pg=await pdf.getPage(i),tc=await pg.getTextContent(),rows=new Map();
    tc.items.forEach(it=>{if(!it.str||!it.str.trim())return;const y=Math.round(it.transform[5]/3)*3;(rows.get(y)||rows.set(y,[]).get(y)).push([it.transform[4],it.str])});
    parts.push(`## Página ${i}\n`+[...rows.entries()].sort((a,b)=>b[0]-a[0]).map(([,c])=>qcsv(c.sort((a,b)=>a[0]-b[0]).map(x=>x[1]))).join("\n"))}
  const text=parts.join("\n\n"),letters=(text.match(/[a-záéíóúñ]/gi)||[]).length,images=[];
  if(letters<60*N&&maxImgs){for(let i=1;i<=Math.min(N,maxImgs);i++){const pg=await pdf.getPage(i),v0=pg.getViewport({scale:1}),k=Math.min(2.5,2000/Math.max(v0.width,v0.height)),vp=pg.getViewport({scale:k});
    const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);await pg.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
    images.push(await new Promise(r=>c.toBlob(b=>r(b),"image/jpeg",0.85)))}}
  return {text:letters>=60*N?text:"",images,scanned:letters<60*N}}
async function readAny(f,maxImgs){const x=extOf(f);
  if(x==="csv"||x==="txt")return {text:await f.text(),images:[]};
  if(x==="xlsx")return {text:await readXlsx(f),images:[]};
  if(x==="docx")return {text:await readDocx(f),images:[]};
  if(x==="pdf")return await readPdf(f,maxImgs);
  if(x==="xls"){const X=await loadXLSX();const wb=X.read(await f.arrayBuffer(),{type:"array"});return {text:wb.SheetNames.map(s=>`## Hoja: ${s}\n`+X.utils.sheet_to_csv(wb.Sheets[s],{blankrows:false})).join("\n\n"),images:[]}}
  if(x==="doc")throw {code:"doc_old"};
  throw {code:"unsupported"}}
/* convierte para guardar como evidencia: imágenes y PDF tal cual; Word y Excel como texto */
async function toStorable(f){const x=extOf(f);
  if(isImg(f)){const g=await normImg(f);return {blob:g,type:g.type,conv:false}}
  if(x==="pdf")return {blob:f,type:"application/pdf",conv:false};
  if(x==="csv")return {blob:f,type:"text/csv",conv:false};
  if(x==="xlsx"||x==="xls"){const t=(await readAny(f,0)).text;return {blob:new Blob([t],{type:"text/csv"}),type:"text/csv",conv:true}}
  if(x==="docx"){const t=await readDocx(f);return {blob:new Blob([`# ${f.name}\n\n${t}`],{type:"text/markdown"}),type:"text/markdown",conv:true}}
  throw {code:x==="doc"?"doc_old":"unsupported"}}
const TIPO_EV=f=>{const x=extOf(f);return isImg(f)?"Imagen":x==="pdf"?"PDF":["xlsx","xls","csv"].includes(x)?"Excel":["docx","doc"].includes(x)?"Word":x==="pptx"?"PowerPoint":/^(mp3|wav|m4a|ogg)$/.test(x)?"Audio":"Archivo"};
function errMsg(e){return e&&e.code==="doc_old"?"Los archivos .doc antiguos no se pueden leer: guárdalo como .docx o PDF.":e&&e.code==="unsupported"?"Formato no admitido. Usa JPG, PNG, PDF, Excel, Word, PowerPoint, MP3 o WAV.":e&&e.code==="bad_file"?"El archivo está dañado o no es del formato indicado.":e&&e.code==="pdf_lib"||e&&/script/.test(e.message||"")?"No se pudo cargar el lector de PDF. Revisa tu conexión.":null}

async function fileToText(f){return (await readAny(f,0)).text}
async function shrink(f){if(!/^image\//.test(f.type))return f;try{const bmp=await createImageBitmap(f);const k=Math.min(1,2000/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  return await new Promise(r=>c.toBlob(b=>r(b||f),"image/jpeg",0.85))}catch(e){return f}}
function promptIA(C,texto){const ctx=IMP.tipo==="asis"?`Lista de asistencia de la asesoría sabatina de inglés del ${IMP.fecha}.`:IMP.tipo==="cal"?`Calificaciones del ${PARC.find(p=>p[0]===IMP.p)[1]} de inglés, ${ANIO[IMP.a]} año${IMP.g?", grupo "+IMP.g:""}.`:`Resultados del examen ALCPT o diagnóstico (${IMP.lab||"sin etiqueta"}) de ${ANIO[IMP.a]} año.`;
  const esquema=IMP.tipo==="asis"?`{"filas":[{"nombre":"texto","marca":"A|F|J|","causa":"medica|tesis|servicio|comision|otros|","nota":"texto breve o vacío"}]}
Reglas para la marca: hora de llegada, firma, rúbrica, palomita (✓), "P", "A" o "•" = A (asistió). "F", "X", tache o "falta" = F. SV, guardia o servicio = J con causa servicio. ENCAM, encamado o enfermería = J con causa medica. Asesoría de tesis o ausente por tesis = J con causa tesis. Escolta o comisión toda la sesión = J con causa comision. Sin hora ni firma y sin justificación = F. Si no puedes leer la fila, marca "" y explica en nota. Retardos o salidas durante la clase: A y anota la hora en nota.`
  :IMP.tipo==="cal"?`{"filas":[{"nombre":"texto","matricula":"texto o vacío","examen":número 0-10 o null,"portafolio":número 0-3 o null,"participacion":número 0-1 o null}]}
"examen" es la calificación del examen en escala de 0 a 10 (no la ponderada al 60%). Si solo aparece la evaluación parcial total, deja examen en null y explica en "nota".`
  :`{"filas":[{"nombre":"texto","matricula":"texto o vacío","puntaje":número 0-100}]}`;
  return `Eres un capturista de la Mesa de Inglés de la Escuela Militar de Enfermería. ${ctx}
Extrae cada cadete del documento${texto?" (texto de hoja de cálculo abajo)":" (imágenes adjuntas: fotos de listas, pueden estar escritas a mano, inclinadas o con sombras)"}.${IMP.nfr>1?` Las ${IMP.nfr} imágenes son franjas consecutivas, de arriba abajo, de UNA misma hoja y se traslapan un poco: no repitas renglones.`:""} Responde SOLO con JSON con esta forma:
${esquema}
No inventes cadetes ni valores; omite encabezados, firmas de docentes y filas vacías. Copia el nombre tal como aparece.
Cadetes esperados (sirven para leer nombres difíciles): ${C.map(o=>o.n).join("; ")}.
${texto?"\nCONTENIDO DEL ARCHIVO:\n"+texto:""}`}
function csvRows(texto){return texto.split(/\r?\n/).map(l=>{const out=[];let cur="",q=false;for(const ch of l){if(ch==='"')q=!q;else if(ch===","&&!q){out.push(cur.trim());cur=""}else cur+=ch}out.push(cur.trim());return out})}
function heuristica(texto,C){const rows=csvRows(texto),out=[];let col={};
  rows.forEach(cells=>{const low=cells.map(c=>norm(c));
    if(low.some(c=>/nombre/.test(c))){col={};low.forEach((c,i)=>{if(/examen/.test(c)&&!/%|6\.0|pond/.test(c)&&col.e==null)col.e=i;if(/portafolio/.test(c))col.pt=i;if(/particip/.test(c))col.pa=i;if(/alcpt|puntaje|diagn/.test(c))col.al=i;if(/matr/.test(c))col.m=i});return}
    const ni=cells.findIndex(c=>/[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(c)&&match(c,null,C).o);if(ni<0)return;const nm=cells[ni];
    const nv=i=>{if(i==null)return null;const v=String(cells[i]||"").replace(",",".");return /^\d+(\.\d+)?$/.test(v)?Number(v):null};
    const after=cells.slice(ni+1).map(c=>c.replace(",",".")).filter(c=>/^\d+(\.\d+)?$/.test(c)).map(Number);
    if(IMP.tipo==="alcpt"){const v=col.al!=null?nv(col.al):after.filter(x=>x<=100).pop();if(v!=null)out.push({nombre:nm,matricula:col.m!=null?cells[col.m]:"",puntaje:v})}
    else if(IMP.tipo==="cal"){const e=col.e!=null?nv(col.e):null;out.push({nombre:nm,matricula:col.m!=null?cells[col.m]:"",examen:e,portafolio:nv(col.pt),participacion:nv(col.pa),nota:e==null?"No se encontró la columna del examen":""})}
    else{const tx=cells.slice(ni+1).join(" ").toUpperCase();const j=/\bSV\b|GUARDIA/.test(tx)?"servicio":/ENCAM/.test(tx)?"medica":/TESIS/.test(tx)?"tesis":"";
      out.push({nombre:nm,marca:j?"J":/\b(P|A)\b|\d{1,2}:\d{2}/.test(tx)?"A":"",causa:j,nota:""})}});return out}
async function leer(){if(!IMP.files.length){toast("Elige al menos un archivo");return}
  if(IMP.tipo==="asis"&&!IMP.fecha){toast("Indica la fecha del sábado");return}if(IMP.tipo==="alcpt"&&!IMP.lab.trim()){toast("Escribe la etiqueta del examen, por ejemplo: Nov 2026");return}
  const C=candidatos();if(!C.length){toast("No hay cadetes que correspondan a esa selección");return}
  IMP.busy=true;IMP.msg="Leyendo el archivo…";IMP.rows=null;vImp();
  try{const imgs=IMP.files.filter(isImg),docs=IMP.files.filter(f=>!isImg(f));const maxI=SAMPLE&&SAMPLE_LIM&&SAMPLE_LIM.images?SAMPLE_LIM.images.maxCount:0;
    let texto="";for(const f of docs){const r=await readAny(f,Math.max(0,maxI-imgs.length));if(r.text&&r.text.trim())texto+=`\n### ${f.name}\n`+r.text;imgs.push(...r.images);
      if(r.scanned&&!r.images.length&&!maxI)throw {code:"pdf_scan"}}
    texto=texto.slice(0,90000);if(!texto.trim()&&!imgs.length)throw {code:"empty"};
    let filas=null;
    if(SAMPLE){IMP.msg=imgs.length?"Claude está leyendo las imágenes (puede tardar hasta un minuto)…":"Claude está leyendo el archivo…";vImp();
      filas=[];const errs=[];const pick=r=>Array.isArray(r)?r:(r&&r.filas)||[];
      if(texto){IMP.nfr=0;filas.push(...pick(await SAMPLE.json(promptIA(C,texto),{modelTier:"complex",cache:false})))}
      if(imgs.length){if(!SAMPLE_LIM||!SAMPLE_LIM.images)throw {code:"images_unavailable"};const mx=SAMPLE_LIM.images.maxCount||1;
        for(let k=0;k<imgs.length;k++){IMP.msg=`Claude está leyendo la imagen ${k+1} de ${imgs.length} (hasta un minuto por imagen)…`;vImp();
          try{const parts=await franjas(imgs[k],Math.min(3,mx));IMP.nfr=parts.length;filas.push(...pick(await SAMPLE.json(promptIA(C,""),{modelTier:"complex",cache:false,images:parts})))}
          catch(e){console.error(e);if(e&&(e.code==="not_granted"||e.code==="rate_limited"))throw e;errs.push(`${imgs[k].name||"imagen "+(k+1)}: ${e.code==="img_bad"?"no se pudo abrir la imagen":e.code==="image_rejected"?"la imagen no es válida o es muy grande":"no se pudo leer"}`)}}}
      const seen=new Map();filas.forEach(f=>{if(!f||!f.nombre)return;const k=norm(f.nombre).replace(/\s+/g," ").trim(),o=seen.get(k);if(!o||(!o.marca&&f.marca))seen.set(k,f)});filas=[...seen.values()];
      IMP.errs=errs}
    else if(texto){filas=heuristica(texto,C)}
    else throw {code:"no_sample"};
    IMP.rows=filas.filter(f=>f&&f.nombre).map(f=>{const m=match(f.nombre,f.matricula,C);return {...f,oid:m.o?m.o.id:"",sug:m.sug?m.sug.id:"",sc:m.s,ok:!!m.o}});
    IMP.msg=(IMP.rows.length?"":"No se reconoció ningún renglón. Revisa que la foto esté completa, enfocada y con buena luz; si la lista es larga, toma una foto por mitad de hoja.")+(IMP.errs&&IMP.errs.length?" "+IMP.errs.join(" · "):"");IMP.errs=null;
  }catch(e){console.error(e);IMP.msg=errMsg(e)||(e.code==="pdf_scan"?"El PDF es escaneado y esta vista no puede leer imágenes. Usa el Excel o un PDF con texto.":e.code==="empty"?"El archivo no tiene texto legible.":e.code==="no_sample"?"Leer fotos requiere la lectura con Claude, que no está disponible en esta vista. Usa un archivo Excel, Word, CSV o PDF con texto.":e.code==="images_unavailable"?"Esta vista no permite leer imágenes. Usa un archivo Excel, Word, CSV o PDF con texto.":e.code==="not_granted"?"No se dio permiso para leer con Claude. Usa un archivo Excel o CSV, o vuelve a abrir la página y acepta el permiso.":e.code==="rate_limited"?"Se alcanzó el límite de lecturas. Espera unos minutos e inténtalo de nuevo.":e.code==="prompt_too_large"?"El archivo es demasiado grande. Sube una hoja o un grupo a la vez.":"No se pudo leer el archivo. Prueba con una foto más nítida o con el archivo Excel.")}
  IMP.busy=false;vImp()}
function actual(o){if(IMP.tipo==="asis"){const v=o.asis&&o.asis[IMP.fecha];return v?({P:"A",F:"F",J:"J"}[v]+(o.causa&&o.causa[IMP.fecha]?" · "+CAUSA_TXT[o.causa[IMP.fecha]]:"")):"—"}
  if(IMP.tipo==="cal"){const c=o.cal&&o.cal[IMP.p],t=ptot(c);return t==null?"—":`${c.e} / ${c.pt||0} / ${c.pa||0} = ${t.toFixed(2)}`}
  const h=(o.alcpt||[]).find(x=>x[0]===IMP.lab.trim());return h?String(h[1]):"—"}
function nuevo(r){if(IMP.tipo==="asis")return (r.marca||"—")+(r.causa?" · "+(CAUSA_TXT[r.causa]||r.causa):"");
  if(IMP.tipo==="cal"){if(r.examen==null)return "—";const t=ptot({e:r.examen,pt:r.portafolio,pa:r.participacion});return `${r.examen} / ${r.portafolio??0} / ${r.participacion??0} = ${t.toFixed(2)}`}
  return r.puntaje??"—"}
function vImp(){const C=all(),R=C.filter(inRem),grps=[...new Set(R.map(o=>`${o.a}|${o.rem.grupo||""}`))].sort();
  if(!IMP.fecha)IMP.fecha=S.cfg.sesiones[S.cfg.sesiones.length-1]||new Date().toISOString().slice(0,10);
  const ctx=IMP.tipo==="asis"?`<label class="hint">Fecha del sábado<input type="date" id="iF" value="${IMP.fecha}"></label>
    <label class="hint">Grupo de asesoría<select id="iGr"><option value="">Todos los del remedial</option>${grps.map(k=>{const [a,g]=k.split("|");return `<option value="${esc(k)}" ${IMP.grp===k?"selected":""}>${ANIO[a]} año · ${g?"grupo "+esc(g):"sin grupo"}</option>`}).join("")}</select></label>`
   :`<label class="hint">Año<select id="iA">${YRS().map(a=>`<option value="${a}" ${IMP.a===a?"selected":""}>${ANIO[a]} año</option>`).join("")}</select></label>`+
    (IMP.tipo==="cal"?`<label class="hint">Grupo<select id="iG"><option value="">Todos</option>${groups(IMP.a).map(g=>`<option value="${esc(g)}" ${IMP.g===g?"selected":""}>Grupo ${esc(g)}</option>`).join("")}</select></label>
    <label class="hint">Parcial<select id="iP">${PARC.map(([k,t])=>`<option value="${k}" ${IMP.p===k?"selected":""}>${t}</option>`).join("")}</select></label>`
    :`<label class="hint">Etiqueta del examen<input id="iL" placeholder="Ej. Nov 2026" value="${esc(IMP.lab)}"></label>`);
  const rows=IMP.rows||[],C2=candidatos(),sel=rows.filter(r=>r.ok&&r.oid).length;
  VW.innerHTML=`<h2>Importar desde imágenes o archivos</h2>
  <p class="lead">Sube la foto de una lista o el archivo (Excel, CSV, Word, PowerPoint, PDF, MP3 o WAV). La app lee el archivo en este dispositivo y te muestra cada cambio antes de guardarlo; nada se actualiza hasta que oprimas <b>Aplicar cambios</b>.</p>
  ${S.canWrite?"":`<p class="notice">Tienes acceso de solo lectura: puedes revisar, pero no aplicar cambios.</p>`}
  <div class="impbox">
    <div class="bar"><label class="hint">Qué contiene<select id="iT">${TIPOS.map(([k,t])=>`<option value="${k}" ${IMP.tipo===k?"selected":""}>${t}</option>`).join("")}</select></label>${ctx}</div>
    <label class="drop" id="drop"><input type="file" id="iFile" multiple accept="${ACCEPT}">
      <b>${IMP.files.length?IMP.files.map(f=>esc(f.name)).join(" · "):"Elige o arrastra fotos (JPG, PNG), PDF, Excel, Word, PowerPoint, MP3 o WAV"}</b>
      <span class="hint">Excel, CSV, Word y PowerPoint se leen completos. Fotos y PDF escaneados se leen con reconocimiento de texto; el audio se transcribe con errores y queda para revisión.</span></label>
    <div class="acts" style="justify-content:flex-start"><button class="btn" id="iRead" ${IMP.busy?"disabled":""}>${IMP.busy?"Leyendo…":"Leer archivo"}</button>${IMP.files.length?`<button class="btn ghost" id="iClr">Quitar archivos</button>`:""}</div>
    ${IMP.msg?`<p class="hint" role="status">${esc(IMP.msg)}</p>`:""}
  </div>
  ${rows.length?`<h2>Revisión (${rows.length} filas leídas)</h2>
  <p class="hint">Corrige el cadete cuando la lectura no coincida y desmarca lo que no quieras aplicar. Las filas en amarillo no se pudieron asociar.</p>
  <div class="tscroll"><table class="tbl"><thead><tr><th><input type="checkbox" id="iAll" aria-label="Seleccionar todas" ${sel===rows.length?"checked":""}></th><th>Leído en el documento</th><th>Cadete en el seguimiento</th><th>Actual</th><th>Nuevo</th><th>Nota</th></tr></thead><tbody>
  ${rows.map((r,i)=>`<tr class="${r.oid?"":"unm"}"><td><input type="checkbox" data-ok="${i}" ${r.ok&&r.oid?"checked":""} ${r.oid?"":"disabled"} aria-label="Aplicar fila ${i+1}"></td><td>${esc(r.nombre)}${r.matricula?`<span class="sub">${esc(r.matricula)}</span>`:""}</td>
  <td><select data-oid="${i}" aria-label="Cadete para ${esc(r.nombre)}"><option value="">— Ignorar —</option>${C2.slice().sort((x,y)=>sim(r.nombre,y.n)-sim(r.nombre,x.n)).slice(0,12).map(o=>`<option value="${o.id}" ${r.oid===o.id?"selected":""}>${esc(o.n)}</option>`).join("")}</select></td>
  <td>${r.oid?esc(actual(S.items.get(r.oid))):"—"}</td><td><b>${esc(nuevo(r))}</b></td><td class="sub">${esc(r.nota||"")}</td></tr>`).join("")}</tbody></table></div>
  <div class="acts" style="justify-content:flex-start;margin-top:10px"><button class="btn" id="iApply" ${!sel||!S.canWrite?"disabled":""}>Aplicar cambios (${sel})</button><button class="btn ghost" id="iCancel">Descartar lectura</button></div>`:""}
  <h2>Importaciones anteriores</h2>${IMP.log.length?`<div class="tscroll"><table class="tbl"><thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th class="num">Aplicados</th><th>Archivo</th></tr></thead><tbody>
  ${IMP.log.map(l=>`<tr><td>${esc(new Date(l.at).toLocaleString("es-MX",{dateStyle:"short",timeStyle:"short"}))}</td><td>${esc((TIPOS.find(t=>t[0]===l.tipo)||[,l.tipo])[1])}</td><td>${esc(l.detalle||"")}</td><td class="num">${l.aplicados}</td>
  <td>${(l.archivos||[]).map((a,k)=>a.url&&!a.fid?`<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.nombre)}</a>`:a.fid?`<a href="#" data-imopen="${esc(l.id||"")}|${k}">${esc(a.nombre)}</a>`:esc(a.nombre)).join("<br>")}</td></tr>`).join("")}</tbody></table></div>`:`<p class="hint">Todavía no hay importaciones.</p>`}`;
  $("#iT").onchange=e=>{IMP.tipo=e.target.value;IMP.rows=null;IMP.msg="";vImp()};
  const on=(id,k,re)=>{const el=$(id);if(el)el.onchange=e=>{IMP[k]=e.target.value;if(re)IMP.g="";IMP.rows=null;vImp()}};
  on("#iF","fecha");on("#iGr","grp");on("#iA","a",true);on("#iG","g");on("#iP","p");const lb=$("#iL");if(lb)lb.oninput=e=>{IMP.lab=e.target.value};
  $("#iFile").onchange=e=>{IMP.files=[...e.target.files];IMP.rows=null;IMP.msg="";vImp()};
  const dr=$("#drop");dr.ondragover=e=>{e.preventDefault();dr.classList.add("over")};dr.ondragleave=()=>dr.classList.remove("over");
  dr.ondrop=e=>{e.preventDefault();IMP.files=[...e.dataTransfer.files];IMP.rows=null;IMP.msg="";vImp()};
  $("#iRead").onclick=leer;VW.querySelectorAll("[data-imopen]").forEach(x=>x.onclick=ev=>{ev.preventDefault();const [lid,k]=x.dataset.imopen.split("|"),l=IMP.log.find(z=>z.id===lid);if(l&&l.archivos[+k])abrirArchivo(l.archivos[+k])});const cl=$("#iClr");if(cl)cl.onclick=()=>{IMP.files=[];IMP.rows=null;IMP.msg="";vImp()};
  VW.querySelectorAll("[data-ok]").forEach(c=>c.onchange=()=>{IMP.rows[+c.dataset.ok].ok=c.checked;vImp()});
  VW.querySelectorAll("[data-oid]").forEach(s=>s.onchange=()=>{const r=IMP.rows[+s.dataset.oid];r.oid=s.value;r.ok=!!s.value;vImp()});
  const al=$("#iAll");if(al)al.onchange=()=>{IMP.rows.forEach(r=>r.ok=al.checked&&!!r.oid);vImp()};
  const ap=$("#iApply");if(ap)ap.onclick=aplicar;const ca=$("#iCancel");if(ca)ca.onclick=()=>{IMP.rows=null;vImp()}}
async function aplicar(){const R=IMP.rows.filter(r=>r.ok&&r.oid),seen=new Set(),leidos=IMP.rows.length;let n=0;
  if(IMP.tipo==="asis"&&!S.cfg.sesiones.includes(IMP.fecha)){S.cfg.sesiones=[...S.cfg.sesiones,IMP.fecha].sort();saveCfg()}
  R.forEach(r=>{if(seen.has(r.oid))return;seen.add(r.oid);const o=clone(S.items.get(r.oid));
    if(IMP.tipo==="asis"){const v={A:"P",F:"F",J:"J"}[r.marca];if(!v)return;o.asis={...(o.asis||{}),[IMP.fecha]:v};o.causa={...(o.causa||{})};
      if((v==="F"||v==="J")&&r.causa&&CAUSA_TXT[r.causa])o.causa[IMP.fecha]=r.causa;else if(v==="P")delete o.causa[IMP.fecha];
      if(r.nota){const f=fmtD(IMP.fecha);o.obs=((o.obs||"")+` ${f.d} ${f.m}: ${r.nota}`).trim()}}
    else if(IMP.tipo==="cal"){if(r.examen==null)return;const cl=(v,m)=>v==null||v===""?"":Math.min(m,Math.max(0,Number(v)));o.cal={...(o.cal||{}),[IMP.p]:{e:cl(r.examen,10),pt:cl(r.portafolio,3),pa:cl(r.participacion,1)}}}
    else{if(r.puntaje==null)return;const lab=IMP.lab.trim(),a=(o.alcpt||[]).filter(x=>x[0]!==lab);a.push([lab,Math.round(Number(r.puntaje))]);o.alcpt=a}
    saveItem(o,true);n++});
  const archivos=[];for(const f of IMP.files){let r={};try{r=await guardarArchivo(f)}catch(e){console.warn("archivo",e)}archivos.push({nombre:f.name,...r})}
  const det=IMP.tipo==="asis"?`Sábado ${IMP.fecha}${IMP.grp?" · "+IMP.grp.replace("|"," año · grupo "):""}`:IMP.tipo==="cal"?`${ANIO[IMP.a]} año${IMP.g?" · grupo "+IMP.g:""} · ${PARC.find(p=>p[0]===IMP.p)[1]}`:`${ANIO[IMP.a]} año · ${IMP.lab}`;
  if(S.db){const id="i"+Date.now().toString(36);write(id,()=>S.db.collection("importaciones").doc(id).set({tipo:IMP.tipo,detalle:det,aplicados:n,leidos,archivos,at:new Date().toISOString()}))}
  IMP.rows=null;IMP.files=[];IMP.msg=`Se aplicaron ${n} cambio${n===1?"":"s"}.`;render();toast(`${n} cambio${n===1?"":"s"} aplicado${n===1?"":"s"}`)}

/* ---------- descarga de lo seleccionado ---------- */
const SECS=[["datos","Datos del cadete"],["alcpt","ALCPT y diagnóstico"],["cal","Calificaciones"],["rem","Remedial"],["asis","Asistencia sabatina"],["obs","Observaciones"]];
let DLSET=null;
function openDl(L,titulo){DLSET=L;$("#dlTitle").textContent=titulo;$("#dlCount").textContent=`${L.length} cadete${L.length===1?"":"s"}`;
  $("#dlSecs").innerHTML=SECS.map(([k,t])=>`<label class="chk"><input type="checkbox" value="${k}" checked> ${t}</label>`).join("");$("#dDl").showModal()}
$("#dlGo").onclick=()=>{const secs=[...document.querySelectorAll("#dlSecs input:checked")].map(i=>i.value);if(!secs.length){toast("Elige al menos una sección");return}$("#dDl").close();csv(DLSET,secs)};
$("#dlCancel").onclick=()=>$("#dDl").close();

/* no redibujar mientras alguien escribe en la vista */
function typing(){const a=document.activeElement;return !!(a&&VW.contains(a)&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName))}
VW.addEventListener("focusout",()=>setTimeout(()=>{if(S.dirty&&!typing()){S.dirty=false;render()}},250));
/* ---------- conexión ---------- */
(async()=>{
  if(!window.claude||!window.claude.use){conn("Sin conexión","",true);notice("Vista sin conexión a la base: no hay datos que mostrar.");S.loaded=true;render();return}
  const [db,user]=await Promise.all([window.claude.use("db"),window.claude.use("user")]);
  if(!db){conn("Sin conexión","",true);notice("No se pudo abrir la base local de este dispositivo.");S.loaded=true;render();return}
  S.db=db;
  Promise.all([window.claude.use("sample"),window.claude.use("assets")]).then(async([s,a])=>{SAMPLE=s;ASSETS=a;if(s){try{SAMPLE_LIM=await s.limits()}catch(e){}}if(S.view==="imp")render()});
  db.collection("importaciones").onSnapshot(sn=>{IMP.log=sn.docs.map(d=>({id:d.id,...d.data()})).sort((x,y)=>String(y.at).localeCompare(String(x.at)));if(S.view==="imp"&&!typing())render()},()=>{});
  if(user){const w=await user.can("data.write");if(w===false){S.canWrite=false;conn("Solo lectura","Puedes consultar, no editar",true);notice("Tienes acceso de solo lectura a este seguimiento.")}}
  db.doc("ajustes/general").onSnapshot(s=>{if(s.exists){const d=s.data();S.cfg={...S.cfg,...d,sesiones:[...(d.sesiones||[])],minimo:d.minimo??6,riesgo:d.riesgo??2};render()}},()=>{});
  db.collection("alumnos").onSnapshot(snap=>{if(S.canWrite)conn("Guardado en línea",`${snap.docs.length} cadetes · cambios al instante`);const m=new Map();snap.docs.forEach(d=>m.set(d.id,{id:d.id,...d.data()}));S.items=m;S.loaded=true;
    if($("#dFicha").open&&document.activeElement&&document.activeElement.closest("#dFicha"))return;
    if(typing()){S.dirty=true;return}render()},()=>notice("Se perdió la conexión con la base. Recarga la página."));
})();

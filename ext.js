/* Seguimiento de inglés · réplica local: secciones nuevas.
   ALC y ALCPT, Remedial (expedientes, re-evaluación, historial), Seguimiento EME (kárdex),
   lectura local de archivos para Importar, respaldos y ajustes extra. */
(function (G) {
"use strict";
const VER = "1.0";
const MES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const MESL = {ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11,jan:0,apr:3,aug:7,dec:11};
const DEF = {
  ciclo: "2026-2027", semestre: "1",
  escalaAlcpt: [{min:0,max:29,c:"#C6334A",t:"Remedial obligatorio"},{min:30,max:49,c:"#D98200",t:"Riesgo: candidato a remedial"},{min:50,max:69,c:"#2762C8",t:"En desarrollo"},{min:70,max:100,c:"#11794B",t:"Meta alcanzada"}],
  escalaAlc: [{min:0,max:59,c:"#C6334A",t:"Remedial obligatorio"},{min:60,max:69,c:"#D98200",t:"Riesgo"},{min:70,max:84,c:"#2762C8",t:"Suficiente"},{min:85,max:100,c:"#11794B",t:"Sobresaliente"}],
  planAlc: [{a:"1",sem:"2",libros:"4-5"},{a:"2",sem:"1",libros:"6-7"},{a:"2",sem:"2",libros:"8-9"},{a:"3",sem:"1",libros:"10-11"},{a:"3",sem:"2",libros:"12-13"},{a:"4",sem:"1",libros:"14-15"},{a:"4",sem:"2",libros:"16-17"}]
};
const TIPO_ALCPT = [["diagnostico","Diagnóstico"],["periodo","Periodo"],["final","Final"],["seguimiento","Seguimiento"]];
const TIPO_ALC = [["p1","Examen parcial 1"],["p2","Examen parcial 2"],["p3","Examen parcial 3"],["final","Examen final del libro"]];
const REM_EST = [["curso","En curso"],["aprobado","Aprobado"],["noaprobado","No aprobado"]];
const REM_TXT_ALL = {curso:"En curso",aprobado:"Aprobado",noaprobado:"No aprobado",baja:"Baja por otro motivo"};
const cfg = k => (S.cfg && S.cfg[k] != null ? S.cfg[k] : DEF[k]);
const everyone = () => [...S.items.values()];
const sitLabel = o => (o.eg ? (o.estatus && o.estatus !== "Egresado" ? o.estatus : "Egresado") : grpLabel(o));
const hoy = () => isoL(new Date());
const nv = v => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const avg = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((s, b) => s + b, 0) / v.length : null; };
const f1 = v => (v == null ? "—" : (Math.round(v * 10) / 10).toString());
G.ReplicaIng = { DEF, cfg, VER };

/* ---------- escala de colores (semáforo de remedial) ---------- */
function banda(v, which) { if (v == null) return null; const E = cfg(which === "alc" ? "escalaAlc" : "escalaAlcpt"); return E.find(b => v >= b.min && v <= b.max) || null; }
function chipEsc(v, which) { const b = banda(v, which); if (v == null) return `<span class="esc nil">—</span>`;
  return `<span class="esc" style="--c:${esc(b ? b.c : "#888")}" title="${esc(b ? b.t : "Fuera de la escala")}">${esc(String(v))}</span>`; }
G.ReplicaIng.banda = banda; G.ReplicaIng.chipEsc = chipEsc;

/* ---------- etiquetas de ALCPT ---------- */
function labDate(l) { const m = norm(l).match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s*-?\s*(\d{4})/); return m ? new Date(+m[2], MESL[m[1]], 15) : null; }
function labKey(l) { const d = labDate(l); return d ? d.getTime() : 9e15; }
function cicloOf(d) { if (!d) return ""; const y = d.getFullYear(), m = d.getMonth(); return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; }
function alcptList(o) { const L = (o.alcpt || []).map(([l, v]) => ({ l, v, m: (o.alcptMeta || {})[l] || {} })); L.sort((a, b) => labKey(a.l) - labKey(b.l)); return L; }
function allLabels() { const s = new Set(); all().forEach(o => (o.alcpt || []).forEach(x => s.add(x[0]))); return [...s].sort((a, b) => labKey(a) - labKey(b)); }
G.ReplicaIng.alcptList = alcptList; G.ReplicaIng.allLabels = allLabels; G.ReplicaIng.labKey = labKey; G.ReplicaIng.cicloOf = cicloOf; G.ReplicaIng.labDate = labDate;

/* ---------- ALC por libro ---------- */
function librosDe(a, sem) { const p = cfg("planAlc").filter(x => x.a === a && (!sem || x.sem === sem)); const out = [];
  p.forEach(x => { const m = String(x.libros).match(/(\d+)\s*[-–a]\s*(\d+)/); if (m) for (let i = +m[1]; i <= +m[2]; i++) out.push(String(i)); else String(x.libros).split(/[ ,y]+/).filter(Boolean).forEach(b => out.push(b)); });
  return [...new Set(out)]; }
function alcAvg(o, filt) { const v = (o.alc || []).filter(x => !filt || filt(x)).map(x => nv(x.pts)); return avg(v); }
G.ReplicaIng.librosDe = librosDe; G.ReplicaIng.alcAvg = alcAvg;

/* ---------- vista ALC y ALCPT ---------- */
const AX = { tab: "alcpt", a: "", g: "", lab: "", nlab: "", ntipo: "periodo", nfecha: "", libro: "", tipo: "p1", fecha: "", sem: "" };
function subnav(id, items, cur) { return `<div class="seg2 subnav" role="group" aria-label="Apartados" id="${id}">${items.map(([k, t]) => `<button type="button" data-sub="${k}" aria-pressed="${cur === k}">${t}</button>`).join("")}</div>`; }
function rosterSel() { const ys = YRS(); if (!AX.a || !ys.includes(AX.a)) AX.a = ys[ys.length - 1] || "4"; const gs = groups(AX.a); if (AX.g && !gs.includes(AX.g)) AX.g = "";
  return `<select id="axA" aria-label="Año">${ys.map(a => `<option value="${a}" ${AX.a === a ? "selected" : ""}>${ANIO[a]} año</option>`).join("")}</select>
  <select id="axG" aria-label="Grupo"><option value="">Todos los grupos</option>${gs.map(g => `<option value="${esc(g)}" ${AX.g === g ? "selected" : ""}>Grupo ${esc(g)}</option>`).join("")}</select>`; }
function initAX() { const ys = YRS(); if (!AX.a || !ys.includes(AX.a)) AX.a = ys[ys.length - 1] || "4"; if (AX.g && !groups(AX.a).includes(AX.g)) AX.g = ""; }
function roster() { initAX(); return all().filter(o => o.a === AX.a && (!AX.g || String(o.g) === AX.g)).sort((x, y) => String(x.g).localeCompare(String(y.g)) || x.n.localeCompare(y.n, "es")); }
function escLeg(which) { return `<p class="legend esc-leg">${cfg(which === "alc" ? "escalaAlc" : "escalaAlcpt").map(b => `<span><i style="background:${esc(b.c)}"></i>${b.min}–${b.max}: ${esc(b.t)}</span>`).join("")}</p>`; }
function distHTML(vals, which) { const E = cfg(which === "alc" ? "escalaAlc" : "escalaAlcpt"), n = vals.length;
  if (!n) return `<p class="hint">Sin puntajes capturados.</p>`;
  return `<div class="escbar" role="img" aria-label="Distribución por escala">${E.map(b => { const k = vals.filter(v => v >= b.min && v <= b.max).length; return k ? `<i style="width:${k * 100 / n}%;background:${esc(b.c)}" title="${esc(b.t)}: ${k}">${k}</i>` : ""; }).join("")}</div>`; }

function vAlc() {
  VW.innerHTML = `<h2>Calificaciones ALC y ALCPT</h2>
  <p class="lead">Captura los puntajes de ALCPT (diagnóstico, periodos, finales y seguimiento) y de los exámenes ALC de cada libro. El color sigue la escala de Ajustes. La forma del examen solo se anota después de aplicarlo.</p>
  ${subnav("axSub", [["alcpt", "ALCPT"], ["alc", "ALC por libro"], ["res", "Promedios"], ["plan", "Plan de libros"]], AX.tab)}
  <div id="axBody"></div>`;
  VW.querySelectorAll("#axSub [data-sub]").forEach(b => b.onclick = () => { AX.tab = b.dataset.sub; vAlc(); });
  ({ alcpt: axAlcpt, alc: axAlc, res: axRes, plan: axPlan })[AX.tab]();
}
function bindRoster(fn) { const a = $("#axA"), g = $("#axG"); if (a) a.onchange = e => { AX.a = e.target.value; AX.g = ""; fn(); }; if (g) g.onchange = e => { AX.g = e.target.value; fn(); }; }

function axAlcpt() {
  const B = $("#axBody"), labs = allLabels(); const opts = [["__diag", "Diagnóstico 21 sep. 2026"], ...labs.map(l => [l, "ALCPT " + l])];
  if (!AX.lab || (AX.lab !== "__new" && !opts.some(o => o[0] === AX.lab))) AX.lab = labs[labs.length - 1] || "__diag";
  const L = roster(), isNew = AX.lab === "__new", isD = AX.lab === "__diag";
  const get = o => isD ? { v: o.diag, m: o.diagMeta || {} } : (() => { const h = (o.alcpt || []).find(x => x[0] === AX.lab); return { v: h ? h[1] : null, m: ((o.alcptMeta || {})[AX.lab]) || {} }; })();
  const vals = isNew ? [] : L.filter(o => !o.ex).map(o => nv(get(o).v)).filter(v => v != null);
  B.innerHTML = `<div class="bar">${rosterSel()}
    <select id="axL" aria-label="Examen">${opts.map(([k, t]) => `<option value="${esc(k)}" ${AX.lab === k ? "selected" : ""}>${esc(t)}</option>`).join("")}<option value="__new" ${isNew ? "selected" : ""}>+ Registrar examen nuevo…</option></select></div>
  ${isNew ? `<div class="impbox"><div class="bar"><label class="hint">Etiqueta (mes y año)<input id="axNL" placeholder="Ej. Nov 2026" value="${esc(AX.nlab)}"></label>
    <label class="hint">Tipo<select id="axNT">${TIPO_ALCPT.map(([k, t]) => `<option value="${k}" ${AX.ntipo === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="hint">Fecha de aplicación<input type="date" id="axNF" value="${esc(AX.nfecha)}"></label>
    <button class="btn" id="axNOk">Crear y capturar</button></div><p class="hint">La etiqueta agrupa los puntajes de todos los cadetes que presentaron ese examen.</p></div>` : `
  <section class="gmon"><div class="gm-k"><em>Promedio</em><b>${f1(avg(vals))}</b></div><div class="gm-k"><em>Capturados</em><b>${vals.length}<small>/${L.filter(o => !o.ex).length}</small></b></div>
    <div class="gm-k"><em>Mínimo · máximo</em><b>${vals.length ? Math.min(...vals) + "<small> · " + Math.max(...vals) + "</small>" : "—"}</b></div><div class="gm-h esc-h">${distHTML(vals, "alcpt")}</div></section>
  ${escLeg("alcpt")}
  <div class="tscroll"><table class="tbl cap"><thead><tr><th>Cadete</th><th class="num">Puntaje (0–100)</th><th>Escala</th><th>Fecha</th><th>Forma (después de aplicar)</th><th>Tipo</th></tr></thead><tbody>
  ${L.map(o => { const x = get(o), v = nv(x.v), b = banda(v, "alcpt"); return `<tr data-row="${o.id}"><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}${o.ex ? " · exento" : ""}</span></td>
    <td class="num"><input type="number" inputmode="numeric" min="0" max="100" step="1" data-f="v" value="${v ?? ""}" aria-label="Puntaje de ${esc(o.n)}"></td>
    <td>${v == null ? "—" : `<span class="esc" style="--c:${esc(b ? b.c : "#888")}">${esc(b ? b.t : "fuera de escala")}</span>`}</td>
    <td><input type="date" data-f="fecha" value="${esc(x.m.fecha || "")}" aria-label="Fecha de ${esc(o.n)}"></td>
    <td><input data-f="forma" value="${esc(x.m.forma || "")}" ${v == null ? "disabled placeholder=\"Se anota al aplicar\"" : "placeholder=\"Forma aplicada\""} aria-label="Forma aplicada a ${esc(o.n)}" style="max-width:130px"></td>
    <td>${isD ? "Diagnóstico" : `<select data-f="tipo" aria-label="Tipo">${TIPO_ALCPT.map(([k, t]) => `<option value="${k}" ${(x.m.tipo || "periodo") === k ? "selected" : ""}>${t}</option>`).join("")}</select>`}</td></tr>`; }).join("")}
  </tbody></table></div>`}`;
  bindRoster(axAlcpt);
  $("#axL").onchange = e => { AX.lab = e.target.value; axAlcpt(); };
  if (isNew) {
    $("#axNL").oninput = e => AX.nlab = e.target.value; $("#axNT").onchange = e => AX.ntipo = e.target.value; $("#axNF").onchange = e => AX.nfecha = e.target.value;
    $("#axNOk").onclick = () => { const l = AX.nlab.trim(); if (!l) { toast("Escribe la etiqueta, por ejemplo: Nov 2026"); return; } if (!labDate(l)) { toast("La etiqueta debe llevar mes y año, por ejemplo: Nov 2026"); return; }
      AX.pend = { l, tipo: AX.ntipo, fecha: AX.nfecha }; AX.lab = l; AX.nlab = ""; toast("Examen listo para capturar"); axAlcptPend(); };
  }
  B.querySelectorAll("tr[data-row] [data-f]").forEach(inp => inp.onchange = () => {
    const tr = inp.closest("tr"), o = clone(S.items.get(tr.dataset.row)); const val = f => { const el = tr.querySelector(`[data-f="${f}"]`); return el ? el.value : ""; };
    let v = val("v"); v = v === "" ? null : Math.max(0, Math.min(100, Math.round(Number(v)))); if (v != null && isNaN(v)) return;
    const meta = { fecha: val("fecha"), forma: v == null ? "" : val("forma").trim(), tipo: isD ? "diagnostico" : (val("tipo") || "periodo") };
    if (isD) { o.diag = v; o.diagMeta = meta; }
    else { const a = (o.alcpt || []).filter(x => x[0] !== AX.lab); if (v != null) a.push([AX.lab, v]); a.sort((p, q) => labKey(p[0]) - labKey(q[0])); o.alcpt = a;
      o.alcptMeta = { ...(o.alcptMeta || {}) }; if (v != null) o.alcptMeta[AX.lab] = meta; else delete o.alcptMeta[AX.lab]; }
    saveItem(o, true); if (inp.dataset.f === "v") axAlcpt();
  });
  B.querySelectorAll(".nameb").forEach(b => b.onclick = () => openFicha(b.dataset.id));
}
/* examen nuevo todavía sin puntajes: se muestra la captura con la etiqueta pendiente */
function axAlcptPend() { const p = AX.pend; if (!p) return axAlcpt();
  const L = roster(); AX.lab = p.l;
  /* se registra la etiqueta al guardar el primer puntaje */
  const B = $("#axBody");
  B.innerHTML = `<div class="bar">${rosterSel()}<span class="badge b-rem">ALCPT ${esc(p.l)} · ${esc((TIPO_ALCPT.find(t => t[0] === p.tipo) || [, ""])[1])}</span><button class="btn ghost small" id="axBack">Volver</button></div>
  ${escLeg("alcpt")}<div class="tscroll"><table class="tbl cap"><thead><tr><th>Cadete</th><th class="num">Puntaje (0–100)</th><th>Forma (después de aplicar)</th></tr></thead><tbody>
  ${L.map(o => `<tr data-row="${o.id}"><td>${esc(o.n)}<span class="sub">${grpLabel(o)}</span></td><td class="num"><input type="number" min="0" max="100" data-f="v" aria-label="Puntaje de ${esc(o.n)}"></td><td><input data-f="forma" placeholder="Se anota al aplicar" style="max-width:130px" disabled title="Primero captura el puntaje" aria-label="Forma aplicada a ${esc(o.n)}"></td></tr>`).join("")}</tbody></table></div>`;
  bindRoster(axAlcptPend); $("#axBack").onclick = () => { AX.pend = null; AX.lab = ""; axAlcpt(); };
  B.querySelectorAll("tr[data-row] input").forEach(inp => inp.onchange = () => { const tr = inp.closest("tr"), o = clone(S.items.get(tr.dataset.row));
    const v = nv(tr.querySelector('[data-f="v"]').value); if (v == null) return; const a = (o.alcpt || []).filter(x => x[0] !== p.l); a.push([p.l, Math.max(0, Math.min(100, Math.round(v)))]); a.sort((x, y) => labKey(x[0]) - labKey(y[0]));
    o.alcpt = a; o.alcptMeta = { ...(o.alcptMeta || {}), [p.l]: { tipo: p.tipo, fecha: p.fecha, forma: tr.querySelector('[data-f="forma"]').value.trim() } }; saveItem(o, true); AX.pend = null; AX.lab = p.l; toast("Puntaje guardado"); axAlcpt(); });
}

function axAlc() {
  const B = $("#axBody"); rosterSel(); const sem = AX.sem || cfg("semestre"); const libs = librosDe(AX.a, sem); const allLib = librosDe(AX.a);
  if (!AX.libro || ![...libs, ...allLib].includes(AX.libro)) AX.libro = libs[0] || allLib[0] || "";
  const L = roster(), ciclo = cfg("ciclo");
  const find = o => (o.alc || []).find(x => x.libro === AX.libro && x.tipo === AX.tipo && (x.ciclo || ciclo) === ciclo) || null;
  const vals = L.filter(o => !o.ex).map(o => { const x = find(o); return x ? nv(x.pts) : null; }).filter(v => v != null);
  B.innerHTML = `<div class="bar">${rosterSel()}
    <select id="axS" aria-label="Semestre">${["1", "2"].map(s => `<option value="${s}" ${sem === s ? "selected" : ""}>${s === "1" ? "1/er." : "2/o."} semestre</option>`).join("")}</select>
    <select id="axLb" aria-label="Libro">${(allLib.length ? allLib : [""]).map(b => `<option value="${esc(b)}" ${AX.libro === b ? "selected" : ""}>${b ? "Libro " + esc(b) + (libs.includes(b) ? "" : " (otro semestre)") : "Sin libros en el plan"}</option>`).join("")}</select>
    <select id="axT" aria-label="Examen">${TIPO_ALC.map(([k, t]) => `<option value="${k}" ${AX.tipo === k ? "selected" : ""}>${t}</option>`).join("")}</select>
    <label class="hint">Fecha<input type="date" id="axF" value="${esc(AX.fecha)}"></label><span class="hint">Ciclo ${esc(ciclo)}</span></div>
  ${allLib.length ? "" : `<p class="notice">El plan de libros no tiene libros para ${ANIO[AX.a]} año. Revísalo en Ajustes.</p>`}
  <section class="gmon"><div class="gm-k"><em>Promedio</em><b>${f1(avg(vals))}</b></div><div class="gm-k"><em>Capturados</em><b>${vals.length}<small>/${L.filter(o => !o.ex).length}</small></b></div>
    <div class="gm-k"><em>Mínimo · máximo</em><b>${vals.length ? Math.min(...vals) + "<small> · " + Math.max(...vals) + "</small>" : "—"}</b></div><div class="gm-h esc-h">${distHTML(vals, "alc")}</div></section>
  ${escLeg("alc")}
  <div class="tscroll"><table class="tbl cap"><thead><tr><th>Cadete</th><th class="num">Puntaje (0–100)</th><th>Escala</th><th>Forma (después de aplicar)</th><th class="num">Promedio ALC</th><th>Remedial</th></tr></thead><tbody>
  ${L.map(o => { const x = find(o) || {}, v = nv(x.pts), b = banda(v, "alc"), pa = alcAvg(o); return `<tr data-row="${o.id}"><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}${o.ex ? " · exento" : ""}</span></td>
    <td class="num"><input type="number" inputmode="numeric" min="0" max="100" step="1" data-f="pts" value="${v ?? ""}" aria-label="Puntaje ALC de ${esc(o.n)}"></td>
    <td>${v == null ? "—" : `<span class="esc" style="--c:${esc(b ? b.c : "#888")}">${esc(b ? b.t : "fuera de escala")}</span>`}</td>
    <td><input data-f="forma" value="${esc(x.forma || "")}" ${v == null ? "disabled placeholder=\"Se anota al aplicar\"" : "placeholder=\"Forma aplicada\""} style="max-width:130px" aria-label="Forma aplicada a ${esc(o.n)}"></td>
    <td class="num">${f1(pa)}</td><td>${inRem(o) ? `<span class="badge b-rem">En remedial</span>` : (b && cfg("escalaAlc")[0] === b ? `<button class="btn small ghost" data-inscr="${o.id}">Inscribir</button>` : "")}</td></tr>`; }).join("")}
  </tbody></table></div>`;
  bindRoster(axAlc);
  $("#axS").onchange = e => { AX.sem = e.target.value; AX.libro = ""; axAlc(); }; $("#axLb").onchange = e => { AX.libro = e.target.value; axAlc(); };
  $("#axT").onchange = e => { AX.tipo = e.target.value; axAlc(); }; $("#axF").onchange = e => { AX.fecha = e.target.value; };
  B.querySelectorAll("tr[data-row] input").forEach(inp => inp.onchange = () => {
    const tr = inp.closest("tr"), o = clone(S.items.get(tr.dataset.row)); let v = tr.querySelector('[data-f="pts"]').value; v = v === "" ? null : Math.max(0, Math.min(100, Math.round(Number(v)))); if (v != null && isNaN(v)) return;
    const rest = (o.alc || []).filter(x => !(x.libro === AX.libro && x.tipo === AX.tipo && (x.ciclo || ciclo) === ciclo)); const prev = find(o) || {};
    if (v != null) rest.push({ id: prev.id || "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ciclo, a: o.a, sem, libro: AX.libro, tipo: AX.tipo, fecha: AX.fecha || prev.fecha || "", forma: tr.querySelector('[data-f="forma"]').value.trim(), pts: v });
    o.alc = rest; saveItem(o, true); if (inp.dataset.f === "pts") axAlc();
  });
  B.querySelectorAll("[data-inscr]").forEach(b => b.onclick = () => { const o = S.items.get(b.dataset.inscr); inscribirMotivo(o, `ALC libro ${AX.libro} (${(TIPO_ALC.find(t => t[0] === AX.tipo) || [, ""])[1]}): ${(find(o) || {}).pts}`, (find(o) || {}).pts); toast("Inscrito al remedial"); axAlc(); });
  B.querySelectorAll(".nameb").forEach(b => b.onclick = () => openFicha(b.dataset.id));
}
function axRes() {
  const B = $("#axBody"), labs = allLabels(), ys = YRS();
  const rows = []; ys.forEach(a => { const gs = groups(a); [...gs, null].forEach(g => { const L = all().filter(o => o.a === a && !o.ex && (g == null || String(o.g) === g));
    rows.push({ a, g, n: L.length, d: g == null ? "" : ((L.find(o => o.d) || {}).d || ""), diag: avg(L.map(o => nv(o.diag))), labs: labs.map(l => avg(L.map(o => { const h = (o.alcpt || []).find(x => x[0] === l); return h ? nv(h[1]) : null; }))), alc: avg(L.map(o => alcAvg(o))), tot: g == null }); }); });
  const showLabs = labs.filter((l, i) => rows.some(r => r.labs[i] != null));
  B.innerHTML = `<p class="hint">Promedios sin exentos. ALCPT en escala 0–100; ALC es el promedio de todos los exámenes de libro capturados.</p>
  <div class="tscroll"><table class="tbl"><thead><tr><th>Año</th><th>Grupo</th><th>Docente</th><th class="num">Cadetes</th><th class="num">Diag. 2026</th>${showLabs.map(l => `<th class="num">ALCPT ${esc(l)}</th>`).join("")}<th class="num">ALC</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="${r.tot ? "total" : ""}"><td>${ANIO[r.a]} año</td><td>${r.g == null ? "Total" : "Grupo " + esc(r.g)}</td><td>${esc(r.d)}</td><td class="num">${r.n}</td><td class="num">${chipEsc(r.diag == null ? null : Math.round(r.diag), "alcpt")}</td>
  ${showLabs.map(l => { const v = r.labs[labs.indexOf(l)]; return `<td class="num">${chipEsc(v == null ? null : Math.round(v), "alcpt")}</td>`; }).join("")}<td class="num">${chipEsc(r.alc == null ? null : Math.round(r.alc), "alc")}</td></tr>`).join("")}</tbody></table></div>`;
}
function axPlan() {
  const P = cfg("planAlc");
  $("#axBody").innerHTML = `<p class="lead">Plan de libros ALC (tabla C.2). Se edita en Ajustes.</p>
  <div class="tscroll"><table class="tbl" style="min-width:420px"><thead><tr><th>Año</th><th>Semestre</th><th>Libros</th></tr></thead><tbody>
  ${["1", "2", "3", "4"].map(a => { const R = P.filter(x => x.a === a); return R.map((x, i) => `<tr>${i ? "" : `<td rowspan="${R.length}">${ANIO[a]} año</td>`}<td>${x.sem === "1" ? "1/er." : "2/o."} semestre</td><td>${esc(x.libros)}</td></tr>`).join(""); }).join("")}</tbody></table></div>`;
}
G.vAlc = vAlc;

/* ---------- Remedial: expedientes, re-evaluación e historial ---------- */
const RX = { tab: "lista", q: "", est: "" };
function inscribirMotivo(o0, motivo, pts) { const o = clone(o0); const d = hoy();
  o.rem = { ...(o.rem || {}), on: true, alta: d, desde: (lastPart(o) || {}).k || "", motivo, puntaje: pts ?? null, estatus: "curso", baja: null, reeval: [], avances: [] };
  o.remHist = [...(o.remHist || []), { alta: d, motivo, puntaje: pts ?? null, estatus: "curso" }]; saveItem(o, true); }
function remSes(o) { return S.cfg.sesiones.filter(s => s >= ((o.rem && o.rem.alta) || "0000") && (!o.rem || !o.rem.baja || s <= o.rem.baja)); }
function remAsis(o) { const ses = remSes(o), m = ses.filter(s => o.asis && o.asis[s]); const p = m.filter(s => o.asis[s] === "P").length; return { ses: ses.length, marc: m.length, P: p, F: m.filter(s => o.asis[s] === "F").length, J: m.filter(s => o.asis[s] === "J").length, pct: m.length ? Math.round(p * 100 / m.length) : null }; }
function remBase(o) { return nv(o.rem && o.rem.puntaje) ?? nv(o.diag) ?? (lastAl(o) || [])[1] ?? null; }
function remUlt(o) { const r = ((o.rem && o.rem.reeval) || []).filter(x => nv(x.pts) != null); return r.length ? r[r.length - 1] : null; }
function remEst(o) { return (o.rem && o.rem.estatus) || "curso"; }
const REM_TXT = REM_TXT_ALL;
G.ReplicaIng.remAsis = remAsis; G.ReplicaIng.remEst = remEst; G.ReplicaIng.remUlt = remUlt; G.ReplicaIng.remBase = remBase;

const _vRem = G.vRem;
G.vRem = function () {
  if (RX.tab === "lista") { _vRem(); const h = VW.querySelector("h2"); if (h) h.insertAdjacentHTML("afterend", remHead()); else VW.insertAdjacentHTML("afterbegin", remHead()); bindRemHead(); return; }
  VW.innerHTML = remHead() + `<div id="rxBody"></div>`; bindRemHead();
  ({ exp: rxExp, cand: rxCand, hist: rxHist })[RX.tab]();
};
function remHead() { const R = all().filter(inRem); const ap = everyone().filter(o => (o.remHist || []).some(h => h.estatus === "aprobado")).length;
  return `<div class="remhead">${RX.tab === "lista" ? "" : `<h2 style="margin:0">Remedial</h2>`}<span class="hint">${R.length} en curso · ${ap} con remedial aprobado</span></div>
  ${subnav("rxSub", [["lista", "Pase de lista sabatino"], ["exp", "Expedientes y re-evaluación"], ["cand", "Candidatos por escala"], ["hist", "Historial"]], RX.tab)}`; }
function bindRemHead() { VW.querySelectorAll("#rxSub [data-sub]").forEach(b => b.onclick = () => { RX.tab = b.dataset.sub; render(); }); }
function rxExp() {
  const q = norm(RX.q.trim()); const R = all().filter(inRem).filter(o => (!q || norm(o.n).includes(q) || norm(o.m).includes(q)) && (!RX.est || remEst(o) === RX.est)).sort((x, y) => x.a.localeCompare(y.a) || String(x.rem.grupo || "").localeCompare(String(y.rem.grupo || "")) || x.n.localeCompare(y.n, "es"));
  $("#rxBody").innerHTML = `<p class="lead">Expediente de cada cadete en remedial: motivo, puntaje que lo envió, sesiones, asistencia, avances, re-evaluaciones y estatus.</p>
  <div class="bar"><input type="search" id="rxQ" placeholder="Buscar cadete" value="${esc(RX.q)}" aria-label="Buscar"><select id="rxE" aria-label="Estatus"><option value="">Cualquier estatus</option>${REM_EST.map(([k, t]) => `<option value="${k}" ${RX.est === k ? "selected" : ""}>${t}</option>`).join("")}</select>
  <button class="btn ghost" id="rxAdd">Inscribir cadete</button></div>
  ${R.length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th>Asesoría</th><th>Motivo</th><th class="num">Puntaje de ingreso</th><th class="num">Sesiones</th><th class="num">Asistencia</th><th class="num">Última re-evaluación</th><th class="num">Avance</th><th>Estatus</th></tr></thead><tbody>
  ${R.map(o => { const a = remAsis(o), b = remBase(o), u = remUlt(o), d = u && b != null ? nv(u.pts) - b : null; return `<tr><td><button class="nameb" data-rx="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}</span></td>
    <td>${esc(o.rem.grupo || "—")}<span class="sub">${esc(o.rem.docente || "")}</span></td><td class="wide"><span class="sub" style="color:inherit">${esc(o.rem.motivo || "—")}</span><span class="sub">Alta ${esc(o.rem.alta || "—")}</span></td>
    <td class="num">${chipEsc(b, "alcpt")}</td><td class="num">${a.marc}/${a.ses}</td><td class="num ${a.pct != null && a.pct < 80 ? "lo" : ""}">${a.pct == null ? "—" : a.pct + "%"}<span class="sub">${a.F} F · ${a.J} J</span></td>
    <td class="num">${u ? chipEsc(nv(u.pts), "alcpt") + `<span class="sub">${esc(u.fecha || "")}</span>` : "—"}</td><td class="num ${d != null && d < 0 ? "lo" : ""}">${d == null ? "—" : (d > 0 ? "+" : "") + d}</td>
    <td><select data-est="${o.id}" aria-label="Estatus de ${esc(o.n)}">${REM_EST.map(([k, t]) => `<option value="${k}" ${remEst(o) === k ? "selected" : ""}>${t}</option>`).join("")}</select></td></tr>`; }).join("")}</tbody></table></div>`
  : `<div class="empty"><strong>Sin cadetes en remedial con ese filtro</strong>Inscribe desde aquí, desde Calificaciones o desde Candidatos por escala.</div>`}`;
  $("#rxQ").oninput = e => { RX.q = e.target.value; rxExp(); const i = $("#rxQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
  $("#rxE").onchange = e => { RX.est = e.target.value; rxExp(); }; $("#rxAdd").onclick = () => openAddRem();
  VW.querySelectorAll("[data-rx]").forEach(b => b.onclick = () => openRemExp(b.dataset.rx));
  VW.querySelectorAll("[data-est]").forEach(s => s.onchange = () => { const o = clone(S.items.get(s.dataset.est)); setEstatus(o, s.value); });
}
function setEstatus(o, v, motivoBaja) {
  o.rem = { ...o.rem, estatus: v }; const h = o.remHist || []; if (h.length) h[h.length - 1] = { ...h[h.length - 1], estatus: v };
  if (v !== "curso") { o.rem.on = false; o.rem.baja = hoy(); o.rem.motivoBaja = motivoBaja || (v === "aprobado" ? "Aprobó el remedial" : "No aprobó el remedial");
    if (h.length) h[h.length - 1] = { ...h[h.length - 1], baja: o.rem.baja, motivoBaja: o.rem.motivoBaja, reeval: o.rem.reeval || [], asistencia: remAsis(o).pct }; }
  o.remHist = h; saveItem(o); toast(v === "curso" ? "Estatus: en curso" : `Remedial cerrado: ${REM_TXT[v].toLowerCase()}`);
}
function openRemExp(id) {
  const o = S.items.get(id); if (!o) return; const r = o.rem || {}, a = remAsis(o), ses = remSes(o);
  $("#remBody").innerHTML = `<div class="fhead"><div><h2>${esc(o.n)}</h2><p class="hint">${grpLabel(o)}${o.m ? " · " + esc(o.m) : ""}</p></div><button class="fx" type="button" id="rxX" aria-label="Cerrar">×</button></div>
  <div class="g3"><label>Motivo<input id="rxM" value="${esc(r.motivo || "")}"></label><label>Puntaje que lo envió<input id="rxP" type="number" min="0" max="100" value="${r.puntaje ?? ""}"></label><label>Fecha de alta<input id="rxA" type="date" value="${esc(r.alta || "")}"></label>
  <label>Grupo de asesoría<input id="rxG" value="${esc(r.grupo || "")}"></label><label>Docente de asesoría<input id="rxD" value="${esc(r.docente || "")}"></label><label>Estatus<select id="rxS">${REM_EST.map(([k, t]) => `<option value="${k}" ${remEst(o) === k ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
  <h3>Sesiones y asistencia</h3><p class="hint">${a.ses} sábados desde el alta · ${a.P} asistencias · ${a.F} faltas · ${a.J} justificadas${a.pct != null ? ` · ${a.pct}% de asistencia` : ""}</p>
  <div class="ls-tl rx-tl">${ses.map(s => { const x = (o.asis && o.asis[s]) || "", d = fmtD(s); return `<i class="${x}" title="${d.d} ${d.m}: ${x === "P" ? "asistió" : x === "F" ? "faltó" : x === "J" ? "justificada" : "sin marcar"}">${x === "P" ? "A" : x || "·"}</i>`; }).join("") || '<span class="hint">Sin sábados registrados desde el alta.</span>'}</div>
  <h3>Re-evaluaciones</h3>
  <div class="tscroll"><table class="tbl" style="min-width:460px"><thead><tr><th>Fecha</th><th>Examen</th><th class="num">Puntaje</th><th>Observación</th><th></th></tr></thead><tbody>
  ${(r.reeval || []).map((x, i) => `<tr><td>${esc(x.fecha || "")}</td><td>${esc(x.tipo || "")}</td><td class="num">${chipEsc(nv(x.pts), /ALC /.test(x.tipo || "") ? "alc" : "alcpt")}</td><td>${esc(x.obs || "")}</td><td><button class="btn ghost small" data-rdel="${i}">Quitar</button></td></tr>`).join("") || `<tr><td colspan="5" class="hint">Sin re-evaluaciones.</td></tr>`}
  </tbody></table></div>
  <div class="bar"><input type="date" id="reF" value="${hoy()}" aria-label="Fecha"><select id="reT" aria-label="Examen"><option>ALCPT</option><option>ALC libro</option><option>Examen de recuperación</option><option>Evaluación de la asesoría</option></select>
  <input id="reP" type="number" min="0" max="100" placeholder="Puntaje" style="width:100px" aria-label="Puntaje"><input id="reO" placeholder="Observación" aria-label="Observación"><button class="btn small" id="reAdd">Agregar</button></div>
  <h3>Avances</h3><ul class="evl">${(r.avances || []).map((x, i) => `<li><span class="evt">${esc(x.fecha)}</span>${esc(x.nota)}<button class="btn ghost small" data-adel="${i}">Quitar</button></li>`).join("") || `<li class="hint">Sin avances anotados.</li>`}</ul>
  <div class="bar"><input type="date" id="avF" value="${hoy()}" aria-label="Fecha del avance"><input id="avN" placeholder="Tema reforzado, progreso, acuerdo" style="flex:1" aria-label="Avance"><button class="btn small" id="avAdd">Anotar</button></div>
  <h3>Historial de remediales</h3><p class="hint">${(o.remHist || []).map(h => `${esc(h.alta || "—")} a ${esc(h.baja || "en curso")} · ${esc(h.motivo || "")}${h.estatus ? " · " + esc(REM_TXT[h.estatus] || h.estatus) : ""}`).join("<br>") || "Primer remedial."}</p>
  <div class="acts"><button class="btn ghost" id="rxC">Cerrar</button><button class="btn" id="rxOk">Guardar expediente</button></div>`;
  const d = $("#dRem"); if (!d.open) d.showModal();
  const cl = () => d.close(); $("#rxX").onclick = cl; $("#rxC").onclick = cl;
  const mut = fn => { const x = clone(S.items.get(id)); x.rem = { ...(x.rem || {}) }; fn(x); saveItem(x, true); openRemExp(id); };
  $("#reAdd").onclick = () => { const p = nv($("#reP").value); if (p == null) { toast("Escribe el puntaje"); return; } mut(x => { x.rem.reeval = [...(x.rem.reeval || []), { fecha: $("#reF").value, tipo: $("#reT").value, pts: Math.round(p), obs: $("#reO").value.trim() }]; }); toast("Re-evaluación agregada"); };
  $("#avAdd").onclick = () => { const t = $("#avN").value.trim(); if (!t) return; mut(x => { x.rem.avances = [...(x.rem.avances || []), { fecha: $("#avF").value, nota: t }]; }); };
  d.querySelectorAll("[data-rdel]").forEach(b => b.onclick = () => mut(x => { x.rem.reeval = (x.rem.reeval || []).filter((_, i) => i !== +b.dataset.rdel); }));
  d.querySelectorAll("[data-adel]").forEach(b => b.onclick = () => mut(x => { x.rem.avances = (x.rem.avances || []).filter((_, i) => i !== +b.dataset.adel); }));
  $("#rxOk").onclick = () => { const x = clone(S.items.get(id)); x.rem = { ...(x.rem || {}), motivo: $("#rxM").value.trim(), puntaje: nv($("#rxP").value), alta: $("#rxA").value, grupo: $("#rxG").value.trim(), docente: $("#rxD").value.trim() };
    const h = x.remHist || []; if (h.length) h[h.length - 1] = { ...h[h.length - 1], alta: x.rem.alta, motivo: x.rem.motivo, puntaje: x.rem.puntaje }; x.remHist = h;
    const st = $("#rxS").value; cl(); if (st !== remEst(x)) setEstatus(x, st); else { saveItem(x); toast("Expediente guardado"); } };
}
function rxCand() {
  const E = cfg("escalaAlcpt"), EA = cfg("escalaAlc"); const low = E[0], lowA = EA[0];
  const C = all().filter(o => !o.ex && !inRem(o)).map(o => { const la = lastAl(o), al = la ? nv(la[1]) : null, dg = nv(o.diag), ult = (o.alc || []).slice().sort((x, y) => String(x.fecha).localeCompare(String(y.fecha))).pop();
    const why = []; const ref = dg != null && (!la || labKey(la[0]) < Date.UTC(2026, 8, 1)) ? dg : al;
    if (ref != null && ref >= low.min && ref <= low.max) why.push(`ALCPT ${ref} (${low.t.toLowerCase()})`);
    if (ult && nv(ult.pts) != null && nv(ult.pts) >= lowA.min && nv(ult.pts) <= lowA.max) why.push(`ALC libro ${ult.libro}: ${ult.pts}`);
    if (estAc(o) === "bad") why.push(`promedio ${prom(o).toFixed(2)}`);
    return { o, why, ref }; }).filter(x => x.why.length).sort((x, y) => (x.ref ?? 999) - (y.ref ?? 999));
  $("#rxBody").innerHTML = `<p class="lead">Cadetes fuera del remedial cuyo último puntaje cae en la primera banda de la escala (${low.min}–${low.max} en ALCPT, ${lowA.min}–${lowA.max} en ALC) o con promedio reprobatorio. La escala se cambia en Ajustes.</p>
  ${C.length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th class="num">ALCPT de referencia</th><th>Motivo</th><th></th></tr></thead><tbody>${C.map(({ o, why, ref }) => `<tr><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${grpLabel(o)}</span></td><td class="num">${chipEsc(ref, "alcpt")}</td><td>${esc(why.join(" · "))}</td><td><button class="btn small ghost" data-cand="${o.id}">Inscribir</button></td></tr>`).join("")}</tbody></table></div>`
  : `<div class="empty"><strong>Sin candidatos</strong>Ningún cadete fuera del remedial cae en la banda de remedial.</div>`}`;
  VW.querySelectorAll("[data-cand]").forEach(b => b.onclick = () => { const x = C.find(c => c.o.id === b.dataset.cand); inscribirMotivo(x.o, x.why.join(" · "), x.ref); toast("Inscrito al remedial"); render(); });
  VW.querySelectorAll("#rxBody .nameb").forEach(b => b.onclick = () => openFicha(b.dataset.id));
}
function rxHist() {
  const H = []; everyone().forEach(o => (o.remHist || []).forEach(h => H.push({ o, h })));
  H.sort((x, y) => String(y.h.alta || "").localeCompare(String(x.h.alta || "")) || x.o.n.localeCompare(y.o.n, "es"));
  $("#rxBody").innerHTML = `<p class="lead">Todos los remediales registrados, en curso y cerrados, incluidos egresados.</p>
  ${H.length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th>Alta</th><th>Baja</th><th>Motivo</th><th class="num">Ingreso</th><th class="num">Última re-evaluación</th><th>Estatus</th><th>Cierre</th></tr></thead><tbody>
  ${H.map(({ o, h }) => { const re = (h.reeval || (o.rem && o.rem.on && h === (o.remHist || [])[o.remHist.length - 1] ? o.rem.reeval : []) || []).filter(x => nv(x.pts) != null).pop(); return `<tr><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button><span class="sub">${o.eg ? sitLabel(o) + " · " + esc(o.gen || "") : grpLabel(o)}</span></td><td>${esc(h.alta || "—")}</td><td>${esc(h.baja || "—")}</td><td>${esc(h.motivo || "")}</td><td class="num">${chipEsc(nv(h.puntaje), "alcpt")}</td><td class="num">${re ? chipEsc(nv(re.pts), "alcpt") : "—"}</td><td>${esc(REM_TXT[h.estatus] || (h.baja ? "Cerrado" : "En curso"))}</td><td>${esc(h.motivoBaja || "")}</td></tr>`; }).join("")}</tbody></table></div>`
  : `<div class="empty"><strong>Sin historial</strong>Todavía no hay remediales registrados.</div>`}`;
  VW.querySelectorAll("#rxBody .nameb").forEach(b => b.onclick = () => { const o = S.items.get(b.dataset.id); if (o && o.eg) openEme(o.id); else openFicha(b.dataset.id); });
}
/* la inscripción original guarda también el estatus y el puntaje */
const _inscribir = G.inscribir;
G.inscribir = function (o0, pk, silent) { _inscribir(o0, pk, true); const o = clone(S.items.get(o0.id)); o.rem = { ...o.rem, estatus: "curso", puntaje: o.rem.puntaje ?? remBase(o), reeval: o.rem.reeval || [], avances: o.rem.avances || [] };
  const h = o.remHist || []; if (h.length) h[h.length - 1] = { ...h[h.length - 1], estatus: "curso", puntaje: o.rem.puntaje }; o.remHist = h; saveItem(o, silent); };
const _baja = G.baja;
G.baja = function (o0, motivo) { const est = /no aprob/i.test(motivo) ? "noaprobado" : /aprob/i.test(motivo) ? "aprobado" : "baja"; const o = clone(o0); o.rem = { ...o.rem, estatus: est }; const h = o.remHist || []; if (h.length) h[h.length - 1] = { ...h[h.length - 1], estatus: est, reeval: o.rem.reeval || [] }; o.remHist = h; _baja(o, motivo); };
G.ReplicaIng.inscribirMotivo = inscribirMotivo;

/* ---------- Excel con Noto Sans 10 y celdas combinadas ---------- */
const XL = {
  async lib() { return await loadXLSX(); },
  sheet(X, rows, widths, merges, hdrRows) {
    const ws = X.utils.aoa_to_sheet(rows); if (widths) ws["!cols"] = widths.map(w => ({ wch: w })); if (merges && merges.length) ws["!merges"] = merges;
    const bd = { style: "thin", color: { rgb: "999999" } }, hs = new Set(hdrRows || []);
    Object.keys(ws).forEach(k => { if (k[0] === "!") return; const c = ws[k]; const r = X.utils.decode_cell(k).r; c.s = { font: { name: "Noto Sans", sz: 10, bold: r === 0 || hs.has(r) }, alignment: { vertical: "center", wrapText: true, horizontal: r === 0 ? "center" : undefined } };
      if (r > 0 && rows[r] && rows[r].length > 1) c.s.border = { top: bd, bottom: bd, left: bd, right: bd }; if (hs.has(r)) c.s.fill = { fgColor: { rgb: "E2F1EC" } }; });
    /* las celdas combinadas también llevan borde */
    (merges || []).forEach(m => { for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) { const a = X.utils.encode_cell({ r, c }); if (!ws[a]) ws[a] = { t: "s", v: "" }; ws[a].s = ws[a].s || { font: { name: "Noto Sans", sz: 10 } }; } });
    return ws;
  },
  runs(rows, cols, from, to) { const M = []; cols.forEach(c => { let st = from; for (let r = from + 1; r <= to + 1; r++) { const same = r <= to && rows[r][c] === rows[st][c] && (c === cols[0] || cols.slice(0, cols.indexOf(c)).every(k => rows[r][k] === rows[st][k])); if (!same) { if (r - 1 > st && rows[st][c] !== "") M.push({ s: { r: st, c }, e: { r: r - 1, c } }); st = r; } } }); return M; },
  async save(X, wb, name) { const out = X.write(wb, { bookType: "xlsx", type: "array" }); const DL = await window.claude.use("downloads"); await DL.save({ filename: name, data: new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }) }); }
};
G.ReplicaIng.XL = XL;

/* ---------- Seguimiento EME (1/er. a 4/o. año) ---------- */
const EM = { q: "", gen: "", a: "", eg: false, id: "" };
function trayOf(o) { const T = (o.tray || []).map(t => ({ ...t })); const c = cfg("ciclo"), sm = cfg("semestre") === "2" ? "2/o. semestre" : "1/er. semestre";
  if (!o.eg && !T.some(t => t.ciclo === c && t.sem === sm)) T.push({ ciclo: c, sem: sm, a: o.a, g: String(o.g), d: o.d || "", actual: true });
  return T.sort((x, y) => (x.ciclo + x.sem).localeCompare(y.ciclo + y.sem)); }
function puntosEme(o) { const P = alcptList(o).map(x => ({ k: labKey(x.l), l: "ALCPT " + x.l, v: nv(x.v), t: "alcpt" }));
  if (nv(o.diag) != null) P.push({ k: Date.UTC(2026, 8, 21), l: "Diagnóstico sep 2026", v: nv(o.diag), t: "diag" });
  (o.alc || []).forEach(x => { const d = x.fecha ? new Date(x.fecha + "T12:00:00").getTime() : (labDate("ene " + String(x.ciclo || "").slice(5)) || new Date()).getTime(); P.push({ k: d, l: `ALC L${x.libro}`, v: nv(x.pts), t: "alc" }); });
  return P.filter(p => p.v != null).sort((a, b) => a.k - b.k); }
function chartEme(o) { const P = puntosEme(o); if (!P.length) return `<p class="hint">Sin puntajes registrados.</p>`;
  const W = 640, H = 200, pl = 34, pr = 56, pt = 18, pb = 44, x = i => pl + (P.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (P.length - 1)), y = v => pt + (H - pt - pb) * (1 - v / 100);
  const E = cfg("escalaAlcpt"); let g = E.map(b => `<rect x="${pl}" width="${W - pl - pr}" y="${y(b.max)}" height="${y(b.min) - y(b.max)}" fill="${esc(b.c)}" opacity=".07"/>`).join("");
  g += [0, 50, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`).join("");
  ["alcpt", "alc"].forEach(t => { const Q = P.map((p, i) => [p, i]).filter(([p]) => t === "alcpt" ? p.t !== "alc" : p.t === "alc"); if (Q.length > 1) g += `<path d="M${Q.map(([p, i]) => x(i) + "," + y(p.v)).join("L")}" fill="none" stroke="${t === "alc" ? "var(--brass)" : "var(--olive)"}" stroke-width="2.5" stroke-linejoin="round" class="ln"/>`; });
  P.forEach((p, i) => { g += p.t === "diag" ? `<path d="M${x(i)},${y(p.v) - 7}L${x(i) + 7},${y(p.v)}L${x(i)},${y(p.v) + 7}L${x(i) - 7},${y(p.v)}Z" fill="var(--brass)"/>` : `<circle cx="${x(i)}" cy="${y(p.v)}" r="4.5" fill="var(--surface)" stroke="${p.t === "alc" ? "var(--brass)" : "var(--olive)"}" stroke-width="2.5"/>`;
    g += `<text x="${x(i)}" y="${y(p.v) - 10}" class="vl" text-anchor="middle">${p.v}</text><text x="${x(i)}" y="${H - 24 + (i % 2) * 14}" class="ax xl" text-anchor="middle">${esc(p.l)}</text>`; });
  return `<div class="chart flat"><div class="chh"><h3><em>Progreso</em>Puntajes durante su estancia</h3><div class="lg"><span><i style="background:var(--olive)"></i>ALCPT</span><span><i style="background:var(--brass)"></i>ALC y diagnóstico</span></div></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Progreso de ${esc(o.n)}">${g}</svg></div>`; }
function emeList() { const q = norm(EM.q.trim()); return everyone().filter(o => (EM.eg ? true : !o.eg) && (!q || norm(o.n).includes(q) || norm(o.m).includes(q)) && (!EM.gen || o.gen === EM.gen) && (!EM.a || (o.eg ? "eg" : o.a) === EM.a))
  .sort((x, y) => String(x.gen || "").localeCompare(String(y.gen || "")) || (x.a || "").localeCompare(y.a || "") || String(x.g).localeCompare(String(y.g)) || x.n.localeCompare(y.n, "es")); }
function vEme() {
  const gens = [...new Set(everyone().map(o => o.gen).filter(Boolean))].sort(), L = emeList();
  const nEg = everyone().filter(o => o.eg).length;
  VW.innerHTML = `<h2>Seguimiento EME</h2>
  <p class="lead">Expediente de inglés de cada cadete durante toda su estancia, de 1/er. a 4/o. año, ligado a su matrícula: grupos y docentes por ciclo, ALCPT, ALC, remediales, calificaciones y observaciones. Desde aquí se imprime o descarga el kárdex.</p>
  <div class="bar"><input type="search" id="emQ" placeholder="Buscar por nombre o matrícula" value="${esc(EM.q)}" aria-label="Buscar">
  <select id="emG" aria-label="Generación"><option value="">Todas las generaciones</option>${gens.map(g => `<option ${EM.gen === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select>
  <select id="emA" aria-label="Año"><option value="">Todos los años</option>${["1", "2", "3", "4"].map(a => `<option value="${a}" ${EM.a === a ? "selected" : ""}>${ANIO[a]} año</option>`).join("")}${nEg ? `<option value="eg" ${EM.a === "eg" ? "selected" : ""}>Egresados</option>` : ""}</select>
  ${nEg ? `<label class="chk"><input type="checkbox" id="emE" ${EM.eg ? "checked" : ""}> Incluir ${nEg} egresados o fuera del ciclo</label>` : ""}
  <span style="flex:1"></span><button class="btn small ghost" id="emXl" ${L.length ? "" : "disabled"}>Kárdex de lo filtrado (.xlsx, ${L.length})</button></div>
  ${L.length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th>Generación</th><th>Situación</th><th class="num">Ciclos</th><th class="num">Primer ALCPT</th><th class="num">Último ALCPT</th><th class="num">Avance</th><th class="num">ALC</th><th class="num">Remediales</th></tr></thead><tbody>
  ${L.slice(0, 400).map(o => { const A = alcptList(o).filter(x => nv(x.v) != null), f = A[0], l = A[A.length - 1], d = f && l && A.length > 1 ? nv(l.v) - nv(f.v) : null; return `<tr><td><button class="nameb" data-em="${o.id}">${esc(o.n)}</button><span class="sub">${o.m ? esc(o.m) : "sin matrícula"}</span></td><td>${esc(o.gen || "—")}</td>
    <td>${sitLabel(o)}${inRem(o) ? ` <span class="badge b-rem">Remedial</span>` : ""}</td><td class="num">${trayOf(o).length}</td><td class="num">${f ? chipEsc(nv(f.v), "alcpt") + `<span class="sub">${esc(f.l)}</span>` : "—"}</td>
    <td class="num">${l ? chipEsc(nv(l.v), "alcpt") + `<span class="sub">${esc(l.l)}</span>` : "—"}</td><td class="num ${d != null && d < 0 ? "lo" : ""}">${d == null ? "—" : (d > 0 ? "+" : "") + d}</td><td class="num">${f1(alcAvg(o))}</td><td class="num">${(o.remHist || []).length || "—"}</td></tr>`; }).join("")}</tbody></table></div>${L.length > 400 ? `<p class="hint">Se muestran 400 de ${L.length}. Usa la búsqueda o los filtros.</p>` : ""}`
  : `<div class="empty"><strong>Sin resultados</strong>Ningún cadete coincide con los filtros.</div>`}`;
  const on = (id, k, ev) => { const el = $(id); if (el) el[ev || "onchange"] = e => { EM[k] = e.target.type === "checkbox" ? e.target.checked : e.target.value; vEme(); if (k === "q") { const i = $("#emQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }; };
  on("#emQ", "q", "oninput"); on("#emG", "gen"); on("#emA", "a"); on("#emE", "eg");
  if (EM.a === "eg" && !EM.eg) { EM.eg = true; vEme(); return; }
  VW.querySelectorAll("[data-em]").forEach(b => b.onclick = () => openEme(b.dataset.em));
  $("#emXl").onclick = () => kardexXlsx(L);
}
function kardexRows(o) {
  const T = trayOf(o), A = alcptList(o);
  return T.map(t => { const inC = x => { const d = labDate(x.l); return d && cicloOf(d) === t.ciclo; }; const al = A.filter(inC);
    const alc = (o.alc || []).filter(x => (x.ciclo || cfg("ciclo")) === t.ciclo); const rem = (o.remHist || []).filter(h => h.alta && cicloOf(new Date(h.alta + "T12:00:00")) === t.ciclo);
    const parc = t.actual || t.ciclo === cfg("ciclo") ? PARC.map(([k]) => ptot(o.cal && o.cal[k])).filter(v => v != null) : (t.parciales || []);
    return { t, al, alc, rem, parc }; });
}
function openEme(id) {
  const o = S.items.get(id); if (!o) return; EM.id = id; const K = kardexRows(o);
  $("#emeBody").innerHTML = `<div class="fhead"><span class="av s-${o.eg ? "ex" : estAc(o)}">${esc(ini(o.n))}</span><div><h2>${esc(o.n)}</h2><p class="hint">${o.m ? esc(o.m) + " · " : ""}Generación ${esc(o.gen || "—")} · ${sitLabel(o)}${o.estatus && !o.eg && o.estatus !== "Activo" ? " · " + esc(o.estatus) : ""}</p></div>
    <button class="fx" type="button" id="emX" aria-label="Cerrar">×</button></div>
  ${chartEme(o)}
  <h3>Trayectoria por ciclo</h3>
  <div class="tscroll"><table class="tbl" style="min-width:860px"><thead><tr><th>Ciclo</th><th>Semestre</th><th>Año</th><th>Grupo</th><th>Docente</th><th>ALCPT</th><th>ALC</th><th class="num">Parciales</th><th>Remedial</th></tr></thead><tbody>
  ${K.map(({ t, al, alc, rem, parc }) => `<tr><td>${esc(t.ciclo)}</td><td>${esc(t.sem || "")}</td><td>${ANIO[t.a] ? ANIO[t.a] + " año" : esc(t.a || "")}</td><td>${esc(t.g || "—")}</td><td>${esc(t.d || "—")}</td>
    <td>${al.map(x => `<span class="nw">${esc(x.l)}: ${chipEsc(nv(x.v), "alcpt")}</span>`).join("<br>") || "—"}${t.ciclo === "2026-2027" && nv(o.diag) != null ? `<br><span class="nw">Diag.: ${chipEsc(nv(o.diag), "alcpt")}</span>` : ""}</td>
    <td>${alc.map(x => `<span class="nw">L${esc(x.libro)} ${esc((TIPO_ALC.find(k => k[0] === x.tipo) || [, x.tipo])[1].replace("Examen ", ""))}: ${chipEsc(nv(x.pts), "alc")}</span>`).join("<br>") || "—"}</td>
    <td class="num">${parc.length ? (parc.reduce((a, b) => a + b, 0) / parc.length).toFixed(2) : "—"}</td><td>${rem.map(h => `${esc(h.alta)} · ${esc(REM_TXT[h.estatus] || (h.baja ? "cerrado" : "en curso"))}`).join("<br>") || "—"}</td></tr>`).join("")}
  </tbody></table></div>
  <h3>Remediales</h3><p class="hint">${(o.remHist || []).map(h => `${esc(h.alta || "—")} a ${esc(h.baja || "en curso")} · ${esc(h.motivo || "")}${h.estatus ? " · " + esc(REM_TXT[h.estatus] || h.estatus) : ""}`).join("<br>") || "No ha estado en el remedial."}</p>
  <h3>Novedades y observaciones</h3>
  <ul class="evl">${(o.obsHist || []).map((x, i) => `<li><span class="evt">${esc(x.fecha)}</span>${esc(x.txt)}<button class="btn ghost small" data-odel="${i}">Quitar</button></li>`).join("")}${o.obs ? `<li><span class="evt">Ficha</span>${esc(o.obs)}</li>` : ""}${!(o.obsHist || []).length && !o.obs ? `<li class="hint">Sin observaciones.</li>` : ""}</ul>
  <div class="bar"><input type="date" id="obF" value="${hoy()}" aria-label="Fecha"><input id="obT" placeholder="Novedad u observación" style="flex:1" aria-label="Observación"><button class="btn small" id="obAdd">Anotar</button></div>
  <div class="acts"><button class="btn ghost" id="emC">Cerrar</button>${o.eg ? "" : `<button class="btn ghost" id="emF">Abrir ficha del ciclo</button>`}<button class="btn ghost" id="emP">Imprimir kárdex</button><button class="btn" id="emK">Descargar kárdex .xlsx</button></div>`;
  const d = $("#dEme"); if (!d.open) d.showModal(); const cl = () => d.close(); $("#emX").onclick = cl; $("#emC").onclick = cl;
  const f = $("#emF"); if (f) f.onclick = () => { cl(); openFicha(id); };
  $("#obAdd").onclick = () => { const t = $("#obT").value.trim(); if (!t) return; const x = clone(S.items.get(id)); x.obsHist = [...(x.obsHist || []), { fecha: $("#obF").value, txt: t }]; saveItem(x, true); openEme(id); toast("Observación anotada"); };
  d.querySelectorAll("[data-odel]").forEach(b => b.onclick = () => { const x = clone(S.items.get(id)); x.obsHist = (x.obsHist || []).filter((_, i) => i !== +b.dataset.odel); saveItem(x, true); openEme(id); });
  $("#emP").onclick = () => printKardex(o); $("#emK").onclick = () => kardexXlsx([o]);
}
function kardexAoa(o) {
  const K = kardexRows(o), rows = [["KÁRDEX DE INGLÉS · " + o.n], ["Esc. Mil. Enfría. · Mesa de Idioma Extranjero"], ["Matrícula", o.m || "", "Generación", o.gen || "", "Situación", o.eg ? (o.estatus && o.estatus !== "Egresado" ? o.estatus : "Egresado") : `${ANIO[o.a]} año · Grupo ${o.g}`], [],
    ["Ciclo", "Semestre", "Año", "Grupo", "Docente", "Examen", "Puntaje", "Escala", "Promedio de parciales", "Remedial"]];
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }]; const start = rows.length;
  K.forEach(({ t, al, alc, rem, parc }) => { const ex = [...al.map(x => ["ALCPT " + x.l, nv(x.v), "alcpt"]), ...(t.ciclo === "2026-2027" && nv(o.diag) != null ? [["Diagnóstico sep 2026", nv(o.diag), "alcpt"]] : []), ...alc.map(x => [`ALC libro ${x.libro} · ${(TIPO_ALC.find(k => k[0] === x.tipo) || [, x.tipo])[1]}`, nv(x.pts), "alc"])];
    const pr = parc.length ? Math.round(parc.reduce((a, b) => a + b, 0) / parc.length * 100) / 100 : ""; const rm = rem.map(h => `${h.alta} · ${REM_TXT[h.estatus] || (h.baja ? "cerrado" : "en curso")}`).join("; ");
    (ex.length ? ex : [["", "", ""]]).forEach(e => { const b = banda(e[1], e[2]); rows.push([t.ciclo, t.sem || "", ANIO[t.a] ? ANIO[t.a] + " año" : (t.a || ""), t.g || "", t.d || "", e[0], e[1] ?? "", b ? b.t : "", pr, rm]); }); });
  const end = rows.length - 1; if (end >= start) merges.push(...XL.runs(rows, [0, 1, 2, 3, 4, 8, 9], start, end));
  rows.push([], ["Remediales"]); merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 9 } });
  rows.push(["Alta", "Baja", "Motivo", "", "", "Estatus", "Puntaje de ingreso", "", "Cierre", ""]); const hr = rows.length - 1;
  (o.remHist || []).forEach(h => { rows.push([h.alta || "", h.baja || "", h.motivo || "", "", "", REM_TXT[h.estatus] || "", h.puntaje ?? "", "", h.motivoBaja || "", ""]); const r = rows.length - 1; merges.push({ s: { r, c: 2 }, e: { r, c: 4 } }, { s: { r, c: 6 }, e: { r, c: 7 } }, { s: { r, c: 8 }, e: { r, c: 9 } }); });
  if (!(o.remHist || []).length) { rows.push(["Sin remediales", "", "", "", "", "", "", "", "", ""]); merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 9 } }); }
  merges.push({ s: { r: hr, c: 2 }, e: { r: hr, c: 4 } }, { s: { r: hr, c: 6 }, e: { r: hr, c: 7 } }, { s: { r: hr, c: 8 }, e: { r: hr, c: 9 } });
  const obs = [...(o.obsHist || []).map(x => `${x.fecha}: ${x.txt}`), ...(o.obs ? [o.obs] : [])];
  rows.push([], ["Observaciones"]); merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 9 } });
  (obs.length ? obs : ["Sin observaciones"]).forEach(t => { rows.push([t]); merges.push({ s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: 9 } }); });
  return { rows, merges, hdr: [4, hr] };
}
async function kardexXlsx(L) { try { toast("Preparando kárdex…"); const X = await XL.lib(), wb = X.utils.book_new(); const used = new Set();
  L.forEach(o => { const k = kardexAoa(o); let nm = (o.n || "Cadete").replace(/[\\/?*\[\]:]/g, "").slice(0, 28); let i = 2; while (used.has(nm)) nm = nm.slice(0, 26) + " " + i++; used.add(nm);
    X.utils.book_append_sheet(wb, XL.sheet(X, k.rows, [11, 13, 9, 8, 26, 30, 9, 22, 12, 26], k.merges, k.hdr), nm); });
  await XL.save(X, wb, L.length === 1 ? `KARDEX INGLES ${L[0].n} ${hoy()}.xlsx` : `KARDEX INGLES ${L.length} cadetes ${hoy()}.xlsx`); toast("Kárdex descargado"); } catch (e) { console.error(e); toast("No se pudo preparar el kárdex"); } }
function printKardex(o) { const k = kardexAoa(o); const M = new Map(); const skip = new Set();
  k.merges.forEach(m => { M.set(m.s.r + "," + m.s.c, m); for (let r = m.s.r; r <= m.e.r; r++) for (let c = m.s.c; c <= m.e.c; c++) if (r !== m.s.r || c !== m.s.c) skip.add(r + "," + c); });
  const html = k.rows.map((row, r) => row.length ? `<tr>${row.map((v, c) => { if (skip.has(r + "," + c)) return ""; const m = M.get(r + "," + c); const at = m ? ` rowspan="${m.e.r - m.s.r + 1}" colspan="${m.e.c - m.s.c + 1}"` : ""; const tag = r < 2 || k.hdr.includes(r) ? "th" : "td"; return `<${tag}${at}>${esc(v ?? "")}</${tag}>`; }).join("")}</tr>` : `<tr class="sp"><td colspan="10"></td></tr>`).join("");
  $("#printArea").innerHTML = `<table class="kx">${html}</table>`; document.body.classList.add("printing"); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove("printing"), 400); }, 60); }
G.vEme = vEme; G.ReplicaIng.openEme = openEme; G.ReplicaIng.kardexAoa = kardexAoa; G.ReplicaIng.kardexXlsx = kardexXlsx; G.ReplicaIng.trayOf = trayOf;

/* ---------- ficha: ALC por libro y acceso al Seguimiento EME ---------- */
const _openFicha = G.openFicha;
G.openFicha = function (id) { const o = S.items.get(id); if (o && o.eg) { openEme(id); return; } _openFicha(id); if (!o) return;
  const hs = [...document.querySelectorAll("#fichaBody h3")].find(h => /Evidencias/.test(h.textContent)); const A = (o.alc || []).slice().sort((x, y) => (x.ciclo + x.libro.padStart(2, "0") + x.tipo).localeCompare(y.ciclo + y.libro.padStart(2, "0") + y.tipo));
  const html = `<h3>ALC por libro</h3>${A.length ? `<div class="tscroll"><table class="tbl" style="min-width:420px"><thead><tr><th>Ciclo</th><th>Libro</th><th>Examen</th><th class="num">Puntaje</th></tr></thead><tbody>${A.map(x => `<tr><td>${esc(x.ciclo || "")}</td><td>${esc(x.libro)}</td><td>${esc((TIPO_ALC.find(k => k[0] === x.tipo) || [, x.tipo])[1])}</td><td class="num">${chipEsc(nv(x.pts), "alc")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Sin exámenes ALC capturados. Se capturan en ALC y ALCPT.</p>`}
  <p><button class="btn ghost small" id="fEme" type="button">Ver seguimiento EME y kárdex</button></p>`;
  if (hs) hs.insertAdjacentHTML("beforebegin", html); const b = $("#fEme"); if (b) b.onclick = () => { $("#dFicha").close(); openEme(id); }; };

/* ---------- Importar: lectura local de todos los formatos ---------- */
TIPOS.push(["alc", "Calificaciones ALC (examen de libro)"]);
function linesToCsv(text) { return String(text || "").split(/\r?\n/).map(l => l.replace(/[|¦]/g, " ").trim()).filter(Boolean).filter(l => !(/nombre|matr[ií]cula|puntaje|calificaci/i.test(l) && !/\d/.test(l) && !/\t|\s{2,}/.test(l))).filter(l => !/^-{2,}.*-{2,}$/.test(l)).map(l => {
  if (/^"|,/.test(l) && l.split(",").length > 2) return l; const parts = l.split(/\t|\s{2,}/).map(x => x.trim()).filter(Boolean);
  const out = []; parts.forEach(p => { const toks = p.split(/\s+/); let name = []; toks.forEach(t => { if (/^\d+([.,]\d+)?$/.test(t) || /^(A|F|J|P|X|✓|✔|SV)$/i.test(t) || /^\d{1,2}:\d{2}$/.test(t)) { if (name.length) { out.push(name.join(" ")); name = []; } out.push(t.replace(",", ".")); } else name.push(t); }); if (name.length) out.push(name.join(" ")); });
  return qcsv(out); }).join("\n"); }
G.ReplicaIng.linesToCsv = linesToCsv;
const _heur = G.heuristica;
G.heuristica = function (texto, C) { const rows = _heur(texto, C);
  if (IMP.tipo === "cal" && rows.length && rows.every(r => r.examen == null)) { /* sin encabezados: examen, portafolio y participación en orden */
    const byName = new Map(); csvRows(texto).forEach(cells => { const ni = cells.findIndex(c => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}\s+[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(c)); if (ni < 0) return; const nums = cells.slice(ni + 1).map(c => c.replace(",", ".")).filter(c => /^\d+(\.\d+)?$/.test(c)).map(Number); byName.set(cells[ni], nums); });
    rows.forEach(r => { const n = byName.get(r.nombre) || []; if (n.length && n[0] <= 10) { r.examen = n[0]; r.portafolio = n[1] != null && n[1] <= 3 ? n[1] : null; r.participacion = n[2] != null && n[2] <= 1 ? n[2] : null; r.nota = "Columnas leídas en orden: examen, portafolio, participación. Verifica."; } }); }
  return rows; };
const _actual = G.actual, _nuevo = G.nuevo;
G.actual = function (o) { if (IMP.tipo === "alc") { const x = (o.alc || []).find(z => z.libro === IMP.libro && z.tipo === IMP.alcTipo && (z.ciclo || cfg("ciclo")) === cfg("ciclo")); return x ? String(x.pts) : "—"; } return _actual(o); };
G.nuevo = function (r) { return IMP.tipo === "alc" ? (r.puntaje ?? "—") : _nuevo(r); };
const _vImp = G.vImp;
G.vImp = function () { _vImp(); if (IMP.tipo !== "alc") return; const lab = $("#iL"); if (!lab) return; const libs = librosDe(IMP.a); if (!IMP.libro || !libs.includes(IMP.libro)) IMP.libro = libs[0] || ""; IMP.alcTipo = IMP.alcTipo || "p1";
  lab.closest("label").outerHTML = `<label class="hint">Libro<select id="iLb">${libs.map(b => `<option ${IMP.libro === b ? "selected" : ""}>${b}</option>`).join("")}</select></label><label class="hint">Examen<select id="iAt">${TIPO_ALC.map(([k, t]) => `<option value="${k}" ${IMP.alcTipo === k ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="hint">Fecha<input type="date" id="iAf" value="${esc(IMP.alcFecha || "")}"></label>`;
  $("#iLb").onchange = e => { IMP.libro = e.target.value; IMP.rows = null; G.vImp(); }; $("#iAt").onchange = e => { IMP.alcTipo = e.target.value; IMP.rows = null; G.vImp(); }; $("#iAf").onchange = e => { IMP.alcFecha = e.target.value; }; };
G.leer = async function () {
  if (!IMP.files.length) { toast("Elige al menos un archivo"); return; }
  if (IMP.tipo === "asis" && !IMP.fecha) { toast("Indica la fecha del sábado"); return; } if (IMP.tipo === "alcpt" && !IMP.lab.trim()) { toast("Escribe la etiqueta del examen, por ejemplo: Nov 2026"); return; }
  if (IMP.tipo === "alc" && !IMP.libro) { toast("Elige el libro"); return; }
  const C = candidatos(); if (!C.length) { toast("No hay cadetes que correspondan a esa selección"); return; }
  IMP.busy = true; IMP.msg = "Leyendo el archivo…"; IMP.rows = null; G.vImp(); const notes = [];
  const prog = (m) => { IMP.msg = m; const el = VW.querySelector('.impbox [role="status"]'); if (el) el.textContent = m; };
  try { let texto = "";
    for (const f of IMP.files) { const x = extOf(f);
      if (["xlsx", "xls", "csv", "txt", "docx"].includes(x)) { const r = await readAny(f, 0); if (r.text && r.text.trim()) texto += `\n### ${f.name}\n` + r.text; continue; }
      if (x === "pdf") { const r = await readAny(f, 0); if (r.text && r.text.trim()) { texto += `\n### ${f.name}\n` + r.text; continue; } }
      if (x === "doc") { notes.push(`${f.name}: guárdalo como .docx o PDF.`); continue; }
      const r = await ReplicaReaders.extract(f, prog); notes.push(...(r.notes || []).map(n => n));
      if (r.text && r.text.trim()) texto += `\n### ${f.name}\n` + linesToCsv(r.text.replace(/^\s*## .*$/m, "")); }
    if (!texto.trim()) throw { code: "empty" };
    const t0 = IMP.tipo; if (t0 === "alc") IMP.tipo = "alcpt"; let filas; try { filas = G.heuristica(texto.slice(0, 400000), C); } finally { IMP.tipo = t0; }
    IMP.rows = filas.filter(f => f && f.nombre).map(f => { const m = match(f.nombre, f.matricula, C); return { ...f, oid: m.o ? m.o.id : "", sug: m.sug ? m.sug.id : "", sc: m.s, ok: !!m.o }; });
    IMP.msg = (IMP.rows.length ? "" : "No se reconoció ningún renglón con nombre de cadete. Revisa que la lista esté completa y legible.") + (notes.length ? " " + notes.join(" · ") : "");
  } catch (e) { console.error(e); IMP.msg = errMsg(e) || (e.code === "empty" ? "El archivo no tiene texto legible." + (notes.length ? " " + notes.join(" · ") : "") : "No se pudo leer el archivo. Prueba con una foto más nítida o con el archivo Excel."); }
  IMP.busy = false; G.vImp(); };
const _aplicar = G.aplicar;
G.aplicar = async function () { if (IMP.tipo !== "alc") return _aplicar();
  const R = IMP.rows.filter(r => r.ok && r.oid), seen = new Set(), ciclo = cfg("ciclo"); let n = 0;
  R.forEach(r => { if (seen.has(r.oid) || r.puntaje == null) return; seen.add(r.oid); const o = clone(S.items.get(r.oid)); const rest = (o.alc || []).filter(x => !(x.libro === IMP.libro && x.tipo === IMP.alcTipo && (x.ciclo || ciclo) === ciclo));
    rest.push({ id: "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ciclo, a: o.a, sem: cfg("semestre"), libro: IMP.libro, tipo: IMP.alcTipo, fecha: IMP.alcFecha || "", forma: "", pts: Math.max(0, Math.min(100, Math.round(Number(r.puntaje)))) }); o.alc = rest; saveItem(o, true); n++; });
  const leidos = IMP.rows.length, detalle = `${ANIO[IMP.a]} año · libro ${IMP.libro} · ${(TIPO_ALC.find(t => t[0] === IMP.alcTipo) || [, ""])[1]}`;
  const archivos = []; for (const f of IMP.files) { let r = {}; try { r = await guardarArchivo(f); } catch (e) { console.warn(e); } archivos.push({ nombre: f.name, ...r }); }
  if (S.db) { const id = "i" + Date.now().toString(36); write(id, () => S.db.collection("importaciones").doc(id).set({ tipo: "alc", detalle, aplicados: n, leidos, archivos, at: new Date().toISOString() })); }
  IMP.rows = null; IMP.files = []; IMP.msg = `Se aplicaron ${n} cambio${n === 1 ? "" : "s"}.`; render(); toast(`${n} cambio${n === 1 ? "" : "s"} aplicado${n === 1 ? "" : "s"}`); };

/* ---------- respaldos y carga de datos ---------- */
const FORMATO = "ingles-seguimiento-eme-respaldo";
function snapshot() { const al = {}; S.items.forEach((v, k) => { const o = { ...v }; delete o.id; al[k] = o; });
  return { formato: FORMATO, version: VER, app: "Seguimiento de inglés (réplica)", exportedAt: new Date().toISOString(), cfg: JSON.parse(JSON.stringify(S.cfg || {})), alumnos: al, importaciones: Object.fromEntries((IMP.log || []).map(l => { const x = { ...l }; delete x.id; return [l.id, x]; })) }; }
async function downloadJson() { const blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: "application/json" }); const DL = await window.claude.use("downloads"); await DL.save({ filename: `RESPALDO SEGUIMIENTO INGLES ${hoy()}.json`, data: blob }); toast("Respaldo JSON listo"); }
async function replaceAll(data) { if (!S.db) throw new Error("Sin base"); for (const c of ["alumnos", "importaciones", "ajustes"]) await S.db._clear(c);
  const items = []; Object.entries(data.alumnos || {}).forEach(([id, d]) => items.push({ col: "alumnos", id, data: d })); Object.entries(data.importaciones || {}).forEach(([id, d]) => items.push({ col: "importaciones", id, data: d }));
  items.push({ col: "ajustes", id: "general", data: { ...DEF, sesiones: [], minimo: 6, riesgo: 2, ...(data.cfg || {}) } }); await S.db._bulk(items);
  S.cfg = { ...DEF, sesiones: [], minimo: 6, riesgo: 2, ...(data.cfg || {}) }; await Promise.all(["ajustes", "importaciones", "alumnos"].map(c => S.db._notify(c))); }
async function importJson(file) { let d; try { d = JSON.parse(await file.text()); } catch (e) { toast("El archivo no es un JSON válido"); return; }
  if (!d || d.formato !== FORMATO || !d.alumnos) { toast("No es un respaldo de esta app"); return; }
  const n = Object.keys(d.alumnos).length; if (S.items.size && !(await ask("Reemplazar datos", `Se reemplazan los ${S.items.size} cadetes de este dispositivo por los ${n} del respaldo.`, "Reemplazar", true))) return;
  await replaceAll(d); toast(`Respaldo cargado: ${n} cadetes`); }
function idFor(m, n) { const k = (m ? "m-" + String(m).replace(/[^A-Za-z0-9]/g, "") : "n-" + norm(n).replace(/[^a-z]+/g, "-")).slice(0, 60); return k; }
/* lista de cadetes desde Excel o CSV: Año, Grupo, Nombre, Matrícula, Docente, Compañía, Exento, Generación */
async function importLista(file) { try { const X = await loadXLSX(); const wb = X.read(await file.arrayBuffer(), { type: "array" }); let n = 0, upd = 0; const items = [];
  const parseA = v => { const m = String(v ?? "").match(/[1-4]/); return m ? m[0] : ""; };
  for (const sn of wb.SheetNames) { const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: "" }); let h = -1, col = {};
    rows.forEach((r, i) => { const low = r.map(c => norm(String(c))); if (h < 0 && low.some(c => /nombre|cadete/.test(c))) { h = i; low.forEach((c, j) => { if (/^ano|^año|^a o$/.test(c) || c === "ano") col.a = j; if (/grupo/.test(c) && col.g == null) col.g = j; if ((/nombre|cadete/.test(c)) && col.n == null) col.n = j; if (/matr/.test(c)) col.m = j; if (/docente/.test(c)) col.d = j; if (/compa|cia/.test(c)) col.c = j; if (/exent/.test(c)) col.ex = j; if (/generac/.test(c)) col.gen = j; }); return; }
      if (h < 0 || col.n == null) return; const nm = String(r[col.n] || "").replace(/\s+/g, " ").trim(); if (!nm || nm.split(" ").length < 2) return;
      const a = parseA(col.a != null ? r[col.a] : sn), g = String(col.g != null ? r[col.g] : "").replace(/^.*?G(?=\d)/i, "").trim(), m = col.m != null ? String(r[col.m]).trim() : "";
      if (!a) return; const ex = [...S.items.values()].find(o => (m && o.m === m) || norm(o.n) === norm(nm)); const id = ex ? ex.id : idFor(m, nm); const base = ex ? clone(ex) : { n: nm };
      delete base.id; Object.assign(base, { a, g: g || base.g || "", m: m || base.m || "", d: col.d != null && r[col.d] ? String(r[col.d]).trim() : base.d || "", c: col.c != null && r[col.c] ? String(r[col.c]).trim() : base.c || "", gen: col.gen != null && r[col.gen] ? String(r[col.gen]).trim() : base.gen || "" });
      if (col.ex != null) base.ex = /^(s|si|sí|x|1|true)$/i.test(String(r[col.ex]).trim()); items.push({ col: "alumnos", id, data: base }); ex ? upd++ : n++; }); }
  if (!items.length) { toast("No se encontró una tabla con columnas Año, Grupo y Nombre"); return; }
  await S.db._bulk(items); await S.db._notify("alumnos"); toast(`${n} cadetes nuevos · ${upd} actualizados`); } catch (e) { console.error(e); toast("No se pudo leer la lista"); } }
async function concentradoXlsx() { try { const X = await XL.lib(), wb = X.utils.book_new(), L = all().sort((x, y) => x.a.localeCompare(y.a) || String(x.g).localeCompare(String(y.g)) || x.n.localeCompare(y.n, "es")); const labs = allLabels();
  const head = ["Año", "Grupo", "Docente", "Nombre", "Matrícula", "Exento", "Diagnóstico 2026", ...labs.map(l => "ALCPT " + l), "ALC promedio", ...PARC.map(p => p[1]), "Promedio", "Estado", "Remedial", "Estatus remedial", "Faltas sabatinas"];
  const rows = [["CONCENTRADO DE INGLÉS · " + cfg("ciclo")], ["Esc. Mil. Enfría. · Mesa de Idioma Extranjero · " + hoy()], head];
  L.forEach(o => rows.push([ANIO[o.a] + " año", "Grupo " + o.g, o.d || "", o.n, o.m || "", o.ex ? "Sí" : "", o.diag ?? "", ...labs.map(l => { const h = (o.alcpt || []).find(x => x[0] === l); return h ? h[1] : ""; }), alcAvg(o) == null ? "" : Math.round(alcAvg(o) * 10) / 10, ...parts(o).map(v => v == null ? "" : v), prom(o) == null ? "" : prom(o), o.ex ? "Exento" : EST_TXT[estAc(o)], inRem(o) ? "Sí" : "", o.rem ? REM_TXT[remEst(o)] || "" : "", inRem(o) ? faltas(o) : ""]));
  const W = head.length; const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: W - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: W - 1 } }, ...XL.runs(rows, [0, 1, 2], 3, rows.length - 1)];
  X.utils.book_append_sheet(wb, XL.sheet(X, rows, [9, 10, 28, 36, 14, 7, 10, ...labs.map(() => 10), 9, 10, 10, 10, 9, 14, 9, 14, 9], merges, [2]), "Concentrado");
  await XL.save(X, wb, `CONCENTRADO INGLES ${hoy()}.xlsx`); toast("Concentrado descargado"); } catch (e) { console.error(e); toast("No se pudo preparar el concentrado"); } }
/* cierre de ciclo: guarda la trayectoria y promueve de año; 4/o. año pasa a egresado */
async function cerrarCiclo(nuevo) { const c = cfg("ciclo"), sm = cfg("semestre") === "2" ? "2/o. semestre" : "1/er. semestre"; const items = [];
  all().forEach(o => { const x = clone(o); delete x.id; const T = (x.tray || []).filter(t => !(t.ciclo === c && t.sem === sm)); const parc = PARC.map(([k]) => ptot(x.cal && x.cal[k])).filter(v => v != null);
    T.push({ ciclo: c, sem: sm, a: x.a, g: String(x.g), d: x.d || "", parciales: parc, calCiclo: x.cal || {} }); x.tray = T; x.cal = {};
    if (x.a === "4") { x.eg = true; x.estatus = "Egresado"; } else x.a = String(+x.a + 1);
    if (x.rem && x.rem.on) { x.rem = { ...x.rem }; } items.push({ col: "alumnos", id: o.id, data: x }); });
  await S.db._bulk(items); S.cfg = { ...S.cfg, ciclo: nuevo, semestre: "1", sesiones: [] }; await S.db._bulk([{ col: "ajustes", id: "general", data: S.cfg }]); await S.db._notify("ajustes"); await S.db._notify("alumnos"); }
G.ReplicaIng.snapshot = snapshot; G.ReplicaIng.replaceAll = replaceAll; G.ReplicaIng.importLista = importLista; G.ReplicaIng.concentradoXlsx = concentradoXlsx; G.ReplicaIng.cerrarCiclo = cerrarCiclo;

/* ---------- Ajustes ---------- */
const _vCfg = G.vCfg;
function escTable(id, E) { return `<div class="tscroll"><table class="tbl esc-t" id="${id}" style="min-width:520px"><thead><tr><th class="num">Desde</th><th class="num">Hasta</th><th>Color</th><th>Significado</th><th></th></tr></thead><tbody>
  ${E.map((b, i) => `<tr><td class="num"><input type="number" min="0" max="100" data-k="min" value="${b.min}" aria-label="Desde"></td><td class="num"><input type="number" min="0" max="100" data-k="max" value="${b.max}" aria-label="Hasta"></td><td><input type="color" data-k="c" value="${esc(b.c)}" aria-label="Color"></td><td><input data-k="t" value="${esc(b.t)}" aria-label="Significado" style="width:100%"></td><td><button class="btn ghost small" data-erm="${i}" type="button">Quitar</button></td></tr>`).join("")}</tbody></table></div>
  <p><button class="btn ghost small" type="button" data-eadd="${id}">Agregar banda</button></p>`; }
function readEsc(id) { return [...document.querySelectorAll(`#${id} tbody tr`)].map(tr => { const g = k => tr.querySelector(`[data-k="${k}"]`).value; return { min: +g("min"), max: +g("max"), c: g("c"), t: g("t").trim() }; }).filter(b => !isNaN(b.min) && !isNaN(b.max)).sort((a, b) => a.min - b.min); }
G.vCfg = function () {
  _vCfg();
  const P = cfg("planAlc");
  VW.insertAdjacentHTML("beforeend", `
  <h2>Ciclo lectivo</h2><div class="g2" style="max-width:520px"><label class="hint">Ciclo actual<input id="xCi" value="${esc(cfg("ciclo"))}" placeholder="2026-2027"></label><label class="hint">Semestre actual<select id="xSe"><option value="1" ${cfg("semestre") === "1" ? "selected" : ""}>1/er. semestre</option><option value="2" ${cfg("semestre") === "2" ? "selected" : ""}>2/o. semestre</option></select></label></div>
  <h2>Escala de colores (semáforo de remedial)</h2><p class="lead">Rangos de puntaje (0–100) y su color. La primera banda marca a los candidatos al remedial.</p>
  <h3>ALCPT</h3>${escTable("xEsA", cfg("escalaAlcpt"))}<h3>ALC (exámenes de libro)</h3>${escTable("xEsL", cfg("escalaAlc"))}
  <h2>Plan de libros ALC (tabla C.2)</h2><div class="tscroll"><table class="tbl" id="xPlan" style="min-width:420px"><thead><tr><th>Año</th><th>Semestre</th><th>Libros</th></tr></thead><tbody>
  ${P.map((x, i) => `<tr><td><select data-k="a">${["1", "2", "3", "4"].map(a => `<option value="${a}" ${x.a === a ? "selected" : ""}>${ANIO[a]} año</option>`).join("")}</select></td><td><select data-k="sem"><option value="1" ${x.sem === "1" ? "selected" : ""}>1/er.</option><option value="2" ${x.sem === "2" ? "selected" : ""}>2/o.</option></select></td><td><input data-k="libros" value="${esc(x.libros)}" placeholder="Ej. 6-7"></td></tr>`).join("")}</tbody></table></div>
  <p class="hint">Supuesto inicial: en 2/o., 3/er. y 4/o. año el primer par de libros corresponde al 1/er. semestre y el segundo al 2/o. Corrígelo si no es así.</p>
  <p style="margin-top:12px"><button class="btn" id="xSave">Guardar ciclo, escalas y plan</button></p>
  <h2>Datos de este dispositivo</h2><p class="lead">La app no envía datos a ningún servidor. Los cadetes, puntajes y remediales se guardan solo en este navegador. Descarga un respaldo con frecuencia.</p>
  <div class="bar"><button class="btn" id="xDl">Descargar respaldo JSON</button><label class="btn ghost">Importar respaldo JSON<input type="file" id="xUp" accept=".json,application/json" hidden></label>
  <label class="btn ghost">Importar lista de cadetes (Excel o CSV)<input type="file" id="xLi" accept=".xlsx,.xls,.csv" hidden></label><button class="btn ghost" id="xCo">Descargar concentrado .xlsx</button></div>
  <p class="hint">La lista de cadetes necesita columnas Año, Grupo y Nombre; opcionales: Matrícula, Docente, Compañía, Exento y Generación. Si el cadete ya existe (por matrícula o nombre), se actualiza.</p>
  <h2>Cierre de ciclo</h2><p class="lead">Guarda grupo, docente y calificaciones del ciclo en la trayectoria de cada cadete y lo promueve al año siguiente; 4/o. año pasa a egresado. Los puntajes ALCPT, ALC y remediales se conservan.</p>
  <div class="bar"><input id="xNc" placeholder="Nuevo ciclo, ej. 2027-2028" aria-label="Nuevo ciclo"><button class="btn danger" id="xCc">Cerrar ciclo y promover</button></div>
  <h2>Borrar datos</h2><div class="bar"><button class="btn danger" id="xWipe">Borrar todos los datos de este dispositivo</button></div>
  <p class="hint">Réplica local v${VER} · sin conexión a internet después de la primera visita.</p>`);
  const bindE = id => { const T = $("#" + id); T.parentElement.parentElement.querySelectorAll(`[data-eadd="${id}"]`).forEach(b => b.onclick = () => { T.querySelector("tbody").insertAdjacentHTML("beforeend", `<tr><td class="num"><input type="number" min="0" max="100" data-k="min" value="0"></td><td class="num"><input type="number" min="0" max="100" data-k="max" value="100"></td><td><input type="color" data-k="c" value="#888888"></td><td><input data-k="t" value="" style="width:100%"></td><td><button class="btn ghost small" type="button" onclick="this.closest('tr').remove()">Quitar</button></td></tr>`); });
    T.querySelectorAll("[data-erm]").forEach(b => b.onclick = () => b.closest("tr").remove()); };
  bindE("xEsA"); bindE("xEsL");
  $("#xSave").onclick = () => { const ea = readEsc("xEsA"), el = readEsc("xEsL"); if (!ea.length || !el.length) { toast("Cada escala necesita al menos una banda"); return; }
    S.cfg.escalaAlcpt = ea; S.cfg.escalaAlc = el; S.cfg.ciclo = $("#xCi").value.trim() || DEF.ciclo; S.cfg.semestre = $("#xSe").value;
    S.cfg.planAlc = [...document.querySelectorAll("#xPlan tbody tr")].map(tr => ({ a: tr.querySelector('[data-k="a"]').value, sem: tr.querySelector('[data-k="sem"]').value, libros: tr.querySelector('[data-k="libros"]').value.trim() })); saveCfg(); toast("Ajustes guardados"); };
  $("#xDl").onclick = () => downloadJson().catch(e => { console.error(e); toast("No se pudo descargar"); });
  $("#xUp").onchange = e => { const f = e.target.files[0]; if (f) importJson(f); e.target.value = ""; };
  $("#xLi").onchange = e => { const f = e.target.files[0]; if (f) importLista(f); e.target.value = ""; };
  $("#xCo").onclick = () => concentradoXlsx();
  $("#xCc").onclick = async () => { const nc = $("#xNc").value.trim(); if (!/^\d{4}-\d{4}$/.test(nc)) { toast("Escribe el nuevo ciclo, por ejemplo 2027-2028"); return; }
    if (!(await ask("Cerrar ciclo", `Se guarda el ciclo ${cfg("ciclo")} en la trayectoria de ${all().length} cadetes, se promueven de año y 4/o. año pasa a egresado. Descarga antes un respaldo.`, "Cerrar ciclo", true))) return;
    await cerrarCiclo(nc); toast("Ciclo cerrado"); };
  $("#xWipe").onclick = async () => { if (!(await ask("Borrar datos", "Se borran todos los cadetes, puntajes, remediales y ajustes de este dispositivo. No se puede deshacer.", "Borrar todo", true))) return;
    await replaceAll({ alumnos: {}, importaciones: {}, cfg: {} }); S.items = new Map(); render(); toast("Datos borrados"); };
};

/* ---------- arranque ---------- */
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("printing")) document.body.classList.remove("printing"); });
window.addEventListener("afterprint", () => document.body.classList.remove("printing"));
})(window);

/* Seguimiento de inglés v1.2 · Aprobación ALCPT por año.
   Un mínimo y una tabla de ponderación (puntos = calificación) por año, editables en Ajustes:
   1/er. sin mínimo; 2/o. 45 (50 o más=10 … 45=6.0); 3/er. 31 (36 o más=10 … 31=6); 4/o. 55 (60 o más=10 … 55=6).
   Por debajo del mínimo = No aprobado. */
(function (G) {
"use strict";
const RI = () => G.ReplicaIng;
const DEFAP = {
  apTabla: {
    "1": { min: null, conv: [] },
    "2": { min: 45, conv: [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]] },
    "3": { min: 31, conv: [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]] },
    "4": { min: 55, conv: [[60, 10], [59, 9], [58, 8], [57, 7], [56, 6.5], [55, 6]] }
  },
  aprobBase: "examen", pesoParc: 60, pesoAlcpt: 40, monitorUmbral: 7
};
/* claves de versiones anteriores que ya no se usan (no deben revivir) */
const OLD = ["minPreset", "minSem", "minAlcpt", "convAlcpt", "min12", "min12v", "conv12", "refAlcpt", "sem2Ini", "sem2Fin"];
function mig() { if (!S.cfg || S.cfg.apVer === 2) return; OLD.forEach(k => delete S.cfg[k]); S.cfg.apTabla = JSON.parse(JSON.stringify(DEFAP.apTabla)); S.cfg.apVer = 2; }
const C = k => { mig(); return S.cfg && S.cfg[k] != null ? S.cfg[k] : DEFAP[k]; };
const nv = v => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const MESL = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11, jan: 0, apr: 3, aug: 7, dec: 11 };
function labDate(l) { const m = norm(String(l || "")).match(/(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic|jan|apr|aug|dec)[a-z]*\.?\s*-?\s*(\d{4})/); return m ? new Date(+m[2], MESL[m[1]], 15) : null; }
const cicloIni = d => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1);
const cicloStr = c => +String(c || "").slice(0, 4) || null;
const DIAG_LAB = "Sep 2026";

/* año de referencia del cadete: ciclo actual, o el último de su trayectoria si ya egresó */
function refOf(o) { const cur = cicloStr(C("ciclo") || (RI() && RI().cfg("ciclo"))) || 2026;
  if (o.eg) { const T = (o.tray || []).slice().sort((x, y) => String(x.ciclo).localeCompare(String(y.ciclo))); const t = T[T.length - 1]; if (t) return { c: cicloStr(t.ciclo) || cur - 1, a: +t.a || +o.a || 4 }; return { c: cur - 1, a: +o.a || 4 }; }
  return { c: cur, a: +o.a }; }
/* año que cursaba al presentar el examen */
function yearAt(o, lab) { const r = refOf(o), d = labDate(lab); if (C("aprobBase") === "actual") return { a: String(r.a), sinFecha: !d };
  if (!d) return { a: String(r.a), sinFecha: true };
  const a = r.a - (r.c - cicloIni(d)); return { a: a >= 1 && a <= 4 ? String(a) : "", sinFecha: false }; }
const fila = a => (C("apTabla") || {})[a] || { min: null, conv: [] };
function minFor(a) { return { min: nv(fila(a).min), oficial: true }; }
function minTxt(a) { const m = minFor(a).min; return m == null ? "Sin mínimo" : String(m); }
function convTab(a) { const t = fila(a).conv; return t && t.length ? t : null; }
/* calificación según la tabla del año; null si queda por debajo del último renglón o no hay tabla */
function conv(a, pts) { pts = nv(pts); const t = convTab(a); if (pts == null || !t) return null; const s = t.slice().sort((x, y) => y[0] - x[0]);
  for (const [p, c] of s) if (pts >= p) return c; return null; }
/* resultado de un puntaje: ap = aprobado, na = no aprobado, sin = sin mínimo, nd = sin puntaje */
function res(o, v, lab) { v = nv(v); const y = yearAt(o, lab), m = y.a ? minFor(y.a) : { min: null, oficial: true };
  const st = v == null ? "nd" : m.min == null ? "sin" : v >= m.min ? "ap" : "na";
  return { st, a: y.a, min: m.min, oficial: true, sinFecha: y.sinFecha, cal: y.a ? conv(y.a, v) : null, v }; }
const TXT = { ap: "Aprobado", na: "No aprobado", sin: "Sin mínimo", nd: "Sin puntaje" };
function txt(r) { return TXT[r.st]; }
function badge(r, pre) { if (!r || r.st === "nd") return ""; const cls = r.st === "ap" ? "b-out" : r.st === "na" ? "b-bad" : "b-sin";
  const tt = r.st === "sin" ? `${ANIO[r.a] || ""} año: sin mínimo` : `${ANIO[r.a]} año · mínimo ${r.min} pts${r.cal != null ? " · calificación " + r.cal : ""}`;
  return `<span class="badge ${cls} b-ap" title="${esc(tt)}">${esc((pre ? pre + " " : "") + (r.st === "sin" ? "sin mín." : r.st === "ap" ? "aprob." : "no aprob."))}</span>`; }
function chip(r) { if (!r || r.st === "nd") return "—"; const cls = r.st === "ap" ? "ap-ok" : r.st === "na" ? "ap-no" : "ap-sin";
  return `<span class="apres ${cls}">${esc(txt(r))}</span><span class="sub">${r.min != null ? `mín. ${r.min} · ${ANIO[r.a]} año${r.cal != null ? " · calif. " + r.cal : ""}` : r.a ? `${ANIO[r.a]} año` : "antes de ingresar"}${r.sinFecha ? " · sin fecha" : ""}</span>`; }
function lastRes(o) { const L = RI().alcptList(o).filter(x => nv(x.v) != null); const l = L[L.length - 1]; return l ? { ...res(o, l.v, l.l), lab: l.l } : { st: "nd" }; }
function diagRes(o) { return nv(o.diag) == null ? { st: "nd" } : { ...res(o, o.diag, DIAG_LAB), lab: "Diagnóstico sep 2026" }; }
/* monitor: calificación diagnóstica mayor al umbral (7.0); se puede fijar a mano en la ficha */
function monitor(o) { if (o.monitor === true || o.monitor === false) return o.monitor; const r = diagRes(o); return r.st !== "nd" && r.cal != null && r.cal > nv(C("monitorUmbral")); }
/* salida del remedial: un examen posterior al alta alcanza el mínimo */
function salida(o) { if (!inRem(o)) return null; const alta = (o.rem && o.rem.alta) || "";
  const t0 = alta ? new Date(alta + "T12:00:00").getTime() : 0;
  const after = RI().alcptList(o).filter(x => nv(x.v) != null && labDate(x.l) && RI().labKey(x.l) > t0)
    .map(x => ({ f: x.l, v: nv(x.v), r: res(o, x.v, x.l) }));
  const re = ((o.rem && o.rem.reeval) || []).filter(x => /ALCPT|recuperaci/i.test(x.tipo || "") && nv(x.pts) != null).map(x => { const m = minFor(String(o.a)); return { f: x.fecha, v: nv(x.pts), r: { st: m.min == null ? "sin" : nv(x.pts) >= m.min ? "ap" : "na", min: m.min } }; });
  const hit = [...after, ...re].filter(x => x.r.st === "ap").pop(); return hit ? { f: hit.f, v: hit.v, min: hit.r.min } : null; }
/* calificación final del ciclo: parciales × 60 % + A.L.C.P.T. final convertido × 40 % */
function finalAlcpt(o) { const c = C("ciclo") || RI().cfg("ciclo"); const L = RI().alcptList(o).filter(x => x.m && x.m.tipo === "final" && nv(x.v) != null && RI().cicloOf(labDate(x.l)) === c); return L.pop() || null; }
function calFinal(o) { const f = finalAlcpt(o), p = prom(o), a = String(o.a); if (!f) return { st: "pend", p };
  const r = res(o, f.v, f.l); if (r.st === "na") return { st: "extra", p, f, r }; if (r.cal == null || p == null) return { st: "pend", p, f, r };
  const v = Math.round((p * nv(C("pesoParc")) + r.cal * nv(C("pesoAlcpt"))) / 100 * 100) / 100; return { st: v >= S.cfg.minimo ? "ap" : "na", v, p, f, r }; }
/* conteo por año: diagnóstico y último ALCPT */
function resumen(L) { const out = []; ["1", "2", "3", "4"].forEach(a => { const Y = L.filter(o => o.a === a); if (!Y.length) return;
  const cnt = fn => { const c = { ap: 0, na: 0, sin: 0, nd: 0 }; Y.forEach(o => c[fn(o).st]++); return c; };
  out.push({ a, n: Y.length, min: minFor(a), diag: cnt(diagRes), ult: cnt(lastRes), mon: Y.filter(monitor).length, sal: Y.filter(o => salida(o)).length }); }); return out; }
const pct = (ap, na) => (ap + na ? Math.round(ap * 1000 / (ap + na)) / 10 : null);
G.ReplicaIng.ap = { DEFAP, C, mig, yearAt, minTxt, minFor, conv, res, txt, TXT, badge, chip, lastRes, diagRes, monitor, salida, calFinal, finalAlcpt, resumen, pct, labDate };

/* ---------- insignias (Cadetes, ficha y remedial) ---------- */
const _badges = G.badges;
G.badges = function (o) { let h = _badges(o); if (!o || !RI()) return h; try { const d = diagRes(o), l = lastRes(o);
  if (d.st !== "nd") h += badge(d, "Diag.");
  if (l.st !== "nd") h += badge(l, "ALCPT");
  if (monitor(o)) h += `<span class="badge b-ev" title="Calificación diagnóstica mayor a ${esc(String(C("monitorUmbral")))}: monitor, exento de parciales">Monitor</span>`;
  if (salida(o)) h += `<span class="badge b-out" title="Alcanzó el mínimo después del alta: puede darse de baja del remedial">Puede salir del remedial</span>`;
  } catch (e) { console.warn(e); } return h; };

/* ---------- Panorama: aprobación ALCPT por año ---------- */
function tablaResumen(R) { const cell = c => { const p = pct(c.ap, c.na); return `<td class="num">${c.ap}</td><td class="num ${c.na ? "lo" : ""}">${c.na}</td><td class="num">${c.sin || "—"}</td><td class="num">${p == null ? "—" : p + "%"}</td>`; };
  return `<div class="tscroll"><table class="tbl aptab"><thead><tr><th rowspan="2">Año</th><th rowspan="2" class="num">Cadetes</th><th rowspan="2" class="num">Mínimo</th><th colspan="4" class="cen">Diagnóstico 21 sep. 2026</th><th colspan="4" class="cen">Último ALCPT registrado</th><th rowspan="2" class="num">Monitores</th><th rowspan="2" class="num">Pueden salir del remedial</th></tr>
  <tr><th class="num">Aprob.</th><th class="num">No aprob.</th><th class="num">Sin mín.</th><th class="num">%</th><th class="num">Aprob.</th><th class="num">No aprob.</th><th class="num">Sin mín.</th><th class="num">%</th></tr></thead><tbody>
  ${R.map(r => `<tr><td>${ANIO[r.a]} año</td><td class="num">${r.n}</td><td class="num">${esc(minTxt(r.a))}</td>${cell(r.diag)}${cell(r.ult)}<td class="num">${r.mon}</td><td class="num">${r.sal}</td></tr>`).join("")}</tbody></table></div>`; }
G.ReplicaIng.ap.tablaResumen = tablaResumen;
const _vPan = G.vPan;
G.vPan = function () { _vPan(); try { const R = resumen(all()); if (!R.length) return; const m = VW.querySelector(".mon");
  const html = `<section class="apsec"><div class="chh"><h3><em>ALCPT</em>Aprobación por año</h3><span class="hint">Mínimo y ponderación de cada año en Ajustes.</span></div>
  ${tablaResumen(R)}<p class="hint">Cada examen se califica con el mínimo del año que cursaba el cadete cuando lo presentó${C("aprobBase") === "actual" ? " (Ajustes: se usa el año actual)" : ""}. El % se calcula sobre aprobados + no aprobados.</p></section>`;
  if (m) m.insertAdjacentHTML("afterend", html); else VW.insertAdjacentHTML("afterbegin", html); } catch (e) { console.warn(e); } };

/* ---------- ficha: resultado ALCPT, monitor y calificación final ---------- */
const _openFicha = G.openFicha;
G.openFicha = function (id) { _openFicha(id); const o = S.items.get(id); if (!o || o.eg) return; try {
  const hs = [...document.querySelectorAll("#fichaBody h3")]; const after = hs.find(h => /Historial ALCPT/.test(h.textContent)); const next = after ? hs[hs.indexOf(after) + 1] : null;
  const L = RI().alcptList(o).filter(x => nv(x.v) != null).map(x => ({ l: "ALCPT " + x.l, r: res(o, x.v, x.l) })); if (nv(o.diag) != null) L.push({ l: "Diagnóstico 21 sep. 2026", r: diagRes(o) });
  const cf = calFinal(o), sal = salida(o), mon = monitor(o);
  const html = `<h3>Resultado ALCPT por año</h3>${L.length ? `<div class="tscroll"><table class="tbl" style="min-width:460px"><thead><tr><th>Examen</th><th class="num">Puntaje</th><th>Año que cursaba</th><th class="num">Mínimo</th><th class="num">Calif.</th><th>Resultado</th></tr></thead><tbody>
    ${L.map(x => `<tr><td>${esc(x.l)}</td><td class="num">${x.r.v}</td><td>${x.r.a ? ANIO[x.r.a] + " año" : "—"}${x.r.sinFecha ? " (sin fecha)" : ""}</td><td class="num">${x.r.min ?? "—"}</td><td class="num">${x.r.cal ?? (x.r.min != null && x.r.st === "na" ? "NA" : "—")}</td><td>${esc(txt(x.r))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Sin puntajes ALCPT.</p>`}
  <div class="bar"><label class="hint">Monitor<select id="fMon"><option value="">Automático (${mon && o.monitor == null ? "sí" : "no"})</option><option value="si" ${o.monitor === true ? "selected" : ""}>Sí</option><option value="no" ${o.monitor === false ? "selected" : ""}>No</option></select></label>
  <span class="hint">${sal ? `Alcanzó ${sal.v} pts (mín. ${sal.min}) en ${esc(sal.f || "")}: puede darse de baja del remedial.` : ""}</span></div>
  <p class="hint">Calificación final del ciclo (parciales ${C("pesoParc")} % + A.L.C.P.T. final ${C("pesoAlcpt")} %): ${cf.st === "pend" ? "pendiente" + (cf.f ? "" : " del A.L.C.P.T. final") : cf.st === "extra" ? `A.L.C.P.T. final ${cf.f.v} pts, por debajo de ${cf.r.min}: examen extraordinario` : `<b>${cf.v.toFixed(2)}</b> · ${cf.st === "ap" ? "aprobado" : "no aprobado"}`}.</p>`;
  if (next) next.insertAdjacentHTML("beforebegin", html); else $("#fichaBody").insertAdjacentHTML("beforeend", html);
  const s = $("#fMon"); if (s) s.onchange = () => { const x = clone(S.items.get(id)); if (s.value === "si") x.monitor = true; else if (s.value === "no") x.monitor = false; else delete x.monitor; saveItem(x, true); toast("Monitor actualizado"); };
  } catch (e) { console.warn(e); } };

/* ---------- Ajustes: mínimos por año, conversión y ponderación ---------- */
const convTxt = t => (t || []).map(([p, c]) => `${p}=${c}`).join(", ");
const parseConv = s => String(s || "").split(/[,;\n]+/).map(x => x.trim().match(/^(\d+)\s*[=:]\s*(\d+(?:[.,]\d+)?)$/)).filter(Boolean).map(m => [+m[1], +m[2].replace(",", ".")]).sort((a, b) => b[0] - a[0]);
const _vCfg = G.vCfg;
G.vCfg = function () { _vCfg(); const T = C("apTabla"); const anchor = [...VW.querySelectorAll("h2")].find(h => /Datos de este dispositivo/.test(h.textContent));
  const html = `<h2>ALCPT: puntaje mínimo aprobatorio por año</h2>
  <div class="tscroll"><table class="tbl" id="xAp" style="min-width:520px"><thead><tr><th>Año</th><th class="num">Mínimo</th><th>Ponderación (puntos = calificación)</th></tr></thead><tbody>
  ${["1", "2", "3", "4"].map(a => `<tr><td>${ANIO[a]} año</td><td class="num"><input type="number" min="0" max="100" data-k="min" data-a="${a}" value="${(T[a] || {}).min ?? ""}" placeholder="Sin mínimo" aria-label="Mínimo de ${ANIO[a]} año" style="width:112px"></td>
    <td><input data-k="conv" data-a="${a}" value="${esc(convTxt((T[a] || {}).conv))}" placeholder="Sin tabla" style="width:100%" aria-label="Ponderación de ${ANIO[a]} año"></td></tr>`).join("")}</tbody></table></div>
  <p class="hint">Ponderación: puntos=calificación separados por coma, de mayor a menor (el primer renglón vale también para más puntos). Por debajo del mínimo: No aprobado.</p>
  <div class="g3" style="max-width:760px"><label class="hint">Calificar cada examen con el año<select id="xBase"><option value="examen" ${C("aprobBase") === "examen" ? "selected" : ""}>que cursaba al presentarlo</option><option value="actual" ${C("aprobBase") === "actual" ? "selected" : ""}>que cursa ahora</option></select></label>
  <label class="hint">Parciales en la calificación final (%)<input type="number" id="xPp" min="0" max="100" value="${C("pesoParc")}"></label><label class="hint">A.L.C.P.T. final (%)<input type="number" id="xPa" min="0" max="100" value="${C("pesoAlcpt")}"></label>
  <label class="hint">Monitor si la calificación diagnóstica es mayor a<input type="number" id="xMu" step="0.1" min="0" max="10" value="${C("monitorUmbral")}"></label></div>
  <p><button class="btn" id="xApSave" type="button">Guardar mínimos y ponderación</button></p>`;
  if (anchor) anchor.insertAdjacentHTML("beforebegin", html); else VW.insertAdjacentHTML("beforeend", html);
  $("#xApSave").onclick = () => { const t = {}; ["1", "2", "3", "4"].forEach(a => { t[a] = { min: nv(VW.querySelector(`#xAp [data-k="min"][data-a="${a}"]`).value), conv: parseConv(VW.querySelector(`#xAp [data-k="conv"][data-a="${a}"]`).value) }; });
    const pp = nv($("#xPp").value), pa = nv($("#xPa").value); if (pp == null || pa == null || pp + pa !== 100) { toast("Los pesos deben sumar 100 %"); return; }
    OLD.forEach(k => delete S.cfg[k]); Object.assign(S.cfg, { apVer: 2, apTabla: t, aprobBase: $("#xBase").value, pesoParc: pp, pesoAlcpt: pa, monitorUmbral: nv($("#xMu").value) ?? 7 }); saveCfg(); toast("Mínimos y ponderación guardados"); }; };
})(window);

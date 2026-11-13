/* Seguimiento de inglés v1.1 · Aprobación ALCPT por año.
   Fuentes:
   - Mínimo aprobatorio oficial: Mensaje C.E.I. SAC./P.C.-100 del 22 Sep. 2026 (cumple SFPM/SAC.-987 del 17 Sep. 2026):
     3/er. año (Inglés III) 31 puntos; 4/o. año (Inglés V) 45 puntos. Tablas de conversión de puntos a calificación del mismo mensaje
     (3/er.: 36 o más = 10 por decisión de la Cap. del 14 Oct. 2026).
   - 1/er. y 2/o. año: no hay mínimo oficial. El programa «Idioma Extranjero II» trae 30+=10 … 26=6 (por confirmar a qué año aplica).
   - Puntaje de referencia al concluir cada semestre (tabla C.2 del informe del 30 Sep. 2026): solo referencia, no decide aprobación.
   - Calificación final = parciales 60 % + A.L.C.P.T. final 40 %, mínimo 6.0; con más de 7.0 en el diagnóstico el cadete es monitor.
   - Remedial: entra con el diagnóstico por debajo del mínimo; sale al alcanzar el mínimo en el siguiente examen (tabla R.1). */
(function (G) {
"use strict";
const RI = () => G.ReplicaIng;
const DEFAP = {
  minAlcpt: { "1": null, "2": null, "3": 31, "4": 45 },
  min12: false, min12v: 26,
  convAlcpt: { "3": [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]], "4": [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]] },
  conv12: [[30, 10], [29, 9], [28, 8], [27, 7], [26, 6]],
  refAlcpt: [{ a: "1", sem: "2", ref: "29-30" }, { a: "2", sem: "1", ref: "30" }, { a: "2", sem: "2", ref: "41" }, { a: "3", sem: "1", ref: "45" }, { a: "3", sem: "2", ref: "53" }, { a: "4", sem: "1", ref: "55" }, { a: "4", sem: "2", ref: "61" }],
  aprobBase: "examen", pesoParc: 60, pesoAlcpt: 40, monitorUmbral: 7
};
const C = k => (S.cfg && S.cfg[k] != null ? S.cfg[k] : DEFAP[k]);
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
function yearAt(o, lab) { const r = refOf(o); if (C("aprobBase") === "actual") return { a: String(r.a), sinFecha: false };
  const d = labDate(lab); if (!d) return { a: String(r.a), sinFecha: true };
  const a = r.a - (r.c - cicloIni(d)); return { a: a >= 1 && a <= 4 ? String(a) : "", sinFecha: false }; }
function minFor(a) { const m = nv((C("minAlcpt") || {})[a]); if (m != null) return { min: m, oficial: true };
  if ((a === "1" || a === "2") && C("min12")) return { min: nv(C("min12v")) ?? 26, oficial: false }; return { min: null, oficial: false }; }
function convTab(a) { const t = (C("convAlcpt") || {})[a]; if (t && t.length) return t; if ((a === "1" || a === "2") && C("min12")) return C("conv12"); return null; }
/* calificación convertida (0-10) según la tabla oficial; null si queda por debajo del mínimo o no hay tabla */
function conv(a, pts) { pts = nv(pts); const t = convTab(a); if (pts == null || !t) return null; const s = t.slice().sort((x, y) => y[0] - x[0]);
  for (const [p, c] of s) if (pts >= p) return c; return null; }
/* resultado de un puntaje: ap = aprobado, na = no aprobado, sin = sin mínimo oficial, nd = sin puntaje */
function res(o, v, lab) { v = nv(v); const y = yearAt(o, lab), m = y.a ? minFor(y.a) : { min: null, oficial: false };
  const st = v == null ? "nd" : m.min == null ? "sin" : v >= m.min ? "ap" : "na";
  return { st, a: y.a, min: m.min, oficial: m.oficial, sinFecha: y.sinFecha, cal: y.a ? conv(y.a, v) : null, v }; }
const TXT = { ap: "Aprobado", na: "No aprobado", sin: "Sin mínimo oficial", nd: "Sin puntaje" };
function txt(r) { return r.st === "sin" ? TXT.sin : TXT[r.st] + (r.st !== "nd" && !r.oficial ? " (mín. por confirmar)" : ""); }
function badge(r, pre) { if (!r || r.st === "nd") return ""; const cls = r.st === "ap" ? "b-out" : r.st === "na" ? "b-bad" : "b-sin";
  const tt = r.st === "sin" ? `${ANIO[r.a] || ""} año: sin mínimo aprobatorio oficial` : `${ANIO[r.a]} año · mínimo ${r.min} pts${r.oficial ? "" : " (por confirmar)"}${r.cal != null ? " · calificación " + r.cal : ""}`;
  return `<span class="badge ${cls} b-ap" title="${esc(tt)}">${esc((pre ? pre + " " : "") + (r.st === "sin" ? "sin mín." : r.st === "ap" ? "aprob." : "no aprob."))}</span>`; }
function chip(r) { if (!r || r.st === "nd") return "—"; const cls = r.st === "ap" ? "ap-ok" : r.st === "na" ? "ap-no" : "ap-sin";
  return `<span class="apres ${cls}">${esc(txt(r))}</span><span class="sub">${r.min != null ? `mín. ${r.min} · ${ANIO[r.a]} año${r.cal != null ? " · calif. " + r.cal : ""}` : r.a ? `${ANIO[r.a]} año` : "antes de ingresar"}${r.sinFecha ? " · sin fecha" : ""}</span>`; }
function lastRes(o) { const L = RI().alcptList(o).filter(x => nv(x.v) != null); const l = L[L.length - 1]; return l ? { ...res(o, l.v, l.l), lab: l.l } : { st: "nd" }; }
function diagRes(o) { return nv(o.diag) == null ? { st: "nd" } : { ...res(o, o.diag, DIAG_LAB), lab: "Diagnóstico sep 2026" }; }
/* monitor: calificación diagnóstica mayor al umbral (7.0); se puede fijar a mano en la ficha */
function monitor(o) { if (o.monitor === true || o.monitor === false) return o.monitor; const r = diagRes(o); return r.st !== "nd" && r.cal != null && r.cal > nv(C("monitorUmbral")); }
/* salida del remedial: un examen posterior al alta alcanza el mínimo */
function salida(o) { if (!inRem(o)) return null; const alta = (o.rem && o.rem.alta) || ""; const m = minFor(String(o.a)); if (m.min == null) return null;
  const t0 = alta ? new Date(alta + "T12:00:00").getTime() : 0;
  const after = RI().alcptList(o).filter(x => nv(x.v) != null && labDate(x.l) && RI().labKey(x.l) > t0)
    .map(x => ({ f: x.l, v: nv(x.v) }));
  const re = ((o.rem && o.rem.reeval) || []).filter(x => /ALCPT|recuperaci/i.test(x.tipo || "") && nv(x.pts) != null).map(x => ({ f: x.fecha, v: nv(x.pts) }));
  const hit = [...after, ...re].filter(x => x.v >= m.min).pop(); return hit ? { ...hit, min: m.min } : null; }
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
G.ReplicaIng.ap = { DEFAP, C, yearAt, minFor, conv, res, txt, TXT, badge, chip, lastRes, diagRes, monitor, salida, calFinal, finalAlcpt, resumen, pct, labDate };

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
  ${R.map(r => `<tr><td>${ANIO[r.a]} año</td><td class="num">${r.n}</td><td class="num">${r.min.min == null ? "Sin mínimo oficial" : r.min.min + (r.min.oficial ? "" : " (por confirmar)")}</td>${cell(r.diag)}${cell(r.ult)}<td class="num">${r.mon}</td><td class="num">${r.sal}</td></tr>`).join("")}</tbody></table></div>`; }
G.ReplicaIng.ap.tablaResumen = tablaResumen;
const _vPan = G.vPan;
G.vPan = function () { _vPan(); try { const R = resumen(all()); if (!R.length) return; const m = VW.querySelector(".mon");
  const html = `<section class="apsec"><div class="chh"><h3><em>ALCPT</em>Aprobación por año</h3><span class="hint">Mínimo oficial: 3/er. año 31 pts, 4/o. año 45 pts (Mensaje C.E.I. SAC./P.C.-100, 22 sep. 2026). 1/er. y 2/o. año sin mínimo oficial.</span></div>
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
G.vCfg = function () { _vCfg(); const mn = C("minAlcpt"), cv = C("convAlcpt"); const anchor = [...VW.querySelectorAll("h2")].find(h => /Datos de este dispositivo/.test(h.textContent));
  const html = `<h2>ALCPT: puntaje mínimo aprobatorio por año</h2>
  <p class="lead">Decide quién aprobó y quién no en Cadetes, ALC y ALCPT, Seguimiento EME, Panorama y Estadística. Oficial: 3/er. año 31 y 4/o. año 45 puntos (Mensaje C.E.I. SAC./P.C.-100 del 22 sep. 2026). Para 1/er. y 2/o. año no hay mínimo oficial: déjalo vacío.</p>
  <div class="tscroll"><table class="tbl" id="xAp" style="min-width:560px"><thead><tr><th>Año</th><th class="num">Mínimo (pts)</th><th>Tabla de conversión (puntos=calificación)</th><th>Referencia al concluir (tabla C.2, no decide)</th></tr></thead><tbody>
  ${["1", "2", "3", "4"].map(a => `<tr><td>${ANIO[a]} año</td><td class="num"><input type="number" min="0" max="100" data-k="min" data-a="${a}" value="${mn[a] ?? ""}" placeholder="Sin mínimo" aria-label="Mínimo de ${ANIO[a]} año" style="width:90px"></td>
    <td><input data-k="conv" data-a="${a}" value="${esc(convTxt(cv[a]))}" placeholder="${a < "3" ? "Sin tabla oficial" : ""}" style="width:100%" aria-label="Conversión de ${ANIO[a]} año"></td><td>${C("refAlcpt").filter(r => r.a === a).map(r => `${r.sem === "1" ? "1/er." : "2/o."} sem.: ${esc(r.ref)}`).join(" · ") || "—"}</td></tr>`).join("")}</tbody></table></div>
  <label class="chk"><input type="checkbox" id="xMin12" ${C("min12") ? "checked" : ""}> Usar para 1/er. y 2/o. año el mínimo del programa «Idioma Extranjero II» (<input type="number" id="xMin12v" value="${esc(String(C("min12v")))}" style="width:60px" aria-label="Mínimo del programa"> pts; tabla 30=10 … 26=6), marcado «por confirmar»</label>
  <div class="g3" style="max-width:760px"><label class="hint">Calificar cada examen con el mínimo del<select id="xBase"><option value="examen" ${C("aprobBase") === "examen" ? "selected" : ""}>año que cursaba al presentarlo</option><option value="actual" ${C("aprobBase") === "actual" ? "selected" : ""}>año que cursa ahora</option></select></label>
  <label class="hint">Peso de los parciales en la calificación final (%)<input type="number" id="xPp" min="0" max="100" value="${C("pesoParc")}"></label><label class="hint">Peso del A.L.C.P.T. final (%)<input type="number" id="xPa" min="0" max="100" value="${C("pesoAlcpt")}"></label>
  <label class="hint">Monitor si la calificación diagnóstica es mayor a<input type="number" id="xMu" step="0.1" min="0" max="10" value="${C("monitorUmbral")}"></label></div>
  <p class="hint">Calificación final = parciales × peso + A.L.C.P.T. final convertido × peso; aprobatoria ${S.cfg.minimo}. Si el A.L.C.P.T. final queda por debajo del mínimo, el cadete va a extraordinario. El remedial lo deja quien alcanza el mínimo en el siguiente examen.</p>
  <p><button class="btn" id="xApSave" type="button">Guardar mínimos y ponderación</button></p>`;
  if (anchor) anchor.insertAdjacentHTML("beforebegin", html); else VW.insertAdjacentHTML("beforeend", html);
  $("#xApSave").onclick = () => { const m = {}, c = {}; VW.querySelectorAll('#xAp [data-k="min"]').forEach(i => { m[i.dataset.a] = nv(i.value); }); VW.querySelectorAll('#xAp [data-k="conv"]').forEach(i => { const t = parseConv(i.value); if (t.length) c[i.dataset.a] = t; });
    const pp = nv($("#xPp").value), pa = nv($("#xPa").value); if (pp == null || pa == null || pp + pa !== 100) { toast("Los pesos deben sumar 100 %"); return; }
    Object.assign(S.cfg, { minAlcpt: m, convAlcpt: c, min12: $("#xMin12").checked, min12v: nv($("#xMin12v").value) ?? 26, aprobBase: $("#xBase").value, pesoParc: pp, pesoAlcpt: pa, monitorUmbral: nv($("#xMu").value) ?? 7 }); saveCfg(); toast("Mínimos ALCPT guardados"); }; };
})(window);

/* Seguimiento de inglés v1.4 · Aprobación ALCPT por año, tipos de ALCPT y avance del seguimiento.
   Tipos: Diagnóstico (orden de rectoría; define el ingreso al remedial; no cuenta para la calificación),
   Seguimiento (orden de la Directora; cualquier número, con fecha; no cuenta; mide el avance y la salida del remedial),
   Final (cuenta 40 %). Calificación: 2 parciales ALC (examen 60 + portafolio 30 + participación 10) × 60 % + A.L.C.P.T. final × 40 %.
   Un mínimo y una tabla de ponderación (puntos = calificación) por año, editables en Ajustes:
   1/er. 25 (30 o más=10 … 25=6); 2/o. 31 (36 o más=10 … 31=6); 3/er. 45 (50 o más=10 … 45=6); 4/o. 55 (60 o más=10 … 55=6).
   Por debajo del mínimo = No aprobado. */
(function (G) {
"use strict";
const RI = () => G.ReplicaIng;
const DEFAP = {
  apTabla: {
    "1": { min: 25, conv: [[30, 10], [29, 9], [28, 8], [27, 7], [26, 6.5], [25, 6]] },
    "2": { min: 31, conv: [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]] },
    "3": { min: 45, conv: [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]] },
    "4": { min: 55, conv: [[60, 10], [59, 9], [58, 8], [57, 7], [56, 6.5], [55, 6]] }
  },
  aprobBase: "examen", pesoParc: 60, pesoAlcpt: 40, monitorUmbral: 7
};
/* claves de versiones anteriores que ya no se usan (no deben revivir) */
const OLD = ["minPreset", "minSem", "minAlcpt", "convAlcpt", "min12", "min12v", "conv12", "refAlcpt", "sem2Ini", "sem2Fin"];
/* v1.4: valores por omisión de v1.2/v1.3 que se sustituyen; lo editado a mano se conserva y se señala */
const DEF13 = { "1": { min: null, conv: [] }, "2": { min: 45, conv: [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]] }, "3": { min: 31, conv: [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]] }, "4": { min: 55, conv: [[60, 10], [59, 9], [58, 8], [57, 7], [56, 6.5], [55, 6]] } };
const filaEq = (x, y) => { x = x || {}; y = y || {}; const cv = t => JSON.stringify((t || []).map(([p, c]) => [+p, +c]).sort((a, b) => b[0] - a[0])); return (x.min == null ? null : +x.min) === (y.min == null ? null : +y.min) && cv(x.conv) === cv(y.conv); };
const AP_VER = 3; let migCambio = false;
function mig() { if (!S.cfg || S.cfg.apVer === AP_VER) return;
  const D = JSON.parse(JSON.stringify(DEFAP.apTabla));
  if (S.cfg.apVer !== 2 || !S.cfg.apTabla) { OLD.forEach(k => delete S.cfg[k]); S.cfg.apTabla = D; S.cfg.apFlag = []; }
  else { const T = { ...S.cfg.apTabla }, flag = [];
    ["1", "2", "3", "4"].forEach(a => { if (!T[a] || filaEq(T[a], DEF13[a])) T[a] = D[a]; else if (!filaEq(T[a], D[a])) flag.push({ a, min: T[a].min ?? null, conv: T[a].conv || [] }); });
    S.cfg.apTabla = T; S.cfg.apFlag = flag; }
  S.cfg.apVer = AP_VER; migCambio = true; }
function migCfgPend() { const c = migCambio; migCambio = false; return c; }
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
/* ---------- tipos de ALCPT ---------- */
const TIPOS = [["diagnostico", "Diagnóstico"], ["seguimiento", "Seguimiento"], ["final", "Final"], ["historico", "Ciclo anterior"]];
const TIPO_TXT = Object.fromEntries(TIPOS);
const curCiclo = () => C("ciclo") || RI().cfg("ciclo");
const inCur = l => { const d = labDate(l); return !!d && RI().cicloOf(d) === curCiclo(); };
/* tipo de un examen: lo guardado; "periodo" o sin tipo = seguimiento si es del ciclo actual, ciclo anterior si no */
function tipoOf(o, l) { const t = (((o.alcptMeta || {})[l]) || {}).tipo; if (t === "diagnostico" || t === "seguimiento" || t === "final" || t === "historico") return t; return inCur(l) ? "seguimiento" : "historico"; }
const fechaKey = (lab, f) => (f ? new Date(f + "T12:00:00").getTime() : RI().labKey(lab));
/* avance del ciclo: diagnóstico -> cada seguimiento -> final */
function progreso(o) { const L = RI().alcptList(o).filter(x => nv(x.v) != null && inCur(x.l)).map(x => ({ k: tipoOf(o, x.l), lab: x.l, f: (x.m && x.m.fecha) || "", v: nv(x.v), r: res(o, x.v, x.l) }));
  let d = nv(o.diag) != null ? { k: "diagnostico", lab: DIAG_LAB, f: (o.diagMeta || {}).fecha || "2026-09-21", v: nv(o.diag), r: diagRes(o) } : (L.find(x => x.k === "diagnostico") || null);
  const ord = (a, b) => fechaKey(a.lab, a.f) - fechaKey(b.lab, b.f);
  const seg = L.filter(x => x.k === "seguimiento").sort(ord), fin = L.filter(x => x.k === "final").sort(ord);
  seg.forEach((x, i) => x.n = i + 1);
  const pasos = [...(d ? [d] : []), ...seg, ...fin]; pasos.forEach(p => { p.dif = d && p !== d ? p.v - d.v : null; });
  return { d, seg, fin, pasos, ult: seg[seg.length - 1] || null }; }
const pasoTxt = p => p.k === "diagnostico" ? "Diagnóstico" : p.k === "final" ? "Final" : `Seguimiento ${p.n}`;
const fmtF = f => { const m = String(f || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${+m[3]} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+m[2] - 1]} ${m[1]}` : ""; };
/* gráfica pequeña de tendencia con la línea del mínimo del año */
function progSvg(P, a, w, h) { w = w || 260; h = h || 70; const ps = P.pasos; if (!ps.length) return ""; const m = minFor(a).min;
  const vs = [...ps.map(p => p.v), ...(m != null ? [m] : [])], lo = Math.max(0, Math.min(...vs) - 5), hi = Math.min(100, Math.max(...vs) + 5), sp = hi - lo || 1, pad = 8;
  const X = i => ps.length === 1 ? w / 2 : pad + i * (w - 2 * pad) / (ps.length - 1), Y = v => h - pad - (v - lo) * (h - 2 * pad) / sp;
  const col = p => p.r.st === "ap" ? "#2e7d32" : p.r.st === "na" ? "#c62828" : "#607d8b";
  return `<svg class="progsvg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Tendencia ALCPT: ${esc(ps.map(p => pasoTxt(p) + " " + p.v).join(", "))}">
    ${m != null ? `<line x1="0" x2="${w}" y1="${Y(m).toFixed(1)}" y2="${Y(m).toFixed(1)}" stroke="#c62828" stroke-dasharray="4 3" stroke-width="1"/><text x="2" y="${(Y(m) > 14 ? Y(m) - 3 : Y(m) + 10).toFixed(1)}" text-anchor="start" font-size="9" fill="#c62828">mín. ${m}</text>` : ""}
    ${ps.length > 1 ? `<polyline fill="none" stroke="#1d3557" stroke-width="2" points="${ps.map((p, i) => X(i).toFixed(1) + "," + Y(p.v).toFixed(1)).join(" ")}"/>` : ""}
    ${ps.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5" fill="${col(p)}"><title>${esc(pasoTxt(p))}: ${p.v}</title></circle>`).join("")}</svg>`; }
function progresoHTML(o) { const P = progreso(o);
  if (!P.pasos.length) return `<p class="hint">Sin ALCPT de diagnóstico, seguimiento ni final en el ciclo ${esc(curCiclo())}.</p>`;
  const sal = salida(o);
  return `<div class="progv"><div class="tscroll"><table class="tbl progtab" style="min-width:520px"><thead><tr><th>Examen</th><th>Fecha</th><th class="num">Puntos</th><th class="num">Dif. vs diagnóstico</th><th>Resultado</th></tr></thead><tbody>
  ${P.pasos.map(p => `<tr class="pk-${p.k}"><td>${esc(pasoTxt(p))}${p.k !== "diagnostico" ? `<span class="sub">ALCPT ${esc(p.lab)}</span>` : ""}</td><td>${esc(fmtF(p.f) || p.lab)}</td><td class="num">${p.v}</td>
    <td class="num ${p.dif != null && p.dif < 0 ? "lo" : ""}">${p.dif == null ? "—" : (p.dif > 0 ? "+" : "") + p.dif}</td><td>${chip(p.r)}</td></tr>`).join("")}</tbody></table></div>
  <figure class="progfig">${progSvg(P, String(o.a))}<figcaption class="hint">Diagnóstico y seguimientos no cuentan para la calificación; el final cuenta ${esc(String(C("pesoAlcpt")))} %.${sal ? ` Alcanzó el mínimo en ${esc(sal.f)} (${sal.v} pts): puede salir del remedial.` : ""}</figcaption></figure></div>`; }
/* avance por grupo: promedio diagnóstico vs último seguimiento, % que ya aprueba y mejoraron */
function progCnt(L) { const X = L.map(o => ({ o, P: progreso(o) })).filter(x => x.P.d && x.P.ult);
  const av = f => X.length ? Math.round(X.reduce((s, x) => s + f(x), 0) / X.length * 10) / 10 : null;
  const ap = X.filter(x => x.P.ult.r.st === "ap").length, na = X.filter(x => x.P.ult.r.st === "na").length;
  return { n: L.length, conSeg: L.filter(o => progreso(o).seg.length).length, both: X.length, dAvg: av(x => x.P.d.v), sAvg: av(x => x.P.ult.v), avAvg: av(x => x.P.ult.v - x.P.d.v), mej: X.filter(x => x.P.ult.v > x.P.d.v).length, ap, na, pct: pct(ap, na) }; }
/* salida del remedial: después del alta, un seguimiento (o ALCPT de parcial / final) alcanza el mínimo del año */
function salida(o) { if (!inRem(o)) return null; const alta = (o.rem && o.rem.alta) || "";
  const t0 = alta ? new Date(alta + "T12:00:00").getTime() : 0;
  const after = RI().alcptList(o).filter(x => nv(x.v) != null && labDate(x.l) && !/^(diagnostico|historico)$/.test(tipoOf(o, x.l)) && fechaKey(x.l, x.m && x.m.fecha) >= t0)
    .map(x => ({ t: fechaKey(x.l, x.m && x.m.fecha), f: `${TIPO_TXT[tipoOf(o, x.l)].toLowerCase()} ALCPT ${x.l}`, v: nv(x.v), r: res(o, x.v, x.l) })).sort((p, q) => p.t - q.t);
  const re = ((o.rem && o.rem.reeval) || []).filter(x => /ALCPT|recuperaci/i.test(x.tipo || "") && nv(x.pts) != null).map(x => { const m = minFor(String(o.a)); return { f: x.fecha, v: nv(x.pts), r: { st: m.min == null ? "sin" : nv(x.pts) >= m.min ? "ap" : "na", min: m.min } }; });
  /* la primera vez que alcanza el mínimo después del alta */
  const hit = after.find(x => x.r.st === "ap") || re.find(x => x.r.st === "ap"); return hit ? { f: hit.f, v: hit.v, min: hit.r.min } : null; }
/* calificación final del ciclo: promedio de los 2 parciales × 60 % + A.L.C.P.T. final convertido × 40 % */
function finalAlcpt(o) { const L = RI().alcptList(o).filter(x => tipoOf(o, x.l) === "final" && nv(x.v) != null && inCur(x.l)); return L.pop() || null; }
function calFinal(o) { const f = finalAlcpt(o), p = prom(o), a = String(o.a); if (!f) return { st: "pend", p };
  const r = res(o, f.v, f.l); if (r.st === "na") return { st: "extra", p, f, r }; if (r.cal == null || p == null) return { st: "pend", p, f, r };
  const v = Math.round((p * nv(C("pesoParc")) + r.cal * nv(C("pesoAlcpt"))) / 100 * 100) / 100; return { st: v >= S.cfg.minimo ? "ap" : "na", v, p, f, r }; }
/* conteo por año: diagnóstico y último ALCPT */
function resumen(L) { const out = []; ["1", "2", "3", "4"].forEach(a => { const Y = L.filter(o => o.a === a); if (!Y.length) return;
  const cnt = fn => { const c = { ap: 0, na: 0, sin: 0, nd: 0 }; Y.forEach(o => c[fn(o).st]++); return c; };
  out.push({ a, n: Y.length, min: minFor(a), diag: cnt(diagRes), ult: cnt(lastRes), mon: Y.filter(monitor).length, sal: Y.filter(o => salida(o)).length }); }); return out; }
const pct = (ap, na) => (ap + na ? Math.round(ap * 1000 / (ap + na)) / 10 : null);
G.ReplicaIng.ap = { TIPOS, TIPO_TXT, tipoOf, inCur, progreso, progSvg, progresoHTML, progCnt, pasoTxt, fmtF, migItem: o => migItem(o), DEFAP, C, mig, yearAt, minTxt, minFor, conv, res, txt, TXT, badge, chip, lastRes, diagRes, monitor, salida, calFinal, finalAlcpt, resumen, pct, labDate };

/* ---------- ALC parcial: libros y puntaje de referencia por semestre (no aplica al ALCPT) ---------- */
const DEFREF = [{ a: "1", sem: "2", libros: "4-5", ref: "29-30" }, { a: "2", sem: "1", libros: "6-7", ref: "30" }, { a: "2", sem: "2", libros: "8-9", ref: "41" }, { a: "3", sem: "1", libros: "10-11", ref: "45" }, { a: "3", sem: "2", libros: "12-13", ref: "53" }, { a: "4", sem: "1", libros: "14-15", ref: "55" }, { a: "4", sem: "2", libros: "16-17", ref: "61" }];
function planRef() { const P = (RI() && RI().cfg("planAlc")) || []; return DEFREF.map((d, i) => { const p = P.find(x => x.a === d.a && x.sem === d.sem) || {}; return { n: i + 1, a: d.a, sem: d.sem, libros: p.libros || d.libros, ref: p.ref !== undefined ? String(p.ref) : d.ref }; }); }
const refRow = (a, sem) => planRef().find(x => x.a === String(a) && x.sem === String(sem)) || null;
const refThr = ref => { const m = String(ref || "").match(/\d+(?:[.,]\d+)?/); return m ? +m[0].replace(",", ".") : null; };
const librosTxt = l => String(l || "").replace(/\s*[-–]\s*/g, " y ");
/* resultado de un examen ALC: si = alcanza, no = no alcanza, noimp = no se imparte, np = no es parcial, sin = sin referencia, nd = sin puntaje */
function alcRef(o, x) { const a = String((x && x.a) || o.a), sem = String((x && x.sem) || RI().cfg("semestre")), v = nv(x && x.pts);
  if (a === "1" && sem === "1") return { st: "noimp", v };
  const row = refRow(a, sem); if (!/^p[12]$/.test((x && x.tipo) || "")) return { st: "np", v, row };
  if (!row) return { st: "noimp", v }; const t = refThr(row.ref);
  return { st: v == null ? "nd" : t == null ? "sin" : v >= t ? "si" : "no", v, row, thr: t, x }; }
const ALC_TXT = { si: "Alcanza", no: "No alcanza", noimp: "No se imparte", sin: "Sin referencia", np: "", nd: "" };
function alcTxt(r) { return !r || !ALC_TXT[r.st] ? "" : ALC_TXT[r.st] + (r.row && /^(si|no)$/.test(r.st) ? ` (ref. ${r.row.ref})` : ""); }
function alcChip(r) { if (!r || r.st === "nd" || r.st === "np") return "—"; const cls = r.st === "si" ? "ap-ok" : r.st === "no" ? "ap-no" : "ap-sin";
  return `<span class="apres ${cls}">${esc(ALC_TXT[r.st])}</span>${r.row ? `<span class="sub">ref. ${esc(r.row.ref)} · semestre ${r.row.n} · libros ${esc(librosTxt(r.row.libros))}</span>` : ""}`; }
function alcBadge(r) { if (!r || !/^(si|no)$/.test(r.st)) return ""; return `<span class="badge ${r.st === "si" ? "b-out" : "b-bad"} b-ap" title="Referencia ${esc(r.row.ref)} · semestre ${r.row.n}">${r.st === "si" ? "alcanza" : "no alcanza"}</span>`; }
/* último parcial ALC del ciclo actual (orden: semestre, parcial) */
function lastAlcPar(o) { const c = curCiclo(); const L = (o.alc || []).filter(x => /^p[12]$/.test(x.tipo) && (x.ciclo || c) === c && nv(x.pts) != null)
    .sort((p, q) => String(p.sem || "").localeCompare(String(q.sem || "")) || String(p.fecha || "").localeCompare(String(q.fecha || "")) || p.tipo.localeCompare(q.tipo));
  const x = L[L.length - 1]; return x ? alcRef(o, x) : null; }
function alcParList(o) { const c = curCiclo(); return (o.alc || []).filter(x => /^p[12]$/.test(x.tipo) && (x.ciclo || c) === c).map(x => ({ x, r: alcRef(o, x) })); }
Object.assign(G.ReplicaIng.ap, { DEFREF, planRef, refRow, refThr, librosTxt, alcRef, alcTxt, alcChip, alcBadge, lastAlcPar, alcParList, ALC_TXT });

/* ---------- migración de datos a v1.3 (2 parciales, tipos ALCPT) ---------- */
const DATA_VER = 3;
function migItem(o) { if (!o || o.dataVer === DATA_VER) return null; const x = clone(o), n = { p3: 0, alcp3: 0, trayp3: 0, seg: 0, hist: 0 }, hoyS = new Date().toISOString().slice(0, 10);
  const arch = (k, v) => { x.archivoV13 = { ...(x.archivoV13 || {}), [k]: v, fecha: hoyS, motivo: "v1.3: el programa tiene 2 parciales ALC; el 3/er. parcial se conserva aquí, fuera de los cálculos" }; };
  if (x.cal && x.cal.p3 != null) { arch("calP3", x.cal.p3); x.cal = { ...x.cal }; delete x.cal.p3; n.p3++; }
  const a3 = (x.alc || []).filter(a => a.tipo === "p3"); if (a3.length) { arch("alcP3", a3); x.alc = x.alc.filter(a => a.tipo !== "p3"); n.alcp3 += a3.length; }
  (x.tray || []).forEach((t, i) => { const tp = {}; if (t.calCiclo && t.calCiclo.p3 != null) { tp.calCiclo = t.calCiclo.p3; t.calCiclo = { ...t.calCiclo }; delete t.calCiclo.p3; }
    if ((t.parciales || []).length > 2) { tp.parciales = t.parciales.slice(2); t.parciales = t.parciales.slice(0, 2); }
    if (Object.keys(tp).length) { arch("tray" + i + "_" + t.ciclo + "_" + (t.sem || ""), tp); n.trayp3++; } });
  const M = { ...(x.alcptMeta || {}) }; (x.alcpt || []).forEach(([l]) => { const m = { ...(M[l] || {}) }; const t = m.tipo;
    if (t === "diagnostico" || t === "seguimiento" || t === "final" || t === "historico") return;
    m.tipoOrig = t || "sin tipo"; m.tipo = inCur(l) ? "seguimiento" : "historico"; if (m.tipo === "seguimiento") n.seg++; else n.hist++; M[l] = m; });
  x.alcptMeta = M; x.dataVer = DATA_VER; return { x, n }; }
function migrarTodo() { if (!S.items || !S.items.size) return null; const out = [], tot = { cad: 0, p3: 0, alcp3: 0, trayp3: 0, seg: 0, hist: 0, nombres: [] };
  S.items.forEach(o => { const r = migItem(o); if (!r) return; S.items.set(o.id, r.x); const b = { ...r.x }; delete b.id; out.push({ col: "alumnos", id: o.id, data: b }); tot.cad++;
    Object.keys(r.n).forEach(k => tot[k] += r.n[k]); if (r.n.p3 || r.n.alcp3 || r.n.trayp3) tot.nombres.push(o.n); });
  if (!out.length) return null;
  const log = { at: new Date().toISOString(), cadetes: tot.cad, p3: tot.p3, alcP3: tot.alcp3, trayP3: tot.trayp3, seguimiento: tot.seg, cicloAnterior: tot.hist, archivados: tot.nombres };
  S.cfg.migV13 = [...(S.cfg.migV13 || []), log].slice(-10);
  if (S.db && S.db._bulk) S.db._bulk([...out, { col: "ajustes", id: "general", data: { ...S.cfg } }]).catch(e => console.warn(e));
  return log; }
const _render = G.render;
G.render = function () { let log = null; try { if (S.cfg) C("apTabla"); log = migrarTodo(); if (migCfgPend() && !log && S.loaded && S.items && S.items.size && S.db && S.db._bulk) S.db._bulk([{ col: "ajustes", id: "general", data: { ...S.cfg } }]).catch(e => console.warn(e)); } catch (e) { console.warn(e); } _render();
  if (log && (log.p3 || log.alcP3 || log.trayP3)) toast(`Datos actualizados a 2 parciales: ${log.p3 + log.alcP3 + log.trayP3} registro(s) de 3/er. parcial archivados (${log.archivados.length} cadete(s)); consulta Ajustes.`); };
G.ReplicaIng.ap.migrarTodo = migrarTodo;

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
  if (m) m.insertAdjacentHTML("afterend", html + remCard()); else VW.insertAdjacentHTML("afterbegin", html + remCard()); } catch (e) { console.warn(e); } };
/* tarjeta de Panorama: avance de quienes están (o estuvieron este ciclo) en el remedial */
function remCard() { const R = all().filter(o => inRem(o) || (o.rem && o.rem.alta)); if (!R.length) return "";
  const c = progCnt(R), sal = R.filter(o => salida(o)).length, Y = ["1", "2", "3", "4"].filter(a => R.some(o => o.a === a));
  const sg = v => v == null ? "—" : (v > 0 ? "+" : "") + v;
  return `<section class="apsec remprog" id="panRemProg"><div class="chh"><h3><em>Remedial</em>Avance del seguimiento</h3><span class="hint">Diagnóstico (rectoría) contra el último ALCPT de seguimiento (Directora).</span></div>
  <section class="gmon"><div class="gm-k"><em>En el remedial</em><b>${R.length}</b></div><div class="gm-k"><em>Con seguimiento</em><b>${c.conSeg}<small>/${R.length}</small></b></div>
  <div class="gm-k"><em>Diagnóstico → último seguimiento</em><b>${c.dAvg ?? "—"}<small> → ${c.sAvg ?? "—"} (${sg(c.avAvg)} pts)</small></b></div>
  <div class="gm-k"><em>Mejoraron</em><b>${c.mej}<small>/${c.both}</small></b></div><div class="gm-k"><em>Ya alcanzan el mínimo</em><b>${c.ap}<small>${c.pct != null ? " (" + c.pct + "%)" : ""}</small></b></div>
  <div class="gm-k"><em>Pueden salir del remedial</em><b>${sal}</b></div></section>
  <div class="tscroll"><table class="tbl aptab"><thead><tr><th>Año</th><th class="num">En remedial</th><th class="num">Con seguimiento</th><th class="num">Prom. diagnóstico</th><th class="num">Prom. último seguimiento</th><th class="num">Avance</th><th class="num">Mejoraron</th><th class="num">Ya aprueban</th><th class="num">%</th></tr></thead><tbody>
  ${Y.map(a => { const q = progCnt(R.filter(o => o.a === a)); return `<tr><td>${ANIO[a]} año</td><td class="num">${q.n}</td><td class="num">${q.conSeg}</td><td class="num">${q.dAvg ?? "—"}</td><td class="num">${q.sAvg ?? "—"}</td><td class="num ${q.avAvg != null && q.avAvg < 0 ? "lo" : ""}">${sg(q.avAvg)}</td><td class="num">${q.mej}</td><td class="num">${q.ap}</td><td class="num">${q.pct == null ? "—" : q.pct + "%"}</td></tr>`; }).join("")}</tbody></table></div>
  ${c.conSeg ? "" : `<p class="hint">Todavía no hay ALCPT de seguimiento registrados. Captúralos en ALC y ALCPT con tipo Seguimiento.</p>`}</section>`; }

/* ---------- ficha: resultado ALCPT, monitor y calificación final ---------- */
const _openFicha = G.openFicha;
G.openFicha = function (id) { _openFicha(id); const o = S.items.get(id); if (!o || o.eg) return; try {
  const hs = [...document.querySelectorAll("#fichaBody h3")]; const after = hs.find(h => /Historial ALCPT/.test(h.textContent)); const next = after ? hs[hs.indexOf(after) + 1] : null;
  const L = RI().alcptList(o).filter(x => nv(x.v) != null).map(x => ({ l: "ALCPT " + x.l, r: res(o, x.v, x.l) })); if (nv(o.diag) != null) L.push({ l: "Diagnóstico 21 sep. 2026", r: diagRes(o) });
  const cf = calFinal(o), sal = salida(o), mon = monitor(o);
  const html = `<h3>Avance ALCPT del ciclo: diagnóstico → seguimientos → final</h3>${progresoHTML(o)}<h3>Resultado ALCPT por año</h3>${L.length ? `<div class="tscroll"><table class="tbl" style="min-width:460px"><thead><tr><th>Examen</th><th class="num">Puntaje</th><th>Año que cursaba</th><th class="num">Mínimo</th><th class="num">Calif.</th><th>Resultado</th></tr></thead><tbody>
    ${L.map(x => `<tr><td>${esc(x.l)}</td><td class="num">${x.r.v}</td><td>${x.r.a ? ANIO[x.r.a] + " año" : "—"}${x.r.sinFecha ? " (sin fecha)" : ""}</td><td class="num">${x.r.min ?? "—"}</td><td class="num">${x.r.cal ?? (x.r.min != null && x.r.st === "na" ? "NA" : "—")}</td><td>${esc(txt(x.r))}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Sin puntajes ALCPT.</p>`}
  <div class="bar"><label class="hint">Monitor<select id="fMon"><option value="">Automático (${mon && o.monitor == null ? "sí" : "no"})</option><option value="si" ${o.monitor === true ? "selected" : ""}>Sí</option><option value="no" ${o.monitor === false ? "selected" : ""}>No</option></select></label>
  <span class="hint">${sal ? `Alcanzó ${sal.v} pts (mín. ${sal.min}) en ${esc(sal.f || "")}: puede darse de baja del remedial.` : ""}</span></div>
  <p class="hint">Calificación final del ciclo (parciales ${C("pesoParc")} % + A.L.C.P.T. final ${C("pesoAlcpt")} %): ${cf.st === "pend" ? "pendiente" + (cf.f ? "" : " del A.L.C.P.T. final") : cf.st === "extra" ? `A.L.C.P.T. final ${cf.f.v} pts, por debajo de ${cf.r.min}: examen extraordinario` : `<b>${cf.v.toFixed(2)}</b> · ${cf.st === "ap" ? "aprobado" : "no aprobado"}`}.</p>`;
  if (next) next.insertAdjacentHTML("beforebegin", html); else $("#fichaBody").insertAdjacentHTML("beforeend", html);
  const AL = alcParList(o), hs2 = [...document.querySelectorAll("#fichaBody h3")], ev = hs2.find(h => /Evidencias/.test(h.textContent));
  const ah = `<h3>ALC parcial: referencia del semestre</h3>${AL.length ? `<div class="tscroll"><table class="tbl" id="fAlcRef" style="min-width:520px"><thead><tr><th>Libro</th><th>Examen</th><th>Semestre</th><th class="num">Puntos</th><th>Referencia</th></tr></thead><tbody>
    ${AL.map(({ x, r }) => `<tr><td>Libro ${esc(x.libro)}</td><td>${x.tipo === "p1" ? "Parcial 1" : "Parcial 2"}</td><td>${r.row ? `${r.row.n} · ${ANIO[r.row.a]} año ${r.row.sem === "1" ? "1/er." : "2/o."} sem. · libros ${esc(librosTxt(r.row.libros))}` : "—"}</td><td class="num">${r.v ?? "—"}</td><td>${alcChip(r)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Sin exámenes parciales ALC en el ciclo.</p>`}`;
  if (ev) ev.insertAdjacentHTML("beforebegin", ah); else $("#fichaBody").insertAdjacentHTML("beforeend", ah);
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
  <label class="hint">Promedio de los 2 parciales ALC en la calificación final (%)<input type="number" id="xPp" min="0" max="100" value="${C("pesoParc")}"></label><label class="hint">A.L.C.P.T. final convertido (%)<input type="number" id="xPa" min="0" max="100" value="${C("pesoAlcpt")}"></label>
  <label class="hint">Monitor si la calificación diagnóstica es mayor a<input type="number" id="xMu" step="0.1" min="0" max="10" value="${C("monitorUmbral")}"></label></div>
  <p><button class="btn" id="xApSave" type="button">Guardar mínimos y ponderación</button></p>`;
  const FL = S.cfg.apFlag || [];
  const fh = FL.length ? `<div class="impbox apflag" id="xApFlag" role="status"><p><b>Valores editados a mano conservados:</b> ${FL.map(f => `${ANIO[f.a]} año (mínimo ${f.min ?? "sin mínimo"}; ${esc(convTxt(f.conv) || "sin tabla")})`).join(" · ")}. Los valores por omisión actuales son ${FL.map(f => `${ANIO[f.a]} año: mínimo ${DEFAP.apTabla[f.a].min ?? "sin mínimo"}; ${esc(convTxt(DEFAP.apTabla[f.a].conv))}`).join(" · ")}.</p>
    <p><button class="btn small" id="xApDef" type="button">Usar los valores por omisión</button> <button class="btn ghost small" id="xApKeep" type="button">Conservar los míos</button></p></div>` : "";
  const ML = (S.cfg.migV13 || []).filter(l => l.p3 || l.alcP3 || l.trayP3);
  const mh = ML.length ? `<h2>3/er. parcial archivado</h2><p class="hint">El programa tiene 2 parciales ALC. Al actualizar a v1.3 se archivaron ${ML.reduce((s, l) => s + l.p3 + l.alcP3 + l.trayP3, 0)} registro(s) de 3/er. parcial (no se borraron; quedan en el respaldo, campo archivoV13, y no entran en promedios): ${esc([...new Set(ML.flatMap(l => l.archivados))].join(", "))}.</p>` : "";
  const html2 = html.replace('<div class="tscroll"><table class="tbl" id="xAp"', fh + '<div class="tscroll"><table class="tbl" id="xAp"');
  if (anchor) anchor.insertAdjacentHTML("beforebegin", html2 + mh); else VW.insertAdjacentHTML("beforeend", html2 + mh);
  const bd = $("#xApDef"); if (bd) bd.onclick = () => { const T = { ...S.cfg.apTabla }; FL.forEach(f => T[f.a] = JSON.parse(JSON.stringify(DEFAP.apTabla[f.a]))); S.cfg.apTabla = T; S.cfg.apFlag = []; saveCfg(); toast("Se aplicaron los valores por omisión"); };
  const bk = $("#xApKeep"); if (bk) bk.onclick = () => { S.cfg.apFlag = []; saveCfg(); toast("Se conservan tus valores"); };
  $("#xApSave").onclick = () => { const t = {}; ["1", "2", "3", "4"].forEach(a => { t[a] = { min: nv(VW.querySelector(`#xAp [data-k="min"][data-a="${a}"]`).value), conv: parseConv(VW.querySelector(`#xAp [data-k="conv"][data-a="${a}"]`).value) }; });
    const pp = nv($("#xPp").value), pa = nv($("#xPa").value); if (pp == null || pa == null || pp + pa !== 100) { toast("Los pesos deben sumar 100 %"); return; }
    OLD.forEach(k => delete S.cfg[k]); Object.assign(S.cfg, { apVer: AP_VER, apFlag: [], apTabla: t, aprobBase: $("#xBase").value, pesoParc: pp, pesoAlcpt: pa, monitorUmbral: nv($("#xMu").value) ?? 7 }); saveCfg(); toast("Mínimos y ponderación guardados"); }; };
})(window);

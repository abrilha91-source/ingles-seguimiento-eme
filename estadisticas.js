/* Estadística de inglés: filtros, pedido en español y descarga en Excel (Noto Sans 10). */
(function (G) {
"use strict";
const RI = () => G.ReplicaIng;
const E = { a: "", g: "", d: "", rem: "", est: "", gen: "", met: "alcpt_ult", por: "grupo", lab: "", libro: "", q: "", txt: "", leido: "" };
const METS = [["alcpt_ult", "ALCPT: último examen"], ["alcpt_lab", "ALCPT: un examen"], ["diag", "Diagnóstico ALCPT 2026"], ["alcpt_av", "ALCPT: avance (último − primero)"], ["alc", "ALC: promedio de libro"], ["alc_par", "ALC parcial: referencia del semestre"],
  ["seg_av", "ALCPT: avance del seguimiento"], ["p1", "1/er. parcial"], ["p2", "2/o. parcial"], ["prom", "Promedio de los 2 parciales"], ["rem_asis", "Remedial: asistencia"], ["rem_est", "Remedial: estatus"], ["inasis", "Remedial: inasistencias por causa"]];
const PORS = [["grupo", "Grupo"], ["anio", "Año"], ["docente", "Docente"], ["escala", "Escala (semáforo)"], ["estado", "Estado académico"], ["gen", "Generación"], ["examen", "Examen ALCPT (tendencia)"], ["sabado", "Sábado de remedial"], ["causa", "Causa de inasistencia"], ["resultado", "Resultado ALCPT (aprobado / no aprobado)"], ["ninguno", "Sin agrupar"]];
const MET_TXT = Object.fromEntries(METS), POR_TXT = Object.fromEntries(PORS);
const nv = v => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const r1 = v => (v == null ? null : Math.round(v * 10) / 10), r2 = v => (v == null ? null : Math.round(v * 100) / 100);
const isA = m => /^alcpt_ult$|^alcpt_lab$|^diag$/.test(m);
function resOf(o) { const A = RI().ap; if (E.met === "diag") return A.diagRes(o); if (E.met === "alcpt_lab") { const h = (o.alcpt || []).find(x => x[0] === E.lab); return h ? A.res(o, h[1], E.lab) : { st: "nd" }; } return A.lastRes(o); }
function apCnt(A) { const c = { ap: 0, na: 0, sin: 0 }; A.forEach(o => { const r = resOf(o); if (c[r.st] != null) c[r.st]++; }); c.pct = RI().ap.pct(c.ap, c.na); return c; }
const isRem = m => /^rem_|^inasis/.test(m), isPts = m => /^alcpt|^diag|^alc$|^alc_par$/.test(m), whichEsc = m => (/^alc$|^alc_par$/.test(m) ? "alc" : "alcpt");
const refCnt = L => { const c = { si: 0, no: 0, n: 0 }; L.forEach(o => { const r = RI().ap.lastAlcPar(o); if (r && c[r.st] != null) c[r.st]++; }); c.pct = RI().ap.pct(c.si, c.no); return c; };

function base() { return all().filter(o => (!E.a || o.a === E.a) && (!E.g || String(o.g) === E.g) && (!E.d || (o.d || "") === E.d) && (!E.gen || o.gen === E.gen)
  && (!E.rem || (E.rem === "si" ? inRem(o) : E.rem === "no" ? !inRem(o) : E.rem === "hist" ? (o.remHist || []).length > 0 : true))
  && (!E.est || (E.est === "ex" ? o.ex : estAc(o) === E.est)) && (!E.q || norm(o.n).includes(norm(E.q)) || norm(o.m).includes(norm(E.q)))); }
function valOf(o) { const m = E.met;
  if (m === "alcpt_ult") { const l = lastAl(o); return l ? nv(l[1]) : null; }
  if (m === "alcpt_lab") { const h = (o.alcpt || []).find(x => x[0] === E.lab); return h ? nv(h[1]) : null; }
  if (m === "diag") return nv(o.diag);
  if (m === "alcpt_av") { const L = RI().alcptList(o).filter(x => nv(x.v) != null); return L.length > 1 ? nv(L[L.length - 1].v) - nv(L[0].v) : null; }
  if (m === "seg_av") { const P = RI().ap.progreso(o); return P.d && P.ult ? P.ult.v - P.d.v : null; }
  if (m === "alc_par") { const r = RI().ap.lastAlcPar(o); return r ? r.v : null; }
  if (m === "alc") return RI().alcAvg(o, E.libro ? x => x.libro === E.libro : null);
  if (/^p[12]$/.test(m)) return o.ex ? null : ptot(o.cal && o.cal[m]);
  if (m === "prom") return o.ex ? null : prom(o);
  if (m === "rem_asis") { if (!inRem(o) && !(o.remHist || []).length) return null; return RI().remAsis(o).pct; }
  return null; }
function keyOf(o, v) { const p = E.por;
  if (p === "grupo") return `${ANIO[o.a]} año · Grupo ${o.g}`; if (p === "anio") return `${ANIO[o.a]} año`; if (p === "docente") return o.d || "Sin docente"; if (p === "gen") return o.gen || "Sin generación";
  if (p === "resultado") { const r = E.met === "seg_av" ? ((P => P.ult ? P.ult.r : { st: "nd" })(RI().ap.progreso(o))) : isA(E.met) ? resOf(o) : RI().ap.lastRes(o); return r.st === "nd" ? "Sin puntaje" : RI().ap.TXT[r.st] + (r.a ? ` · ${ANIO[r.a]} año` : ""); }
  if (p === "estado") return o.ex ? "Exento" : EST_TXT[estAc(o)]; if (p === "escala") { const b = RI().banda(v, /^p|prom/.test(E.met) ? null : whichEsc(E.met)); return v == null ? "Sin puntaje" : b ? `${b.min}–${b.max} · ${b.t}` : "Fuera de escala"; }
  return "Todos"; }
const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
function stats(vals) { const v = vals.filter(x => x != null); const mn = S.cfg.minimo; const isP = /^p[12]$|^prom$/.test(E.met);
  return { n: vals.length, cap: v.length, avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, med: med(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null, ok: isP ? v.filter(x => x >= mn).length : null }; }

function compute() {
  const L = base(), out = { L, grupos: [], tendencia: [], sabados: [], causas: [], estatus: [], detalle: [], bandas: [] };
  if (E.met === "inasis" || E.por === "causa") { const c = {}; let tot = 0; L.forEach(o => S.cfg.sesiones.forEach(s => { const x = o.asis && o.asis[s]; if (x === "F" || x === "J") { const k = (o.causa && o.causa[s]) || ""; c[k] = (c[k] || 0) + 1; tot++; } }));
    out.causas = [...CAUSAS.map(([k, t]) => ({ k: t, n: c[k] || 0 })), ...(c[""] ? [{ k: "Sin clasificar", n: c[""] }] : [])].map(x => ({ ...x, pct: tot ? r1(x.n * 100 / tot) : 0 })); out.totInas = tot; }
  if (E.met === "rem_asis" || E.por === "sabado") { out.sabados = S.cfg.sesiones.map(s => { const m = L.filter(o => o.asis && o.asis[s]); const P = m.filter(o => o.asis[s] === "P").length, F = m.filter(o => o.asis[s] === "F").length, J = m.filter(o => o.asis[s] === "J").length; return { s, n: m.length, P, F, J, pct: m.length ? r1(P * 100 / m.length) : null }; }); }
  if (E.met === "rem_est") { const H = []; L.forEach(o => (o.remHist || []).forEach(h => H.push({ o, h }))); const c = {}; H.forEach(({ h }) => { const k = h.estatus || (h.baja ? "baja" : "curso"); c[k] = (c[k] || 0) + 1; });
    const T = { curso: "En curso", aprobado: "Aprobado", noaprobado: "No aprobado", baja: "Baja por otro motivo" }; out.estatus = Object.keys(T).map(k => ({ k: T[k], n: c[k] || 0 })); out.totRem = H.length;
    const g = new Map(); H.forEach(({ o, h }) => { const k = keyOf(o, null); const x = g.get(k) || { k, n: 0, curso: 0, aprobado: 0, noaprobado: 0, baja: 0 }; x.n++; x[h.estatus || (h.baja ? "baja" : "curso")]++; g.set(k, x); }); out.remGrupos = [...g.values()].sort((a, b) => a.k.localeCompare(b.k, "es")); }
  if (E.por === "examen" || E.met === "alcpt_lab") { const labs = RI().allLabels(); out.tendencia = labs.map(l => { const v = L.map(o => { const h = (o.alcpt || []).find(x => x[0] === l); return h ? nv(h[1]) : null; }).filter(x => x != null); return { k: "ALCPT " + l, ...stats(v), n: v.length }; }).filter(x => x.cap);
    const dv = L.map(o => nv(o.diag)).filter(x => x != null); if (dv.length) out.tendencia.push({ k: "Diagnóstico sep 2026", ...stats(dv), n: dv.length }); }
  if (!/^rem_est|^inasis/.test(E.met)) { const g = new Map(); L.forEach(o => { const v = valOf(o); const k = keyOf(o, v); (g.get(k) || g.set(k, []).get(k)).push({ o, v }); });
    out.grupos = [...g.entries()].map(([k, A]) => { const st = stats(A.map(x => x.v)); const bb = isPts(E.met) ? (G.ReplicaIng.cfg(whichEsc(E.met) === "alc" ? "escalaAlc" : "escalaAlcpt")).map(b => A.filter(x => x.v != null && x.v >= b.min && x.v <= b.max).length) : null; return { k, ...st, bb, apr: isA(E.met) ? apCnt(A.map(x => x.o)) : null, prog: E.met === "seg_av" ? RI().ap.progCnt(A.map(x => x.o)) : null, ref: E.met === "alc_par" ? refCnt(A.map(x => x.o)) : null }; })
      .sort((a, b) => a.k.localeCompare(b.k, "es", { numeric: true }));
    out.detalle = L.map(o => ({ o, v: valOf(o) })).sort((x, y) => x.o.a.localeCompare(y.o.a) || String(x.o.g).localeCompare(String(y.o.g)) || x.o.n.localeCompare(y.o.n, "es")); }
  out.global = stats(L.map(valOf)); out.global.apr = isA(E.met) ? apCnt(L) : null; out.global.prog = E.met === "seg_av" ? RI().ap.progCnt(L) : null; out.global.ref = E.met === "alc_par" ? refCnt(L) : null;
  return out;
}
/* ---------- pedido en español ---------- */
function parsePedido(t) { const s = norm(t), r = { a: "", g: "", d: "", rem: "", est: "", met: "", por: "", lab: "", libro: "", q: "" }, ent = [];
  const ym = s.match(/\b([1-4])\s*(?:\/?\s*(?:o|er|ro|do|to|º|°)\.?)?\s*ano\b/) || s.match(/\b(primer|primero|segundo|tercer|tercero|cuarto)\s+ano\b/);
  if (ym) { const map = { primer: "1", primero: "1", segundo: "2", tercer: "3", tercero: "3", cuarto: "4" }; r.a = map[ym[1]] || ym[1]; ent.push(`${ANIO[r.a]} año`); }
  const gm = s.match(/\bgrupo\s+([a-z0-9-]+)/) || s.match(/\bg\s?(\d)\b/); if (gm) { const gv = gm[1].replace(/^g/, ""); const gs = groups(r.a); const hit = gs.find(g => norm(g) === gv || norm(g).replace(/^.*g/, "") === gv); if (hit) { r.g = hit; ent.push(`grupo ${hit}`); } }
  const docs = [...new Set(all().map(o => o.d).filter(Boolean))]; const dh = docs.find(d => norm(d).split(/\s+/).filter(w => w.length > 3 && !/docente|ret|almta|myr/.test(w)).some(w => new RegExp("\\b" + w + "\\b").test(s.replace(/\bdocente\b/g, "")) && /docente|maestr|profe|de la |del /.test(s)));
  if (dh) { r.d = dh; ent.push(`docente ${dh}`); }
  if (/seguimiento/.test(s) && !/seguimiento eme|kardex/.test(s)) r.met = "seg_av";
  else if (/diagn/.test(s) && !/(avance|progres|mejor).*(diagn)|vs\.? diagn|contra (el )?diagn/.test(s)) r.met = "diag"; else if (/alcpt/.test(s) && /avance|progres|mejor|evoluc/.test(s) && !/por examen|tendencia/.test(s)) r.met = "alcpt_av";
  else if (/alcpt/.test(s)) { const labs = RI().allLabels(); const lh = labs.find(l => s.includes(norm(l))); if (lh) { r.met = "alcpt_lab"; r.lab = lh; } else r.met = "alcpt_ult"; }
  else if (r.met === "alc_par") { }
  else if (/\balc\b|libro/.test(s)) { r.met = "alc"; const lb = s.match(/libro\s+(\d{1,2})/); if (lb) r.libro = lb[1]; }
  else if (/causa/.test(s)) r.met = "inasis"; else if (/asistencia|inasistencia|falta/.test(s)) r.met = "rem_asis";
  else if (/estatus|aprobaron el remedial|salieron/.test(s) && /remedial/.test(s)) r.met = "rem_est";
  else { const pm = s.match(/\b([12])\s*(?:\/?\s*(?:o|er|ro|do|º|°)\.?)?\s*parcial/) || s.match(/parcial\s+([12])/) || s.match(/\b(primer|segundo)\s+parcial/); if (pm) r.met = "p" + ({ primer: "1", segundo: "2" }[pm[1]] || pm[1]); else if (/promedio|calificaci|reprob|aprob/.test(s)) r.met = "prom"; }
  if (/\balc\b/.test(s) && !/alcpt/.test(s) && /referencia|alcanz|parcial/.test(s)) { r.met = "alc_par"; }
  if (r.met === "seg_av" && !/por (ano|docente|maestr|escala|semaforo|color|estado|generacion|resultado)/.test(s)) r.por = "grupo";
  if (r.met === "seg_av" || r.met === "alc_par") { /* traen sus propios conteos; no se filtra por estado */ }
  else if (/alcpt|diagn/.test(s) && /aprob|reprob/.test(s)) { if (!/por (grupo|ano|docente|maestr|escala|semaforo|color|estado|generacion|examen|fecha|sabado|causa|resultado)/.test(s)) r.por = "resultado"; }
  else if (/reprobad/.test(s)) r.est = "bad"; else if (/\baprobados\b/.test(s) && !/remedial/.test(s)) r.est = "ok"; else if (/exent/.test(s)) r.est = "ex";
  if (/(en|del|al) remedial/.test(s) && !/fuera/.test(s) && r.met !== "rem_est") r.rem = "si"; else if (/fuera del remedial|sin remedial/.test(s)) r.rem = "no";
  const pm2 = s.match(/por (grupo|ano|docente|maestr|escala|semaforo|color|estado|generacion|examen|fecha|sabado|causa|resultado)/); if (pm2) r.por = { resultado: "resultado", grupo: "grupo", ano: "anio", docente: "docente", maestr: "docente", escala: "escala", semaforo: "escala", color: "escala", estado: "estado", generacion: "gen", examen: "examen", fecha: "sabado", sabado: "sabado", causa: "causa" }[pm2[1]];
  else if (/tendencia|evolucion|historic/.test(s)) r.por = "examen";
  if (r.met === "inasis" && !r.por) r.por = "causa"; if (r.met === "rem_asis" && !r.por) r.por = "sabado";
  /* cadete por nombre (dos o más palabras que coinciden) */
  const toks = s.split(/[^a-z]+/).filter(w => w.length > 3); const cad = all().find(o => { const n = norm(o.n); return toks.filter(w => new RegExp("\\b" + w + "\\b").test(n)).length >= 2; }); if (cad) { r.q = cad.n; ent.push(`cadete ${cad.n}`); }
  if (r.met) ent.unshift(MET_TXT[r.met] + (r.lab ? " " + r.lab : "") + (r.libro ? ` (libro ${r.libro})` : "")); if (r.est) ent.push({ bad: "reprobados", ok: "aprobados", ex: "exentos" }[r.est]); if (r.rem) ent.push(r.rem === "si" ? "en remedial" : "fuera del remedial"); if (r.por) ent.push("por " + POR_TXT[r.por].toLowerCase());
  return { r, txt: ent.join(" · ") }; }
function applyPedido() { const { r, txt } = parsePedido(E.txt); Object.assign(E, { a: r.a, g: r.g, d: r.d, rem: r.rem, est: r.est, q: r.q, lab: r.lab, libro: r.libro }); if (r.met) E.met = r.met; if (r.por) E.por = r.por; else if (r.q) E.por = "ninguno"; E.leido = txt || "No reconocí datos en el pedido; ajusta los filtros a mano."; }
function filtroTxt() { const p = []; if (E.a) p.push(`${ANIO[E.a]} año`); if (E.g) p.push(`grupo ${E.g}`); if (E.d) p.push(`docente ${E.d}`); if (E.gen) p.push(`generación ${E.gen}`); if (E.rem) p.push({ si: "en remedial", no: "fuera del remedial", hist: "con historial de remedial" }[E.rem]); if (E.est) p.push({ ok: "aprobados", bad: "reprobados", sc: "sin calificación", ex: "exentos" }[E.est]); if (E.q) p.push(`cadete ${E.q}`); return p.length ? p.join(" · ") : "todos los cadetes del ciclo"; }

/* ---------- vista ---------- */
const progTd = c => `<td class="num">${fmt(c.dAvg)}</td><td class="num">${fmt(c.sAvg)}</td><td class="num">${c.mej}/${c.both}</td><td class="num">${c.ap}</td><td class="num ${c.na ? "lo" : ""}">${c.na}</td><td class="num">${c.pct == null ? "—" : c.pct + "%"}</td>`;
const refTd = c => `<td class="num">${c.si}</td><td class="num ${c.no ? "lo" : ""}">${c.no}</td><td class="num">${c.pct == null ? "—" : c.pct + "%"}</td>`;
const refRowX = c => [c.si, c.no, c.pct ?? ""];
const progRow = c => [c.dAvg ?? "", c.sAvg ?? "", c.mej, c.ap, c.na, c.pct ?? ""];
const fmt = (v, d) => (v == null ? "—" : d ? v.toFixed(d) : String(Math.round(v * 10) / 10));
function bars(rows, max, lab, val, sub) { return `<div class="estbars">${rows.map(r => `<div class="crow"><span>${esc(lab(r))}</span><div class="track"><div class="fill" style="width:${max ? Math.max(0, val(r)) * 100 / max : 0}%"></div></div><b>${fmt(val(r))}<small>${esc(sub(r))}</small></b></div>`).join("")}</div>`; }
function vEst() {
  const st = compute(), labs = RI().allLabels(), docs = [...new Set(all().map(o => o.d).filter(Boolean))].sort(), gens = [...new Set(all().map(o => o.gen).filter(Boolean))].sort();
  const libs = E.a ? RI().librosDe(E.a) : [...new Set(all().flatMap(o => (o.alc || []).map(x => x.libro)))].sort((a, b) => a - b);
  const isP = /^p[12]$|^prom$/.test(E.met), isS = E.met === "seg_av", dec = isP ? 2 : 1, esc_ = isPts(E.met) ? RI().cfg(whichEsc(E.met) === "alc" ? "escalaAlc" : "escalaAlcpt") : null;
  let main = "";
  if (E.met === "inasis") main = `<h3>Inasistencias al remedial por causa</h3><p class="hint">${st.totInas || 0} inasistencias (F y J) en ${S.cfg.sesiones.length} sábados.</p>${bars(st.causas, Math.max(1, ...st.causas.map(x => x.n)), r => r.k, r => r.n, r => r.pct + "%")}`;
  else if (E.met === "rem_est") main = `<h3>Estatus de los remediales</h3><p class="hint">${st.totRem || 0} remediales registrados.</p>${bars(st.estatus, Math.max(1, ...st.estatus.map(x => x.n)), r => r.k, r => r.n, () => "")}
    ${(st.remGrupos || []).length ? `<div class="tscroll"><table class="tbl"><thead><tr><th>${esc(POR_TXT[E.por] || "Grupo")}</th><th class="num">Remediales</th><th class="num">En curso</th><th class="num">Aprobados</th><th class="num">No aprobados</th><th class="num">Baja</th></tr></thead><tbody>${st.remGrupos.map(x => `<tr><td>${esc(x.k)}</td><td class="num">${x.n}</td><td class="num">${x.curso}</td><td class="num">${x.aprobado}</td><td class="num">${x.noaprobado}</td><td class="num">${x.baja}</td></tr>`).join("")}</tbody></table></div>` : ""}`;
  else {
    if (E.por === "sabado" && st.sabados.length) main += `<h3>Asistencia al remedial por sábado</h3><div class="tscroll"><table class="tbl"><thead><tr><th>Sábado</th><th class="num">Con registro</th><th class="num">Asistieron</th><th class="num">Faltaron</th><th class="num">Justificadas</th><th class="num">% asistencia</th></tr></thead><tbody>${st.sabados.map(x => `<tr><td>${esc(x.s)}</td><td class="num">${x.n}</td><td class="num">${x.P}</td><td class="num">${x.F}</td><td class="num">${x.J}</td><td class="num">${x.pct == null ? "—" : x.pct + "%"}</td></tr>`).join("")}</tbody></table></div>`;
    else if (E.por === "causa") main += `<h3>Inasistencias por causa</h3>${bars(st.causas, Math.max(1, ...st.causas.map(x => x.n)), r => r.k, r => r.n, r => r.pct + "%")}`;
    else if (E.por === "examen") main += `<h3>Tendencia por examen ALCPT</h3>${st.tendencia.length ? bars(st.tendencia, 100, r => r.k, r => r.avg, r => `${r.cap} cadetes`) + `<div class="tscroll"><table class="tbl"><thead><tr><th>Examen</th><th class="num">Cadetes</th><th class="num">Promedio</th><th class="num">Mediana</th><th class="num">Mín.</th><th class="num">Máx.</th></tr></thead><tbody>${st.tendencia.map(x => `<tr><td>${esc(x.k)}</td><td class="num">${x.cap}</td><td class="num">${fmt(x.avg)}</td><td class="num">${fmt(x.med)}</td><td class="num">${fmt(x.min)}</td><td class="num">${fmt(x.max)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="hint">Sin puntajes ALCPT en el recorte.</p>`}`;
    else main += `<h3>${esc(MET_TXT[E.met])}${E.lab && E.met === "alcpt_lab" ? " " + esc(E.lab) : ""} por ${esc((POR_TXT[E.por] || "").toLowerCase())}</h3>
      ${st.grupos.length ? bars(st.grupos.filter(x => x.avg != null), isP ? 10 : /_av$/.test(E.met) ? Math.max(1, ...st.grupos.map(x => Math.abs(x.avg || 0))) : 100, r => r.k, r => r.avg, r => `${r.cap}/${r.n}`) : ""}
      <div class="tscroll"><table class="tbl"><thead><tr><th>${esc(POR_TXT[E.por] || "")}</th><th class="num">Cadetes</th><th class="num">Con dato</th><th class="num">Promedio</th><th class="num">Mediana</th><th class="num">Mín.</th><th class="num">Máx.</th>${isP ? `<th class="num">Aprobados</th><th class="num">% aprob.</th>` : ""}${isA(E.met) ? `<th class="num">Aprobados</th><th class="num">No aprobados</th><th class="num">Sin mínimo</th><th class="num">% aprob.</th>` : ""}${E.met === "alc_par" ? `<th class="num">Alcanzan</th><th class="num">No alcanzan</th><th class="num">% alcanza</th>` : ""}${isS ? `<th class="num">Prom. diagnóstico</th><th class="num">Prom. último seguimiento</th><th class="num">Mejoraron</th><th class="num">Aprueban ahora</th><th class="num">No aprueban</th><th class="num">% aprueba ahora</th>` : ""}${esc_ ? esc_.map(b => `<th class="num" title="${esc(b.t)}"><i class="dot" style="background:${esc(b.c)}"></i>${b.min}–${b.max}</th>`).join("") : ""}</tr></thead><tbody>
      ${st.grupos.map(x => `<tr><td>${esc(x.k)}</td><td class="num">${x.n}</td><td class="num">${x.cap}</td><td class="num">${fmt(x.avg, dec)}</td><td class="num">${fmt(x.med, dec)}</td><td class="num">${fmt(x.min)}</td><td class="num">${fmt(x.max)}</td>${isP ? `<td class="num">${x.ok}</td><td class="num">${x.cap ? Math.round(x.ok * 1000 / x.cap) / 10 + "%" : "—"}</td>` : ""}${x.apr ? `<td class="num">${x.apr.ap}</td><td class="num ${x.apr.na ? "lo" : ""}">${x.apr.na}</td><td class="num">${x.apr.sin}</td><td class="num">${x.apr.pct == null ? "—" : x.apr.pct + "%"}</td>` : ""}${x.ref ? refTd(x.ref) : ""}${x.prog ? progTd(x.prog) : ""}${x.bb ? x.bb.map(n => `<td class="num">${n}</td>`).join("") : ""}</tr>`).join("")}
      <tr class="total"><td>Total</td><td class="num">${st.global.n}</td><td class="num">${st.global.cap}</td><td class="num">${fmt(st.global.avg, dec)}</td><td class="num">${fmt(st.global.med, dec)}</td><td class="num">${fmt(st.global.min)}</td><td class="num">${fmt(st.global.max)}</td>${isP ? `<td class="num">${st.global.ok}</td><td class="num">${st.global.cap ? Math.round(st.global.ok * 1000 / st.global.cap) / 10 + "%" : "—"}</td>` : ""}${st.global.apr ? `<td class="num">${st.global.apr.ap}</td><td class="num ${st.global.apr.na ? "lo" : ""}">${st.global.apr.na}</td><td class="num">${st.global.apr.sin}</td><td class="num">${st.global.apr.pct == null ? "—" : st.global.apr.pct + "%"}</td>` : ""}${st.global.ref ? refTd(st.global.ref) : ""}${st.global.prog ? progTd(st.global.prog) : ""}${esc_ ? esc_.map((b, i) => `<td class="num">${st.grupos.reduce((s, x) => s + (x.bb ? x.bb[i] : 0), 0)}</td>`).join("") : ""}</tr></tbody></table></div>`;
    if (st.detalle.length && E.por !== "examen") main += `<h3>Detalle por cadete</h3><div class="tscroll"><table class="tbl"><thead><tr><th>Cadete</th><th>Año y grupo</th><th>Docente</th><th class="num">${esc(MET_TXT[E.met])}</th>${isA(E.met) || isS || E.met === "alc_par" ? "<th>Resultado</th>" : ""}</tr></thead><tbody>${st.detalle.slice(0, 300).map(({ o, v }) => `<tr><td><button class="nameb" data-id="${o.id}">${esc(o.n)}</button></td><td>${ANIO[o.a]} año · Grupo ${esc(o.g)}</td><td>${esc(o.d || "")}</td><td class="num">${v == null ? "—" : isPts(E.met) && !/_av$/.test(E.met) ? RI().chipEsc(Math.round(v), whichEsc(E.met)) : fmt(v, dec) + (E.met === "rem_asis" ? "%" : "")}</td>${isA(E.met) ? `<td>${RI().ap.chip(resOf(o))}</td>` : E.met === "alc_par" ? `<td>${RI().ap.alcChip(RI().ap.lastAlcPar(o))}</td>` : isS ? `<td>${(P => P.ult ? RI().ap.chip(P.ult.r) : "—")(RI().ap.progreso(o))}</td>` : ""}</tr>`).join("")}</tbody></table></div>${st.detalle.length > 300 ? `<p class="hint">Se muestran 300 de ${st.detalle.length}; el Excel trae todos.</p>` : ""}`;
  }
  VW.innerHTML = `<h2>Estadística</h2>
  <p class="lead">Pide un dato general o específico. Escribe tu pedido o usa los filtros; el resultado se descarga en Excel.</p>
  <div class="impbox"><div class="bar"><input id="esTxt" style="flex:1;min-width:260px" placeholder="Ej.: avance del seguimiento por grupo · promedio ALCPT de 4/o. año por grupo · reprobados del 2/o. parcial · inasistencias del remedial por causa" value="${esc(E.txt)}" aria-label="Pedido"><button class="btn" id="esGo">Calcular</button></div>
  ${E.leido ? `<p class="hint" role="status">Entendí: ${esc(E.leido)}</p>` : ""}
  <div class="bar">
    <label class="hint">Dato<select id="esMet">${METS.map(([k, t]) => `<option value="${k}" ${E.met === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    ${E.met === "alcpt_lab" ? `<label class="hint">Examen<select id="esLab">${labs.map(l => `<option ${E.lab === l ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>` : ""}
    ${E.met === "alc" ? `<label class="hint">Libro<select id="esLib"><option value="">Todos</option>${libs.map(b => `<option ${E.libro === b ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></label>` : ""}
    <label class="hint">Agrupar por<select id="esPor">${PORS.map(([k, t]) => `<option value="${k}" ${E.por === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    <label class="hint">Año<select id="esA"><option value="">Todos</option>${YRS().map(a => `<option value="${a}" ${E.a === a ? "selected" : ""}>${ANIO[a]} año</option>`).join("")}</select></label>
    <label class="hint">Grupo<select id="esG"><option value="">Todos</option>${groups(E.a).map(g => `<option ${E.g === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label>
    <label class="hint">Docente<select id="esD"><option value="">Todos</option>${docs.map(d => `<option ${E.d === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
    <label class="hint">Generación<select id="esGen"><option value="">Todas</option>${gens.map(d => `<option ${E.gen === d ? "selected" : ""}>${esc(d)}</option>`).join("")}</select></label>
    <label class="hint">Remedial<select id="esR"><option value="">Todos</option><option value="si" ${E.rem === "si" ? "selected" : ""}>En remedial</option><option value="no" ${E.rem === "no" ? "selected" : ""}>Fuera del remedial</option><option value="hist" ${E.rem === "hist" ? "selected" : ""}>Con historial de remedial</option></select></label>
    <label class="hint">Estado<select id="esE"><option value="">Todos</option>${[["ok", "Aprobados"], ["bad", "Reprobados"], ["sc", "Sin calificación"], ["ex", "Exentos"]].map(([k, t]) => `<option value="${k}" ${E.est === k ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    ${E.q ? `<span class="chip">${esc(E.q)}<button type="button" id="esQx" aria-label="Quitar cadete">×</button></span>` : ""}
  </div></div>
  <section class="gmon"><div class="gm-k"><em>Cadetes en el recorte</em><b>${st.L.length}</b></div>${st.global.prog ? `<div class="gm-k"><em>Diagnóstico → último seguimiento</em><b>${fmt(st.global.prog.dAvg)}<small> → ${fmt(st.global.prog.sAvg)}</small></b></div><div class="gm-k"><em>Ya alcanzan el mínimo</em><b>${st.global.prog.ap}<small>/${st.global.prog.both}${st.global.prog.pct != null ? " (" + st.global.prog.pct + "%)" : ""}</small></b></div>` : ""}${st.global.apr ? `<div class="gm-k"><em>Aprobados · no aprobados</em><b>${st.global.apr.ap}<small> · ${st.global.apr.na}${st.global.apr.pct != null ? " (" + st.global.apr.pct + "%)" : ""}${st.global.apr.sin ? " · " + st.global.apr.sin + " sin mínimo" : ""}</small></b></div>` : ""}<div class="gm-k"><em>Con dato</em><b>${st.global.cap}</b></div><div class="gm-k"><em>Promedio</em><b>${fmt(st.global.avg, dec)}</b></div><div class="gm-k"><em>Filtro</em><span class="hint" style="color:inherit">${esc(filtroTxt())}</span></div></section>
  ${main}
  <p style="margin-top:14px"><button class="btn" id="esXl">Descargar estadística .xlsx</button></p>`;
  const on = (id, k, re) => { const el = $(id); if (el) el.onchange = e => { E[k] = e.target.value; if (re) E.g = ""; E.leido = ""; vEst(); }; };
  on("#esMet", "met"); on("#esLab", "lab"); on("#esLib", "libro"); on("#esPor", "por"); on("#esA", "a", true); on("#esG", "g"); on("#esD", "d"); on("#esGen", "gen"); on("#esR", "rem"); on("#esE", "est");
  if (E.met === "alcpt_lab" && !E.lab) { E.lab = labs[labs.length - 1] || ""; }
  const qx = $("#esQx"); if (qx) qx.onclick = () => { E.q = ""; vEst(); };
  const go = () => { E.txt = $("#esTxt").value; applyPedido(); vEst(); }; $("#esGo").onclick = go; $("#esTxt").onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); go(); } };
  $("#esXl").onclick = () => exportEst().catch(e => { console.error(e); toast("No se pudo preparar el Excel"); });
  VW.querySelectorAll(".nameb").forEach(b => b.onclick = () => openFicha(b.dataset.id));
}
async function exportEst() {
  const XL = RI().XL, X = await XL.lib(), wb = X.utils.book_new(), st = compute(), isP = /^p[12]$|^prom$/.test(E.met), escs = isPts(E.met) ? RI().cfg(whichEsc(E.met) === "alc" ? "escalaAlc" : "escalaAlcpt") : null;
  const tit = "ESTADÍSTICA DE INGLÉS · " + MET_TXT[E.met] + (E.lab && E.met === "alcpt_lab" ? " " + E.lab : "") + (E.libro && E.met === "alc" ? " · libro " + E.libro : "");
  const res = [[tit], ["Esc. Mil. Enfría. · Mesa de Idioma Extranjero"], ["Filtro", filtroTxt()], ["Pedido", E.txt || "(filtros)"], ["Agrupado por", POR_TXT[E.por] || ""], ["Fecha de emisión", isoL(new Date())], []];
  const mR = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, ...[2, 3, 4, 5].map(r => ({ s: { r, c: 1 }, e: { r, c: 6 } }))]; const hdr = [];
  if (E.met === "inasis" || E.por === "causa") { hdr.push(res.length); res.push(["Causa", "Inasistencias", "Porcentaje"]); st.causas.forEach(x => res.push([x.k, x.n, x.pct])); res.push(["Total", st.totInas || 0, 100]); }
  else if (E.met === "rem_est") { hdr.push(res.length); res.push(["Estatus", "Remediales"]); st.estatus.forEach(x => res.push([x.k, x.n])); res.push(["Total", st.totRem || 0]);
    if ((st.remGrupos || []).length) { res.push([]); hdr.push(res.length); res.push([POR_TXT[E.por] || "Grupo", "Remediales", "En curso", "Aprobados", "No aprobados", "Baja"]); st.remGrupos.forEach(x => res.push([x.k, x.n, x.curso, x.aprobado, x.noaprobado, x.baja])); } }
  else if (E.por === "sabado") { hdr.push(res.length); res.push(["Sábado", "Con registro", "Asistieron", "Faltaron", "Justificadas", "% asistencia"]); st.sabados.forEach(x => res.push([x.s, x.n, x.P, x.F, x.J, x.pct ?? ""])); }
  else if (E.por === "examen") { hdr.push(res.length); res.push(["Examen", "Cadetes", "Promedio", "Mediana", "Mínimo", "Máximo"]); st.tendencia.forEach(x => res.push([x.k, x.cap, r1(x.avg), r1(x.med), x.min, x.max])); }
  else { hdr.push(res.length); res.push([POR_TXT[E.por] || "", "Cadetes", "Con dato", "Promedio", "Mediana", "Mínimo", "Máximo", ...(isP ? ["Aprobados", "% aprobados"] : []), ...(isA(E.met) ? ["Aprobados", "No aprobados", "Sin mínimo", "% aprobación"] : []), ...(E.met === "alc_par" ? ["Alcanzan", "No alcanzan", "% alcanza"] : []), ...(E.met === "seg_av" ? ["Prom. diagnóstico", "Prom. último seguimiento", "Mejoraron", "Aprueban ahora", "No aprueban", "% aprueba ahora"] : []), ...(escs ? escs.map(b => `${b.min}–${b.max} ${b.t}`) : [])]);
    st.grupos.forEach(x => res.push([x.k, x.n, x.cap, isP ? r2(x.avg) : r1(x.avg), isP ? r2(x.med) : r1(x.med), x.min, x.max, ...(isP ? [x.ok, x.cap ? r1(x.ok * 100 / x.cap) : ""] : []), ...(x.apr ? [x.apr.ap, x.apr.na, x.apr.sin, x.apr.pct ?? ""] : []), ...(x.ref ? refRowX(x.ref) : []), ...(x.prog ? progRow(x.prog) : []), ...(x.bb || [])]));
    res.push(["Total", st.global.n, st.global.cap, isP ? r2(st.global.avg) : r1(st.global.avg), isP ? r2(st.global.med) : r1(st.global.med), st.global.min, st.global.max, ...(isP ? [st.global.ok, st.global.cap ? r1(st.global.ok * 100 / st.global.cap) : ""] : []), ...(st.global.apr ? [st.global.apr.ap, st.global.apr.na, st.global.apr.sin, st.global.apr.pct ?? ""] : []), ...(st.global.ref ? refRowX(st.global.ref) : []), ...(st.global.prog ? progRow(st.global.prog) : []), ...(escs ? escs.map((b, i) => st.grupos.reduce((s, x) => s + (x.bb ? x.bb[i] : 0), 0)) : [])]); }
  const wR = Math.max(...res.map(r => r.length)); mR[0].e.c = mR[1].e.c = Math.max(6, wR - 1); mR.slice(2).forEach(m => m.e.c = Math.max(6, wR - 1));
  X.utils.book_append_sheet(wb, XL.sheet(X, res, [34, 14, 12, 12, 12, 12, 12, 14, 14, 16, 16, 16, 16], mR, hdr), "Resumen");
  if (st.detalle.length) { const det = [["Detalle por cadete · " + MET_TXT[E.met]], ["Año", "Grupo", "Docente", "Nombre", "Matrícula", MET_TXT[E.met], "Escala", "Remedial", ...(isA(E.met) ? ["Resultado", "Mínimo aplicado"] : E.met === "seg_av" ? ["Diagnóstico", "Último seguimiento", "Resultado último seguimiento"] : E.met === "alc_par" ? ["Libro y parcial", "Semestre y libros", "Referencia", "Resultado"] : [])]];
    st.detalle.forEach(({ o, v }) => { const b = isPts(E.met) && !/_av$/.test(E.met) ? RI().banda(v == null ? null : Math.round(v), whichEsc(E.met)) : null; det.push([ANIO[o.a] + " año", "Grupo " + o.g, o.d || "", o.n, o.m || "", v == null ? "" : isP ? r2(v) : r1(v), b ? b.t : "", inRem(o) ? "Sí" : "", ...(isA(E.met) ? (r => [r.st === "nd" ? "" : RI().ap.txt(r), r.min != null ? `${r.min} (${ANIO[r.a]} año)` : ""])(resOf(o)) : E.met === "seg_av" ? (P => [P.d ? P.d.v : "", P.ult ? `${P.ult.v} (${P.ult.lab})` : "", P.ult ? RI().ap.txt(P.ult.r) : ""])(RI().ap.progreso(o)) : E.met === "alc_par" ? (r => r ? [`Libro ${r.x.libro} · ${r.x.tipo === "p1" ? "parcial 1" : "parcial 2"}`, r.row ? `${r.row.n} · libros ${RI().ap.librosTxt(r.row.libros)}` : "", r.row ? r.row.ref : "", RI().ap.alcTxt(r)] : ["", "", "", ""])(RI().ap.lastAlcPar(o)) : [])]); });
    const mD = [{ s: { r: 0, c: 0 }, e: { r: 0, c: isA(E.met) ? 9 : E.met === "seg_av" ? 10 : E.met === "alc_par" ? 11 : 7 } }, ...XL.runs(det, [0, 1, 2], 2, det.length - 1)];
    X.utils.book_append_sheet(wb, XL.sheet(X, det, [10, 10, 28, 36, 14, 16, 22, 9, 22, 16], mD, [1]), "Detalle"); }
  if (RI().apSheet) RI().apSheet(X, wb, st.L);
  if (RI().segSheet) RI().segSheet(X, wb, st.L);
  if (st.tendencia.length && E.por !== "examen") { const t = [["Tendencia ALCPT del recorte"], ["Examen", "Cadetes", "Promedio", "Mediana", "Mínimo", "Máximo"]]; st.tendencia.forEach(x => t.push([x.k, x.cap, r1(x.avg), r1(x.med), x.min, x.max])); X.utils.book_append_sheet(wb, XL.sheet(X, t, [26, 10, 10, 10, 10, 10], [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }], [1]), "Tendencia ALCPT"); }
  await XL.save(X, wb, `ESTADISTICA INGLES ${isoL(new Date())}.xlsx`); toast("Estadística descargada");
}
G.vEst = vEst; G.ReplicaEstIng = { parsePedido, compute, exportEst, applyPedido, E };
})(window);

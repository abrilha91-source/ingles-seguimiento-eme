#!/usr/bin/env python3
"""Pruebas v1.3: 2 parciales ALC + A.L.C.P.T. final, tipos de ALCPT (diagnóstico / seguimiento / final),
avance del seguimiento, salida del remedial y migración (datos SINTÉTICOS, nombres inventados)."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
import openpyxl
APP = os.environ.get("APP_URL", "http://localhost:8937/")
T = Path(__file__).resolve().parent; SH = Path(os.environ.get("SHOTS", T / "capturas")); SH.mkdir(exist_ok=True)
DL = Path("/tmp/ing_dl_v13"); DL.mkdir(exist_ok=True)
R = []; ERR = []
def rec(n, ok, d=""): R.append({"prueba": n, "ok": bool(ok), "detalle": str(d)[:300]}); print(("OK  " if ok else "FALLA ") + n, ("" if ok else str(d)[:300]))
def cad(n, a, g, alcpt=(), diag=None, **k):
    meta = {}
    for x in alcpt:
        m = {"fecha": x[3] if len(x) > 3 else "", "forma": ""}
        if len(x) > 2 and x[2]: m["tipo"] = x[2]
        meta[x[0]] = m
    o = {"n": n, "a": a, "g": g, "m": "", "d": "Docente Ficticio", "alcpt": [list(x[:2]) for x in alcpt], "alcptMeta": meta, "cal": {}, "asis": {}, "causa": {}, "evid": [], "obs": "", "c": "", "tray": []}
    if diag is not None: o["diag"] = diag; o["diagMeta"] = {"tipo": "diagnostico", "fecha": "2026-09-21", "forma": ""}
    o.update(k); return o
REM = lambda p, alta="2026-09-26": {"rem": {"on": True, "grupo": "R4-G1", "docente": "Docente Ficticio", "alta": alta, "motivo": "Diagnóstico", "puntaje": p, "estatus": "curso", "reeval": [], "avances": []}, "remHist": [{"alta": alta, "motivo": "Diagnóstico", "puntaje": p, "estatus": "curso"}]}
C3 = {"p1": {"e": 8, "pt": 2.5, "pa": 1}, "p2": {"e": 7, "pt": 2, "pa": 1}, "p3": {"e": 2, "pt": 0, "pa": 0}}
A = {
 # 4/o. (mín. 55): diag 40, seguimientos Oct 45 · Nov 56 (sale), final Ene 2027 58; historial de ciclos anteriores sin tipo / periodo
 "v-4a": cad("Ficticia Cuatro Alfa", "4", "1", [("Feb 2026", 30, "periodo"), ("Oct 2026", 45, "periodo", "2026-10-24"), ("Nov 2026", 56, None, "2026-11-07"), ("Ene 2027", 58, "final", "2027-01-20")], 40,
         cal=C3, alc=[{"id": "x1", "ciclo": "2026-2027", "a": "4", "sem": "1", "libro": "29", "tipo": "p3", "fecha": "", "forma": "", "pts": 70}, {"id": "x2", "ciclo": "2026-2027", "a": "4", "sem": "1", "libro": "29", "tipo": "p1", "fecha": "", "forma": "", "pts": 80}],
         tray=[{"ciclo": "2025-2026", "sem": "2", "a": "3", "g": "1", "d": "Docente Ficticio", "parciales": [7, 8, 9], "calCiclo": {"p1": {"e": 7}, "p3": {"e": 9}}}], **REM(40)),
 # 4/o.: diag 42, seguimiento Oct 50 (no aprueba), mejora 8
 "v-4b": cad("Ficticio Cuatro Beta", "4", "1", [("Oct 2026", 50, "seguimiento", "2026-10-24")], 42, **REM(42)),
 # 4/o.: seguimiento ANTES del alta: no cuenta para salir
 "v-4c": cad("Ficticio Cuatro Gama", "4", "2", [("Oct 2026", 60, "seguimiento", "2026-10-03")], 41, **REM(41, "2026-10-10")),
 # 3/er. (mín. 31): diag 25, seguimiento 33 → sale
 "v-3a": cad("Ficticia Tres Alfa", "3", "1", [("Nov 2026", 33, "seguimiento", "2026-11-07")], 25, **REM(25)),
 # 3/er.: sin remedial, diag 40, sin seguimiento
 "v-3b": cad("Ficticio Tres Beta", "3", "1", [], 40, cal={"p1": {"e": 9, "pt": 3, "pa": 1}, "p2": {"e": 9, "pt": 3, "pa": 1}}),
 # 2/o. (mín. 45): sin diagnóstico; seguimiento 47
 "v-2a": cad("Ficticia Dos Alfa", "2", "1", [("Nov 2026", 47, "seguimiento", "2026-11-07")]),
}
DATA = {"formato": "ingles-seguimiento-eme-respaldo", "version": "1.2", "cfg": {"sesiones": ["2026-09-26"], "minimo": 6, "riesgo": 2, "ciclo": "2026-2027", "semestre": "1", "apVer": 2,
        "apTabla": {"1": {"min": None, "conv": []}, "2": {"min": 45, "conv": [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]]}, "3": {"min": 31, "conv": [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]]}, "4": {"min": 55, "conv": [[60, 10], [59, 9], [58, 8], [57, 7], [56, 6.5], [55, 6]]}},
        "pesoParc": 60, "pesoAlcpt": 40}, "alumnos": A, "importaciones": {}}
FJ = DL / "sintetico_v13.json"; FJ.write_text(json.dumps(DATA, ensure_ascii=False))
def tab(pg, v): pg.click(f'nav.tabs button[data-v="{v}"]'); pg.wait_for_timeout(350)
def download(pg, fn):
    with pg.expect_download(timeout=30000) as d: fn()
    p = DL / d.value.suggested_filename; d.value.save_as(p); return p
def fonts_ok(wb):
    bad = tot = 0
    for ws in wb:
        for row in ws.iter_rows():
            for c in row:
                if c.value is None: continue
                tot += 1
                if not (c.font and c.font.name == "Noto Sans" and float(c.font.sz or 0) == 10): bad += 1
    return tot, bad
def cells(ws): return [str(c.value) for row in ws.iter_rows() for c in row if c.value is not None]
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True); pg = ctx.new_page()
    pg.on("console", lambda m: ERR.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: ERR.append("PAGEERR " + str(e)))
    pg.goto(APP + "?nosw"); pg.wait_for_timeout(1200)
    tab(pg, "cfg"); pg.set_input_files("#xUp", str(FJ)); pg.wait_for_timeout(1800)
    rec("Carga del respaldo sintético v1.2", pg.evaluate("S.items.size") == len(A))
    # 1. migración
    m = pg.evaluate("""(()=>{const o=S.items.get('v-4a');return {p3:'p3' in (o.cal||{}),arch:o.archivoV13&&o.archivoV13.calP3,alc:(o.alc||[]).map(x=>x.tipo),alcA:(o.archivoV13.alcP3||[]).length,
      tp:o.tray[0].parciales,tc:'p3' in o.tray[0].calCiclo,ta:Object.keys(o.archivoV13).filter(k=>k.startsWith('tray')).length,ver:o.dataVer,
      tipos:Object.fromEntries(Object.entries(o.alcptMeta).map(([k,v])=>[k,v.tipo])),orig:o.alcptMeta['Feb 2026'].tipoOrig,log:S.cfg.migV13}})()""")
    rec("Migración: 3/er. parcial sale de cal y queda archivado", not m["p3"] and m["arch"] and m["arch"]["e"] == 2, m)
    rec("Migración: examen ALC parcial 3 archivado, parcial 1 conservado", m["alc"] == ["p1"] and m["alcA"] == 1, m)
    rec("Migración: trayectoria con 3 parciales queda en 2 y el tercero archivado", m["tp"] == [7, 8] and not m["tc"] and m["ta"] == 1, m)
    rec("Migración: tipos ALCPT (ciclo actual → seguimiento, anterior → ciclo anterior, final se respeta)", m["tipos"] == {"Feb 2026": "historico", "Oct 2026": "seguimiento", "Nov 2026": "seguimiento", "Ene 2027": "final"} and m["orig"] == "periodo" and m["ver"] == 3, m)
    lg = (m["log"] or [{}])[-1]
    rec("Migración: bitácora con conteo y nombres archivados", lg.get("p3") == 1 and lg.get("alcP3") == 1 and lg.get("trayP3") == 1 and lg.get("archivados") == ["Ficticia Cuatro Alfa"], lg)
    tab(pg, "cfg"); t = pg.text_content("#view")
    rec("Ajustes: aviso de 3/er. parcial archivado y tabla simple sin CEI/propuesta", "3/er. parcial archivado" in t and "Ficticia Cuatro Alfa" in t and "CEI" not in t and "C.E.I." not in t and "propuesta" not in t.lower(), t[t.find("ALCPT: puntaje"):][:400])
    # 2. calificaciones
    c = pg.evaluate("""(()=>{const o=S.items.get('v-4a'),P=ReplicaIng.ap;return {parc:PARC.map(x=>x[0]),parts:parts(o),prom:prom(o),cf:P.calFinal(o)}})()""")
    rec("Calificaciones: exactamente 2 parciales", c["parc"] == ["p1", "p2"] and len(c["parts"]) == 2, c)
    rec("Parcial = examen 60 % + portafolio + participación", c["parts"] == [8.3, 7.2], c["parts"])
    rec("Promedio de los 2 parciales (el 3/er. archivado no cuenta)", c["prom"] == 7.75, c["prom"])
    rec("Calificación final = parciales 60 % + ALCPT final convertido 40 %", c["cf"].get("f", {}).get("l") == "Ene 2027" and abs(c["cf"]["v"] - round((7.75 * 60 + 8 * 40) / 100, 2)) < 0.01, c["cf"])
    tab(pg, "cal"); t = pg.text_content("#view")
    rec("Vista Calificaciones sin 3/er. parcial", "3/er. parcial" not in t and "3/P" not in t and "2/o. parcial" in t, t[:300])
    tab(pg, "cad"); t = pg.text_content("#view"); rec("Cadetes sin columna de 3/er. parcial", "3/er." not in pg.text_content("#view thead") if pg.locator("#view thead").count() else True, "")
    tab(pg, "imp"); pg.evaluate("IMP.tipo='cal';render()"); pg.wait_for_timeout(300); h = pg.inner_html("#view")
    rec("Importar calificaciones: solo 1/er. y 2/o. parcial", "3/er. parcial" not in h and "2/o. parcial" in h, "")
    pg.evaluate("IMP.tipo='alcpt';render()"); pg.wait_for_timeout(300)
    rec("Importar ALCPT: tipo (Seguimiento por omisión) y fecha", pg.locator("#iTp").count() == 1 and pg.eval_on_selector("#iTp", "e=>e.value") == "seguimiento" and pg.locator("#iTf").count() == 1, "")
    # 3. seguimiento y salida del remedial
    g = pg.evaluate("""(()=>{const P=ReplicaIng.ap,g=id=>S.items.get(id);const pr=P.progreso(g('v-4a'));return {
      pasos:pr.pasos.map(x=>[P.pasoTxt(x),x.v,x.dif,x.r.st]),ult:pr.ult.v,
      s4a:P.salida(g('v-4a')),s4b:P.salida(g('v-4b')),s4c:P.salida(g('v-4c')),s3a:P.salida(g('v-3a')),
      p2a:P.progreso(g('v-2a')).pasos.map(x=>[P.pasoTxt(x),x.dif]),cnt:P.progCnt([...S.items.values()].filter(o=>o.a==='4'))}})()""")
    rec("Avance: diagnóstico → seguimiento 1 → seguimiento 2 → final, con diferencia y resultado", g["pasos"] == [["Diagnóstico", 40, None, "na"], ["Seguimiento 1", 45, 5, "na"], ["Seguimiento 2", 56, 16, "ap"], ["Final", 58, 18, "ap"]], g["pasos"])
    rec("Avance: el ciclo anterior no entra", all(x[0] != "Ciclo anterior" for x in g["pasos"]) and g["ult"] == 56, g)
    rec("Salida del remedial: seguimiento posterior al alta alcanza el mínimo (primera vez)", g["s4a"] and "Nov 2026" in g["s4a"]["f"] and "seguimiento" in g["s4a"]["f"] and g["s3a"] and not g["s4b"], [g["s4a"], g["s3a"], g["s4b"]])
    rec("Salida del remedial: seguimiento anterior al alta no cuenta", not g["s4c"], g["s4c"])
    rec("Avance sin diagnóstico: diferencia vacía", g["p2a"] == [["Seguimiento 1", None]], g["p2a"])
    ct = g["cnt"]; rec("Avance por año 4/o.: prom. diag. 41 → 55.3 (último seg.), 3/3 mejoraron, 2 ya aprueban", ct["both"] == 3 and ct["dAvg"] == 41 and ct["sAvg"] == 55.3 and ct["mej"] == 3 and ct["ap"] == 2, ct)
    # 4. vistas
    pg.evaluate("openFicha('v-4a')"); pg.wait_for_timeout(500); t = pg.text_content("#fichaBody")
    rec("Ficha: vista de avance con gráfica", "Avance ALCPT del ciclo" in t and "Seguimiento 2" in t and "+16" in t and pg.locator("#fichaBody svg.progsvg").count() == 1, t[t.find("Avance"):][:300])
    pg.locator("#fichaBody .progv").screenshot(path=str(SH / "v13_ficha_avance.png")); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    tab(pg, "alc"); pg.click('#axSub [data-sub="prog"]'); pg.wait_for_timeout(400); pg.select_option("#axA", "4"); pg.wait_for_timeout(400); t = pg.text_content("#view")
    rec("ALC y ALCPT: pestaña Avance del seguimiento con columnas por seguimiento y gráfica", "Seg. 2" in t and "Ficticia Cuatro Alfa" in t and pg.locator("#axBody svg.progsvg").count() == 3, t[:400])
    pg.screenshot(path=str(SH / "v13_alc_avance.png"), full_page=True)
    pg.click('#axSub [data-sub="alcpt"]'); pg.wait_for_timeout(300); o = pg.text_content("#axL")
    rec("ALCPT: el selector de examen muestra el tipo", "Oct 2026 · Seguimiento" in o and "Ene 2027 · Final" in o and "Feb 2026 · Ciclo anterior" in o, o)
    tab(pg, "eme"); pg.evaluate("ReplicaIng.openEme ? ReplicaIng.openEme('v-4a') : document.querySelector('[data-em=\"v-4a\"]').click()"); pg.wait_for_timeout(500); t = pg.text_content("#emeBody")
    rec("Seguimiento EME: vista de avance en el kárdex", "Avance ALCPT del ciclo" in t and "Seguimiento 1" in t and pg.locator("#emeBody svg.progsvg").count() == 1, t[:200])
    kp = download(pg, lambda: pg.click("#emK")); wb = openpyxl.load_workbook(kp); ws = wb.worksheets[0]; cs = cells(ws); tot, bad = fonts_ok(wb)
    rec("Kárdex .xlsx: avance (diagnóstico → seguimientos → final), tipos, Noto Sans 10 y celdas combinadas", any("Avance ALCPT del ciclo" in x for x in cs) and "Seguimiento 2" in cs and any("· Seguimiento" in x for x in cs) and bad == 0 and len(ws.merged_cells.ranges) > 10, (tot, bad, len(ws.merged_cells.ranges)))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    tab(pg, "pan"); t = pg.text_content("#view")
    rec("Panorama: tarjeta de avance del remedial", pg.locator("#panRemProg").count() == 1 and "Avance del seguimiento" in t and "Pueden salir del remedial" in t, t[t.find("Avance del seguimiento"):][:300])
    # 5. estadística
    tab(pg, "est"); pg.fill("#esTxt", "avance del seguimiento por grupo"); pg.click("#esGo"); pg.wait_for_timeout(500); t = pg.text_content("#view")
    rec("Estadística: 'avance del seguimiento por grupo' se entiende", pg.evaluate("ReplicaEstIng.E.met") == "seg_av" and pg.evaluate("ReplicaEstIng.E.por") == "grupo", pg.evaluate("ReplicaEstIng.E.leido"))
    rec("Estadística: prom. diagnóstico vs último seguimiento, % aprueba ahora y mejoraron", "Prom. último seguimiento" in t and "% aprueba ahora" in t and "4/o. año · Grupo 1" in t, t[:500])
    rec("Estadística: lista de datos sin 3/er. parcial", "3/er. parcial" not in pg.inner_html("#esMet"), "")
    ep = download(pg, lambda: pg.click("#esXl")); wb = openpyxl.load_workbook(ep); tot, bad = fonts_ok(wb); cs = cells(wb["Resumen"])
    rec("Estadística .xlsx: columnas de avance + hoja Avance seguimiento, Noto Sans 10", "Prom. último seguimiento" in cs and "% aprueba ahora" in cs and "Avance seguimiento" in wb.sheetnames and bad == 0, (wb.sheetnames, bad))
    # 6. concentrado
    tab(pg, "cfg"); cp = download(pg, lambda: pg.click("#xCo")); wb = openpyxl.load_workbook(cp); ws = wb["Concentrado"]; hd = [c.value for c in ws[3]]; tot, bad = fonts_ok(wb)
    sg = wb["Avance seguimiento"]; sc = cells(sg)
    rec("Concentrado: 2 parciales, sin 3/er., con último seguimiento", "3/er. parcial" not in hd and "2/o. parcial" in hd and "Último seguimiento" in hd and "Dif. vs diagnóstico" in hd, hd)
    rec("Concentrado: hoja Avance seguimiento con celdas combinadas y Noto Sans 10", "Total del año" in sc and len(sg.merged_cells.ranges) >= 2 and bad == 0, (len(sg.merged_cells.ranges), bad))
    # 7. peso configurable
    pg.fill("#xPp", "50"); pg.fill("#xPa", "50"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    v = pg.evaluate("ReplicaIng.ap.calFinal(S.items.get('v-4a')).v"); rec("Ponderación final configurable (50/50)", abs(v - round((7.75 * 50 + 8 * 50) / 100, 2)) < 0.01, v)
    pg.fill("#xPp", "60"); pg.fill("#xPa", "40"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    # 8. respaldo v1.3 y recarga sin re-migrar
    jp = download(pg, lambda: pg.click("#xDl")); J = json.load(open(jp)); o = J["alumnos"]["v-4a"]
    rec("Respaldo JSON v1.3 conserva lo archivado", J["version"] == "1.3" and o.get("dataVer") == 3 and o["archivoV13"]["calP3"]["e"] == 2 and "p3" not in o["cal"], J["version"])
    n0 = len(pg.evaluate("S.cfg.migV13 || []")); pg.reload(); pg.wait_for_timeout(1500)
    rec("Persistencia: tras recargar no se vuelve a migrar", len(pg.evaluate("S.cfg.migV13 || []")) == n0 and pg.evaluate("S.items.get('v-4a').dataVer") == 3, n0)
    tab(pg, "cfg"); pg.set_input_files("#xUp", str(jp)); pg.wait_for_timeout(1500)
    rec("Respaldo v1.3 se vuelve a cargar sin cambios", pg.evaluate("S.items.get('v-4a').archivoV13.calP3.e") == 2 and len(pg.evaluate("S.cfg.migV13 || []")) == n0, "")
    rec("Sin errores en consola", not [e for e in ERR if "favicon" not in e], ERR[:5])
    b.close()
ok = sum(r["ok"] for r in R); print(f"\n{ok}/{len(R)} pruebas correctas")
(T / "resultado_test_v13.json").write_text(json.dumps({"total": len(R), "ok": ok, "pruebas": R}, ensure_ascii=False, indent=1))

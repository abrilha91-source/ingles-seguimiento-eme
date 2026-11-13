#!/usr/bin/env python3
"""Pruebas v1.2: mínimo y ponderación ALCPT por año (datos SINTÉTICOS, nombres inventados)."""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright
import openpyxl
APP = os.environ.get("APP_URL", "http://localhost:8937/")
T = Path(__file__).resolve().parent; SH = Path(os.environ.get("SHOTS", T / "capturas")); SH.mkdir(exist_ok=True)
DL = Path("/tmp/ing_dl_ap"); DL.mkdir(exist_ok=True)
R = []; ERR = []
def rec(n, ok, d=""): R.append({"prueba": n, "ok": bool(ok), "detalle": str(d)[:300]}); print(("OK  " if ok else "FALLA ") + n, ("" if ok else str(d)[:300]))
def cad(n, a, g, alcpt=(), diag=None, **k):
    o = {"n": n, "a": a, "g": g, "m": "", "d": "Docente Ficticio", "alcpt": [list(x[:2]) for x in alcpt], "alcptMeta": {x[0]: {"tipo": x[2] if len(x) > 2 else "periodo", "fecha": "", "forma": ""} for x in alcpt},
         "cal": {}, "asis": {}, "causa": {}, "evid": [], "obs": "", "c": "", "tray": []}
    if diag is not None: o["diag"] = diag; o["diagMeta"] = {"tipo": "diagnostico", "fecha": "2026-09-21", "forma": ""}
    o.update(k); return o
REM = lambda p: {"rem": {"on": True, "grupo": "R4-G1", "docente": "Docente Ficticio", "alta": "2026-09-26", "motivo": "Diagnóstico", "puntaje": p, "estatus": "curso", "reeval": [], "avances": []}, "remHist": [{"alta": "2026-09-26", "motivo": "Diagnóstico", "puntaje": p, "estatus": "curso"}]}
A = {
 "s-4a": cad("Prueba Cuatro Alfa", "4", "1", [("Feb 2025", 20), ("Jul 2026", 35)], 44, **REM(44)),             # diag (4/o., 55) no aprob.; feb 2025 = 2/o. (45) no aprob.; jul 2026 = 3/er. (31) aprob.
 "s-4b": cad("Prueba Cuatro Beta", "4", "1", [("Jul 2026", 28)], 58),                                           # diag 58 aprob., calif. 8.0: monitor; jul 2026 no aprob.
 "s-4c": cad("Prueba Cuatro Gama", "4", "2", [("Jul 2026", 40), ("Nov 2026", 56)], 40, **REM(40)),             # sale del remedial con 56 (mín. 55)
 "s-3a": cad("Prueba Tres Alfa", "3", "1", [("Jul 2026", 50)], 30, **REM(30)),                                  # jul 2026 = 2/o. año (45) aprob.
 "s-3b": cad("Prueba Tres Beta", "3", "1", [("Jul 2026", 60)], 45),                                             # diag aprob. (31), calif. 10: monitor
 "s-3c": cad("Prueba Tres Gama", "3", "2", [("Ene 2027", 46, "final")], 31, cal={"p1": {"e": 8, "pt": 2.5, "pa": 1}, "p2": {"e": 7, "pt": 2, "pa": 1}}),  # final 46 → 10
 "s-3d": cad("Prueba Tres Delta", "3", "2", [("Ene 2027", 25, "final")], 29),                                   # final por debajo: extraordinario; candidato
 "s-2a": cad("Prueba Dos Alfa", "2", "1", [("Jul 2026", 27)]),                                                  # jul 2026 = 1/er. año: sin mínimo
 "s-2b": cad("Prueba Dos Beta", "2", "1", [("Nov 2026", 47)]),                                                  # 2/o. año (45) aprob., calif. 7
 "s-1a": cad("Prueba Uno Alfa", "1", "1", [("Nov 2026", 50)]),                                                  # 1/er. año: sin mínimo
}
DATA = {"formato": "ingles-seguimiento-eme-respaldo", "version": "1.1", "cfg": {"sesiones": ["2026-09-26"], "minimo": 6, "riesgo": 2, "ciclo": "2026-2027", "semestre": "1", "minPreset": "oficial", "minSem": {"4": {"1": 99, "2": 99}}, "minAlcpt": {"3": 99, "4": 99}, "min12": True, "sem2Ini": 3}, "alumnos": A, "importaciones": {}}
FJ = DL / "sintetico_aprob.json"; FJ.write_text(json.dumps(DATA, ensure_ascii=False))
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
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True); pg = ctx.new_page()
    pg.on("console", lambda m: ERR.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: ERR.append("PAGEERR " + str(e)))
    pg.goto(APP + "?nosw"); pg.wait_for_timeout(1200)
    tab(pg, "cfg"); pg.set_input_files("#xUp", str(FJ)); pg.wait_for_timeout(1500)
    rec("Carga del respaldo sintético", pg.evaluate("S.items.size") == len(A))
    # 1. migración: la configuración vieja (presets) no revive
    mg = pg.evaluate("(()=>{ReplicaIng.ap.C('apTabla');return {old:['minPreset','minSem','minAlcpt','min12','sem2Ini'].filter(k=>k in S.cfg),v:S.cfg.apVer,m4:ReplicaIng.ap.minFor('4').min,m3:ReplicaIng.ap.minFor('3').min}})()")
    rec("Migración: se borran presets anteriores y queda la tabla única", mg["old"] == [] and mg["v"] == 2 and mg["m4"] == 55 and mg["m3"] == 31, mg)
    # 2. lógica
    r = pg.evaluate("""(()=>{const P=ReplicaIng.ap,g=id=>S.items.get(id);const x=(o,l)=>{const h=o.alcpt.find(y=>y[0]===l);return P.res(o,h[1],l)};return {
      d4a:P.diagRes(g('s-4a')).st, d4b:P.diagRes(g('s-4b')), d3a:P.diagRes(g('s-3a')).st, d3b:P.diagRes(g('s-3b')).st,
      j4a:x(g('s-4a'),'Jul 2026'), f4a:x(g('s-4a'),'Feb 2025'), j3a:x(g('s-3a'),'Jul 2026'), l2a:P.lastRes(g('s-2a')).st, l2b:P.lastRes(g('s-2b')), l1a:P.lastRes(g('s-1a')).st,
      mon4b:P.monitor(g('s-4b')), mon3a:P.monitor(g('s-3a')), mon4a:P.monitor(g('s-4a')), sal4c:!!P.salida(g('s-4c')), sal4a:!!P.salida(g('s-4a')),
      cf3c:P.calFinal(g('s-3c')), cf3d:P.calFinal(g('s-3d')).st,
      cv:[P.conv('2',52),P.conv('2',45),P.conv('2',44),P.conv('3',40),P.conv('3',31),P.conv('3',30),P.conv('4',70),P.conv('4',56),P.conv('4',54),P.conv('1',50)]}})()""")
    rec("4/o.: mínimo 55 (diag 44 no aprob., 58 aprob. con calificación 8)", r["d4a"] == "na" and r["d4b"]["st"] == "ap" and r["d4b"]["cal"] == 8, r)
    rec("3/er.: mínimo 31 (diag 30 no aprob., 45 aprob.)", r["d3a"] == "na" and r["d3b"] == "ap", r)
    rec("Jul 2026 de un 4/o. se califica como 3/er. año (mín. 31)", r["j4a"]["st"] == "ap" and r["j4a"]["a"] == "3" and r["j4a"]["min"] == 31, r["j4a"])
    rec("2/o. año: mínimo 45 (feb 2025 de un 4/o. con 20 y jul 2026 de un 3/er. con 50)", r["f4a"]["st"] == "na" and r["f4a"]["min"] == 45 and r["j3a"]["st"] == "ap" and r["l2b"]["st"] == "ap" and r["l2b"]["cal"] == 7, r)
    rec("1/er. año: sin mínimo", r["l2a"] == "sin" and r["l1a"] == "sin", r)
    rec("Ponderación: 2/o. 52→10, 45→6, 44→—; 3/er. 40→10, 31→6, 30→—; 4/o. 70→10, 56→6.5, 54→—; 1/er. sin tabla", r["cv"] == [10, 6, None, 10, 6, None, 10, 6.5, None, None], r["cv"])
    rec("Monitor: calificación diagnóstica mayor a 7", r["mon4b"] is True and r["mon3a"] is False and r["mon4a"] is False, r)
    rec("Remedial: puede salir quien alcanza el mínimo después del alta", r["sal4c"] is True and r["sal4a"] is False, r)
    rec("Calificación final 60/40 con ALCPT final ponderado", abs(r["cf3c"]["v"] - round((7.75 * 60 + 10 * 40) / 100, 2)) < 0.01 and r["cf3c"]["st"] == "ap", r["cf3c"])
    rec("ALCPT final por debajo del mínimo: extraordinario", r["cf3d"] == "extra", r["cf3d"])
    # 3. Ajustes: tabla simple
    tab(pg, "cfg"); v = pg.evaluate("(()=>{const t=document.querySelector('#xAp');const sec=t.closest('.tscroll');let txt='';let n=sec.previousElementSibling;txt+=n?n.innerText:'';let k=sec.nextElementSibling;for(let i=0;i<3&&k;i++){txt+=' '+k.innerText;k=k.nextElementSibling};return {h:[...t.querySelectorAll('thead th')].map(x=>x.textContent),min:[...t.querySelectorAll('[data-k=min]')].map(i=>i.value),c4:t.querySelector('[data-k=conv][data-a=\"4\"]').value,c2:t.querySelector('[data-k=conv][data-a=\"2\"]').value,pre:!!document.querySelector('#xPre,#xMin12,#xS2i,#xS2f'),txt}})()")
    rec("Ajustes: tabla de 3 columnas Año | Mínimo | Ponderación", v["h"] == ["Año", "Mínimo", "Ponderación (puntos = calificación)"], v["h"])
    rec("Ajustes: mínimos 1/er. vacío, 2/o. 45, 3/er. 31, 4/o. 55 y ponderaciones", v["min"] == ["", "45", "31", "55"] and v["c4"] == "60=10, 59=9, 58=8, 57=7, 56=6.5, 55=6" and v["c2"] == "50=10, 49=9, 48=8, 47=7, 46=6.5, 45=6", v)
    vt = pg.inner_text("#view").casefold()
    rec("Sin selector de preset ni referencias a CEI o propuesta", not v["pre"] and not any(w in vt for w in ["sac./p.c.", "c.e.i", "propuesta", "inciso", "idioma extranjero ii"]), [w for w in ["sac./p.c.", "c.e.i", "propuesta", "inciso"] if w in vt])
    sec = pg.locator("#xAp").locator("xpath=ancestor::div[contains(@class,'tscroll')]")
    pg.evaluate("document.querySelector('#xAp').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    box = pg.evaluate("(()=>{const h=[...document.querySelectorAll('#view h2')].find(x=>/puntaje mínimo aprobatorio/.test(x.textContent));const b=document.querySelector('#xApSave');const r1=h.getBoundingClientRect(),r2=b.getBoundingClientRect();return {x:r1.left-12,y:r1.top-10+window.scrollY,w:Math.max(r1.width,document.querySelector('#xAp').getBoundingClientRect().width)+24,h:r2.bottom-r1.top+20}})()")
    pg.screenshot(path=str(SH / "ap_01_ajustes_tabla.png"), full_page=True, clip={"x": max(0, box["x"]), "y": box["y"], "width": box["w"], "height": box["h"]})
    pg.screenshot(path=str(SH / "ap_01_ajustes.png"), full_page=True)
    # 3. Cadetes
    tab(pg, "cad"); t = pg.inner_text("#view")
    t = t.casefold(); rec("Cadetes: insignias de diagnóstico y ALCPT", "diag. no aprob." in t and "diag. aprob." in t and "alcpt sin mín." in t and "alcpt aprob." in t and "monitor" in t and "puede salir del remedial" in t, t[:200])
    pg.screenshot(path=str(SH / "ap_02_cadetes.png"))
    # 4. ALC y ALCPT
    tab(pg, "alc"); pg.select_option("#axA", "4"); pg.wait_for_timeout(250); pg.select_option("#axL", "__diag"); pg.wait_for_timeout(300); t = pg.inner_text("#axBody")
    rec("ALC y ALCPT: resultado del diagnóstico de 4/o. (1 aprob., 2 no aprob.)", "no aprobado" in t.casefold() and "1 · 2" in t.replace("\n", " "), t[:400])
    pg.screenshot(path=str(SH / "ap_03_alcpt.png"))
    pg.click('#axSub [data-sub="res"]'); pg.wait_for_timeout(300); t = pg.inner_text("#axBody"); rec("Promedios: columnas de aprobados / no aprobados", "aprob." in t and "% aprob." in t, t[:200])
    # 5. Panorama
    tab(pg, "pan"); t = pg.inner_text("#view"); rows = pg.evaluate("[...document.querySelectorAll('.aptab tbody tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()))")
    r4 = next((x for x in rows if x[0].startswith("4/o.")), None); r3 = next((x for x in rows if x[0].startswith("3/er.")), None)
    rec("Panorama 4/o.: mín. 55, diag 1/2, último ALCPT 2/1, 1 monitor, 1 puede salir", r4 and r4[2] == "55" and r4[3:7] == ["1", "2", "—", "33.3%"] and r4[7:11] == ["2", "1", "—", "66.7%"] and r4[11:13] == ["1", "1"], r4)
    rec("Panorama 3/er.: mín. 31, diag 2/2, último ALCPT 3/1, 1 monitor", r3 and r3[2] == "31" and r3[3:7] == ["2", "2", "—", "50%"] and r3[7:11] == ["3", "1", "—", "75%"] and r3[11] == "1", r3); pg.screenshot(path=str(SH / "ap_04_panorama.png"), full_page=True)
    # 6. Estadística + Excel
    tab(pg, "est"); pg.fill("#esTxt", "aprobados y no aprobados del diagnóstico alcpt por año"); pg.click("#esGo"); pg.wait_for_timeout(400); t = pg.inner_text("#view")
    tl = t.casefold(); rec("Estadística: pedido en español de aprobados del diagnóstico", "aprobados" in tl and "no aprobados" in tl and "resultado alcpt" in tl, t[-400:])
    pg.select_option("#esPor", "anio"); pg.wait_for_timeout(300)
    row = pg.evaluate("[...document.querySelectorAll('#view table.tbl tbody tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim())).find(r=>r[0]==='4/o. año')")
    rec("Estadística por año: 4/o. diag 1 aprob., 2 no aprob., 33.3 %", row and row[7:11] == ["1", "2", "0", "33.3%"], row)
    xp = download(pg, lambda: pg.click("#esXl")); wb = openpyxl.load_workbook(xp); tot, bad = fonts_ok(wb); ws = wb["Aprobación ALCPT"] if "Aprobación ALCPT" in wb.sheetnames else None
    rec("Excel de estadística: hoja Aprobación ALCPT, Noto Sans 10, celdas combinadas", ws is not None and bad == 0 and len(ws.merged_cells.ranges) >= 6, (wb.sheetnames, tot, bad))
    vals = [[c.value for c in r] for r in ws.iter_rows()] if ws else []; i4 = next((i for i, r in enumerate(vals) if r[0] == "4/o. año"), None); tot4 = next((r for r in vals[i4:] if r[1] == "Total del año"), None) if i4 is not None else None
    rec("Excel: total 4/o. diag 1/2/0 y 33.3 %; último 2/1", tot4 and tot4[4:8] == [1, 2, 0, 33.3] and tot4[8:10] == [2, 1], tot4)
    # 7. Seguimiento EME y kárdex
    tab(pg, "eme"); t = pg.inner_text("#view"); rec("Seguimiento EME: resultado del último ALCPT", "aprob." in t, t[:200])
    pg.click('[data-em="s-4a"]'); pg.wait_for_timeout(400); t = pg.inner_text("#emeBody"); rec("Kárdex en pantalla: resultado por examen", "ALCPT aprob." in t or "aprob." in t, t[:300])
    kp = download(pg, lambda: pg.click("#emK")); wb = openpyxl.load_workbook(kp); ws = wb.worksheets[0]; vals = [[c.value for c in r] for r in ws.iter_rows()]; tot, bad = fonts_ok(wb)
    hdr = next((r for r in vals if r and r[0] == "Ciclo"), []); jul = next((r for r in vals if r and r[5] == "Diagnóstico sep 2026"), None)
    rec("Kárdex .xlsx: columna Resultado con mínimo del año y Noto Sans 10", "Resultado" in hdr and jul and jul[8] == "No aprobado (mín. 55)" and bad == 0, (hdr, jul, bad))
    pg.click("#emC")
    # 8. Concentrado
    tab(pg, "cfg"); cp = download(pg, lambda: pg.click("#xCo")); wb = openpyxl.load_workbook(cp); ws = wb["Concentrado"]; head = [c.value for c in ws[3]]; tot, bad = fonts_ok(wb)
    rec("Concentrado: resultados, monitor y calificación final", all(h in head for h in ["Resultado diagnóstico", "Resultado último ALCPT", "Monitor", "Calificación final"]) and "Aprobación ALCPT" in wb.sheetnames and bad == 0, head[-8:])
    # 9. editar la tabla
    pg.fill('#xAp [data-k="min"][data-a="4"]', "60"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    st = pg.evaluate("[ReplicaIng.ap.diagRes(S.items.get('s-4b')).st, ReplicaIng.ap.minFor('4').min]"); rec("Ajustes: subir el mínimo de 4/o. a 60 cambia el resultado", st == ["na", 60], st)
    pg.fill('#xAp [data-k="min"][data-a="4"]', "55"); pg.fill('#xAp [data-k="conv"][data-a="1"]', "40=10, 30=6"); pg.fill('#xAp [data-k="min"][data-a="1"]', "30"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    st = pg.evaluate("[ReplicaIng.ap.lastRes(S.items.get('s-1a')).st, ReplicaIng.ap.conv('1',35), ReplicaIng.ap.diagRes(S.items.get('s-4b')).st]"); rec("Ajustes: mínimo y ponderación editables para 1/er. año", st == ["ap", 6, "ap"], st)
    pg.fill('#xAp [data-k="conv"][data-a="1"]', ""); pg.fill('#xAp [data-k="min"][data-a="1"]', ""); pg.click("#xApSave"); pg.wait_for_timeout(300)
    st = pg.evaluate("[ReplicaIng.ap.lastRes(S.items.get('s-1a')).st, 'minPreset' in S.cfg]"); rec("Regresar 1/er. año a sin mínimo", st == ["sin", False], st)
    # 10. Remedial: candidatos con el mínimo del año
    tab(pg, "rem"); pg.click('#rxSub [data-sub="cand"]'); pg.wait_for_timeout(300); t = pg.inner_text("#view")
    rec("Remedial: candidato por debajo del mínimo de su año", "Prueba Tres Delta" in t and "por debajo del mínimo" in t, t[:300])
    # 11. ficha
    tab(pg, "cad"); pg.click('.nameb[data-id="s-3c"]'); pg.wait_for_timeout(400); t = pg.inner_text("#fichaBody")
    rec("Ficha: tabla de resultado ALCPT y calificación final", "resultado alcpt por año" in t.casefold() and "calificación final del ciclo" in t.casefold() and "8.65" in t, t[-300:]); pg.screenshot(path=str(SH / "ap_05_ficha.png")); pg.keyboard.press("Escape")
    # 12. respaldo conserva ajustes nuevos
    tab(pg, "cfg"); jp = download(pg, lambda: pg.click("#xDl")); J = json.load(open(jp)); rec("Respaldo JSON v1.2 guarda la tabla única sin presets viejos", J["version"] == "1.2" and J["cfg"].get("apTabla", {}).get("4", {}).get("min") == 55 and "minSem" not in J["cfg"] and "minPreset" not in J["cfg"], J.get("version"))
    rec("Sin errores de consola", not ERR, ERR[:5]); ctx.close(); b.close()
ok = sum(r["ok"] for r in R); print(f"\n{ok}/{len(R)} pruebas correctas")
json.dump({"fecha": time.strftime("%Y-%m-%d %H:%M"), "correctas": ok, "total": len(R), "pruebas": R}, open(T / "resultado_test_aprob.json", "w"), ensure_ascii=False, indent=1)

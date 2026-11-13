#!/usr/bin/env python3
"""Pruebas v1.1: aprobación ALCPT por año y semestre, contrapropuesta EME (datos SINTÉTICOS, nombres inventados)."""
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
 "s-4a": cad("Prueba Cuatro Alfa", "4", "1", [("Feb 2025", 20), ("Jul 2026", 35)], 44, **REM(44)),             # diag (1/er. sem., 55) no aprob.; jul 2026 = 3/er. 2/o. sem. (53) no aprob.
 "s-4b": cad("Prueba Cuatro Beta", "4", "1", [("Jul 2026", 28)], 48),                                           # diag no aprob. pero calif. de tabla 8.0: monitor (conflicto)
 "s-4c": cad("Prueba Cuatro Gama", "4", "2", [("Jul 2026", 40), ("Nov 2026", 56)], 40, **REM(40)),             # sale del remedial con 56 (mín. 55)
 "s-3a": cad("Prueba Tres Alfa", "3", "1", [("Jul 2026", 50)], 30, **REM(30)),                                  # jul 2026 = 2/o. año 2/o. sem. (41) aprob.
 "s-3b": cad("Prueba Tres Beta", "3", "1", [("Jul 2026", 60)], 45),                                             # diag aprob. (45)
 "s-3c": cad("Prueba Tres Gama", "3", "2", [("Ene 2027", 46, "final")], 31, cal={"p1": {"e": 8, "pt": 2.5, "pa": 1}, "p2": {"e": 7, "pt": 2, "pa": 1}}),  # final ene 2027 (1/er. sem., 45) aprob.
 "s-3d": cad("Prueba Tres Delta", "3", "2", [("Ene 2027", 25, "final")], 29),                                   # final por debajo: extraordinario; candidato
 "s-2a": cad("Prueba Dos Alfa", "2", "1", [("Jul 2026", 27)]),                                                  # jul 2026 = 1/er. año 2/o. sem. (29) no aprob.
 "s-1a": cad("Prueba Uno Alfa", "1", "1", [("Nov 2026", 50)]),                                                  # 1/er. año 1/er. sem.: sin mínimo
}
DATA = {"formato": "ingles-seguimiento-eme-respaldo", "version": "1.1", "cfg": {"sesiones": ["2026-09-26"], "minimo": 6, "riesgo": 2, "ciclo": "2026-2027", "semestre": "1"}, "alumnos": A, "importaciones": {}}
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
    # 1. lógica
    r = pg.evaluate("""(()=>{const P=ReplicaIng.ap,g=id=>S.items.get(id);const x=(o,l)=>{const h=o.alcpt.find(y=>y[0]===l);return P.res(o,h[1],l)};return {
      d4a:P.diagRes(g('s-4a')).st, l1a:P.lastRes(g('s-1a')).st, sem:[1,6,7,8,0].map(m=>P.semOf(new Date(2026,m,15))), mon3a:P.monitor(g('s-3a')), d4b:P.diagRes(g('s-4b')).st, d3a:P.diagRes(g('s-3a')).st, d3b:P.diagRes(g('s-3b')).st,
      j4a:x(g('s-4a'),'Jul 2026'), f4a:x(g('s-4a'),'Feb 2025').st, j3a:x(g('s-3a'),'Jul 2026').st, l2a:P.lastRes(g('s-2a')).st,
      mon4b:P.monitor(g('s-4b')), mon3b:P.monitor(g('s-3b')), sal4c:!!P.salida(g('s-4c')), sal4a:!!P.salida(g('s-4a')),
      cf3c:P.calFinal(g('s-3c')), cf3d:P.calFinal(g('s-3d')).st, c31:P.conv('3',31), c36:P.conv('3',40), c30:P.conv('3',30), c46:P.conv('4',46)}})()""")
    rec("Diagnóstico (1/er. sem.): 4/o. 44 y 48 no aprobados (mín. 55)", r["d4a"] == "na" and r["d4b"] == "na", r)
    rec("Diagnóstico (1/er. sem.): 3/er. 30 no aprobado, 45 aprobado (mín. 45)", r["d3a"] == "na" and r["d3b"] == "ap", r)
    rec("Jul 2026 de un 4/o. = 3/er. año, 2/o. semestre (mín. 53)", r["j4a"]["st"] == "na" and r["j4a"]["a"] == "3" and r["j4a"]["sem"] == "2" and r["j4a"]["min"] == 53, r["j4a"])
    rec("Feb 2025 de un 4/o. = 2/o. año, 2/o. sem. (41); jul 2026 de un 3/er. = 2/o. año (41) aprobado", r["f4a"] == "na" and r["j3a"] == "ap", r)
    rec("1/er. año: 2/o. sem. 29 (jul 2026, 27 no aprob.) y 1/er. sem. sin mínimo", r["l2a"] == "na" and r["l1a"] == "sin", r)
    rec("Semestre por fecha: feb y jul = 2/o.; ago, sep y ene = 1/er.", r["sem"] == ["2", "2", "1", "1", "1"], r["sem"])
    rec("Monitor: calificación de tabla diagnóstica mayor a 7.0", r["mon4b"] is True and r["mon3a"] is False, r)
    rec("Remedial: puede salir quien alcanza el mínimo del semestre después del alta", r["sal4c"] is True and r["sal4a"] is False, r)
    rec("Calificación final 60/40 con ALCPT final convertido", abs(r["cf3c"]["v"] - round((7.75 * 60 + 10 * 40) / 100, 2)) < 0.01 and r["cf3c"]["st"] == "ap", r["cf3c"])
    rec("ALCPT final por debajo del mínimo: extraordinario", r["cf3d"] == "extra", r["cf3d"])
    rec("Tablas de conversión oficiales sin cambio", r["c31"] == 6 and r["c36"] == 10 and r["c30"] is None and r["c46"] == 6.5, r)
    # 2. Ajustes
    tab(pg, "cfg"); v = pg.evaluate("[[...document.querySelectorAll('#xAp [data-k=ms]')].map(i=>i.value),[...document.querySelectorAll('#xAp [data-k=min]')].map(i=>i.value),document.querySelector('#xPre').value]")
    rec("Ajustes: contrapropuesta por omisión (—/29, 30/41, 45/53, 55/61) y oficial 31/45 como alternativa", v == [["", "29", "30", "41", "45", "53", "55", "61"], ["", "", "31", "45"], "contra"], v); pg.screenshot(path=str(SH / "ap_01_ajustes.png"), full_page=True)
    # 3. Cadetes
    tab(pg, "cad"); t = pg.inner_text("#view")
    t = t.casefold(); rec("Cadetes: insignias de diagnóstico y ALCPT", "diag. no aprob." in t and "diag. aprob." in t and "alcpt sin mín." in t and "monitor" in t and "puede salir del remedial" in t, t[:200])
    pg.screenshot(path=str(SH / "ap_02_cadetes.png"))
    # 4. ALC y ALCPT
    tab(pg, "alc"); pg.select_option("#axA", "4"); pg.wait_for_timeout(250); pg.select_option("#axL", "__diag"); pg.wait_for_timeout(300); t = pg.inner_text("#axBody")
    rec("ALC y ALCPT: resultado del diagnóstico de 4/o. (0 aprob., 3 no aprob.)", "no aprobado" in t.casefold() and "0 · 3" in t.replace("\n", " "), t[:400])
    pg.screenshot(path=str(SH / "ap_03_alcpt.png"))
    pg.click('#axSub [data-sub="res"]'); pg.wait_for_timeout(300); t = pg.inner_text("#axBody"); rec("Promedios: columnas de aprobados / no aprobados", "aprob." in t and "% aprob." in t, t[:200])
    # 5. Panorama
    tab(pg, "pan"); t = pg.inner_text("#view"); rows = pg.evaluate("[...document.querySelectorAll('.aptab tbody tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim()))")
    r4 = next((x for x in rows if x[0].startswith("4/o.")), None); r3 = next((x for x in rows if x[0].startswith("3/er.")), None)
    rec("Panorama 4/o.: diag 0/3, último ALCPT 1/2, 1 monitor, 1 puede salir", r4 and r4[3:7] == ["0", "3", "—", "0%"] and r4[7:11] == ["1", "2", "—", "33.3%"] and r4[11:13] == ["1", "1"] and "55" in r4[2] and "61" in r4[2], r4)
    rec("Panorama 3/er.: diag 1/3, último ALCPT 3/1", r3 and r3[3:7] == ["1", "3", "—", "25%"] and r3[7:11] == ["3", "1", "—", "75%"], r3); pg.screenshot(path=str(SH / "ap_04_panorama.png"), full_page=True)
    # 6. Estadística + Excel
    tab(pg, "est"); pg.fill("#esTxt", "aprobados y no aprobados del diagnóstico alcpt por año"); pg.click("#esGo"); pg.wait_for_timeout(400); t = pg.inner_text("#view")
    tl = t.casefold(); rec("Estadística: pedido en español de aprobados del diagnóstico", "aprobados" in tl and "no aprobados" in tl and "resultado alcpt" in tl, t[-400:])
    pg.select_option("#esPor", "anio"); pg.wait_for_timeout(300)
    row = pg.evaluate("[...document.querySelectorAll('#view table.tbl tbody tr')].map(tr=>[...tr.children].map(td=>td.innerText.trim())).find(r=>r[0]==='4/o. año')")
    rec("Estadística por año: 4/o. diag 0 aprob., 3 no aprob., 0 %", row and row[7:11] == ["0", "3", "0", "0%"], row)
    xp = download(pg, lambda: pg.click("#esXl")); wb = openpyxl.load_workbook(xp); tot, bad = fonts_ok(wb); ws = wb["Aprobación ALCPT"] if "Aprobación ALCPT" in wb.sheetnames else None
    rec("Excel de estadística: hoja Aprobación ALCPT, Noto Sans 10, celdas combinadas", ws is not None and bad == 0 and len(ws.merged_cells.ranges) >= 6, (wb.sheetnames, tot, bad))
    vals = [[c.value for c in r] for r in ws.iter_rows()] if ws else []; i4 = next((i for i, r in enumerate(vals) if r[0] == "4/o. año"), None); tot4 = next((r for r in vals[i4:] if r[1] == "Total del año"), None) if i4 is not None else None
    rec("Excel: total 4/o. diag 0/3/0 y 0 %; último 1/2", tot4 and tot4[4:8] == [0, 3, 0, 0] and tot4[8:10] == [1, 2], tot4)
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
    # 9. cambiar el mínimo y usar el preset oficial
    pg.fill('#xAp [data-k="ms"][data-a="4"][data-s="1"]', "40"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    st = pg.evaluate("ReplicaIng.ap.diagRes(S.items.get('s-4b')).st"); rec("Ajustes: bajar el mínimo de 4/o. 1/er. sem. a 40 cambia el resultado", st == "ap", st)
    pg.fill('#xAp [data-k="ms"][data-a="4"][data-s="1"]', "55"); pg.select_option("#xPre", "oficial"); pg.check("#xMin12"); pg.click("#xApSave"); pg.wait_for_timeout(400)
    st = pg.evaluate("(()=>{const P=ReplicaIng.ap,g=id=>S.items.get(id);return [P.diagRes(g('s-4b')).st, P.res(g('s-4a'),35,'Jul 2026').st, P.txt(P.lastRes(g('s-2a')))]})()")
    rec("Preset «Mínimo oficial SAC./P.C.-100»: 4/o. 48 y 3/er. 35 aprueban; opción 26 por confirmar", st[0] == "ap" and st[1] == "ap" and "por confirmar" in st[2], st)
    pg.select_option("#xPre", "contra"); pg.uncheck("#xMin12"); pg.click("#xApSave"); pg.wait_for_timeout(300)
    st = pg.evaluate("[S.cfg.minPreset, ReplicaIng.ap.diagRes(S.items.get('s-4b')).st]"); rec("Regresar a la contrapropuesta", st == ["contra", "na"], st)
    # 10. Remedial: candidatos con el mínimo del año
    tab(pg, "rem"); pg.click('#rxSub [data-sub="cand"]'); pg.wait_for_timeout(300); t = pg.inner_text("#view")
    rec("Remedial: candidato por debajo del mínimo de su año", "Prueba Tres Delta" in t and "por debajo del mínimo" in t, t[:300])
    # 11. ficha
    tab(pg, "cad"); pg.click('.nameb[data-id="s-3c"]'); pg.wait_for_timeout(400); t = pg.inner_text("#fichaBody")
    rec("Ficha: tabla de resultado ALCPT y calificación final", "resultado alcpt por año" in t.casefold() and "calificación final del ciclo" in t.casefold() and "8.65" in t, t[-300:]); pg.screenshot(path=str(SH / "ap_05_ficha.png")); pg.keyboard.press("Escape")
    # 12. respaldo conserva ajustes nuevos
    tab(pg, "cfg"); jp = download(pg, lambda: pg.click("#xDl")); J = json.load(open(jp)); rec("Respaldo JSON v1.1 guarda los mínimos por año", J["version"] == "1.1" and J["cfg"].get("minSem", {}).get("3", {}).get("2") == 53 and J["cfg"].get("minAlcpt", {}).get("3") == 31, J.get("version"))
    rec("Sin errores de consola", not ERR, ERR[:5]); ctx.close(); b.close()
ok = sum(r["ok"] for r in R); print(f"\n{ok}/{len(R)} pruebas correctas")
json.dump({"fecha": time.strftime("%Y-%m-%d %H:%M"), "correctas": ok, "total": len(R), "pruebas": R}, open(T / "resultado_test_aprob.json", "w"), ensure_ascii=False, indent=1)

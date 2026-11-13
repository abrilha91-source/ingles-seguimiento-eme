#!/usr/bin/env python3
"""Pruebas v1.4: tabla ALCPT manuscrita (1/er. 25, 2/o. 31, 3/er. 45, 4/o. 55), migración de ajustes
y tabla «ALC parcial: libros y puntaje de referencia por semestre» (datos SINTÉTICOS, nombres inventados)."""
import json, os, copy
from pathlib import Path
from playwright.sync_api import sync_playwright
import openpyxl
APP = os.environ.get("APP_URL", "http://localhost:8937/")
T = Path(__file__).resolve().parent; SH = Path(os.environ.get("SHOTS", T / "capturas")); SH.mkdir(exist_ok=True)
DL = Path("/tmp/ing_dl_v14"); DL.mkdir(exist_ok=True)
R = []; ERR = []
def rec(n, ok, d=""): R.append({"prueba": n, "ok": bool(ok), "detalle": str(d)[:300]}); print(("OK  " if ok else "FALLA ") + n, ("" if ok else str(d)[:300]))
OLD13 = {"1": {"min": None, "conv": []}, "2": {"min": 45, "conv": [[50, 10], [49, 9], [48, 8], [47, 7], [46, 6.5], [45, 6]]}, "3": {"min": 31, "conv": [[36, 10], [35, 9], [34, 8], [33, 7], [32, 6.5], [31, 6]]}, "4": {"min": 55, "conv": [[60, 10], [59, 9], [58, 8], [57, 7], [56, 6.5], [55, 6]]}}
def alc(a, sem, libro, tipo, pts): return {"id": f"x{a}{sem}{libro}{tipo}", "ciclo": "2026-2027", "a": a, "sem": sem, "libro": libro, "tipo": tipo, "fecha": "", "forma": "", "pts": pts}
def cad(n, a, g, alcs=(), diag=None, **k):
    o = {"n": n, "a": a, "g": g, "m": "", "d": "Docente Ficticio", "alcpt": [], "alcptMeta": {}, "cal": {}, "asis": {}, "causa": {}, "evid": [], "obs": "", "c": "", "tray": [], "alc": list(alcs), "dataVer": 3}
    if diag is not None: o["diag"] = diag; o["diagMeta"] = {"tipo": "diagnostico", "fecha": "2026-09-21", "forma": ""}
    o.update(k); return o
A = {
 "w-4a": cad("Ficticia Cuatro Uno", "4", "1", [alc("4", "1", "14", "p1", 55), alc("4", "1", "14", "p2", 54), alc("4", "1", "14", "final", 90)], 58, cal={"p1": {"e": 8, "pt": 2.5, "pa": 1}}),
 "w-4b": cad("Ficticio Cuatro Dos", "4", "1", [alc("4", "1", "15", "p1", 70)], 50),
 "w-2a": cad("Ficticia Dos Uno", "2", "1", [alc("2", "1", "6", "p1", 30)], None),
 "w-2b": cad("Ficticio Dos Dos", "2", "1", [alc("2", "1", "6", "p1", 29)], None),
}
def data(tabla, ver=2):
    return {"formato": "ingles-seguimiento-eme-respaldo", "version": "1.3", "cfg": {"sesiones": [], "minimo": 6, "riesgo": 2, "ciclo": "2026-2027", "semestre": "1", "apVer": ver, "apTabla": tabla, "pesoParc": 60, "pesoAlcpt": 40}, "alumnos": A, "importaciones": {}}
F1 = DL / "v14_defaults_viejos.json"; F1.write_text(json.dumps(data(OLD13), ensure_ascii=False))
ED = copy.deepcopy(OLD13); ED["2"] = {"min": 40, "conv": [[44, 10], [40, 6]]}
F2 = DL / "v14_editado.json"; F2.write_text(json.dumps(data(ED), ensure_ascii=False))
def tab(pg, v): pg.click(f'nav.tabs button[data-v="{v}"]'); pg.wait_for_timeout(350)
def load(pg, f):
    tab(pg, "cfg"); pg.set_input_files("#xUp", str(f)); pg.wait_for_timeout(700)
    if pg.locator("#dAsk[open]").count(): pg.click("#askOk")
    pg.wait_for_timeout(1500); tab(pg, "cfg")
def download(pg, fn):
    with pg.expect_download(timeout=30000) as d: fn()
    p = DL / d.value.suggested_filename; d.value.save_as(p); return p
def fonts_bad(wb): return sum(1 for ws in wb for r in ws.iter_rows() for c in r if c.value is not None and not (c.font and c.font.name == "Noto Sans" and float(c.font.sz or 0) == 10))
def cells(ws): return [str(c.value) for row in ws.iter_rows() for c in row if c.value is not None]
NEW = {"1": [25, "30=10, 29=9, 28=8, 27=7, 26=6.5, 25=6"], "2": [31, "36=10, 35=9, 34=8, 33=7, 32=6.5, 31=6"], "3": [45, "50=10, 49=9, 48=8, 47=7, 46=6.5, 45=6"], "4": [55, "60=10, 59=9, 58=8, 57=7, 56=6.5, 55=6"]}
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True); pg = ctx.new_page()
    pg.on("console", lambda m: ERR.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: ERR.append("PAGEERR " + str(e)))
    pg.goto(APP + "?nosw"); pg.wait_for_timeout(1200)
    # 1. migración con los valores por omisión viejos
    load(pg, F1)
    t = pg.evaluate("(()=>{ReplicaIng.ap.C('apTabla');const T=S.cfg.apTabla;return {v:S.cfg.apVer,flag:S.cfg.apFlag,m:['1','2','3','4'].map(a=>T[a].min),c:['1','2','3','4'].map(a=>T[a].conv.map(([p,c])=>p+'='+c).join(', '))}})()")
    rec("Migración: valores por omisión v1.2/v1.3 pasan a la tabla manuscrita", t["v"] == 3 and t["m"] == [25, 31, 45, 55] and t["c"] == [NEW[a][1] for a in "1234"] and t["flag"] == [], t)
    rec("Ajustes: sin aviso de valores editados", pg.locator("#xApFlag").count() == 0, "")
    v = pg.evaluate("(()=>{const t=document.querySelector('#xAp');return {h:[...t.querySelectorAll('thead th')].map(x=>x.textContent),min:[...t.querySelectorAll('[data-k=min]')].map(i=>i.value),c:[...t.querySelectorAll('[data-k=conv]')].map(i=>i.value)}})()")
    rec("Ajustes: tabla Año | Mínimo | Ponderación con 25/31/45/55", v["h"] == ["Año", "Mínimo", "Ponderación (puntos = calificación)"] and v["min"] == ["25", "31", "45", "55"] and v["c"] == [NEW[a][1] for a in "1234"], v)
    pg.evaluate("document.querySelector('#xAp').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    box = pg.evaluate("(()=>{const h=[...document.querySelectorAll('#view h2')].find(x=>/puntaje mínimo aprobatorio/.test(x.textContent));const b=document.querySelector('#xApSave');const r1=h.getBoundingClientRect(),r2=b.getBoundingClientRect();return {x:r1.left-12,y:r1.top-10+window.scrollY,w:Math.max(r1.width,document.querySelector('#xAp').getBoundingClientRect().width)+24,h:r2.bottom-r1.top+20}})()")
    pg.screenshot(path=str(SH / "v14_ajustes_tabla_alcpt.png"), full_page=True, clip={"x": max(0, box["x"]), "y": box["y"], "width": box["w"], "height": box["h"]})
    pg.reload(); pg.wait_for_timeout(1500)
    rec("Migración guardada: tras recargar sigue la tabla nueva", pg.evaluate("[S.cfg.apVer, S.cfg.apTabla['3'].min]") == [3, 45], pg.evaluate("[S.cfg.apVer, S.cfg.apTabla['3'].min]"))
    # 2. migración con un valor editado a mano
    load(pg, F2)
    t = pg.evaluate("(()=>{ReplicaIng.ap.C('apTabla');const T=S.cfg.apTabla;return {m:['1','2','3','4'].map(a=>T[a].min),flag:S.cfg.apFlag}})()")
    rec("Migración: valor editado a mano (2/o. 40) se conserva y se señala; los demás se actualizan", t["m"] == [25, 40, 45, 55] and [f["a"] for f in t["flag"]] == ["2"], t)
    tab(pg, "pan"); tab(pg, "cfg"); ft = pg.text_content("#xApFlag") if pg.locator("#xApFlag").count() else ""
    rec("Ajustes: aviso de valores editados con los valores por omisión", "2/o. año (mínimo 40" in ft and "mínimo 31" in ft, ft)
    pg.click("#xApDef"); pg.wait_for_timeout(400)
    rec("Botón «Usar los valores por omisión» aplica 2/o. 31 y quita el aviso", pg.evaluate("[S.cfg.apTabla['2'].min, (S.cfg.apFlag||[]).length]") == [31, 0] and pg.locator("#xApFlag").count() == 0, pg.evaluate("[S.cfg.apTabla['2'].min, S.cfg.apFlag]"))
    # 3. tabla ALC parcial en Ajustes
    v = pg.evaluate("(()=>{const t=document.querySelector('#xPlan');return {h:[...t.querySelectorAll('thead th')].map(x=>x.textContent),rows:[...t.querySelectorAll('tbody tr')].map(tr=>[...tr.children].map(td=>{const i=td.querySelector('input');return i?i.value:td.textContent.trim()}))}})()")
    rec("Ajustes: tabla ALC parcial Semestre | Año y semestre | Libros | Puntaje de referencia", v["h"] == ["Semestre", "Año y semestre", "Libros", "Puntaje de referencia"], v["h"])
    exp = [["—", "1/er. año · 1/er. semestre", "No se imparte"], ["1", "1/er. año · 2/o. semestre", "4-5", "29-30"], ["2", "2/o. año · 1/er. semestre", "6-7", "30"], ["3", "2/o. año · 2/o. semestre", "8-9", "41"], ["4", "3/er. año · 1/er. semestre", "10-11", "45"], ["5", "3/er. año · 2/o. semestre", "12-13", "53"], ["6", "4/o. año · 1/er. semestre", "14-15", "55"], ["7", "4/o. año · 2/o. semestre", "16-17", "61"]]
    rec("Ajustes: 7 semestres con libros y referencia; 1/er. año 1/er. semestre «No se imparte»", v["rows"] == exp, v["rows"])
    vt = pg.text_content("#view").casefold()
    rec("Ajustes: sin textos de fuente (C.2, propuesta, CEI)", not any(w in vt for w in ["tabla c.2", "propuesta", "c.e.i", "supuesto inicial"]), [w for w in ["tabla c.2", "propuesta", "c.e.i", "supuesto inicial"] if w in vt])
    pg.evaluate("document.querySelector('#xPlan').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
    pg.locator("#xPlan").locator("xpath=ancestor::div[contains(@class,'tscroll')]").screenshot(path=str(SH / "v14_ajustes_tabla_alc_parcial.png"))
    # 4. lógica
    r = pg.evaluate("""(()=>{const P=ReplicaIng.ap,o=S.items.get('w-4a');const f=(a,sem,tipo,pts)=>P.alcRef(o,{a,sem,tipo,pts}).st;return {
      r12:P.refRow('1','2'),thr:P.refThr('29-30'),c:[f('1','2','p1',29),f('1','2','p1',28),f('1','2','p2',30),f('2','1','p1',30),f('2','1','p2',29),f('2','2','p1',41),f('3','1','p1',44),f('3','2','p2',53),f('4','1','p1',55),f('4','2','p1',60),f('1','1','p1',90),f('4','1','final',90)],
      ptot:ptot(o.cal.p1),last:P.lastAlcPar(o).st,lastv:P.lastAlcPar(o).v}})()""")
    rec("Referencia 1/er. año: rango 29-30, umbral 29", r["r12"]["ref"] == "29-30" and r["thr"] == 29, r)
    rec("Alcanza / No alcanza por semestre (29/28 en 1/o.; 30, 41, 45, 53, 55, 61)", r["c"] == ["si", "no", "si", "si", "no", "si", "no", "si", "si", "no", "noimp", "np"], r["c"])
    rec("Calificación del parcial sin cambio (examen 60 % + portafolio + participación)", r["ptot"] == 8.3, r["ptot"])
    rec("Último parcial ALC del ciclo (libro 14, parcial 2 = 54: no alcanza 55)", r["last"] == "no" and r["lastv"] == 54, r)
    # 5. ALC y ALCPT
    tab(pg, "alc"); pg.click('#axSub [data-sub="alc"]'); pg.wait_for_timeout(300); pg.select_option("#axA", "4"); pg.wait_for_timeout(300); pg.select_option("#axS", "1"); pg.wait_for_timeout(300); pg.select_option("#axLb", "14"); pg.wait_for_timeout(300); pg.select_option("#axT", "p1"); pg.wait_for_timeout(300)
    t = pg.text_content("#axBody")
    rec("ALC por libro: semestre 6, libros 14 y 15, referencia 55, conteo", "Semestre 6" in t and "libros 14 y 15" in t and "55" in t and "Alcanzan 1" in t and "Alcanza" in pg.text_content("#axBody tbody"), pg.text_content("#axRef") if pg.locator("#axRef").count() else t[:300])
    pg.screenshot(path=str(SH / "v14_alc_referencia.png"), full_page=True)
    pg.select_option("#axA", "2"); pg.wait_for_timeout(300); t = pg.text_content("#axBody")
    rec("ALC por libro 2/o. 1/er. sem.: 30 alcanza, 29 no alcanza", "referencia del parcial ALC: 30" in t and "No alcanza" in t and "Alcanzan 1 · No alcanzan 1" in t, pg.text_content("#axRef"))
    pg.click('#axSub [data-sub="plan"]'); pg.wait_for_timeout(300); t = pg.text_content("#axBody")
    rec("Pestaña de libros: referencia y «No se imparte»", "No se imparte" in t and "29-30" in t and "16 y 17" in t, t[:300])
    # 6. ficha y kárdex
    pg.evaluate("openFicha('w-4a')"); pg.wait_for_timeout(500)
    rec("Ficha: tabla ALC parcial con semestre, libros y resultado", pg.locator("#fAlcRef").count() == 1 and "No alcanza" in pg.text_content("#fAlcRef") and "Alcanza" in pg.text_content("#fAlcRef") and "libros 14 y 15" in pg.text_content("#fAlcRef"), pg.text_content("#fichaBody")[:200])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    tab(pg, "eme"); pg.click('[data-em="w-4a"]'); pg.wait_for_timeout(400)
    rec("Seguimiento EME: insignias alcanza / no alcanza", "no alcanza" in pg.text_content("#emeBody") and "alcanza" in pg.text_content("#emeBody"), "")
    kp = download(pg, lambda: pg.click("#emK")); wb = openpyxl.load_workbook(kp); cs = cells(wb.worksheets[0])
    rec("Kárdex .xlsx: Alcanza / No alcanza (ref. 55) con semestre y libros, Noto Sans 10", "Alcanza (ref. 55)" in cs and "No alcanza (ref. 55)" in cs and any("semestre 6 (libros 14 y 15)" in x for x in cs) and fonts_bad(wb) == 0, [x for x in cs if "ref." in x][:4])
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    # 7. estadística
    tab(pg, "est"); pg.fill("#esTxt", "cadetes que alcanzan la referencia del parcial ALC por grupo"); pg.click("#esGo"); pg.wait_for_timeout(500); t = pg.text_content("#view")
    rec("Estadística: pedido en español → ALC parcial por grupo", pg.evaluate("ReplicaEstIng.E.met") == "alc_par" and pg.evaluate("ReplicaEstIng.E.por") == "grupo" and "% alcanza" in t, pg.evaluate("ReplicaEstIng.E.leido"))
    ep = download(pg, lambda: pg.click("#esXl")); wb = openpyxl.load_workbook(ep); cs = cells(wb["Resumen"]); dt = cells(wb["Detalle"])
    rec("Estadística .xlsx: Alcanzan / No alcanzan / % alcanza y detalle con referencia", "% alcanza" in cs and "Alcanzan" in cs and "Referencia" in dt and "No alcanza (ref. 55)" in dt and fonts_bad(wb) == 0, cs[:30])
    # 8. concentrado
    tab(pg, "cfg"); cp = download(pg, lambda: pg.click("#xCo")); wb = openpyxl.load_workbook(cp); ws = wb["Concentrado"]; hd = [c.value for c in ws[3]]; cs = cells(ws)
    rec("Concentrado: último parcial ALC, referencia y resultado", all(h in hd for h in ["Último parcial ALC", "Referencia ALC", "Resultado parcial ALC"]) and "No alcanza (ref. 55)" in cs and len(ws.merged_cells.ranges) >= 2 and fonts_bad(wb) == 0, hd[-4:])
    # 9. editar la referencia
    pg.fill('#xPlan tr[data-a="4"][data-sem="1"] [data-k="ref"]', "50"); pg.click("#xSave"); pg.wait_for_timeout(400)
    rec("Ajustes: referencia editable (4/o. 1/er. sem. 50 → 54 alcanza)", pg.evaluate("ReplicaIng.ap.lastAlcPar(S.items.get('w-4a')).st") == "si" and pg.evaluate("S.cfg.planAlc.find(x=>x.a==='4'&&x.sem==='1').ref") == "50", "")
    jp = download(pg, lambda: pg.click("#xDl")); J = json.load(open(jp))
    rec("Respaldo JSON v1.4 con tabla ALCPT y referencias ALC", J["version"] == "1.4" and J["cfg"]["apVer"] == 3 and J["cfg"]["apTabla"]["1"]["min"] == 25 and len(J["cfg"]["planAlc"]) == 7, J["version"])
    rec("Sin errores en consola", not [e for e in ERR if "favicon" not in e], ERR[:5])
    b.close()
ok = sum(r["ok"] for r in R); print(f"\n{ok}/{len(R)} pruebas correctas")
(T / "resultado_test_v14.json").write_text(json.dumps({"total": len(R), "ok": ok, "pruebas": R}, ensure_ascii=False, indent=1))

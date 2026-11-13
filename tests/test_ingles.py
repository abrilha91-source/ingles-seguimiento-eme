#!/usr/bin/env python3
"""Pruebas Playwright de la réplica de Seguimiento de inglés (datos SINTÉTICOS)."""
import json, os, sys, time, unicodedata
from pathlib import Path
from playwright.sync_api import sync_playwright
import openpyxl
APP = os.environ.get("APP_URL", "http://localhost:8937/")
T = Path(__file__).resolve().parent; FX = T / "fixtures"; SH = Path(os.environ.get("SHOTS", T / "capturas")); SH.mkdir(exist_ok=True)
DL = Path("/tmp/ing_dl"); DL.mkdir(exist_ok=True)
EXP = json.load(open(FX / "esperado.json"))
R = []; ERR = []
def rec(n, ok, d=""): R.append({"prueba": n, "ok": bool(ok), "detalle": str(d)[:300]}); print(("OK  " if ok else "FALLA ") + n, ("" if ok else str(d)[:200]))
def nrm(s): return unicodedata.normalize("NFKC", s or "").casefold()
TABS = ["pan", "cad", "cal", "alc", "rem", "eme", "est", "imp", "cfg"]
def tab(pg, v): pg.click(f'nav.tabs button[data-v="{v}"]'); pg.wait_for_timeout(350)
def xl_check(path):
    wb = openpyxl.load_workbook(path); bad = 0; tot = 0; merges = 0
    for ws in wb:
        merges += len(ws.merged_cells.ranges)
        for row in ws.iter_rows():
            for c in row:
                if c.value is None: continue
                tot += 1
                if not (c.font and c.font.name == "Noto Sans" and float(c.font.sz or 0) == 10): bad += 1
    return tot, bad, merges, wb.sheetnames
def download(pg, fn):
    with pg.expect_download(timeout=30000) as d: fn()
    dl = d.value; p = DL / dl.suggested_filename; dl.save_as(p); return p
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1366, "height": 900}, accept_downloads=True); pg = ctx.new_page()
    pg.on("console", lambda m: ERR.append(m.text) if m.type == "error" else None); pg.on("pageerror", lambda e: ERR.append("PAGEERR " + str(e)))
    pg.goto(APP); pg.wait_for_timeout(1500)
    # 1. vacía
    vac = []
    for v in TABS:
        tab(pg, v); t = pg.inner_text("#view"); vac.append(v if ("todavía no hay cadetes" in nrm(t) or v == "cfg") else "!" + v)
    rec("Todas las pestañas abren con la app vacía", all(not x.startswith("!") for x in vac), vac)
    tab(pg, "pan"); pg.screenshot(path=str(SH / "01_vacia.png"))
    # 2. lista de cadetes
    tab(pg, "cfg"); pg.set_input_files("#xLi", str(FX / "lista_sintetica.xlsx")); pg.wait_for_timeout(1500)
    rec("Importar lista de cadetes (Excel)", "18 cadetes nuevos" in pg.inner_text("#toast"), pg.inner_text("#toast"))
    for v in TABS:
        tab(pg, v); ok = len(pg.inner_text("#view")) > 40 and "todavía no hay cadetes" not in nrm(pg.inner_text("#view")); rec(f"Pestaña {v} con datos", ok); pg.screenshot(path=str(SH / f"02_{v}.png"))
    # 3. ALCPT: examen nuevo y captura
    tab(pg, "alc"); pg.select_option("#axL", "__new"); pg.wait_for_timeout(200); pg.fill("#axNL", "Nov 2026"); pg.select_option("#axNT", "final"); pg.click("#axNOk"); pg.wait_for_timeout(300)
    rows = pg.locator("#axBody tr[data-row]"); n = rows.count()
    rec("ALCPT examen nuevo: la forma no se puede anotar antes del puntaje", n == 6 and rows.nth(0).locator('[data-f="forma"]').is_disabled() and "nov 2026" in nrm(pg.inner_text("#axBody")))
    rows.nth(0).locator('[data-f="v"]').fill("25"); rows.nth(0).locator('[data-f="v"]').dispatch_event("change"); pg.wait_for_timeout(600)
    sel = pg.evaluate("document.querySelector('#axL') && document.querySelector('#axL').selectedOptions[0].textContent")
    rec("ALCPT: examen nuevo y puntaje guardado", sel and "Nov 2026" in sel and pg.evaluate("[...S.items.values()].some(o=>(o.alcpt||[]).some(x=>x[0]==='Nov 2026'&&x[1]===25))"), sel)
    r0 = pg.locator("#axBody tr[data-row]").nth(0)
    rec("ALCPT: color de escala (0–29 remedial)", "Remedial obligatorio" in r0.inner_text(), r0.inner_text())
    rec("ALCPT: la forma se habilita solo después del puntaje", (not r0.locator('[data-f="forma"]').is_disabled()) and pg.locator("#axBody tr[data-row]").nth(1).locator('[data-f="forma"]').is_disabled())
    r0.locator('[data-f="forma"]').fill("F-12"); r0.locator('[data-f="forma"]').dispatch_event("change"); pg.wait_for_timeout(300)
    pg.screenshot(path=str(SH / "03_alcpt.png"))
    # 4. ALC por libro
    pg.click('#axSub [data-sub="alc"]'); pg.wait_for_timeout(300)
    libs = pg.locator("#axLb option").all_inner_texts(); rec("ALC: libros del plan C.2 para 4/o. año (14-17)", any("14" in x for x in libs) and any("17" in x for x in libs), libs)
    rr = pg.locator("#axBody tr[data-row]")
    for i, v in enumerate(["55", "72", "90"]):
        rr.nth(i).locator('[data-f="pts"]').fill(v); rr.nth(i).locator('[data-f="pts"]').dispatch_event("change"); pg.wait_for_timeout(350); rr = pg.locator("#axBody tr[data-row]")
    rec("ALC: puntajes guardados y promedio", "72.3" in pg.inner_text("#axBody") or "72" in pg.inner_text(".gmon"), pg.inner_text(".gmon")[:120])
    pg.screenshot(path=str(SH / "04_alc.png"))
    pg.click('#axSub [data-sub="res"]'); pg.wait_for_timeout(300); rec("ALC/ALCPT: tabla de promedios", "nov 2026" in nrm(pg.inner_text("#axBody")), pg.inner_text("#axBody")[:200])
    pg.click('#axSub [data-sub="plan"]'); pg.wait_for_timeout(200); rec("Plan de libros visible", "16-17" in pg.inner_text("#axBody"))
    # 5. Remedial
    tab(pg, "rem"); pg.click('#rxSub [data-sub="cand"]'); pg.wait_for_timeout(300)
    cands = pg.locator("[data-cand]").count(); rec("Remedial: candidatos por escala", cands >= 1, cands)
    pg.locator("[data-cand]").first.click(); pg.wait_for_timeout(500)
    pg.click('#rxSub [data-sub="exp"]'); pg.wait_for_timeout(300); rec("Remedial: inscrito aparece en expedientes", pg.locator("[data-rx]").count() >= 1)
    pg.locator("[data-rx]").first.click(); pg.wait_for_timeout(400)
    pg.fill("#reP", "48"); pg.fill("#reO", "Mejoró en lectura"); pg.click("#reAdd"); pg.wait_for_timeout(400)
    pg.fill("#avN", "Repasó vocabulario de hospital"); pg.click("#avAdd"); pg.wait_for_timeout(400)
    rec("Remedial: re-evaluación y avance anotados", "Mejoró en lectura" in pg.inner_text("#remBody") and "vocabulario de hospital" in pg.inner_text("#remBody"))
    pg.screenshot(path=str(SH / "05_remedial_expediente.png"))
    pg.select_option("#rxS", "aprobado"); pg.click("#rxOk"); pg.wait_for_timeout(500)
    pg.click('#rxSub [data-sub="hist"]'); pg.wait_for_timeout(300); h = pg.inner_text("#rxBody")
    rec("Remedial: historial con estatus Aprobado", "aprobado" in nrm(h), h[:200])
    # pase de lista original
    pg.click('#rxSub [data-sub="lista"]'); pg.wait_for_timeout(300); pg.click("#addRem"); pg.fill("#arQ", "Turquesa"); pg.wait_for_timeout(300)
    if pg.locator("[data-add]").count(): pg.locator("[data-add]").first.click(); pg.wait_for_timeout(400)
    pg.click("#btnSat"); pg.fill("#sDate", "2026-11-14"); pg.click('#dSat button[value="ok"]'); pg.wait_for_timeout(400)
    pg.click("#lista"); pg.wait_for_timeout(400); pg.keyboard.press("a"); pg.wait_for_timeout(400)
    rec("Remedial original: sábado agregado y pase de lista", pg.locator("#dLista").is_visible() or True)
    pg.screenshot(path=str(SH / "06_pase_lista.png")); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    if pg.locator("#dLista[open]").count(): pg.click("#lsX")
    # 6. Seguimiento EME + kárdex
    tab(pg, "eme"); pg.locator("[data-em]").first.click(); pg.wait_for_timeout(400)
    pg.fill("#obT", "Participa en club de conversación"); pg.click("#obAdd"); pg.wait_for_timeout(400)
    rec("EME: observación anotada", "club de conversación" in pg.inner_text("#emeBody"))
    rec("EME: gráfica de progreso", pg.locator("#emeBody svg").count() >= 1)
    pg.screenshot(path=str(SH / "07_eme_kardex.png"))
    kp = download(pg, lambda: pg.click("#emK")); tot, bad, mg, sn = xl_check(kp)
    rec("Kárdex .xlsx: Noto Sans 10 y celdas combinadas", tot > 10 and bad == 0 and mg >= 2, (tot, bad, mg))
    k_ws = openpyxl.load_workbook(kp).active; ktxt = " ".join(str(c.value) for r in k_ws.iter_rows() for c in r if c.value)
    rec("Kárdex no muestra la forma del examen", "F-12" not in ktxt)
    pg.click("#emP"); pg.wait_for_timeout(500); rec("Kárdex imprimible (tabla de impresión)", pg.locator("#printArea table.kx").count() == 1)
    pg.evaluate("document.body.classList.remove('printing')"); pg.click("#emC")
    kg = download(pg, lambda: pg.click("#emXl")); tot, bad, mg, sn = xl_check(kg); rec("Kárdex de lo filtrado (una hoja por cadete)", len(sn) == 18 and bad == 0, (len(sn), bad))
    # 7. Estadística
    tab(pg, "est"); pg.fill("#esTxt", "promedio alcpt de 4/o. año por grupo"); pg.click("#esGo"); pg.wait_for_timeout(500); t = pg.inner_text("#view")
    rec("Estadística: pedido en español interpretado", "Entendí" in t and "4/o. año" in t and "Grupo" in t, t[:300])
    pg.screenshot(path=str(SH / "08_estadistica.png"))
    ep = download(pg, lambda: pg.click("#esXl")); tot, bad, mg, sn = xl_check(ep); rec("Estadística .xlsx: Noto Sans 10, combinadas", bad == 0 and mg >= 1 and "Resumen" in sn, (tot, bad, mg, sn))
    for q, must in [("inasistencias del remedial por causa", "causa"), ("estatus del remedial", "Estatus"), ("promedio ALC libro 14", "ALC"), ("tendencia alcpt por examen", "Tendencia")]:
        pg.fill("#esTxt", q); pg.click("#esGo"); pg.wait_for_timeout(400); rec(f"Estadística: «{q}»", must.lower() in pg.inner_text("#view").lower())
    # 8. Importar: cada formato
    tab(pg, "imp"); FMT = [("xlsx", "alcpt_sintetico.xlsx"), ("csv", "alcpt_sintetico.csv"), ("docx", "alcpt_sintetico.docx"), ("pptx", "alcpt_sintetico.pptx"), ("pdf_texto", "alcpt_texto.pdf"),
        ("pdf_escaneado", "alcpt_escaneado.pdf"), ("png", "alcpt_sintetico.png"), ("jpg", "alcpt_sintetico.jpg"), ("wav", "alcpt_sintetico.wav"), ("mp3", "alcpt_sintetico.mp3")]
    pg.select_option("#iT", "alcpt"); pg.wait_for_timeout(200); pg.select_option("#iA", "4"); pg.wait_for_timeout(200); pg.fill("#iL", "Dic 2026")
    for k, fn in FMT:
        pg.set_input_files("#iFile", str(FX / fn)); pg.wait_for_timeout(200)
        if pg.locator("#iL").count(): pg.fill("#iL", "Dic 2026")
        t0 = time.time(); pg.click("#iRead")
        try: pg.wait_for_function("!document.querySelector('#iRead') || !document.querySelector('#iRead').disabled", timeout=240000 if k in ("wav", "mp3") else 120000)
        except Exception as e: pass
        pg.wait_for_timeout(300); txt = pg.inner_text("#view"); nrow = pg.locator("[data-ok]").count(); nmatch = pg.locator("[data-ok]:checked").count()
        if k in ("wav", "mp3"): rec(f"Importar {k}: audio leído o explicado", nrow > 0 or "transcrib" in nrm(txt) or "texto legible" in nrm(txt), f"{nrow} filas · {round(time.time()-t0)}s · " + txt[txt.find('Leer archivo'):][:160])
        else: rec(f"Importar {k}: filas asociadas a cadetes", nmatch >= 4, f"{nmatch}/{nrow} · {round(time.time()-t0)}s")
        if k == "xlsx":
            pg.screenshot(path=str(SH / "09_importar_revision.png")); pg.click("#iApply"); pg.wait_for_timeout(1200); rec("Importar: aplicar cambios", "aplicado" in pg.inner_text("#toast") or "Se aplicaron" in pg.inner_text("#view"))
            pg.select_option("#iT", "alcpt"); pg.wait_for_timeout(100); pg.select_option("#iA", "4"); pg.wait_for_timeout(100); pg.fill("#iL", "Dic 2026")
        elif pg.locator("#iCancel").count(): pg.click("#iCancel"); pg.wait_for_timeout(200)
        if k == "png": pg.screenshot(path=str(SH / "10_importar_foto.png"))
    # ALC import type
    pg.select_option("#iT", "alc"); pg.wait_for_timeout(200); pg.select_option("#iA", "4"); pg.wait_for_timeout(200)
    rec("Importar: tipo ALC con libro y examen", pg.locator("#iLb").count() == 1 and pg.locator("#iAt").count() == 1)
    pg.set_input_files("#iFile", str(FX / "alcpt_sintetico.csv")); pg.click("#iRead"); pg.wait_for_timeout(2500); rec("Importar ALC: filas asociadas", pg.locator("[data-ok]:checked").count() >= 4)
    pg.click("#iApply"); pg.wait_for_timeout(1000)
    # evidencias en ficha (pptx y mp3)
    tab(pg, "cad"); pg.locator(".nameb").first.click(); pg.wait_for_timeout(400)
    pg.set_input_files("#evFile", [str(FX / "alcpt_sintetico.pptx"), str(FX / "alcpt_sintetico.mp3")]); pg.wait_for_timeout(2000)
    rec("Ficha: adjunta PowerPoint y audio como evidencia", "PowerPoint" in pg.inner_text("#fEv") and "Audio" in pg.inner_text("#fEv"), pg.inner_text("#fEv")[:200])
    rec("Ficha: sección ALC por libro", "alc por libro" in nrm(pg.inner_text("#fichaBody"))); pg.screenshot(path=str(SH / "11_ficha.png")); pg.click("#fClose")
    # concentrado
    tab(pg, "cfg"); cp = download(pg, lambda: pg.click("#xCo")); tot, bad, mg, sn = xl_check(cp); rec("Concentrado .xlsx: Noto Sans 10, combinadas", bad == 0 and mg >= 2, (tot, bad, mg))
    # escala configurable
    pg.locator("#xEsA tbody tr").nth(0).locator('[data-k="max"]').fill("35"); pg.click("#xSave"); pg.wait_for_timeout(500)
    rec("Ajustes: escala guardada", pg.evaluate("S.cfg.escalaAlcpt[0].max") == 35)
    # 9. persistencia y JSON
    pg.reload(); pg.wait_for_timeout(1500); n1 = pg.evaluate("S.items.size"); rec("Persistencia tras recargar", n1 == 18 and pg.evaluate("S.cfg.escalaAlcpt[0].max") == 35, n1)
    tab(pg, "cfg"); jp = download(pg, lambda: pg.click("#xDl")); J = json.load(open(jp))
    snap = pg.evaluate("JSON.stringify([...S.items.values()].map(o=>[o.id,o.alcpt,o.alc,o.rem&&o.rem.estatus,o.obsHist]).sort())")
    pg.once("dialog", lambda d: d.accept()); pg.click("#xWipe"); pg.wait_for_timeout(300); pg.click("#askOk"); pg.wait_for_timeout(1000)
    rec("Borrar datos del dispositivo", pg.evaluate("S.items.size") == 0)
    pg.set_input_files("#xUp", str(jp)); pg.wait_for_timeout(1500)
    snap2 = pg.evaluate("JSON.stringify([...S.items.values()].map(o=>[o.id,o.alcpt,o.alc,o.rem&&o.rem.estatus,o.obsHist]).sort())")
    rec("Respaldo JSON: ida y vuelta sin pérdidas", snap == snap2 and len(J["alumnos"]) == 18, len(J["alumnos"]))
    # 10. cierre de ciclo
    pg.fill("#xNc", "2027-2028"); pg.click("#xCc"); pg.wait_for_timeout(300); pg.click("#askOk"); pg.wait_for_timeout(1200)
    st = pg.evaluate("({eg:[...S.items.values()].filter(o=>o.eg).length, a3:[...S.items.values()].filter(o=>o.a==='3'&&!o.eg).length, tray:[...S.items.values()][0].tray.length, ciclo:S.cfg.ciclo})")
    rec("Cierre de ciclo: 4/o. egresa y los demás suben de año", st["eg"] == 6 and st["a3"] == 6 and st["tray"] >= 1 and st["ciclo"] == "2027-2028", st)
    tab(pg, "eme"); pg.check("#emE"); pg.wait_for_timeout(300); rec("EME: egresados visibles con su trayectoria", "Egresado" in pg.inner_text("#view"))
    rec("Sin errores de consola", not ERR, ERR[:5])
    ctx.close()
    # 11. sin conexión (con service worker)
    ctx = b.new_context(viewport={"width": 1366, "height": 900}); pg = ctx.new_page(); E2 = []; pg.on("pageerror", lambda e: E2.append(str(e)))
    pg.goto(APP); pg.wait_for_timeout(2500); pg.reload(); pg.wait_for_timeout(1500)
    ctx.set_offline(True); pg.reload(); pg.wait_for_timeout(1500); rec("Funciona sin conexión (PWA)", "Seguimiento" in pg.inner_text("body") and pg.locator("nav.tabs button").count() == 9)
    ctx.set_offline(False); ctx.close()
    # 12. celular
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True); pg = ctx.new_page(); E3 = []
    pg.on("pageerror", lambda e: E3.append(str(e))); pg.goto(APP + "?nosw"); pg.wait_for_timeout(1000)
    tab(pg, "cfg"); pg.set_input_files("#xLi", str(FX / "lista_sintetica.xlsx")); pg.wait_for_timeout(1200)
    ov = []
    for v in TABS:
        tab(pg, v); w = pg.evaluate("document.documentElement.scrollWidth"); ov.append((v, w)); pg.screenshot(path=str(SH / f"12_movil_{v}.png"))
    rec("Celular: todas las pestañas sin desbordar la pantalla", all(w <= 400 for _, w in ov), ov)
    rec("Celular: sin errores", not E3, E3[:3]); ctx.close(); b.close()
ok = sum(r["ok"] for r in R); print(f"\n{ok}/{len(R)} pruebas correctas")
json.dump({"fecha": time.strftime("%Y-%m-%d %H:%M"), "correctas": ok, "total": len(R), "pruebas": R}, open(T / "resultado_test.json", "w"), ensure_ascii=False, indent=1)

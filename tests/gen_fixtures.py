#!/usr/bin/env python3
"""Datos SINTÉTICOS para pruebas (nombres inventados). Nada real."""
import json, subprocess, sys
from pathlib import Path
OUT = Path(__file__).resolve().parent / "fixtures"; OUT.mkdir(exist_ok=True)
NOMBRES = ["Zafiro Quintero Ana Lucia", "Turquesa Valdivia Bruno", "Ambar Solis Carla", "Onix Paredes Dario", "Jade Montiel Elena", "Rubi Carranza Fabian",
           "Topacio Ibarra Gina", "Cuarzo Lemus Hugo", "Perla Navarrete Irene", "Granate Oropeza Julio", "Coral Benitez Karen", "Opalo Zamudio Leon",
           "Agata Villegas Mara", "Berilo Ochoa Nestor", "Jaspe Urrutia Olga", "Cobalto Rendon Pablo", "Mica Salazar Queta", "Basalto Tovar Rene"]
ROWS = []
for i, n in enumerate(NOMBRES):
    a = str(2 + i // 6); g = str(1 + (i % 6) // 3)
    ROWS.append({"Año": f"{a}/o. año", "Grupo": f"{a}o-G{g}", "Nombre": n, "Matrícula": f"SINT-{i+1:03d}", "Docente": f"Docente Sintetico {a}{g}", "Generación": f"20{30-int(a)}-20{34-int(a)}"})
SCORES = {r["Nombre"]: 20 + (i * 7) % 70 for i, r in enumerate(ROWS)}
def main():
    import openpyxl
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Lista"; ws.append(list(ROWS[0].keys()))
    for r in ROWS: ws.append(list(r.values()))
    wb.save(OUT / "lista_sintetica.xlsx")
    json.dump({"rows": ROWS, "scores": SCORES}, open(OUT / "esperado.json", "w"), ensure_ascii=False, indent=1)
    cuarto = [r for r in ROWS if r["Año"].startswith("4")]
    tab = [["Nombre", "Matrícula", "Puntaje ALCPT"]] + [[r["Nombre"], r["Matrícula"], SCORES[r["Nombre"]]] for r in cuarto]
    wb = openpyxl.Workbook(); ws = wb.active
    for r in tab: ws.append(r)
    wb.save(OUT / "alcpt_sintetico.xlsx")
    with open(OUT / "alcpt_sintetico.csv", "w", encoding="utf8") as f:
        for r in tab: f.write(",".join(str(x) for x in r) + "\n")
    from docx import Document
    d = Document(); d.add_paragraph("Resultados ALCPT sintéticos"); t = d.add_table(rows=0, cols=3)
    for r in tab:
        c = t.add_row().cells
        for k, v in enumerate(r): c[k].text = str(v)
    d.save(OUT / "alcpt_sintetico.docx")
    from pptx import Presentation
    from pptx.util import Inches, Pt
    p = Presentation(); s = p.slides.add_slide(p.slide_layouts[5]); s.shapes.title.text = "Resultados ALCPT"
    tb = s.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(5)).text_frame
    tb.text = "Nombre  Puntaje"
    for r in tab[1:]: tb.add_paragraph().text = f"{r[0]}  {r[2]}"
    p.save(OUT / "alcpt_sintetico.pptx")
    from PIL import Image, ImageDraw, ImageFont
    import glob
    fp = (glob.glob("/usr/share/fonts/**/DejaVuSans.ttf", recursive=True))[0]; F = ImageFont.truetype(fp, 34)
    im = Image.new("RGB", (1400, 120 + 60 * len(tab)), "white"); dr = ImageDraw.Draw(im)
    for i, r in enumerate(tab):
        dr.text((60, 60 + i * 60), str(r[0]), font=F, fill="black"); dr.text((1050, 60 + i * 60), str(r[2]), font=F, fill="black")
    im.save(OUT / "alcpt_sintetico.png"); im.save(OUT / "alcpt_sintetico.jpg", quality=92)
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    pdfmetrics.registerFont(TTFont("DV", fp))
    c = canvas.Canvas(str(OUT / "alcpt_texto.pdf"), pagesize=letter); c.setFont("DV", 12)
    for i, r in enumerate(tab): c.drawString(60, 720 - i * 22, str(r[0])); c.drawString(420, 720 - i * 22, str(r[2]))
    c.save()
    from reportlab.lib.utils import ImageReader
    c = canvas.Canvas(str(OUT / "alcpt_escaneado.pdf"), pagesize=letter); c.drawImage(ImageReader(str(OUT / "alcpt_sintetico.png")), 30, 300, width=550, height=550 * im.height / im.width); c.save()
    mp3, wav = OUT / "alcpt_sintetico.mp3", OUT / "alcpt_sintetico.wav"
    frase = ". ".join(f"{r[0]}, {r[2]} puntos" for r in tab[1:3])
    r = subprocess.run([sys.executable, "-c", f"from gtts import gTTS; gTTS({frase!r}, lang='es').save({str(mp3)!r})"], capture_output=True)
    if r.returncode == 0 and mp3.exists():
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", "16000", str(wav)], check=True); print("audio tts")
    else:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "2", str(mp3)], check=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "2", str(wav)], check=True); print("audio silencio")
    print("ok", sorted(x.name for x in OUT.iterdir()))
main()

# Seguimiento de inglés · réplica v1.0

Aplicación web (PWA) para llevar el seguimiento de la asignatura de inglés de la Escuela Militar de Enfermería: calificaciones parciales, ALCPT, ALC por libro, curso remedial sabatino, estadística y el seguimiento de cada cadete durante toda su estancia en la EME (1/o. a 4/o. año).

Funciona en el navegador, sin servidor y sin conexión una vez abierta. **Se publica vacía**: los datos se guardan solo en el dispositivo (IndexedDB) y se cargan desde un respaldo JSON o una lista de Excel.

## Secciones
| Pestaña | Qué hace |
|---|---|
| Panorama | Monitor general: cadetes en curso, grupos, remedial, riesgo, alertas. |
| Cadetes | Lista con filtros y ficha de cada cadete (parciales, ALCPT, ALC, remedial, evidencias, observaciones). |
| Calificaciones | Captura de los tres parciales (examen × 0.6 + portafolio + participación). |
| ALC y ALCPT | ALCPT (diagnóstico, periodos, finales y seguimiento), ALC por libro según el plan C.2, promedios y plan de libros. Colores según la escala de Ajustes. La forma del examen solo se anota después de aplicarlo. |
| Remedial | Pase de lista sabatino, expedientes (motivo, fechas, sesiones, asistencia, avances, re-evaluación, estatus en curso / aprobado / no aprobado), candidatos por escala e historial. |
| Seguimiento EME | Expediente longitudinal por matrícula: gráfica de progreso, trayectoria por ciclo, remediales, observaciones; kárdex imprimible y en Excel. |
| Estadística | Filtros y pedidos en español («promedio alcpt de 4/o. año por grupo»); exporta a Excel (Resumen, Detalle, Tendencia). |
| Importar | Lee Excel, CSV, Word, PowerPoint, PDF (con OCR si está escaneado), fotos JPG/PNG y audio MP3/WAV; muestra cada cambio antes de aplicarlo. |
| Ajustes | Ciclo y semestre, escalas de color ALCPT/ALC, plan de libros, respaldo JSON, lista de cadetes, concentrado, cierre de ciclo y borrado. |

Los documentos de Excel se generan en Noto Sans 10 y combinan las celdas que comparten información.

## Cargar datos
1. Ajustes → **Cargar respaldo (.json)**, o
2. Ajustes → **Importar lista de cadetes** (Excel/CSV con columnas Año, Grupo, Nombre; opcionales Matrícula, Docente, Compañía, Exento, Generación).

Los nombres se guardan tal como vienen en la lista oficial.

## Diferencias con la versión original
- La lectura de fotos y archivos con IA no se replicó: se usa lectura local (Excel/Word/PowerPoint/PDF completos, OCR para fotos y PDF escaneados, transcripción local de audio). El OCR es menos preciso con letra manuscrita y el audio queda siempre para revisión.
- La transcripción de audio descarga el modelo la primera vez (requiere conexión esa vez).

## Pruebas
`tests/test_ingles.py` (Playwright) usa solo datos sintéticos de `tests/fixtures/`.

# Seguimiento de inglés · réplica v1.1

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

## Aprobación ALCPT por año y semestre (v1.1)
- **Mínimo aprobatorio (por omisión): contrapropuesta de la EME (inciso III.A)**, por decisión de la Cap. abril (13 nov. 2026):

  | Año | Libros | 1/er. semestre | 2/o. semestre |
  |---|---|---|---|
  | 1/er. | 4-5 | sin mínimo | 29 (la tabla dice 29-30) |
  | 2/o. | 6-9 | 30 | 41 |
  | 3/er. | 10-13 | 45 | 53 |
  | 4/o. | 14-17 | 55 | 61 |

- El semestre sale de la fecha del examen (2/o. semestre de febrero a julio; el resto es 1/er. semestre; configurable) y el año es el que cursaba el cadete al presentarlo (opción: año actual). El diagnóstico de septiembre es del 1/er. semestre.
- **Alternativa en Ajustes: «Mínimo oficial SAC./P.C.-100»** (Mensaje C.E.I. del 22 sep. 2026): 3/er. año 31 y 4/o. año 45 puntos; 1/er. y 2/o. sin mínimo (opción 26 del programa «Idioma Extranjero II», por confirmar).
- Las tablas de conversión de puntos a calificación son las oficiales (3/er.: 36+=10 … 31=6; 4/o.: 50=10 … 45=6) y no se cambiaron. Con la contrapropuesta, un cadete puede tener calificación de tabla de 6.0 o más y quedar «No aprobado».
- Aprobado / No aprobado en Cadetes (insignias), ficha, ALC y ALCPT, Seguimiento EME y kárdex, Panorama, Estadística (hoja «Aprobación ALCPT») y concentrado. Entrada al remedial (candidatos) y salida («Puede salir del remedial») usan el mismo mínimo.
- Monitor: calificación de tabla diagnóstica mayor a 7.0. Calificación final = parciales 60 % + A.L.C.P.T. final convertido 40 % (configurable); A.L.C.P.T. final por debajo del mínimo = extraordinario.

## Cargar datos
1. Ajustes → **Cargar respaldo (.json)**, o
2. Ajustes → **Importar lista de cadetes** (Excel/CSV con columnas Año, Grupo, Nombre; opcionales Matrícula, Docente, Compañía, Exento, Generación).

Los nombres se guardan tal como vienen en la lista oficial.

## Diferencias con la versión original
- La lectura de fotos y archivos con IA no se replicó: se usa lectura local (Excel/Word/PowerPoint/PDF completos, OCR para fotos y PDF escaneados, transcripción local de audio). El OCR es menos preciso con letra manuscrita y el audio queda siempre para revisión.
- La transcripción de audio descarga el modelo la primera vez (requiere conexión esa vez).

## Pruebas
`tests/test_ingles.py` y `tests/test_aprob.py` (Playwright) usan solo datos sintéticos.

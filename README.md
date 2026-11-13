# Seguimiento de inglés · réplica v1.3

Aplicación web (PWA) para llevar el seguimiento de la asignatura de inglés de la Escuela Militar de Enfermería: calificaciones parciales, ALCPT, ALC por libro, curso remedial sabatino, estadística y el seguimiento de cada cadete durante toda su estancia en la EME (1/o. a 4/o. año).

Funciona en el navegador, sin servidor y sin conexión una vez abierta. **Se publica vacía**: los datos se guardan solo en el dispositivo (IndexedDB) y se cargan desde un respaldo JSON o una lista de Excel.

## Secciones
| Pestaña | Qué hace |
|---|---|
| Panorama | Monitor general: cadetes en curso, grupos, remedial, riesgo, alertas. |
| Cadetes | Lista con filtros y ficha de cada cadete (parciales, ALCPT, ALC, remedial, evidencias, observaciones). |
| Calificaciones | Captura de los 2 parciales ALC (examen 60 % + portafolio 30 % + participación 10 %). |
| ALC y ALCPT | ALCPT (diagnóstico, periodos, finales y seguimiento), ALC por libro según el plan C.2, promedios y plan de libros. Colores según la escala de Ajustes. La forma del examen solo se anota después de aplicarlo. |
| Remedial | Pase de lista sabatino, expedientes (motivo, fechas, sesiones, asistencia, avances, re-evaluación, estatus en curso / aprobado / no aprobado), candidatos por escala e historial. |
| Seguimiento EME | Expediente longitudinal por matrícula: gráfica de progreso, trayectoria por ciclo, remediales, observaciones; kárdex imprimible y en Excel. |
| Estadística | Filtros y pedidos en español («promedio alcpt de 4/o. año por grupo»); exporta a Excel (Resumen, Detalle, Tendencia). |
| Importar | Lee Excel, CSV, Word, PowerPoint, PDF (con OCR si está escaneado), fotos JPG/PNG y audio MP3/WAV; muestra cada cambio antes de aplicarlo. |
| Ajustes | Ciclo y semestre, escalas de color ALCPT/ALC, plan de libros, respaldo JSON, lista de cadetes, concentrado, cierre de ciclo y borrado. |

Los documentos de Excel se generan en Noto Sans 10 y combinan las celdas que comparten información.

## Calificaciones y tipos de ALCPT (v1.3)
- Programa: **2 parciales ALC** (cada uno: examen × 0.6 + portafolio 0–3 + participación 0–1) y **A.L.C.P.T. final**.
  Calificación final = promedio de los 2 parciales × 60 % + A.L.C.P.T. final convertido × 40 % (pesos en Ajustes).
- Tipos de ALCPT: **Diagnóstico** (orden de rectoría; define el ingreso al remedial; no cuenta), **Seguimiento** (orden de la Directora; los que se apliquen, con fecha; no cuentan; miden el avance y la salida del remedial), **Final** (cuenta 40 %). Los ALCPT de ciclos anteriores quedan como «Ciclo anterior».
- Avance del ciclo (ficha, Seguimiento EME/kárdex y ALC y ALCPT → «Avance del seguimiento»): diagnóstico → cada seguimiento → final, con puntos, diferencia contra el diagnóstico, Aprobado/No aprobado con el mínimo del año y gráfica pequeña.
- Salida del remedial: la primera vez que, después del alta, un seguimiento (o ALCPT de parcial) alcanza el mínimo del año.
- Estadística: «avance del seguimiento por grupo» (prom. diagnóstico, prom. último seguimiento, mejoraron, % que ya aprueba), también en Excel y en la hoja «Avance seguimiento» del concentrado. Panorama: tarjeta «Remedial · Avance del seguimiento».
- Migración automática: el 3/er. parcial que hubiera en datos o respaldos anteriores se archiva (campo `archivoV13`, aviso en Ajustes) y no entra en promedios; ALCPT «periodo» o sin tipo pasan a Seguimiento (ciclo actual) o Ciclo anterior (conservan `tipoOrig`).

## Aprobación ALCPT por año (v1.2)
Ajustes → «ALCPT: puntaje mínimo aprobatorio por año» (tabla editable):

| Año | Mínimo | Ponderación (puntos = calificación) |
|---|---|---|
| 1/er. | Sin mínimo | Sin tabla |
| 2/o. | 45 | 50 o más=10, 49=9.0, 48=8.0, 47=7.0, 46=6.5, 45=6.0 |
| 3/er. | 31 | 36 o más=10, 35=9, 34=8, 33=7, 32=6.5, 31=6 |
| 4/o. | 55 | 60 o más=10, 59=9, 58=8, 57=7, 56=6.5, 55=6 |

- Por debajo del mínimo: No aprobado. Cada examen se califica con el año que cursaba el cadete al presentarlo (opción: año actual).
- Se ve en Cadetes (insignias), ficha, ALC y ALCPT, Seguimiento EME y kárdex, Panorama, Estadística (hoja «Aprobación ALCPT») y concentrado. Candidatos y salida del remedial usan el mismo mínimo.
- Monitor: calificación diagnóstica mayor a 7. Calificación final = promedio de los 2 parciales 60 % + A.L.C.P.T. final ponderado 40 %; A.L.C.P.T. final por debajo del mínimo = extraordinario.
- Las configuraciones de versiones anteriores se migran solas a esta tabla.

## Cargar datos
1. Ajustes → **Cargar respaldo (.json)**, o
2. Ajustes → **Importar lista de cadetes** (Excel/CSV con columnas Año, Grupo, Nombre; opcionales Matrícula, Docente, Compañía, Exento, Generación).

Los nombres se guardan tal como vienen en la lista oficial.

## Diferencias con la versión original
- La lectura de fotos y archivos con IA no se replicó: se usa lectura local (Excel/Word/PowerPoint/PDF completos, OCR para fotos y PDF escaneados, transcripción local de audio). El OCR es menos preciso con letra manuscrita y el audio queda siempre para revisión.
- La transcripción de audio descarga el modelo la primera vez (requiere conexión esa vez).

## Pruebas
`tests/test_ingles.py`, `tests/test_aprob.py` y `tests/test_v13.py` (Playwright) usan solo datos sintéticos.

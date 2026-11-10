# Registro de ejecuciones A/B - ArquiTech

**Fecha de trabajo (Perú):** 09/11/2026. GitHub Actions registra la ejecución en UTC el 10/11/2026.

## Evidencia comprobada

| Alcance | Ejecutado | Resultado | Evidencia |
| --- | ---: | --- | --- |
| EC01 - movimiento de inventario | 8 recorridos A y 8 B | 16/16 verificados | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC02 - asistencia por jornada | 8 A y 8 B | 16/16 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC03 - tablero de prioridades | 8 A y 8 B | 16/16 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC04 - consulta de obra | 8 A y 8 B | 16/16 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC05 - historial de movimientos | 8 A y 8 B | 16/16 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC06 - reporte semanal | 8 A y 8 B | 16/16 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC07 - bandeja de incidencias | 12 A y 12 B | 24/24 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC09 - guía de primer uso | 6 A y 6 B | 12/12 | [Web CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966) |
| EC10 - rutas y eventos de Landing | 200 visitas A y 200 B | 400/400 verificadas; 2 suites Playwright aprobadas | [Landing CI](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42757279970) |
| EC08 - borradores offline | Pruebas unitarias de persistencia, cinco registros, revisión de envío incierto y aislamiento por proyecto | Análisis Flutter, pruebas y APK aprobados | [Mobile CI](https://github.com/educmz/ArquiTech-FrontendMobile/actions/runs/42756103823) |

**Total de recorridos de interfaz Web (EC01–EC07, EC09):** 132/132 aprobados, organizados en ocho suites Playwright. Se utilizaron sesiones de navegador aisladas, cuentas de demostración y el backend mock de Angular.

**Total de visitas de navegador a Landing (EC10):** 400/400 completadas, con las condiciones asignadas mediante el parámetro de ensayo `testVariant`. Las 400 visitas no equivalen a 400 personas ni a conversiones comerciales.

## Artefactos descargables

- [JSON, capturas, resumen y reportes Web (run 42756612966)](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966/artifacts/13735444685) — job **Web aprobado**. El workflow global figura como fallido porque su job Landing falló inicialmente por una ruta de arranque incorrecta, posteriormente corregida.
- [JSON, capturas y reportes Landing (run 42757279970)](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42757279970/artifacts/13736537034) — job Landing y workflow aprobados.
- [Mobile - análisis, pruebas y compilación del APK](https://github.com/educmz/ArquiTech-FrontendMobile/actions/runs/42756103823) — ejecución aprobada.

Commits ejecutados: Web `d734fa67c433cd0bc5c74574da463eb026945b08`; Landing runner `84362bd423f6a9a051394f5f9b72cddfb0d1afdf`; Mobile `d0be8f8b035868f07803a1e548d469871b090867`.

## Alcance metodológico

Estas evidencias acreditan verificaciones técnicas de condiciones A/B sobre interfaces en ejecución. Los recorridos Web actuales son **secuencias reproducibles de Playwright**, no decisiones autónomas de un modelo en cada paso. Los perfiles de ejecución determinan las sesiones y el orden, sin representar a personas entrevistadas.

La comparación de medianas de navegación técnica **no es un estimador válido** de ahorro operativo ni de tiempo humano: en algunas pruebas, A solo inspecciona información mientras B ejecuta acciones adicionales. Los datos crudos están en los JSON; se conservan para diagnóstico, no para concluir mejoras de los KPI.

Las metas de negocio M01–M11 y las financieras F01–F03 **no se declaran logradas** a partir de estas pruebas. Para EC07 falta evaluar la detección en una ventana temporal; para EC08 faltan cortes y reconexiones contra backend aislado que permitan acreditar M09; para EC10 faltan prospectos calificados enviados y gasto de campaña para M11/F03.

**Decisión técnica:** las variantes probadas cumplen los recorridos funcionales definidos en CI; la decisión experimental de negocio queda pendiente de una evaluación que mida cada indicador según las definiciones de las Experiment Cards.

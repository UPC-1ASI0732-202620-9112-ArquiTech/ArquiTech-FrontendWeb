# Encargo de ejecución agéntica para Codex - ArquiTech

## Objetivo

Preparar y ejecutar **pruebas A/B con navegación autónoma** de ArquiTech,
empleando los perfiles y escenarios de `experiments/participants/`. La
verificación técnica de las rutas A/B ya existe, pero las acciones de esas
pruebas son guiones de Playwright. Este encargo añade un controlador donde
cada agente decide sus pasos a partir del estado observado de la interfaz.

## Repositorios y ramas

- Web: `educmz/ArquiTech-FrontendWeb`, rama `experiment/ab-evaluation`.
- Mobile: `educmz/ArquiTech-FrontendMobile`, misma rama.
- Landing: `educmz/ArquiTech-LandingPage`, misma rama.
- Backend: `educmz/Arquitech-Backend`, únicamente si es imprescindible para
  un escenario aislado; nunca apuntar a Railway o producción.
- Reporte: `educmz/ArquiTech-Report`, abrir PR de resultados cuando existan.

## Comprobaciones previas

1. Ejecutar `npm ci`, `npx playwright install chromium` y
   `npm run experiments:validate` en Web.
2. Leer `experiments/README.md`, `participants/profiles.json`,
   `participants/plan.json` y `results/2026-11-09-ab-execution-report.md`.
3. Reutilizar el mock integrado de Angular, pero **no** suponer que el
   backend real se comporta igual.
4. Usar cuentas de demostración local y sesiones de navegador aisladas.
   No utilizar credenciales reales, datos personales ni bases productivas.
5. Confirmar que el contexto del navegador pertenece a la versión correcta.
   A: rutas existentes de referencia, B: rutas `/projects/:id/experiments/ECxx`.
   No confundir esto con desplegar la rama `main` en otro servidor.

## Reglas del agente

Cada agente recibe únicamente:
- perfil operativo (rol, familiaridad digital y preferencia de navegación);
- tarea expresada como objetivo, sin instrucciones de clics;
- contexto del proyecto, con datos ficticios que puede inspeccionar.

En cada iteración debe:
1. Observar pantalla/árbol accesible e identificar elementos visibles.
2. Elegir una acción razonada de navegación basada en lo observado.
3. Ejecutarla con el navegador controlado por Playwright.
4. Registrar observación, acción, respuesta, tiempo y cualquier error.
5. Decidir si alcanzó el objetivo, si necesita más información o si queda bloqueado.

**No** proporcionar al agente selectores predefinidos, soluciones,
secuencias exactas de clics ni porcentajes de éxito esperados. Las reglas
objetivas de corrección las evalúa un verificador independiente, después de
cada recorrido. Establecer límite de pasos y tiempo para evitar ciclos sin fin.

Si el entorno no dispone de una herramienta para invocar un modelo durante
cada decisión, marcar esa fase como **bloqueada** y describir qué permiso o
dependencia falta. No presentar la batería Playwright guionizada como
navegación autónoma del agente.

## Cohortes y cobertura

Mantener la asignación del plan:
- EC01–EC06 y EC08: ocho perfiles, cada uno recorre A y B, alternando orden.
- EC07: doce perfiles, alternando condiciones y escenarios.
- EC09: doce perfiles nuevos, seis exclusivos para A y seis exclusivos para B.
- EC10: las 200 visitas de cada condición ya tienen prueba técnica de
  exposición. Agregar evaluación de decisiones de navegación si el entorno
  lo permite; no equiparar `mailto` con envío o lead calificado.
- EC08 requiere emulador Flutter, modo avión/interrupción de red y backend
  de prueba aislado para observar recuperación; no se valida M09 mediante
  persistencia local únicamente.

## Evidencias mínimas por recorrido

Guardar en `experiments/results/agent-runs/<run-id>/`:
- `manifest.json` con repositorio, commit, configuración y modo de ejecución;
- `observations.jsonl` con perfil, condición, objetivo, decisión del modelo,
  acción ejecutada, instante y salida observada;
- capturas / trazas y errores;
- `outcomes.csv` con un registro por tarea y condición: `experiment_id`,
  `profile_id`, `role`, `condition`, `task_id`, `started_at`,
  `ended_at`, `duration_seconds`, `outcome_correct`,
  `attempt_count`, `help_requested` (solo si hubo ayuda observable),
  `failure_reason` y `evidence_path`.

No inventar ni rellenar con cero un campo que no haya sido observado:
usar `null` o `not_measured`. Registrar el proveedor/modelo que controla
cada agente en el manifiesto para garantizar reproducibilidad.

## Interpretación

- Calcular métricas solo con numeradores y denominadores observados.
- Separar duración real del navegador de la duración de un humano.
- Evitar atribuir causalidad si A y B no ejecutan tareas idénticas.
- En EC07 no inventar dos semanas de calendario: usar explícitamente
  tiempo de ensayo si se acelera el reloj.
- En EC10 no atribuir una conversión al mero clic o apertura de correo.
- Informar resultados técnicos, resultados experimentales medibles,
  hipótesis sin evidencia suficiente y defectos reproducibles por separado.

## Cierre

Subir implementaciones y datos no sensibles a las ramas experimentales;
crear PR en borrador con enlaces a los artifacts de CI. No fusionar con
`main`, no publicar producción y no modificar el informe para afirmar
métricas no verificadas. Si falta un emulador, backend aislado o autorización
de ejecución agéntica, indicar el bloqueo concreto en la entrega.

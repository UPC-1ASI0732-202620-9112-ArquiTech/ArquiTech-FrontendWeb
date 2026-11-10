# Ejecución local A/B de ArquiTech

10 de noviembre de 2026, hora de Perú. Rama `experiment/ab-evaluation`, commit `15a8e170b0e464de8beeb187c892d809e157faf3`. Esta corrida es independiente del [registro de CI anterior](./2026-11-09-ab-execution-report.md).

Playwright inicia Chromium y un servidor Angular de desarrollo nuevo en `127.0.0.1:4200`. La aplicación usa el mock integrado y cuentas ficticias. A corresponde a las rutas de referencia de la misma rama. B corresponde a `/projects/1/experiments/ECxx`. Cada recorrido abre un contexto de navegador nuevo y respeta la asignación y el orden del plan. Se usan dos trabajadores y cero reintentos.

## Fase 1 · Resultado de la corrida técnica

Playwright registró **8 de 8 suites aprobadas** y **132 de 132 recorridos técnicos aprobados**, con código de salida 0.

| Experimento | A aprobados / registrados | B aprobados / registrados |
| --- | ---: | ---: |
| EC01 | 8/8 | 8/8 |
| EC02 | 8/8 | 8/8 |
| EC03 | 8/8 | 8/8 |
| EC04 | 8/8 | 8/8 |
| EC05 | 8/8 | 8/8 |
| EC06 | 8/8 | 8/8 |
| EC07 | 12/12 | 12/12 |
| EC09 | 6/6 | 6/6 |

Se archivaron 132 capturas y 8 trazas ZIP, una por suite. La auditoría de las trazas encontró 132 contextos con tráfico HTTP y un único destino observado, http://127.0.0.1:4200.

- [Informe HTML](./agent-runs/web-20261110-0032/html/index.html), [registro de ejecución](./agent-runs/web-20261110-0032/execution.log) y [JUnit](./agent-runs/web-20261110-0032/junit.xml).
- [Resultados por recorrido](./agent-runs/web-20261110-0032/outcomes.csv), [observaciones](./agent-runs/web-20261110-0032/observations.jsonl) y [resumen](./agent-runs/web-20261110-0032/summary.json). Las trazas contienen las acciones de Playwright y las capturas están en el directorio `records/`.
- [Manifiesto](./agent-runs/web-20261110-0032/manifest.json), [auditoría de red](./agent-runs/web-20261110-0032/network-audit.json) y [huellas SHA-256 de la evidencia](./agent-runs/web-20261110-0032/sha256.txt).

## Alcance observado y pruebas pendientes

| Experimento | Verificación técnica de la suite | Evidencia que falta para la evaluación |
| --- | --- | --- |
| EC01 · M01 | A muestra el inventario. B bloquea un uso superior al stock y guarda un uso válido. | Ejecutar seis movimientos equivalentes por condición y verificar el stock final y cada registro. |
| EC02 · M02 | A muestra el módulo. B exige completar y guarda los doce registros de prueba. | Completar una jornada con la misma nómina y los mismos estados esperados en A y B, con verificación independiente de los registros. |
| EC03 · M03 | A muestra el listado. B presenta cinco tareas en la vista de prioridad. | Probar cinco conjuntos equivalentes por condición y comprobar la identificación de la tarea crítica, incluido el caso de referencia. |
| EC04 · M04 | A muestra el reporte. B muestra estado y avance y abre el reporte. | Resolver de extremo a extremo la misma consulta de obra y semana en ambos recorridos, y comprobar las respuestas. |
| EC05 · M05 | A muestra el historial. B muestra fecha y responsable de ensayo. | Resolver cinco discrepancias equivalentes por condición y contrastar origen, fecha y responsable contra datos patrón. |
| EC06 · M06/M07 | A muestra el reporte. B presenta nueve ítems de revisión y habilita la exportación. | Elaborar y exportar ambos reportes con los mismos datos, y verificar sus campos y su contenido contra una referencia. |
| EC07 · M08 | A muestra el listado. B muestra una alerta crítica y permite abrir su detalle. | Inyectar incidencias comparables en periodos alternados y medir detección y seguimiento desde su aparición. Identificar cualquier reloj acelerado como tiempo de ensayo. |
| EC09 · M10 | A abre el módulo de la primera tarea. B permite marcar un paso de la guía y conserva el progreso al recargar. | Completar la primera tarea con seis perfiles nuevos por variante y registrar los intentos y la ayuda que se observe. |

La batería usa rutas, acciones y aserciones predefinidas. El perfil determina el rol y el tamaño de pantalla. La aplicación identifica B como condición de investigación en la propia interfaz. En esta primera fase quedó pendiente el controlador del runbook que entrega al modelo el objetivo y la observación de interfaz, elige una acción en cada paso y entrega el resultado a un verificador independiente. La disponibilidad del CLI de Codex por sí sola no implementa ni valida ese circuito. Los tiempos guardados corresponden a navegación y verificaciones técnicas después del inicio de sesión.

Para cerrar la evaluación global también faltan los cortes y reconexiones de EC08 en un emulador Flutter con backend de prueba aislado y verificación de sincronización sin duplicados (M09), además de prospectos calificados efectivamente recibidos y gasto de campaña en EC10 (M11/F03). F01 y F02 requieren mediciones operativas comparables y los insumos de costo definidos en las tarjetas. Los indicadores M01–M11 y F01–F03 quedan sin estimar en esta corrida.

## Evidencia local

Los archivos de la corrida funcional están en [web-20261110-0032](./agent-runs/web-20261110-0032/). Los [intentos de infraestructura](./agent-runs/web-20261110-002820/) se conservan por separado. El sandbox impidió la primera conexión a loopback. En el intento siguiente, Chromium devolvió `ERR_NAME_NOT_RESOLVED` al abrir la pantalla de inicio de sesión, debido a una regla de bloqueo DNS aplicada también a la IP local. Se corrigió la regla para permitir `127.0.0.1`. Los registros de ese intento corresponden al fallo de configuración y quedan fuera del resultado funcional.



## Fase 2 · Piloto de navegación autónoma

### Evidencia previa y método

Se comprobaron las 189 huellas del manifiesto SHA-256 de la primera corrida. Se conservaron sus 132 capturas, ocho trazas, CSV, registros y reportes. El [colector de la primera corrida](./agent-runs/web-20261110-0032/collect-results.mjs) contrasta asignaciones, orden y roles con el plan, valida las capturas referenciadas y asocia una traza por suite. Produce el CSV y el resumen técnico con `outcome_correct` sin medir. Exige que estén presentes las suites y asignaciones completas, por lo que no sirve como verificador del piloto ni como colector de corridas parciales. Su huella coincide con la del archivo archivado.

En el piloto, Codex interpretó los objetivos y escogió acciones a partir del árbol accesible y los controles visibles. Un [controlador genérico](./agent-runs/autonomous-web-20261110/controller.mjs) aplicó cada decisión con Playwright y registró la vista anterior, la acción, la vista resultante y los errores. Para la jornada de EC02 se agruparon acciones repetitivas tras descubrir la lista y la ficha individual. El controlador registró sus pasos por separado. En las tareas cuya respuesta estaba en la pantalla inicial se registró la respuesta sin hacer clic. El inicio de sesión y el aprovisionamiento de la pantalla inicial se hicieron fuera del recorrido de decisión.

Cada tarea usó un contexto nuevo con Angular de desarrollo, el mock del navegador y cuentas ficticias. La auditoría de las 16 trazas registró únicamente `127.0.0.1:4200`. Un [verificador separado](./agent-runs/autonomous-web-20261110/verify.mjs) contrastó las respuestas y los efectos observados con el estado del mock antes y después, y con las descargas cuando correspondía.

### Resultados observados

Se ejecutó una tarea por condición para cada experimento, con 16 de 16 objetivos del piloto verificados y sin errores de acción registrados. Los tiempos son segundos transcurridos desde la apertura de la vista hasta registrar la respuesta. Incluyen la coordinación y las esperas del agente. Se intercalaron contextos y un mismo modelo condujo el piloto, por lo que los tiempos no se usan para comparar eficiencia, aprendizaje ni duración humana.

| Experimento | A (s) | B (s) | Resultado verificado en ambas condiciones | Pendiente del ensayo completo |
| --- | ---: | ---: | --- | --- |
| EC01 | 54,703 | 53,196 | Un uso guardado de 2 varillas y stock de 40 a 38 en el mock. | Seis operaciones comparables por condición y perfil. |
| EC02 | 144,400 | 98,488 | Doce registros presentes de la misma jornada, uno por trabajador. A registró fichas individuales y B guardó la lista. | Repetir con los perfiles restantes y controlar el orden y los tiempos. |
| EC03 | 27,170 | 41,268 | La tarea abierta con vencimiento más antiguo fue Armado de fierro de columnas, del 08/11/2026. | Cinco conjuntos comparables y el caso de referencia por perfil. |
| EC04 | 31,042 | 41,785 | Obra activa con 62 % de avance y reporte del 09 al 15/11/2026 consultado con rol contratante. | Cubrir los perfiles restantes con puntos de inicio controlados. |
| EC05 | 14,042 | 12,156 | Último uso del fierro de 3/8 de 60 varillas el 08/11/2026, registrado por Carlos Mendoza. | Cinco discrepancias equivalentes y el caso de referencia. |
| EC06 | 28,249 | 38,367 | Descarga de PDF en ambos flujos. Se abrieron y revisaron los archivos renderizados, incluida la obra, el periodo y sus secciones de proyecto, tareas, movimientos e incidencias. | A también genera un PDF desde el reporte existente. Sigue pendiente el contraste de consolidación manual frente a generación asistida y la validación completa de campos contra una referencia. |
| EC07 | 6,286 | 19,019 | Incidente de severidad alta, abierto, del sector Delta identificado en la lista A y en el detalle de la alerta B. | Inyección con la aplicación en uso, periodos alternados, casos adicionales y seguimiento. |
| EC09 | 26,518 | 44,246 | Primera consulta de inventario resuelta con 40 varillas. A aterrizó en Materiales y B salió de la guía mediante el menú de la obra. | Completar los grupos independientes y controlar el punto de inicio y la exposición a la guía. |

En EC07 se midió un intervalo adicional desde la marca de inyección del registro de ensayo hasta la respuesta correcta. Dio **6,292 s en A** y **19,026 s en B**. El incidente se añadió al almacenamiento de cada contexto antes de abrir su vista, porque el mock carga el estado en memoria. Los intervalos incluyen esa carga y la respuesta del agente. Se dispone de una observación por condición y no se evaluaron la recepción asíncrona, el seguimiento posterior ni una ventana de dos semanas.

Se usaron perfiles del plan. S01 condujo EC01, EC02, EC03, EC05, EC06 y EC07, C01 condujo EC04, y N01 y N02 se asignaron exclusivamente a A y B en EC09, respectivamente. Son asignaciones sintéticas del mismo modelo. En varios pares se inició B antes de terminar A y la interfaz identificaba visualmente B. Al cierre del piloto quedaban **116 recorridos de cohorte** para alcanzar las asignaciones previstas, además de los casos múltiples pendientes dentro de algunos recorridos. Los indicadores M01–M11 y F01–F03 siguen sin estimarse.

### Archivos del piloto

- [Manifiesto](./agent-runs/autonomous-web-20261110/manifest.json), [resultados CSV](./agent-runs/autonomous-web-20261110/outcomes.csv) y [verificación por tarea](./agent-runs/autonomous-web-20261110/verification.json).
- [Observaciones y decisiones](./agent-runs/autonomous-web-20261110/observations.jsonl), [respuestas y tiempos](./agent-runs/autonomous-web-20261110/completed.jsonl), [auditoría de red](./agent-runs/autonomous-web-20261110/network-audit.json) y [huellas SHA-256](./agent-runs/autonomous-web-20261110/sha256.txt).
- Cada carpeta de tarea contiene una captura inicial, una captura final, la traza ZIP y el estado del mock para la verificación. Las carpetas de EC06 también conservan el PDF descargado y su renderizado.

## Fase 3 · Cohorte autónoma

Se conservaron las 16 asignaciones del piloto y se completaron **116/116 asignaciones nuevas**, de las cuales **84 fueron correctas** según el verificador. La cobertura acumulada fue **132/132 asignaciones**. El lote dejó 0 asignaciones sin terminar. Las pruebas suplementarias de S01 se registran aparte y no se suman a 132.

Cada recorrido empezó en un contexto nuevo con el mismo proyecto ficticio de Angular de desarrollo. Codex observó el árbol accesible, eligió acciones y las envió al navegador mediante un conector local. El verificador separado contrastó los movimientos y el stock, la asistencia, las respuestas, los métodos de consolidación y los archivos. La verificación se volvió a ejecutar sobre la evidencia persistida.

Se usaron gpt-6.1-sol y, tras el límite de uso del proveedor, gpt-6-luna. Se conservaron por separado los intentos de infraestructura, incluidos el cierre prematuro de EC01 y la navegación abortada de la pestaña auxiliar de EC07. En los 53 pares con evidencia en ambos lados, 4 cambiaron de modelo entre condiciones y 4 tuvieron una huella inicial distinta por valores horarios del mock. El orden asignado se verificó en 53 de los 53 pares. La auditoría registra los perfiles afectados. Los tiempos de navegador, espera explícita e inicio del modelo quedan separados del tiempo total por recorrido.

| Experimento | A completos / previstos | A correctos | B completos / previstos | B correctos |
| --- | ---: | ---: | ---: | ---: |
| EC01 | 7/7 | 7 | 7/7 | 7 |
| EC02 | 7/7 | 7 | 7/7 | 7 |
| EC03 | 7/7 | 7 | 7/7 | 7 |
| EC04 | 7/7 | 7 | 7/7 | 7 |
| EC05 | 7/7 | 0 | 7/7 | 3 |
| EC06 | 7/7 | 2 | 7/7 | 7 |
| EC07 | 11/11 | 6 | 11/11 | 0 |
| EC09 | 5/5 | 5 | 5/5 | 5 |

Se registraron 351 respuestas de caso entre la cohorte nueva y los suplementos, con 303 correctas. Los suplementos registraron 9 recorridos y 6 correctos. Una asignación completa entregó todos los casos aunque alguna respuesta resultara incorrecta.

- EC01 ejecutó seis usos separados por asignación. EC03 presentó cinco conjuntos de fechas y estados, y EC05 cinco materiales. En EC05, varias respuestas eligieron una entrada de ladrillos más reciente en lugar del uso solicitado. Los suplementos de S01 cubrieron casos nuevos que faltaban en el piloto.
- EC06 comparó la entrega manual de un reporte estructurado con la generación asistida. Abrir el consolidado en A invalidó el método manual. El verificador reconoció como equivalente el avance escrito con o sin signo porcentual y conservó el dictamen original en los casos revisados. La comprobación de contenido de los PDF aprobó 7/7 archivos.
- EC07 usó dos periodos de ensayo por recorrido. Una pestaña separada inyectó los registros con la vista principal abierta. El mock necesita una recarga para releer su estado. Los intervalos van desde la inyección confirmada hasta el registro de la respuesta del agente. Son periodos acelerados de ensayo, sin entrega asíncrona ni seguimiento de dos semanas.
- EC09 mantuvo la asignación exclusiva por condición en los contextos de los perfiles nuevos. El modelo operó sobre una única condición en cada recorrido. El piloto previo y esta cohorte usaron puntos de partida diferentes para A.

### Indicadores observables

Las definiciones proceden de la sección 8.2.2 del informe de ArquiTech. Los siguientes cocientes describen únicamente los casos observados de esta cohorte sintética. Se excluyen el piloto y los suplementos. Los denominadores reflejan la medición disponible.

| Medida de laboratorio | A | B |
| --- | ---: | ---: |
| M01 · Operación correcta en el primer envío observable | 42/42 | 42/42 |
| M02 · Jornada intentada sin trabajadores ni estados omitidos | 7/7 | 7/7 |
| M03 · Caso de referencia correcto en 120 s | 7/7 | 7/7 |
| M05 · Responsable y fecha correctos en el caso de referencia, dentro de 120 s | 7/7 | 7/7 |
| M07 · Campos obligatorios presentes en reportes elaborados con el método asignado | 2/2 | 7/7 |
| EC07 · Detecciones verificadas dentro de 600 s / inyecciones observadas | 12/22 | 3/22 |

Las medianas de EC06 para los 2 pares correctos del mismo modelo fueron 26.999 s en A y 6.831 s en B. Las medianas de detección en periodos de ensayo fueron 8.780 s y 11.025 s. Los tiempos son descriptivos y no establecen una reducción operativa de M06 ni la tasa de notificaciones del piloto de M08.

M04 y M10 quedan sin estimar como indicadores porque no hubo medición independiente de ayuda. EC08 y EC10 quedan fuera de esta corrida web, por lo que no se calcularon M09 ni M11. F01–F03 requieren tiempos de trabajo, tarifas, costos o datos comerciales que este ensayo no obtuvo. El cambio de modelo y el alcance sintético impiden una conclusión causal o de significancia.

### Evidencia e integridad

- [CSV de asignaciones](./agent-runs/autonomous-cohort-20261110/outcomes.csv), [CSV de casos y marcas temporales](./agent-runs/autonomous-cohort-20261110/cases.csv), [CSV de suplementos](./agent-runs/autonomous-cohort-20261110/supplementary.csv) y [medidas de laboratorio](./agent-runs/autonomous-cohort-20261110/metrics.json).
- [Manifiesto](./agent-runs/autonomous-cohort-20261110/manifest.json), [auditoría de 125 trazas](./agent-runs/autonomous-cohort-20261110/audit.json), [PDF verificados](./agent-runs/autonomous-cohort-20261110/pdf-audit.json) y [SHA-256](./agent-runs/autonomous-cohort-20261110/sha256.txt). La única dirección HTTP observada fue el servidor de pruebas 127.0.0.1:4200.
- Cada carpeta de recorrido conserva las observaciones, decisiones, errores, estado del mock, capturas y traza. Los intentos de infraestructura y de cuota se mantienen en subcarpetas separadas.


# Experimentos ArquiTech - Plan de pruebas A/B automatizadas

Este directorio contiene la configuración reproducible de diez evaluaciones
A/B ejecutables sobre ArquiTech. Las variantes A/B, tareas y métricas derivan
de las Experiment Cards del Capítulo VIII y del dimensionamiento de 8.2.5.

**Método de ejecución previsto:** agentes automatizados con distintos perfiles
operativos interactúan con interfaces reales del software. El controlador debe
observar la interfaz, decidir acciones y registrar evidencias de cada recorrido.
Estas ejecuciones son pruebas reales del sistema, pero no constituyen
participación de usuarios humanos ni encuestas de usabilidad con personas.

## Configuración

- `participants/profiles.json`: perfiles de ejecución, diferenciados por rol,
  familiaridad con herramientas digitales y estrategia de navegación.
- `participants/plan.json`: tareas, métricas, condiciones A/B y asignaciones.
- `scripts/validate-plan.mjs`: comprobación estática de tamaños de grupos,
  roles, identificadores y balance A/B.

```bash
npm run experiments:validate
```

Este comando solo verifica el plan; no ejecuta navegadores ni genera resultados.

## Escalas por experimento

| ID | Recorridos previstos | Diseño |
| --- | --- | --- |
| EC01 | 8 agentes supervisores; 6 operaciones por condición | A/B intra-sujeto |
| EC02 | 8 agentes supervisores; 1 jornada de 12 trabajadores por condición | A/B intra-sujeto |
| EC03 | 8 agentes supervisores; 5 casos por condición | A/B intra-sujeto |
| EC04 | 8 agentes contratantes; 1 consulta por condición | A/B intra-sujeto |
| EC05 | 8 agentes de distintos roles; 5 discrepancias por condición | A/B intra-sujeto |
| EC06 | 8 agentes supervisores; 1 reporte por condición | A/B intra-sujeto |
| EC07 | 12 agentes; incidencias de ensayo en periodos alternados | Periodos alternados |
| EC08 | 8 agentes supervisores; 5 registros por condición | A/B y cortes de red |
| EC09 | 12 agentes nuevos; 6 en A y 6 en B | Grupos independientes |
| EC10 | 200 visitas automatizadas en A y 200 en B | Visitantes independientes |

Para EC01-EC06 y EC08 se alterna el orden de exposición para controlar
aprendizaje. EC07 mantiene seis secuencias A-B y seis B-A. EC09 asigna
independientemente seis agentes a cada variante. EC10 verifica exposición,
asignación persistente y eventos de conversión del prototipo, **no** ventas
ni solicitudes comerciales efectivamente recibidas.

## Protocolo del ejecutor

1. Entregar al agente únicamente su perfil, su rol y el objetivo de la tarea.
   No entregarle la ruta ideal, selectores exactos ni resultados esperados.
2. Tomar una observación de la interfaz antes de cada decisión; ejecutar la
   acción mediante Playwright o el controlador móvil correspondiente.
3. Guardar para cada ejecución: identificador de agente, versión A/B, commit,
   escenario, eventos, marcas de tiempo, capturas, errores, salida y criterio
   objetivo de éxito. No completar cifras antes de ejecutar.
4. Mantener sesiones aisladas y datos de prueba equivalentes en ambas versiones.
   Los registros de EC01, EC02 y EC08 solo se manipulan en entorno de ensayo.
5. No inventar intervenciones, fallos, tiempos ni solicitudes de ayuda. Las
   preferencias del perfil orientan decisiones, pero no determinan el resultado.
6. Identificar en el reporte la herramienta de ejecución automatizada. Los
   tiempos obtenidos corresponden a agentes automatizados y no pueden
   extrapolarse directamente a tiempos humanos. Cualquier costo estimado
   requiere tarifa y supuestos explícitos.
7. Cuando falten mediciones de uso humano o comerciales, registrar el indicador
   como no evaluable con esta metodología, en lugar de afirmarlo como validado.

## Estado de implementación y evidencia

- [x] Configuración de perfiles y asignaciones A/B.
- [x] Variantes B iniciales en Web, Mobile y Landing.
- [x] Playwright Web con 132 recorridos técnicos aprobados (EC01–EC07, EC09).
- [x] Playwright Landing con 200 visitas automatizadas por condición (EC10).
- [x] Flutter Mobile: verificación local de borradores, análisis y compilación aprobados (EC08).
- [x] Evidencias conservadas en GitHub Actions y consolidación de resultados técnicos.
- [ ] Controlador con decisiones de navegación autónomas de modelo; la batería actual de Playwright utiliza acciones predefinidas.
- [ ] Ensayo completo EC08 con interrupción/reconexión sobre backend de pruebas aislado.
- [ ] Métricas M01–M11 y F01–F03 contrastadas bajo escenarios equivalentes; no se derivan de aprobaciones técnicas.

**Evidencias:** [ejecución Web](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42756612966/artifacts/13735444685), [ejecución EC10](https://github.com/educmz/ArquiTech-FrontendWeb/actions/runs/42757279970/artifacts/13736537034), [validación Mobile](https://github.com/educmz/ArquiTech-FrontendMobile/actions/runs/42756103823).

**Informe técnico consolidado:** [resultados A/B del 09/11/2026](./results/2026-11-09-ab-execution-report.md).

La ejecución de las rutas A/B es una **prueba real del comportamiento del software** mediante automatización, pero no se atribuye a participantes humanos. Los KPI que no se han medido se mantienen sin conclusión, sin inferirlos a partir de tiempos de script o visitas sin conversiones comerciales.

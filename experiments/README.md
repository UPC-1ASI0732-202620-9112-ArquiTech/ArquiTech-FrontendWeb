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

## Estado de implementación

- [x] Configuración de perfiles, cohortes y asignaciones A/B.
- [x] Variantes B iniciales: Web (EC01-EC07 y EC09), Mobile (EC08) y
  Landing Page (EC10), en ramas de evaluación independientes.
- [ ] Controlador de agentes y batería de recorridos verificables.
- [ ] Ejecución integrada con evidencias por condición.
- [ ] Análisis de resultados y documentación en el informe.

**Estado de resultados:** las variantes de software están desarrolladas, pero
las pruebas A/B con agentes aún no se han ejecutado. No existen resultados
experimentales que puedan presentarse como observaciones completadas.

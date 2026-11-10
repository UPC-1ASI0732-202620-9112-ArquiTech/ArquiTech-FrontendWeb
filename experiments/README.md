# Experimentos ArquiTech - Fase 1: participantes sintéticos

Este directorio contiene la **configuración reproducible** de los participantes
sintéticos y su asignación a EC01-EC10, de acuerdo con las Experiment Cards y
8.2.5 del Project Report. No contiene resultados de experimentos ejecutados.

## Archivos

- `participants/profiles.json`: 8 perfiles de supervisor (S01-S08), 8 de
  contratante (C01-C08), 12 de primer uso (N01-N12), y plantillas de visitantes
  sintéticos para la Landing Page.
- `participants/plan.json`: diseños, tareas generales, condiciones y asignación
  contrabalanceada o por grupos independientes.
- `scripts/validate-plan.mjs`: comprueba tamaños, unicidad de IDs, roles y
  balance A/B. Ejecutar desde la raíz del frontend:

```bash
npm run experiments:validate
```

El validador **no ejecuta** navegadores, agentes de IA ni pruebas funcionales;
únicamente comprueba que los archivos de configuración sean consistentes.

## Escalas y diseño

| Experimento | Participación sintética | Diseño |
| --- | --- | --- |
| EC01 | 8 supervisores, 6 operaciones por versión | A/B intra-sujeto |
| EC02 | 8 supervisores, 1 jornada de 12 trabajadores por versión | A/B intra-sujeto |
| EC03 | 8 supervisores, 5 casos por versión | A/B intra-sujeto |
| EC04 | 8 contratantes, 1 consulta por versión | A/B intra-sujeto |
| EC05 | 8 usuarios, 5 discrepancias por versión | A/B intra-sujeto |
| EC06 | 8 supervisores, 1 reporte por versión | A/B intra-sujeto |
| EC07 | 12 usuarios, 2 periodos, incidencias simuladas | Periodos alternados |
| EC08 | 8 supervisores, 5 registros por versión | A/B intra-sujeto, cortes de red |
| EC09 | 12 usuarios nuevos, 6 en A y 6 en B | A/B grupos independientes |
| EC10 | 200 visitas sintéticas A y 200 B | A/B visitantes independientes |

Los grupos A/B de EC09 tienen tres supervisores y tres contratantes por
variante. Los experimentos intra-sujeto alternan el orden: cuatro A-B y
cuatro B-A, o seis por orden en EC07. EC10 no genera personas reales ni
evidencia de conversiones comerciales; sus visitas solo pueden verificar
funcionamiento de asignación y eventos de seguimiento.

## Contrato para el futuro ejecutor de agentes

1. El agente recibe un perfil y un objetivo general, **no** una lista de
   selectores o clics, la ruta óptima ni el valor de la respuesta correcta.
2. Un ciclo de decisión observa la interfaz actual (captura o árbol accesible),
   solicita al modelo la próxima acción y deja que Playwright, Flutter o
   el controlador correspondiente la ejecute. Se registra cada observación,
   decisión, acción, resultado y marca de tiempo.
3. Cada participante usa un contexto/sesión aislado. La variante A se fija
   a un commit de referencia antes de ejecutar; B usa el commit de ensayo.
   Los conjuntos de datos se emparejan por complejidad y se reinician para
   evitar contaminación entre ejecuciones.
4. Los perfiles representan preferencias, **no** cuotas de éxito, fallos
   forzados o tiempos artificiales. Si no hay controlador de modelo, se
   declara el bloqueo; un script determinista no puede llamarse agente de IA.
5. Las credenciales se reciben mediante variables de entorno, nunca mediante
   commits ni trazas. Usar demostración o mock aislado; no eliminar ni alterar
   información de producción.
6. Los resultados solo se generan **tras** una ejecución observada, con
   identificación del agente sintético, condición, tareas y evidencias.
   Los tiempos de IA no son tiempos humanos; los costos modelados y las
   conversiones sintéticas no equivalen a observaciones comerciales.

## Estado y siguiente fase

- [x] Fase 1: perfiles sintéticos y plan de asignación.
- [ ] Fase 2: implementar condiciones B en las ramas experimentales.
- [ ] Fase 3: controlador de agentes y pruebas de navegador/móvil/landing.
- [ ] Fase 4: ejecutar, guardar evidencias, analizar y documentar resultados.

**Estado: no se ha ejecutado ninguna de las diez pruebas.** La ejecución
con IA deberá declararse como simulación de participantes autorizada por el
docente; no se atribuirán sus resultados a usuarios humanos.

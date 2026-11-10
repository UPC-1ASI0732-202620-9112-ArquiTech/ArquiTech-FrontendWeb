# Evidencias de la evaluación A/B Web

El [informe de cierre](../2026-11-10-ab-local-execution-report.md) registra 132 recorridos autónomos ejecutados, 100 correctos y 32 incorrectos. Los 132 recorridos técnicos y los nueve suplementos tienen registros separados. La aplicación probada corresponde al commit `15a8e170b0e464de8beeb187c892d809e157faf3`.

## Inventario y almacenamiento

- [Inventario por archivo](./inventory.csv) con ruta relativa a `experiments/results/agent-runs/`, tamaño en bytes, SHA-256, destino y paquete. Contiene los 4.888 archivos de la cohorte, incluida la lista que contiene las 4.887 huellas originales, además de los archivos de las fases anteriores.
- [Verificación consolidada](./verification-cohort.jsonl) con los 116 dictámenes canónicos de la cohorte y los nueve suplementos, incluidos los casos y las revisiones del verificador. Los 16 dictámenes del piloto se conservan en [su archivo original](../agent-runs/autonomous-web-20261110/verification.json).
- [Paquetes adjuntos en GitHub](https://github.com/educmz/ArquiTech-FrontendWeb/releases/tag/evidence/web-ab-2026-11-10) y [huellas de los paquetes](./assets.csv). Contienen 1.338 archivos canónicos. Las trazas, capturas, observaciones, estados del mock y descargas se recuperan conservando sus rutas originales.
- Las filas con destino `local` identifican los **4.314 archivos de respaldo local**. Incluyen las colas, registros brutos de Codex, diagnósticos y reintentos, así como el HTML de Playwright que duplica evidencia. Se conservan bajo `experiments/results/agent-runs/` en la máquina de ejecución. Queda pendiente copiarlos a almacenamiento privado si deben conservarse fuera de esa máquina.

La [copia del informe al terminar la ejecución](./report-as-executed.md) conserva la huella registrada en el manifiesto de la cohorte. El informe de cierre agrega el inventario y la publicación para el PR.

## Verificación desde una copia de revisión

Desde la raíz del repositorio, con Node.js 24 y GitHub CLI disponibles:

```powershell
node experiments/results/evidence-review/verify-inventory.mjs git
New-Item -ItemType Directory -Force evidence-download | Out-Null
gh release download evidence/web-ab-2026-11-10 --repo educmz/ArquiTech-FrontendWeb --pattern '*.tar.gz' --dir evidence-download
node experiments/results/evidence-review/verify-inventory.mjs git evidence-download
Get-ChildItem evidence-download -Filter '*.tar.gz' | ForEach-Object {
  tar -xzf $_.FullName -C experiments/results/agent-runs
  if ($LASTEXITCODE) { throw "Error al extraer $($_.Name)" }
}
node experiments/results/evidence-review/verify-inventory.mjs release
```

El alcance `all` del verificador requiere también los archivos con destino `local`. En una copia de revisión, `git` y `release` comprueban todos los bytes publicados. La auditoría original de la cohorte validó 125 trazas con un único origen HTTP de pruebas. El HTML técnico se puede consultar en la máquina de ejecución. Las trazas publicadas se pueden abrir con `npx playwright show-trace <ruta-al-trace.zip>`.

## Reproducción

Usar una copia de trabajo separada para evitar sobrescribir evidencia. Instalar las dependencias fijadas con `npm ci` y Playwright Chromium con `npx playwright install chromium`. Ejecutar `npm run experiments:validate` para validar las asignaciones.

- **Fase técnica.** Con `AB_FULL=1`, ejecutar `node node_modules/@playwright/test/cli.js test --config experiments/results/agent-runs/web-20261110-0032/playwright.config.ts`. El servidor de pruebas se inicia en loopback. La suite registra sus capturas y resultados en `test-results/ab-web/records/`. Copiarlos al directorio `records/` de una copia de la evidencia antes de ejecutar `collect-results.mjs`.
- **Piloto.** `autonomous-web-20261110/controller.mjs` abre contextos Playwright y consume peticiones JSON por archivo en `queue/`. Las decisiones y sus observaciones están en el paquete. El controlador separa la inspección de la interfaz de la verificación posterior. Ejecutar `verify.mjs` desde una copia del paquete con sus PDF renderizados.
- **Cohorte.** Iniciar `npm run start -- --configuration development --host 127.0.0.1 --port 4200`. En otro terminal, configurar `ARQUITECH_CODEX_JS` con la ruta al lanzador `bin/codex.js` de Codex CLI autenticado y ejecutar `node experiments/results/agent-runs/autonomous-cohort-20261110/run.mjs`. Se puede elegir modelo con `ARQUITECH_MODEL`, concurrencia con `ARQUITECH_WORKERS` y asignaciones con `ARQUITECH_RUN_IDS`. Con `ARQUITECH_INCLUDE_SUPPLEMENT=1` se incluyen los casos adicionales. Los recorridos con `result.json` existente se omiten. La disponibilidad del modelo y sus decisiones pueden cambiar en una ejecución nueva.
- **Revisión posterior.** Con los paquetes extraídos en una copia desechable, `reverify.mjs`, `collect.mjs` y `metrics.mjs` reproducen los dictámenes y los resúmenes canónicos. `audit.mjs` y `hash.mjs` comprueban la evidencia completa cuando también están disponibles los archivos locales. `verify-pdfs.py` usa `pypdf` para revisar los documentos exportados.

Los recorridos usan el mock local y perfiles sintéticos. Cuatro pares cambiaron de modelo y de hora en parte de los datos iniciales. Los tiempos de laboratorio y los recuentos descriptivos se documentan separados de las métricas de negocio y de cualquier inferencia estadística.

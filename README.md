# ArquiTech · Frontend Web Application

Aplicación web de **ArquiTech** (startup Foundex) para la gestión y el seguimiento digital de obras de construcción.
Supervisores de obra registran materiales, maquinaria, personal, tareas e incidencias; los contratantes consultan
la información de sus obras y descargan el reporte semanal.

- **Diseño:** Figma de ArquiTech (Login, Proyectos, Materiales, Trabajadores, Incidentes, Maquinaria).
- **Estilos:** Style Guidelines del Project Report (sección 4.1).
- **Funcionalidad:** todas las User Stories web del Project Report (sección 3.2). La trazabilidad está en
  [`docs/user-stories-traceability.md`](docs/user-stories-traceability.md).

## Stack

| Herramienta | Versión | Uso |
| --- | --- | --- |
| Angular | 19.2 | Framework (standalone components, signals, control flow) |
| TypeScript | 5.7 | Lenguaje |
| Angular CDK | 19.2 | Diálogos, menús y overlays accesibles |
| ngx-translate | 16 | Internacionalización ES / EN |
| Lucide | 1.0 | Íconos (el mismo set usado en el Figma) |
| jsPDF + AutoTable | 4 / 5 | Reporte semanal en PDF (carga diferida) |
| Jasmine + Karma | 5 / 6 | Pruebas unitarias |

Fuentes empaquetadas con `@fontsource` (Anton, Poppins, Inter), sin depender de Google Fonts.

## Requisitos e instalación

```bash
node -v   # 18.19+ o 20+
npm install
npm start           # http://localhost:4200
npm run build       # salida en dist/arquitech/browser
npm run test:ci     # pruebas unitarias en Chrome headless
npm run format      # Prettier
```

## Cuentas de demostración

Con el mock activo (`useMockApi: true`) la pantalla de login muestra accesos rápidos:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Supervisor de obra | `supervisor@arquitech.demo` | `Supervisor2026!` |
| Contratante | `contratante@arquitech.demo` | `Contratante2026!` |
| Supervisor sin obras | `supervisora@arquitech.demo` | `Supervisor2026!` |

Los datos de ejemplo son los del Figma. Se guardan en el navegador y se restablecen desde **Mi perfil → Sesión**.

## Conexión con el backend

`src/environments/environment.ts` (producción) y `environment.development.ts` (desarrollo):

```ts
apiBaseUrl: 'https://arquitech-backend-production.up.railway.app/api/v1',
useMockApi: false,  // producción: backend real; desarrollo conserva demo con true
```

Con `useMockApi: true`, un interceptor HTTP responde en el navegador con el **mismo contrato REST** del backend
(`/api/v1/...`, JWT Bearer, códigos 400/401/403/404/409). Así el frontend funciona aunque el backend no esté
desplegado. Las diferencias entre lo que usa el frontend y lo que hoy expone el Swagger están en
[`docs/api-contract.md`](docs/api-contract.md) (insumo de la Spike Story SP-01).

## Estructura (bounded contexts)

```text
src/app/
├── iam/          HU23, HU27, HU44 · sesión JWT, guards por rol, interceptores
├── projects/     HU09, HU22, HU33 · proyectos y proyecto actual
├── inventory/    HU01–HU05, HU28–HU31, HU40, HU41, HU47, HU48 · materiales, movimientos, maquinaria
├── workforce/    HU06–HU08, HU10, HU32, HU42, HU43, HU49, HU50, HU53 · trabajadores y tareas
├── incidents/    HU35–HU37, HU39, HU51 · incidencias
├── reports/      HU20, HU52 · reporte semanal y PDF, alertas de la campana
├── profile/      HU16, HU19, HU46 · perfil, accesibilidad e idioma
└── shared/       layout (sidebar, top bar), componentes UI, utilidades, mock del API
```

Cada contexto separa `model/` (entidades del Class Dictionary, sección 4.9.2), `services/` (acceso REST),
`pages/` y `components/`. Los componentes no acceden a datos directamente (convenciones de la sección 5.1.3).

## Rutas y roles

| Ruta | Acceso |
| --- | --- |
| `/login` | Público |
| `/projects` | Supervisor (obras supervisadas) · Contratante (obras contratadas) |
| `/projects/new` | Solo Supervisor (`roleGuard`) |
| `/projects/:id/materials`, `/materials/movements`, `/workers`, `/tasks`, `/incidents`, `/machinery`, `/reports` | Usuarios asignados a la obra (`projectAccessGuard`). El Contratante ve todo en solo lectura. |
| `/profile` | Usuario autenticado |

## Despliegue (Netlify)

- **Build command:** `npm run build`
- **Publish directory:** `dist/arquitech/browser`
- `public/_redirects` ya incluye la regla SPA (`/* /index.html 200`).

## Convenciones

Nombres en inglés, `kebab-case` para archivos, sufijos `.component` / `.service`, `camelCase` / `PascalCase` /
`UPPER_SNAKE_CASE` según la sección 5.1.3 del reporte. Commits con Conventional Commits y ramas GitFlow
(`feature/*`, `release/*`, `hotfix/*`).


## Asistencia y eliminación de proyectos

- Supervisor elimina sus obras desde Proyectos, escribiendo el nombre exacto para confirmar. El borrado incluye todos los registros de esa obra, conserva usuarios y otras obras y limpia su contexto local.
- Asistencia se encuentra en la navegación de la obra: registros diarios por trabajador, cuatro estados, entrada/salida opcionales, observaciones, búsqueda y filtros de fechas/estado. Supervisor administra; Contractor solo consulta.
- Producción usa Backend real (useMockApi=false). Desarrollo conserva el demo explícito (true); el mock implementa también estos contratos y migra sus datos locales incorporando asistencia sin restablecer los registros previos.
- Los códigos DUPLICATE_ATTENDANCE, ATTENDANCE_NOT_FOUND y WORKER_HAS_ATTENDANCE se presentan en ES/EN.

Contrato y reglas: [docs/api-contract.md](docs/api-contract.md). Tests: npm run test:ci; build: npm run build.

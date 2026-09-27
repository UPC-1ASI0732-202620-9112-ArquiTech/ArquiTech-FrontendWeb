# Contrato REST: frontend vs. backend (insumo para SP-01)

Comparación entre los endpoints que consume la Frontend Web Application y los expuestos por
`arquitech-back-end` según la documentación OpenAPI del Project Report (sección 5.2.6).

Leyenda: ✅ existe en el Swagger · ⚠️ existe con otra forma · ❌ no existe todavía (el mock del frontend lo implementa).

| Uso en el frontend | Método y ruta | Estado | Historia | Acción recomendada |
| --- | --- | --- | --- | --- |
| Iniciar sesión | `POST /authentication/sign-in` | ✅ | HU23 · TS14 | Devolver `id`, `fullName`, `email`, `role`, `token`. |
| Contratantes para un proyecto | `GET /users` | ✅ | HU09 · TS33 | — |
| Proyectos del supervisor | `GET /projects/supervisor/{userId}` | ✅ | HU22 · TS13 | — |
| Proyectos del contratante | `GET /projects` + filtro por `contractorId` | ⚠️ | HU33 · TS13 | Exponer `GET /projects/contractor/{userId}` para no enviar obras ajenas al cliente. |
| Registrar proyecto | `POST /projects` | ✅ | HU09 · TS09 | Incluir `location`, `supervisorId`, `contractorId`, `progress`. |
| Materiales de una obra | `GET /materials/project/{projectId}` | ✅ | HU28, HU40 · TS24 | — |
| Registrar material | `POST /materials` | ✅ | HU01 · TS01 | Registrar la cantidad inicial como primer movimiento de entrada. |
| Actualizar material | `PUT /materials/{id}` | ✅ | HU29 · TS25 | — |
| Eliminar material | `DELETE /materials/{id}` | ❌ | HU47 · TS34 | Implementar. |
| Entrada de material | `POST /materials/{id}/entry` | ❌ | HU01 · TS01 | Implementar (hoy solo existe `use`). |
| Salida de material | `POST /materials/{id}/use` | ✅ | HU02 · TS02, TS03 | Responder `400` con `code: INSUFFICIENT_STOCK`. |
| Historial de la obra | `GET /materials/project/{projectId}/history` | ⚠️ | HU04 · TS04 | Hoy existe solo por material: `/history/{materialName}`. Agregar el historial completo. |
| Maquinaria | `GET/POST /machinery`, `PUT/DELETE /machinery/{id}` | ✅ | HU05, HU30, HU31, HU41, HU48 | Aceptar `?projectId=` (el frontend filtra igual por seguridad). |
| Trabajadores | `GET/POST /workers`, `PUT/DELETE /workers/{workerId}` | ✅ | HU06, HU10, HU32, HU42, HU49 | Aceptar `?projectId=`. |
| Tareas | `GET/POST /tasks`, `PUT/DELETE /tasks/{taskId}` | ✅ | HU07, HU08, HU43, HU50, HU53 | Guardar `completedAt` al completar (lo usa el reporte semanal). |
| Incidencias | `GET /incidents/project/{projectId}`, `POST /incidents`, `PUT/DELETE /incidents/{id}` | ✅ | HU35–HU37, HU39, HU51 | — |
| Perfil | — | ❌ | HU16 · SP-03 | Hoy se guarda en el navegador; evaluar `PUT /users/{id}` (SP-03). |

## Reglas de seguridad esperadas (SP-02)

- Sin token o con token inválido → `401` (TS20). El frontend cierra la sesión y pide iniciar sesión otra vez.
- Contratante en `POST`, `PUT` o `DELETE` → `403` (TS15). El frontend además oculta esas acciones y bloquea
  `/projects/new` con `roleGuard` (TS21).
- Acceso a una obra no asignada → `403`. El frontend lo bloquea con `projectAccessGuard`.

## Formato de errores

El frontend traduce el campo `code` del cuerpo de error cuando existe:
`INSUFFICIENT_STOCK`, `INVALID_CREDENTIALS`, `DUPLICATED_SERIAL_NUMBER`, `WORKER_NOT_FOUND`,
`INVALID_CONTRACTOR`, `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`. Sin `code`, usa el código HTTP.

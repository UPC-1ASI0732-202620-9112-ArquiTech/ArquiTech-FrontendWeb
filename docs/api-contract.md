# Contrato REST Web y Backend actual

Prefijo /api/v1. Producción llama a la API real; el modo demo es explícito en environment.development.ts. Scope por proyecto y permisos son autoridad Backend. No se solicita GET Project individual ni endpoints de asistencia antes de que existan: esta entrega los incorpora primero al servidor.

| Feature | Operaciones existentes |
|---|---|
| Auth | POST /authentication/sign-in, POST /authentication/sign-up |
| Users | GET /users (Supervisor), GET /users/{id} con permisos del servidor |
| Projects | GET/POST /projects, GET /projects/supervisor/{userId}, DELETE /projects/{id} |
| Materials | GET /materials/project/{projectId}, POST /materials, PUT/DELETE /materials/{id} |
| Movements | POST /materials/{id}/entry, POST /materials/{id}/use, GET /materials/project/{projectId}/history |
| Machinery | GET/POST /machinery, GET/PUT/DELETE /machinery/{id}; filtro projectId |
| Workers | GET/POST /workers, GET/PUT/DELETE /workers/{id}; filtro projectId |
| Tasks | GET/POST /tasks, PUT/DELETE /tasks/{id}; filtro projectId |
| Incidents | GET /incidents/project/{projectId}, POST /incidents, PUT/DELETE /incidents/{id} |
| Attendance | GET/POST /attendance, PUT/DELETE /attendance/{id}; projectId requerido, date opcional en GET |

GET /projects filtra por el usuario autenticado en el servidor. No hace falta endpoint de contratante adicional. No existen GET /tasks/{id}, actualización REST de Profile, Reports ni Notifications. Perfil/preferencias y reportes/alertas agregados mantienen sus operaciones locales. JWT sigue usando la sesión existente.

Sin sesión: 401; escritura Contractor u obra ajena: 403; campos inválidos: 400; recursos inexistentes: 404; conflictos: 409. JSON camelCase. LocalDate YYYY-MM-DD e instantes ISO UTC. Creación 201, actualización 200, borrado 204.

## Asistencia y eliminación de proyectos (4 de octubre de 2026)

Todas las rutas tienen prefijo /api/v1 y requieren JWT. Supervisor escribe únicamente en sus obras; Contractor consulta las obras donde está asignado. Backend aplica permisos y scope, independientemente de la UI.

| Método | Endpoint | Supervisor | Contractor | Request | Response |
|---|---|---|---|---|---|
| DELETE | /projects/{id} | Propietario | No (403) | Sin body | 204 |
| GET | /attendance?projectId=X&date=YYYY-MM-DD | Leer | Leer | projectId requerido; date opcional | 200: AttendanceResource[] |
| POST | /attendance | Crear | No (403) | projectId, workerId, attendanceDate, status, checkInAt opcional, checkOutAt opcional, notes opcional | 201: AttendanceResource |
| PUT | /attendance/{id} | Editar | No (403) | workerId, attendanceDate, status, checkInAt opcional, checkOutAt opcional, notes opcional | 200: AttendanceResource |
| DELETE | /attendance/{id} | Eliminar | No (403) | Sin body | 204 |

AttendanceResource: id, projectId, workerId, workerName, attendanceDate, status, checkInAt, checkOutAt, notes, registeredByUserId, createdAt, updatedAt.

- Estados: PRESENT, ABSENT, LATE, EXCUSED (presente, ausente, tardanza, justificado).
- attendanceDate es la fecha de la jornada, YYYY-MM-DD. Los instantes de entrada y salida son ISO-8601 UTC; Web y Mobile presentan la hora local y permiten turnos que cruzan medianoche.
- Un solo registro por trabajador/fecha, protegido por constraint de base de datos. Duplicados devuelven 409 DUPLICATE_ATTENDANCE.
- La salida requiere entrada y no puede precederla. ABSENT y EXCUSED no admiten horas. Notes tiene máximo 1000 caracteres.
- El trabajador debe pertenecer a la obra; la fecha no puede preceder su contratación. No se crean registros nuevos para INACTIVE, pero puede corregirse su historial existente.
- No se envían registeredByUserId, workerName, createdAt ni updatedAt: son administrados por el servidor. PUT no admite cambio de projectId.
- Eliminar un trabajador con asistencia devuelve 409 WORKER_HAS_ATTENDANCE; puede marcarse INACTIVE para preservar su historial.
- La eliminación del proyecto elimina asistencia, tareas, trabajadores, movimientos/materiales, maquinaria e incidentes de esa obra; conserva usuarios y otras obras. Todo ocurre en una transacción y se revierte completamente si falla un paso.
- Ambas interfaces requieren escribir el nombre exacto de la obra para confirmar su borrado. El contexto local de esa obra se limpia tras el éxito.
- Las escrituras bloquean el proyecto antes de modificar sus recursos para evitar datos huérfanos durante una eliminación simultánea. Materiales bloquea proyecto antes de material.

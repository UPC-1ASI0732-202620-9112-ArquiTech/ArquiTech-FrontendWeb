# QA: asistencia y eliminación de proyectos

Se conservan los tests existentes. Se agregan pruebas de estados y parsing, solicitudes exactas/UTC, validación de horas, HTTP projectId/date, DELETE 204, Supervisor/Contractor, confirmación por nombre y rechazo 403 sin limpiar contexto. El modo demo prueba duplicados, permisos, historial de trabajador y cascada limitada a la obra.

Comandos: npm ci, npm run build y npm run test:ci (Chrome headless). Los tests usan HttpTestingController y el mock explícito; no realizan operaciones sobre producción.

Para QA manual con API real: usar una obra de pruebas; registrar asistencia y duplicarla, revisar historial, editar y borrar un registro; comprobar Contractor read-only. Eliminar la obra desde Proyectos escribiendo su nombre, comprobar desaparición de sus recursos y que otras obras y usuarios se conserven.

Resultado final: npm run build aprobado y 39 tests aprobados en Chrome headless; git diff --check sin errores.

# Trazabilidad: User Stories → Frontend Web Application

Cada historia web del Project Report (sección 3.2) con la pantalla que la cubre y cómo se cumplen sus criterios
de aceptación. "E2E" = verificado en el recorrido automatizado con Playwright; "UT" = prueba unitaria (Jasmine).

## EP01 · Gestión de inventarios y materiales

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU01 | Registrar entrada de materiales | Materiales → "Registrar entrada" / menú de fila | Suma al stock y a la cantidad, crea el movimiento | Cantidad ≤ 0, RUC inválido o datos incompletos se rechazan; el stock no cambia | E2E |
| HU02 | Registrar uso o salida | Materiales → "Registrar salida" | Descuenta el stock y registra la salida | Cantidad mayor al stock se bloquea en el formulario y en el API (`INSUFFICIENT_STOCK`) | E2E · UT |
| HU04 | Historial de movimientos | Materiales → pestaña "Movimientos" | Entradas y salidas con fecha, cantidad, proveedor y usuario; filtros por tipo, material y fechas | Sin movimientos: mensaje informativo | E2E |
| HU05 | Registrar maquinaria | Maquinaria → "Añadir maquinaria" | Se guarda asociada a la obra | Datos inválidos o placa repetida se rechazan | E2E |
| HU28 | Consultar materiales | Materiales (tabla del Figma) | Lista con cantidad, stock, precio, unidad, proveedor, RUC y fecha; alerta de stock bajo | Obra sin materiales: estado vacío | E2E |
| HU29 | Actualizar material | Menú de fila → Editar | Actualiza nombre, unidad, precio, mínimo, proveedor y RUC | Datos inválidos o material inexistente se rechazan | E2E |
| HU30 | Consultar maquinaria | Maquinaria (tabla del Figma) | Nombre, placa, fecha de registro y estado | Estado vacío | E2E |
| HU31 | Actualizar maquinaria | Menú de fila → Editar | Actualiza datos y estado operativo | Datos inválidos / inexistente se rechazan | E2E |
| HU40 | Contratante consulta materiales | Materiales (solo lectura) | Ve el inventario y el historial | Estado vacío | E2E |
| HU41 | Contratante consulta maquinaria | Maquinaria (solo lectura) | Ve la maquinaria de la obra | Estado vacío | E2E |
| HU47 | Eliminar material | Menú de fila → Eliminar (con confirmación) | Elimina el material | Si ya no existe: aviso y la lista se actualiza | E2E · UT |
| HU48 | Eliminar maquinaria | Menú de fila → Eliminar | Elimina el registro | Inexistente: aviso, sin cambios | E2E |

## EP02 · Gestión de trabajadores y tareas

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU06 | Registrar trabajadores | Trabajadores → "Añadir trabajador" | Se guarda asociado a la obra | Nombre o rol vacíos se rechazan | E2E |
| HU07 | Asignar tareas | Tareas → "Asignar tarea" o menú del trabajador | Crea la tarea con responsable y fecha límite | Sin trabajador válido se rechaza (`WORKER_NOT_FOUND` en el API) | E2E |
| HU08 | Consultar tareas | Tareas | Título, responsable, fecha límite, estado y marca "Vencida" | Estado vacío | E2E · UT |
| HU10 | Consultar trabajadores | Trabajadores (tabla del Figma) | Nombre, rol, especialidad, ingreso y estado | Estado vacío | E2E |
| HU32 | Actualizar trabajador | Menú de fila → Editar | Modifica los datos | Datos inválidos se rechazan | E2E |
| HU42 | Contratante consulta trabajadores | Trabajadores (solo lectura) | Ve el personal | Estado vacío | E2E |
| HU43 | Contratante consulta tareas | Tareas (solo lectura) | Ve tareas y estado | Estado vacío | E2E |
| HU49 | Eliminar trabajador | Menú de fila → Eliminar | Elimina el registro | Inexistente: aviso | E2E |
| HU50 | Eliminar tarea | Menú de fila → Eliminar | Elimina la tarea | Inexistente: aviso | E2E |
| HU53 | Actualizar tarea | Menú de fila → Editar / "Marcar como completada" | Cambia datos y estado; guarda fecha de cierre | Datos inválidos se rechazan | E2E |

## EP03 · Gestión de proyectos

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU09 | Registrar proyecto | Proyectos → "Nuevo proyecto" (`/projects/new`, solo Supervisor) | Guarda la obra con supervisor y contratante | Campos vacíos, fecha fin < inicio o contratante inválido se rechazan | E2E |
| HU22 | Proyectos bajo supervisión | Proyectos (Supervisor) | Lista `GET /projects/supervisor/{id}` | "No tienes proyectos registrados" | E2E |
| HU33 | Proyectos contratados | Proyectos (Contratante) | Solo sus obras | Mensaje sin proyectos | E2E · UT |

## EP05 · Perfil, preferencias y accesibilidad

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU16 | Actualizar perfil | Mi perfil → Información personal | Guarda nombre, teléfono y empresa; se refleja en la barra superior | Se recupera al recargar o volver a iniciar sesión en el mismo navegador | E2E |
| HU19 | Preferencias de accesibilidad | Mi perfil → Accesibilidad | Tamaño de texto, alto contraste y reducir animaciones se aplican al instante | Se mantienen al recargar | E2E |
| HU46 | Cambiar idioma | Sidebar (ES/EN), login y Mi perfil | Toda la interfaz, fechas y el PDF cambian de idioma | Se mantiene al navegar y recargar | E2E |

## EP06 · Incidencias y reportes

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU20 | Reporte semanal | Reporte semanal | Avance, tareas completadas, entradas, salidas e incidencias de la semana | Categorías sin registros se muestran vacías sin bloquear el reporte | E2E · UT |
| HU35 | Registrar incidencia | Incidentes → "Registrar incidencia" | Tipo, severidad, descripción, fecha y estado | Datos incompletos se rechazan | E2E |
| HU36 | Actualizar incidencia | Menú de fila → Editar / "Marcar como resuelta" | Cambia datos, severidad y estado; guarda fecha de resolución | Datos inválidos se rechazan | E2E |
| HU37 | Consultar incidencias | Incidentes (tabla del Figma) | Fecha, tipo, severidad y estado; filtros | Estado vacío | E2E |
| HU39 | Contratante consulta incidencias | Incidentes (solo lectura) | Ve las incidencias | Estado vacío | E2E |
| HU51 | Eliminar incidencia | Menú de fila → Eliminar | Elimina el registro | Inexistente: aviso | E2E · UT |
| HU52 | Descargar reporte semanal | Reporte semanal → "Descargar PDF" | Genera un PDF con todo el reporte | Formato portable (PDF) con marca ArquiTech | E2E |

## EP07 · Autenticación y seguridad

| ID | Historia | Dónde | AC1 | AC2 | Verificado |
| --- | --- | --- | --- | --- | --- |
| HU23 | Iniciar sesión | Login (Figma) | Credenciales válidas → sesión con JWT | Credenciales inválidas → mensaje, sin sesión | E2E · UT |
| HU27 | Acceso según rol | Guards y vistas por rol | Supervisor gestiona; Contratante consulta | Rutas de escritura y obras ajenas → "Acceso restringido"; el API responde 403 | E2E · UT |
| HU44 | Cerrar sesión | Menú de usuario y Mi perfil | Borra token y datos de sesión | Rutas protegidas vuelven a pedir login | E2E · UT |

## Technical Stories del frontend

| ID | Implementación |
| --- | --- |
| TS16 | `AuthenticationService` + `authTokenInterceptor`: guarda el JWT y lo envía como `Bearer` en cada petición al API. Una respuesta sin token no crea sesión. |
| TS17 | `SessionService`: sesión con signals, persistida en el navegador, validación de expiración del JWT y limpieza al cerrar sesión o ante un 401. |
| TS21 | `authGuard`, `roleGuard` (`data.roles`) y `projectAccessGuard`; acciones de escritura ocultas para el Contratante. |
| TS03 | Validación de stock en el formulario de salida (además del rechazo del API). |

## Fuera de alcance del frontend web

- **HU11, HU12, HU13, HU34** pertenecen a la Landing Page (otro componente). Para HU34, la aplicación ofrece `/login`
  como punto de entrada que la Landing puede enlazar.
- **Technical Stories de backend** (TS01–TS39 salvo las anteriores): el frontend consume ese contrato REST; las
  diferencias están en [`api-contract.md`](api-contract.md).

import { AttendanceResource } from '../../../workforce/model/attendance.entity';
import { IncidentResource } from '../../../incidents/model/incident.entity';
import { MachineryResource } from '../../../inventory/model/machinery.entity';
import { MaterialMovementResource } from '../../../inventory/model/material-movement.entity';
import { MaterialResource } from '../../../inventory/model/material.entity';
import { UserResource } from '../../../iam/model/user.entity';
import { ProjectResource } from '../../../projects/model/project.entity';
import { TaskResource } from '../../../workforce/model/task.entity';
import { WorkerResource } from '../../../workforce/model/worker.entity';
import { toIsoDate } from '../../utils/date.utils';

/** User record stored by the mock only. A real backend keeps a password hash (class `User`). */
export interface MockUserRecord extends UserResource {
  password: string;
}

export interface MockDatabaseState {
  version: number;
  sequence: number;
  users: MockUserRecord[];
  projects: ProjectResource[];
  materials: MaterialResource[];
  movements: MaterialMovementResource[];
  machinery: MachineryResource[];
  workers: WorkerResource[];
  tasks: TaskResource[];
  incidents: IncidentResource[];
  attendance: AttendanceResource[];
}

export const MOCK_DATABASE_VERSION = 1;

/** Demo credentials shown on the sign-in page while the mock API is enabled. */
export const DEMO_ACCOUNTS = [
  { email: 'supervisor@arquitech.demo', password: 'Supervisor2026!', roleKey: 'roles.SUPERVISOR' },
  { email: 'contratante@arquitech.demo', password: 'Contratante2026!', roleKey: 'roles.CONTRACTOR' },
] as const;

/** Seed data taken from the Figma screens, with dates relative to today so the weekly report has content. */
export function createSeedState(now: Date = new Date()): MockDatabaseState {
  const at = (daysAgo: number, hour = 9): string => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(daysAgo === 0 ? Math.min(hour, now.getHours()) : hour, 0, 0, 0);
    return date.toISOString();
  };
  const day = (daysAgo: number): string => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return toIsoDate(date);
  };

  const users: MockUserRecord[] = [
    {
      id: 1,
      fullName: 'Carlos Mendoza',
      email: 'supervisor@arquitech.demo',
      role: 'SUPERVISOR',
      phone: '+51 987 654 321',
      password: 'Supervisor2026!',
      createdAt: '2025-03-02T10:00:00.000Z',
    },
    {
      id: 2,
      fullName: 'María Salazar',
      email: 'contratante@arquitech.demo',
      role: 'CONTRACTOR',
      phone: '+51 976 543 210',
      password: 'Contratante2026!',
      createdAt: '2025-03-10T10:00:00.000Z',
    },
    {
      id: 3,
      fullName: 'Jorge Paredes',
      email: 'jorge.paredes@arquitech.demo',
      role: 'CONTRACTOR',
      phone: '',
      password: 'Contratante2026!',
      createdAt: '2025-04-01T10:00:00.000Z',
    },
    {
      id: 4,
      fullName: 'Lucía Fernández',
      email: 'supervisora@arquitech.demo',
      role: 'SUPERVISOR',
      phone: '',
      password: 'Supervisor2026!',
      createdAt: '2025-08-20T10:00:00.000Z',
    },
  ];

  const projects: ProjectResource[] = [
    {
      id: 1,
      name: 'Torre Residencial Norte',
      location: 'Miraflores',
      startDate: '2025-06-08',
      endDate: '2026-12-15',
      budget: 4850000,
      status: 'ACTIVE',
      progress: 62,
      supervisorId: 1,
      contractorId: 2,
      createdAt: '2025-06-01T10:00:00.000Z',
    },
    {
      id: 2,
      name: 'Renovación de Oficinas',
      location: 'San Isidro',
      startDate: '2025-05-09',
      endDate: '2026-11-30',
      budget: 780000,
      status: 'PENDING',
      progress: 15,
      supervisorId: 1,
      contractorId: 3,
      createdAt: '2025-05-02T10:00:00.000Z',
    },
    {
      id: 3,
      name: 'Centro Logístico Sur',
      location: 'Lurín',
      startDate: '2025-04-22',
      endDate: '2027-03-31',
      budget: 12300000,
      status: 'ACTIVE',
      progress: 38,
      supervisorId: 1,
      contractorId: 2,
      createdAt: '2025-04-15T10:00:00.000Z',
    },
  ];

  const materialSeeds: Array<Omit<MaterialResource, 'quantity' | 'stock' | 'date'>> = [
    {
      id: 1,
      projectId: 1,
      name: 'Cemento',
      unit: 'kg',
      minimumStock: 100,
      unitPrice: 25.6,
      provider: 'Constructora Lima',
      providerRuc: '20100124567',
    },
    {
      id: 2,
      projectId: 1,
      name: 'Ladrillos',
      unit: 'unidad',
      minimumStock: 2000,
      unitPrice: 0.5,
      provider: 'Ladrillera Sol',
      providerRuc: '20390724678',
    },
    {
      id: 3,
      projectId: 1,
      name: 'Pintura',
      unit: 'litro',
      minimumStock: 10,
      unitPrice: 30,
      provider: 'Pinturas Sur',
      providerRuc: '20109124569',
    },
    {
      id: 4,
      projectId: 1,
      name: 'Fierro corrugado 3/8"',
      unit: 'varilla',
      minimumStock: 120,
      unitPrice: 32.9,
      provider: 'Aceros del Pacífico',
      providerRuc: '20512345671',
    },
    {
      id: 5,
      projectId: 1,
      name: 'Arena gruesa',
      unit: 'm³',
      minimumStock: 10,
      unitPrice: 65,
      provider: 'Agregados Lurín',
      providerRuc: '20601234561',
    },
    {
      id: 6,
      projectId: 3,
      name: 'Cemento',
      unit: 'bolsa',
      minimumStock: 150,
      unitPrice: 28.4,
      provider: 'Constructora Lima',
      providerRuc: '20100124567',
    },
    {
      id: 7,
      projectId: 3,
      name: 'Piedra chancada',
      unit: 'm³',
      minimumStock: 15,
      unitPrice: 78,
      provider: 'Agregados Lurín',
      providerRuc: '20601234561',
    },
    {
      id: 8,
      projectId: 2,
      name: 'Placas de drywall',
      unit: 'plancha',
      minimumStock: 50,
      unitPrice: 38.5,
      provider: 'Distribuidora Andina',
      providerRuc: '20456789012',
    },
    {
      id: 9,
      projectId: 2,
      name: 'Pintura látex',
      unit: 'galón',
      minimumStock: 20,
      unitPrice: 54.9,
      provider: 'Pinturas Sur',
      providerRuc: '20109124569',
    },
  ];

  const movementSeeds: Array<
    [materialId: number, type: 'ENTRY' | 'USAGE', quantity: number, daysAgo: number, hour: number]
  > = [
    [1, 'ENTRY', 500, 40, 8],
    [1, 'USAGE', 50, 0, 9],
    [2, 'ENTRY', 9000, 45, 8],
    [2, 'USAGE', 1500, 10, 11],
    [2, 'ENTRY', 1000, 0, 8],
    [3, 'ENTRY', 50, 20, 10],
    [3, 'USAGE', 5, 1, 15],
    [4, 'ENTRY', 200, 30, 9],
    [4, 'USAGE', 100, 8, 10],
    [4, 'USAGE', 60, 2, 14],
    [5, 'ENTRY', 30, 15, 9],
    [5, 'USAGE', 12, 6, 12],
    [6, 'ENTRY', 800, 50, 8],
    [6, 'USAGE', 180, 3, 10],
    [7, 'ENTRY', 60, 25, 9],
    [7, 'USAGE', 18, 4, 11],
    [8, 'ENTRY', 300, 12, 9],
    [8, 'USAGE', 90, 1, 10],
    [9, 'ENTRY', 80, 9, 9],
    [9, 'USAGE', 16, 0, 8],
  ];

  let movementId = 1;
  const movements: MaterialMovementResource[] = movementSeeds.map(([materialId, type, quantity, daysAgo, hour]) => {
    const material = materialSeeds.find((seed) => seed.id === materialId)!;
    return {
      id: movementId++,
      materialId,
      projectId: material.projectId,
      materialName: material.name,
      unit: material.unit,
      type,
      quantity,
      supplier: type === 'ENTRY' ? material.provider : '',
      registeredByUserId: 1,
      registeredByName: 'Carlos Mendoza',
      occurredAt: at(daysAgo, hour),
      note: '',
    };
  });

  // Quantity, stock and last update are derived from the movements so the seed is always consistent.
  const materials: MaterialResource[] = materialSeeds.map((seed) => {
    const own = movements.filter((movement) => movement.materialId === seed.id);
    const entries = own.filter((movement) => movement.type === 'ENTRY').reduce((sum, m) => sum + m.quantity, 0);
    const usages = own.filter((movement) => movement.type === 'USAGE').reduce((sum, m) => sum + m.quantity, 0);
    const lastUpdate = own
      .map((movement) => movement.occurredAt)
      .sort()
      .at(-1)!;
    return { ...seed, quantity: entries, stock: entries - usages, date: lastUpdate.slice(0, 10) };
  });

  const machinery: MachineryResource[] = [
    {
      id: 1,
      projectId: 1,
      name: 'Mezcladora',
      serialNumber: 'MIX123',
      status: 'OPERATIONAL',
      registeredAt: '2025-06-08',
      description: 'Mezcladora de concreto de 9 p³.',
    },
    {
      id: 2,
      projectId: 1,
      name: 'Bulldozer',
      serialNumber: 'BX202',
      status: 'OPERATIONAL',
      registeredAt: '2025-05-03',
      description: 'Tractor de oruga para movimiento de tierras.',
    },
    {
      id: 3,
      projectId: 1,
      name: 'Grúa torre',
      serialNumber: 'GR118',
      status: 'MAINTENANCE',
      registeredAt: '2025-04-21',
      description: 'Mantenimiento preventivo del sistema de izaje.',
    },
    {
      id: 4,
      projectId: 3,
      name: 'Retroexcavadora',
      serialNumber: 'RX310',
      status: 'OPERATIONAL',
      registeredAt: '2025-05-15',
      description: 'Excavación de zanjas y cimentaciones.',
    },
    {
      id: 5,
      projectId: 3,
      name: 'Rodillo compactador',
      serialNumber: 'RC044',
      status: 'OUT_OF_SERVICE',
      registeredAt: '2025-07-02',
      description: 'En espera de repuesto del sistema hidráulico.',
    },
    {
      id: 6,
      projectId: 2,
      name: 'Andamio eléctrico',
      serialNumber: 'AE021',
      status: 'OPERATIONAL',
      registeredAt: '2025-06-01',
      description: 'Plataforma de trabajo en fachada.',
    },
  ];

  const workers: WorkerResource[] = [
    {
      id: 1,
      projectId: 1,
      fullName: 'Juan Pérez',
      role: 'Capataz',
      specialty: 'Estructuras',
      hireDate: '2025-06-10',
      status: 'ACTIVE',
    },
    {
      id: 2,
      projectId: 1,
      fullName: 'Ana López',
      role: 'Operadora',
      specialty: 'Grúa torre',
      hireDate: '2025-06-12',
      status: 'ACTIVE',
    },
    {
      id: 3,
      projectId: 1,
      fullName: 'Luis Ramos',
      role: 'Electricista',
      specialty: 'Instalaciones eléctricas',
      hireDate: '2025-07-01',
      status: 'ON_LEAVE',
    },
    {
      id: 4,
      projectId: 1,
      fullName: 'Rosa Quispe',
      role: 'Albañil',
      specialty: 'Tarrajeo y acabados',
      hireDate: '2025-06-15',
      status: 'ACTIVE',
    },
    {
      id: 5,
      projectId: 1,
      fullName: 'Pedro Huamán',
      role: 'Operario',
      specialty: 'Encofrado',
      hireDate: '2025-08-04',
      status: 'ACTIVE',
    },
    {
      id: 6,
      projectId: 3,
      fullName: 'Miguel Torres',
      role: 'Operador',
      specialty: 'Maquinaria pesada',
      hireDate: '2025-04-25',
      status: 'ACTIVE',
    },
    {
      id: 7,
      projectId: 3,
      fullName: 'Carmen Díaz',
      role: 'Topógrafa',
      specialty: 'Topografía',
      hireDate: '2025-04-28',
      status: 'ACTIVE',
    },
    {
      id: 8,
      projectId: 2,
      fullName: 'Jorge Villanueva',
      role: 'Maestro de obra',
      specialty: 'Acabados',
      hireDate: '2025-05-12',
      status: 'ACTIVE',
    },
  ];

  const tasks: TaskResource[] = [
    {
      id: 1,
      projectId: 1,
      workerId: 1,
      title: 'Vaciado de losa del piso 7',
      description: 'Coordinar mixer y bomba de concreto; verificar curado.',
      status: 'IN_PROGRESS',
      dueDate: day(-3),
      createdAt: at(6),
      completedAt: null,
    },
    {
      id: 2,
      projectId: 1,
      workerId: 3,
      title: 'Instalación de tableros eléctricos',
      description: 'Tableros de distribución de los pisos 3 al 5.',
      status: 'PENDING',
      dueDate: day(-10),
      createdAt: at(4),
      completedAt: null,
    },
    {
      id: 3,
      projectId: 1,
      workerId: 2,
      title: 'Izaje de encofrados metálicos',
      description: 'Traslado de encofrados del piso 6 al piso 7.',
      status: 'COMPLETED',
      dueDate: day(1),
      createdAt: at(9),
      completedAt: at(1, 16),
    },
    {
      id: 4,
      projectId: 1,
      workerId: 4,
      title: 'Tarrajeo de muros del piso 5',
      description: 'Muros interiores de los departamentos 501 a 504.',
      status: 'COMPLETED',
      dueDate: day(0),
      createdAt: at(7),
      completedAt: at(0, 8),
    },
    {
      id: 5,
      projectId: 1,
      workerId: 5,
      title: 'Armado de fierro de columnas',
      description: 'Columnas C-1 a C-8 del piso 8.',
      status: 'PENDING',
      dueDate: day(2),
      createdAt: at(10),
      completedAt: null,
    },
    {
      id: 6,
      projectId: 3,
      workerId: 6,
      title: 'Nivelación de terreno zona B',
      description: 'Nivelar y compactar la plataforma del almacén B.',
      status: 'IN_PROGRESS',
      dueDate: day(-5),
      createdAt: at(5),
      completedAt: null,
    },
    {
      id: 7,
      projectId: 3,
      workerId: 7,
      title: 'Levantamiento topográfico',
      description: 'Replanteo de ejes del bloque administrativo.',
      status: 'COMPLETED',
      dueDate: day(3),
      createdAt: at(12),
      completedAt: at(3, 15),
    },
    {
      id: 8,
      projectId: 2,
      workerId: 8,
      title: 'Instalación de tabiquería drywall',
      description: 'Oficinas del piso 12, ala este.',
      status: 'IN_PROGRESS',
      dueDate: day(-7),
      createdAt: at(3),
      completedAt: null,
    },
  ];

  const incidents: IncidentResource[] = [
    {
      id: 1,
      projectId: 1,
      reportedByUserId: 1,
      type: 'MATERIAL_SHORTAGE',
      description: 'Stock de fierro corrugado 3/8" por debajo del mínimo para el armado de columnas.',
      severity: 'HIGH',
      status: 'OPEN',
      reportedAt: at(1, 11),
      resolvedAt: null,
    },
    {
      id: 2,
      projectId: 1,
      reportedByUserId: 1,
      type: 'DELIVERY_DELAY',
      description: 'El proveedor de ladrillos reprogramó la entrega dos días.',
      severity: 'MEDIUM',
      status: 'IN_REVIEW',
      reportedAt: at(8, 10),
      resolvedAt: null,
    },
    {
      id: 3,
      projectId: 1,
      reportedByUserId: 1,
      type: 'EQUIPMENT_FAILURE',
      description: 'Falla eléctrica menor en la mezcladora MIX123.',
      severity: 'LOW',
      status: 'RESOLVED',
      reportedAt: at(20, 9),
      resolvedAt: at(18, 17),
    },
    {
      id: 4,
      projectId: 3,
      reportedByUserId: 1,
      type: 'UNSAFE_CONDITION',
      description: 'Zanja sin señalización en el acceso norte.',
      severity: 'MEDIUM',
      status: 'OPEN',
      reportedAt: at(2, 9),
      resolvedAt: null,
    },
    {
      id: 5,
      projectId: 2,
      reportedByUserId: 1,
      type: 'WORK_ACCIDENT',
      description: 'Corte leve en la mano de un operario; atendido en tópico.',
      severity: 'LOW',
      status: 'RESOLVED',
      reportedAt: at(5, 15),
      resolvedAt: at(4, 9),
    },
  ];

  return {
    version: MOCK_DATABASE_VERSION,
    sequence: 100,
    users,
    projects,
    materials,
    movements,
    machinery,
    workers,
    tasks,
    incidents,
    attendance: [],
  };
}

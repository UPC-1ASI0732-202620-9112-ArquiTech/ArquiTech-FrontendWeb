import { Task, TaskStatus } from './task.entity';

describe('Task', () => {
  const base = {
    id: 1,
    projectId: 1,
    workerId: 1,
    title: 'Vaciado de losa',
    description: '',
    status: TaskStatus.Pending,
    dueDate: '2026-09-20',
    createdAt: '2026-09-10T10:00:00.000Z',
  };
  const today = new Date(2026, 8, 24);

  it('is overdue when the due date passed and it is not completed', () => {
    expect(new Task(base).isOverdue(today)).toBeTrue();
    expect(new Task({ ...base, status: TaskStatus.Completed }).isOverdue(today)).toBeFalse();
    expect(new Task({ ...base, dueDate: '2026-09-24' }).isOverdue(today)).toBeFalse();
  });

  it('falls back to Pending for an unknown status', () => {
    expect(new Task({ ...base, status: 'SOMETHING' }).status).toBe(TaskStatus.Pending);
  });
});

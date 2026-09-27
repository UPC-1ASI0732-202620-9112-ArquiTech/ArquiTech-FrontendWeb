import { User, UserRole, normalizeRole } from './user.entity';

describe('User', () => {
  it('normalizes the role spellings a Spring Security backend may return', () => {
    expect(normalizeRole('ROLE_SUPERVISOR')).toBe(UserRole.Supervisor);
    expect(normalizeRole('CONTRACTOR')).toBe(UserRole.Contractor);
    expect(normalizeRole('ROLE_CONTRATANTE')).toBe(UserRole.Contractor);
    expect(normalizeRole('supervisor')).toBe(UserRole.Supervisor);
  });

  it('builds initials and checks roles', () => {
    const user = new User({ id: 1, fullName: 'Carlos Mendoza', email: 'c@a.pe', role: 'SUPERVISOR' });
    expect(user.initials).toBe('CM');
    expect(new User({ id: 3, fullName: 'Carlos A. Mendoza', email: 'c@a.pe', role: 'SUPERVISOR' }).initials).toBe('CM');
    expect(user.hasRole(UserRole.Supervisor)).toBeTrue();
    expect(user.isSupervisor).toBeTrue();
  });

  it('uses the email when the API sends no full name', () => {
    const user = new User({ id: 2, username: 'maria@a.pe', email: undefined as unknown as string, role: 'CONTRACTOR' });
    expect(user.email).toBe('maria@a.pe');
    expect(user.fullName).toBe('maria@a.pe');
  });
});

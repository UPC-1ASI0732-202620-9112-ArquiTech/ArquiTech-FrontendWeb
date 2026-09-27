export enum UserRole {
  Supervisor = 'SUPERVISOR',
  Contractor = 'CONTRACTOR',
}

/** Shape returned by `/api/v1/users`. */
export interface UserResource {
  id: number;
  fullName?: string;
  username?: string;
  email: string;
  role: string;
  phone?: string;
  createdAt?: string;
}

/**
 * Accepts the role spellings a Spring Security backend may return
 * (`ROLE_SUPERVISOR`, `Supervisor`, `CONTRATANTE`, ...).
 */
export function normalizeRole(rawRole: string | null | undefined): UserRole {
  const role = String(rawRole ?? '')
    .toUpperCase()
    .replace(/^ROLE_/, '');
  return role === 'CONTRACTOR' || role === 'CONTRATANTE' ? UserRole.Contractor : UserRole.Supervisor;
}

/** Class `User` from the Class Dictionary (report 4.9.2). */
export class User {
  readonly id: number;
  readonly fullName: string;
  readonly email: string;
  readonly role: UserRole;
  readonly phone: string;
  readonly createdAt: string | null;

  constructor(resource: UserResource) {
    this.id = resource.id;
    this.email = resource.email ?? resource.username ?? '';
    this.fullName = resource.fullName?.trim() || this.email;
    this.role = normalizeRole(resource.role);
    this.phone = resource.phone ?? '';
    this.createdAt = resource.createdAt ?? null;
  }

  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  get isSupervisor(): boolean {
    return this.role === UserRole.Supervisor;
  }

  /** First letter of the first and last names ("Carlos A. Mendoza" → "CM"). */
  get initials(): string {
    const parts = this.fullName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return `${first}${last}`.toUpperCase();
  }

  toResource(): UserResource {
    return {
      id: this.id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
      phone: this.phone,
      createdAt: this.createdAt ?? undefined,
    };
  }
}

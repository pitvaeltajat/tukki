export type AdminRole = 'ADMIN' | 'USER';

/** An admin may not remove the last remaining administrator. */
export function canChangeRole(currentRole: AdminRole, nextRole: AdminRole, adminCount: number) {
  return !(currentRole === 'ADMIN' && nextRole === 'USER' && adminCount <= 1);
}

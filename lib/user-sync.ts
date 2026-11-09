import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { WorkspaceMember } from '@/lib/google-workspace';
import { activeWorkspaceMembers } from '@/lib/user-sync-policy';

export type UserSyncResult = {
  created: string[];
  renamed: string[];
  restored: string[];
  deactivated: string[];
  keptAlive: string[];
  dryRun: boolean;
};

export type UserSyncOptions = {
  domain: string;
  excludeEmails?: string[];
  dryRun?: boolean;
  maxDeactivations?: number;
};

const DEFAULT_MAX_DEACTIVATIONS = 10;

export class UserSyncAbort extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserSyncAbort';
  }
}

/** Reconciles Tukki users against a previously fetched Workspace roster. */
export async function syncWorkspaceUsers(roster: WorkspaceMember[], options: UserSyncOptions): Promise<UserSyncResult> {
  const { domain, excludeEmails = [], dryRun = false, maxDeactivations = DEFAULT_MAX_DEACTIVATIONS } = options;
  const excluded = new Set(excludeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  const active = new Map(
    activeWorkspaceMembers(roster, excludeEmails).map((member) => [member.email.toLowerCase(), member]),
  );
  if (active.size === 0) throw new UserSyncAbort('Workspace roster contains no active members, refusing to sync');

  const governed = (
    await prisma.user.findMany({
      where: { email: { endsWith: `@${domain}`, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, role: true, deletedAt: true, deletedBySync: true },
    })
  ).filter((user) => !excluded.has(user.email.toLowerCase()));
  const byEmail = new Map(governed.map((user) => [user.email.toLowerCase(), user]));
  const liveAdmins = governed.filter((user) => user.role === UserRole.ADMIN && user.deletedAt === null).length;
  const result: UserSyncResult = { created: [], renamed: [], restored: [], deactivated: [], keptAlive: [], dryRun };
  const toDeactivate = governed.filter((user) => user.deletedAt === null && !active.has(user.email.toLowerCase()));
  if (toDeactivate.length > maxDeactivations) {
    throw new UserSyncAbort(
      `Refusing to deactivate ${toDeactivate.length} accounts in one run (limit ${maxDeactivations}): ${toDeactivate.map((user) => user.email).join(', ')}`,
    );
  }

  for (const [email, member] of active) {
    const existing = byEmail.get(email);
    if (!existing) {
      result.created.push(email);
      if (!dryRun) await prisma.user.create({ data: { email, name: member.name, role: UserRole.USER } });
      continue;
    }
    if (existing.deletedAt && !existing.deletedBySync) continue;
    if (existing.deletedAt) {
      result.restored.push(email);
      if (!dryRun)
        await prisma.user.update({ where: { id: existing.id }, data: { deletedAt: null, deletedBySync: false } });
    }
    if (member.name && member.name !== existing.name) {
      result.renamed.push(email);
      if (!dryRun) await prisma.user.update({ where: { id: existing.id }, data: { name: member.name } });
    }
  }

  let remainingAdmins = liveAdmins;
  for (const user of toDeactivate) {
    if (user.role === UserRole.ADMIN && remainingAdmins <= 1) {
      result.keptAlive.push(user.email);
      continue;
    }
    if (user.role === UserRole.ADMIN) remainingAdmins -= 1;
    result.deactivated.push(user.email);
    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id, deletedAt: null },
        data: { deletedAt: new Date(), deletedBySync: true },
      });
    }
  }
  return result;
}

import type { WorkspaceMember } from './google-workspace';

export function activeWorkspaceMembers(roster: WorkspaceMember[], excludeEmails: string[] = []) {
  const excluded = new Set(excludeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean));
  return roster.filter((member) => member.active && !excluded.has(member.email.toLowerCase()));
}

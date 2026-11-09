import { getGoogleAccessToken, requireEnv } from '@/lib/google-auth';

const DIRECTORY_URL = 'https://admin.googleapis.com/admin/directory/v1';
const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
];

export type WorkspaceMember = { email: string; name: string | null; active: boolean };

async function directoryList<T>(
  token: string,
  path: string,
  params: Record<string, string>,
  collect: (page: Record<string, unknown>) => T[],
) {
  const results: T[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${DIRECTORY_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Directory API ${path} failed (${response.status}): ${await response.text()}`);
    const page = (await response.json()) as Record<string, unknown>;
    results.push(...collect(page));
    pageToken = page.nextPageToken as string | undefined;
  } while (pageToken);
  return results;
}

type DirectoryUser = { primaryEmail?: string; name?: { fullName?: string }; suspended?: boolean; archived?: boolean };
type DirectoryMember = { email?: string; type?: string };

/** Reads the current active roster from the configured Workspace group. */
export async function fetchWorkspaceRoster(): Promise<WorkspaceMember[]> {
  const domain = requireEnv('GOOGLE_WORKSPACE_DOMAIN');
  const group = requireEnv('GOOGLE_WORKSPACE_GROUP');
  const token = await getGoogleAccessToken(SCOPES, requireEnv('GOOGLE_WORKSPACE_SUBJECT'));
  const [users, members] = await Promise.all([
    directoryList<DirectoryUser>(
      token,
      '/users',
      { domain, maxResults: '500', projection: 'basic' },
      (page) => (page.users as DirectoryUser[]) ?? [],
    ),
    directoryList<DirectoryMember>(
      token,
      `/groups/${encodeURIComponent(group)}/members`,
      { maxResults: '200' },
      (page) => (page.members as DirectoryMember[]) ?? [],
    ),
  ]);
  if (users.length === 0) throw new Error(`Directory returned no users for domain ${domain}`);
  if (members.length === 0) throw new Error(`Directory returned no members for group ${group}`);
  const wholeDomainIsMember = members.some((member) => member.type === 'CUSTOMER');
  const explicitMembers = new Set(
    members.filter((member) => member.type === 'USER' && member.email).map((member) => member.email!.toLowerCase()),
  );
  return users
    .filter((user) => user.primaryEmail)
    .map((user) => {
      const email = user.primaryEmail!.toLowerCase();
      return {
        email,
        name: user.name?.fullName?.trim() || null,
        active: (wholeDomainIsMember || explicitMembers.has(email)) && !user.suspended && !user.archived,
      };
    });
}

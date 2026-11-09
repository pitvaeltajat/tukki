import { NextResponse } from 'next/server';
import { fetchWorkspaceRoster } from '@/lib/google-workspace';
import { syncWorkspaceUsers, UserSyncAbort } from '@/lib/user-sync';

export async function GET(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
  try {
    const roster = await fetchWorkspaceRoster();
    const result = await syncWorkspaceUsers(roster, {
      domain: process.env.GOOGLE_WORKSPACE_DOMAIN!,
      excludeEmails: (process.env.GOOGLE_WORKSPACE_EXCLUDE ?? '').split(','),
      dryRun,
      maxDeactivations: process.env.WORKSPACE_SYNC_MAX_DEACTIVATIONS
        ? Number(process.env.WORKSPACE_SYNC_MAX_DEACTIVATIONS)
        : undefined,
    });
    console.log(
      `Workspace sync${dryRun ? ' (dry run)' : ''}: ${roster.filter((member) => member.active).length} active member(s), created ${result.created.length}, renamed ${result.renamed.length}, restored ${result.restored.length}, deactivated ${result.deactivated.length}`,
    );
    return NextResponse.json({
      message: 'Workspace user sync completed',
      rosterSize: roster.length,
      activeMembers: roster.filter((member) => member.active).length,
      ...result,
    });
  } catch (error) {
    if (error instanceof UserSyncAbort) return NextResponse.json({ message: error.message }, { status: 409 });
    console.error('Workspace sync error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to resolve Workspace users' },
      { status: 500 },
    );
  }
}

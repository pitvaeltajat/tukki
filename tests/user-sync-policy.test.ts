import assert from 'node:assert/strict';
import test from 'node:test';
import { activeWorkspaceMembers } from '../lib/user-sync-policy.ts';

test('Workspace sync ignores inactive and excluded members', () => {
  const active = activeWorkspaceMembers(
    [
      { email: 'person@example.com', name: 'Person', active: true },
      { email: 'suspended@example.com', name: 'Suspended', active: false },
      { email: 'robot@example.com', name: 'Robot', active: true },
    ],
    ['robot@example.com'],
  );
  assert.deepEqual(
    active.map((member) => member.email),
    ['person@example.com'],
  );
});

test('Workspace sync detects an empty active roster before database work', () => {
  assert.deepEqual(activeWorkspaceMembers([{ email: 'gone@example.com', name: 'Gone', active: false }]), []);
});

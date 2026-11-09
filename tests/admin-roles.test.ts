import assert from 'node:assert/strict';
import test from 'node:test';
import { canChangeRole } from '../lib/admin-roles.ts';

test('the last admin cannot be demoted', () => {
  assert.equal(canChangeRole('ADMIN', 'USER', 1), false);
  assert.equal(canChangeRole('ADMIN', 'USER', 2), true);
});

test('promoting a user and unchanged roles are allowed', () => {
  assert.equal(canChangeRole('USER', 'ADMIN', 0), true);
  assert.equal(canChangeRole('ADMIN', 'ADMIN', 1), true);
});

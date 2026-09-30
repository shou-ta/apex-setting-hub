import assert from 'node:assert/strict';
import test from 'node:test';
import { splitBackupGroups, zipExportFilename, zipExportTimestamp } from '../src/backupPresentation.ts';

const item = (id, created, locked = false, root = 'apex') => ({ id, created, locked, root });

test('backup groups show newest three normal entries and keep locked entries separate', () => {
  const groups = splitBackupGroups([
    item('oldest', 1), item('locked', 7, true), item('newest', 8),
    item('fourth', 4), item('third', 6), item('second', 7), item('other-root', 9, false, 'other'),
  ], 'apex');

  assert.deepEqual(groups.locked.map(({ id }) => id), ['locked']);
  assert.deepEqual(groups.normalVisible.map(({ id }) => id), ['newest', 'second', 'third']);
  assert.deepEqual(groups.normalCollapsed.map(({ id }) => id), ['fourth', 'oldest']);
  assert.equal(groups.normalCount, 5);
});

test('backup groups collapse nothing when at or below the three item limit', () => {
  const groups = splitBackupGroups([item('one', 1), item('two', 2), item('three', 3)], 'apex');
  assert.equal(groups.normalVisible.length, 3);
  assert.deepEqual(groups.normalCollapsed, []);
});

test('ZIP exports use the requested lower-case name and local calendar date', () => {
  assert.equal(zipExportFilename(new Date(2000, 0, 1, 12)), 'apex-setting-hub_2000-01-01.zip');
  assert.equal(zipExportTimestamp(new Date(2000, 0, 1, 10, 10)), '2000-01-01 10:10');
});

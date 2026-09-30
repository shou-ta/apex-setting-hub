import assert from 'node:assert/strict';
import test from 'node:test';
import { checkForUpdates, compareVersions, releaseApiUrl } from '../src/updateCheck.ts';

test('release tags compare numerically and reject unknown formats', () => {
  assert.equal(compareVersions('0.3.62', 'v0.3.63'), 1);
  assert.equal(compareVersions('0.3.62', 'v0.3.62'), 0);
  assert.equal(compareVersions('0.3.62', 'v0.3.61'), -1);
  assert.equal(compareVersions('0.3.62', 'nightly'), null);
});

test('update checks distinguish new, absent, limited, and failed releases', async () => {
  const response = (status, body = {}) => async (url) => {
    assert.equal(url, releaseApiUrl);
    return { status, ok: status >= 200 && status < 300, json: async () => body };
  };
  assert.deepEqual(await checkForUpdates('0.3.62', response(200, { tag_name: 'v0.3.63' })), { status: 'available', latest: 'v0.3.63' });
  assert.deepEqual(await checkForUpdates('0.3.62', response(200, { tag_name: 'v0.3.62' })), { status: 'current', latest: 'v0.3.62' });
  assert.deepEqual(await checkForUpdates('0.3.62', response(404)), { status: 'no-release' });
  assert.deepEqual(await checkForUpdates('0.3.62', response(403)), { status: 'rate-limited' });
  assert.deepEqual(await checkForUpdates('0.3.62', response(200, { tag_name: 'nightly' })), { status: 'invalid-release', latest: 'nightly' });
  assert.deepEqual(await checkForUpdates('0.3.62', async () => { throw new Error('offline'); }), { status: 'error' });
});

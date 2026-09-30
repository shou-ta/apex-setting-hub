import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBindEdits, removeUnchangedEdits } from '../src/pendingEdits.ts';

const snapshot = {
  root: 'fixture',
  files: [{ name: 'videoconfig.txt', readonly: true, hash: 'fixture' }],
  settings: { sensitivity: '0.200000', fullscreen: '1', borderless: '0', width: '1920', height: '1080' },
  binds: [{ key: 'SPACE', action: 'jump', special: null, value: null }],
};

test('restoring a setting to its saved value clears the pending change', () => {
  assert.deepEqual(removeUnchangedEdits(snapshot, [{ kind: 'setting', id: 'sensitivity', value: '0.30' }]),
    [{ kind: 'setting', id: 'sensitivity', value: '0.30' }]);
  assert.deepEqual(removeUnchangedEdits(snapshot, [{ kind: 'setting', id: 'sensitivity', value: '0.20' }]), []);
});

test('compound display changes retain only fields that differ', () => {
  assert.deepEqual(removeUnchangedEdits(snapshot, [
    { kind: 'setting', id: 'fullscreen', value: '1' },
    { kind: 'setting', id: 'borderless', value: '0' },
  ]), []);
  assert.deepEqual(removeUnchangedEdits(snapshot, [
    { kind: 'setting', id: 'width', value: '2560' },
    { kind: 'setting', id: 'height', value: '1080' },
  ]), [{ kind: 'setting', id: 'width', value: '2560' }]);
});

test('restoring file protection and key assignment clears their edits', () => {
  assert.deepEqual(removeUnchangedEdits(snapshot, [
    { kind: 'readonly', file: 'videoconfig.txt', value: true },
    { kind: 'bind', key: 'SPACE', action: 'jump' },
    { kind: 'remove_bind', key: 'F9' },
  ]), []);
  assert.deepEqual(removeUnchangedEdits(snapshot, [
    { kind: 'readonly', file: 'videoconfig.txt', value: false },
    { kind: 'remove_bind', key: 'SPACE' },
  ]).length, 2);
});

test('an absent setting still requires a new line', () => {
  assert.equal(removeUnchangedEdits(snapshot, [{ kind: 'setting', id: 'gibs', value: '0' }]).length, 1);
});

test('key edits replace every duplicate entry and do not disappear against only the first match',()=>{
  const base={...snapshot,binds:[...snapshot.binds,{key:'space',action:'other',special:null,value:null}]};
  const edit={kind:'bind',key:'SPACE',action:'jump'};
  assert.deepEqual(removeUnchangedEdits(base,[edit]),[edit]);
  assert.deepEqual(applyBindEdits(base.binds,[edit]),[snapshot.binds[0]]);
  assert.deepEqual(applyBindEdits(base.binds,[{kind:'remove_bind',key:'space'}]),[]);
  assert.deepEqual(base.binds.length,2);
});

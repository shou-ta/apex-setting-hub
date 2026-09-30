import assert from 'node:assert/strict';
import test from 'node:test';
import {assignSpecialKey,compactSpecialKeys,removeSpecialKey,specialKeySlot} from '../src/specialBindSlots.ts';
import {applyBindEdits,removeUnchangedEdits} from '../src/pendingEdits.ts';

test('assigning Key 2 on an empty FPS or FOV row fills Key 1 without sparse entries',()=>{
  for(const type of ['fps','fov']){
    const rows=[{id:type,type,value:'120',keys:[],originalKeys:[]}];
    assert.equal(specialKeySlot(rows[0].keys,1),0);
    const updated=assignSpecialKey(rows,type,1,'Q');
    assert.deepEqual(updated[0].keys,['Q']);
    assert.deepEqual([...updated[0].originalKeys,...updated[0].keys].map(k=>k.toUpperCase()),['Q']);
    assert.deepEqual(rows[0].keys,[]);
  }
});

test('removing Key 1 shifts Key 2 to Key 1; replacements leave the other key intact',()=>{
  const rows=[{id:'fps',keys:['Q','R']}];
  assert.deepEqual(removeSpecialKey(rows,'fps',0)[0].keys,['R']);
  assert.deepEqual(assignSpecialKey(rows,'fps',1,'E')[0].keys,['Q','E']);
  assert.deepEqual(assignSpecialKey(rows,'fps',0,'E')[0].keys,['E','R']);
  assert.deepEqual(assignSpecialKey(removeSpecialKey(rows,'fps',0),'fps',1,'E')[0].keys,['R','E']);
});

test('moving a key between presets compacts the source and preserves preset metadata',()=>{
  const rows=[{id:'fps',value:'120',keys:['Q','R'],originalKeys:['Q','R']},{id:'fov',value:'110',keys:[],originalKeys:[]}];
  const updated=assignSpecialKey(rows,'fov',1,'q');
  assert.deepEqual(updated.map(row=>row.keys),[['R'],['q']]);
  assert.deepEqual(updated.map(row=>row.value),['120','110']);
  assert.deepEqual(updated[0].originalKeys,['Q','R']);
});

test('legacy holes and empty placeholders are removed before tracking and assignment',()=>{
  const keys=[];keys[1]='Q';
  assert.deepEqual(compactSpecialKeys([...keys,'']),['Q']);
  assert.deepEqual(assignSpecialKey([{id:'fps',keys}],'fps',1,'R')[0].keys,['Q','R']);
});

test('Key 2 first assignment supports value changes, reset, and removal without phantom edits',()=>{
  for(const special of ['fps','fov']){
    const snapshot={root:'fixture',files:[],settings:{},binds:[]};
    const row=assignSpecialKey([{id:special,keys:[]}],special,1,'Q')[0];
    let edits=row.keys.map(key=>({kind:'special',key,special,value:'120'}));
    assert.equal(applyBindEdits(snapshot.binds,edits).length,1);
    edits=edits.map(edit=>({...edit,value:'110'}));
    assert.equal(applyBindEdits(snapshot.binds,edits)[0].value,'110');
    assert.deepEqual(removeSpecialKey([row],special,0)[0].keys,[]);
    assert.deepEqual(removeUnchangedEdits(snapshot,[{kind:'remove_bind',key:'Q'}]),[]);
  }
});

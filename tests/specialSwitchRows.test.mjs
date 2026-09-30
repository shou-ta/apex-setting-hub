import assert from 'node:assert/strict';
import test from 'node:test';
import {specialSwitchRows,assignSwitchKey} from '../src/specialSwitchRows.ts';
import {applyBindEdits} from '../src/pendingEdits.ts';

test('existing keys become independent switch rows, including equal values and custom FPS',()=>{
  const binds=[{key:'Q',special:'fps',value:'120'},{key:'R',special:'fps',value:'120'},{key:'F9',special:'fov',value:'110'},{key:'X',special:'fps',value:'157'},{key:'SPACE',special:null,value:null}];
  const rows=specialSwitchRows(binds);
  assert.deepEqual(rows.map(r=>[r.key,r.type,r.value]),[['Q','fps','120'],['R','fps','120'],['F9','fov','110'],['X','fps','157']]);
  assert.equal(new Set(rows.map(row=>row.id)).size,4);
  assert.deepEqual(rows.map(row=>row.originalKey),['Q','R','F9','X']);
});
test('editing the value or type of one switch preserves other keys with the same value',()=>{
  const saved=[{key:'Q',action:'fps',special:'fps',value:'120'},{key:'R',action:'fps',special:'fps',value:'120'}];
  for(const edit of [{kind:'special',key:'Q',special:'fps',value:'157'},{kind:'special',key:'Q',special:'fov',value:'110'}]){
    const binds=applyBindEdits(saved,[edit]);
    assert.deepEqual(binds.find(b=>b.key==='R'),saved[1]);
    assert.equal(binds.find(b=>b.key==='Q').value,edit.value);
    assert.equal(binds.find(b=>b.key==='Q').special,edit.special);
  }
});
test('assigning and transferring a single key creates no holes and keeps source metadata',()=>{
  const saved=specialSwitchRows([{key:'Q',special:'fps',value:'120'}]);
  const rows=[...saved,{id:'draft',type:'fov',value:'110',key:'',originalKey:''}];
  const updated=assignSwitchKey(rows,'draft','q');
  assert.deepEqual(updated.map(r=>r.key),['','q']);
  assert.equal(updated[0].originalKey,'Q');
  assert.equal(updated[1].value,'110');
  assert.deepEqual(rows.map(r=>r.key),['Q','']);
  assert.deepEqual(specialSwitchRows([]),[]);
});

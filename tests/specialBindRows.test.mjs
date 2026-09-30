import assert from 'node:assert/strict';
import test from 'node:test';
import {newSpecialBindRow,specialBindRows} from '../src/specialBindRows.ts';
import {assignSpecialKey,removeSpecialKey} from '../src/specialBindSlots.ts';
import {applyBindEdits} from '../src/pendingEdits.ts';

test('only saved FPS and FOV bindings become editable rows; ordinary binds stay out',()=>{
  const binds=[
    {key:'Q',special:'fps',value:'120'},
    {key:'SPACE',special:null,value:null},
    {key:'F9',special:'fov',value:'110'},
  ];
  const before=structuredClone(binds);
  assert.deepEqual(specialBindRows(binds),[
    {id:'default-fps',type:'fps',value:'240',keys:[],originalKeys:[]},
    {id:'default-fov',type:'fov',value:'110',keys:['F9'],originalKeys:['F9']},
    {id:'saved-fps-120-2',type:'fps',value:'120',keys:['Q'],originalKeys:['Q']},
  ]);
  assert.deepEqual(binds,before);
});

test('same-type same-value keys share two slots; different values remain separate',()=>{
  const rows=specialBindRows([
    {key:'Q',special:'fps',value:'120'},
    {key:'R',special:'fps',value:'120'},
    {key:'q',special:'fps',value:'120'},
    {key:'F1',special:'fps',value:'240'},
    {key:'F2',special:'fov',value:'120'},
  ]);
  assert.deepEqual(rows.map(({type,value,keys,originalKeys})=>({type,value,keys,originalKeys})),[
    {type:'fps',value:'240',keys:['F1'],originalKeys:['F1']},
    {type:'fov',value:'110',keys:[],originalKeys:[]},
    {type:'fps',value:'120',keys:['Q','R'],originalKeys:['Q','R']},
    {type:'fov',value:'120',keys:['F2'],originalKeys:['F2']},
  ]);
});

test('empty config keeps default FPS/FOV rows visible; the guide creates separate blank drafts',()=>{
  assert.deepEqual(specialBindRows([]),[
    {id:'default-fps',type:'fps',value:'240',keys:[],originalKeys:[]},
    {id:'default-fov',type:'fov',value:'110',keys:[],originalKeys:[]},
  ]);
  for(const [type,value] of [['fps','240'],['fov','110']]){
    const draft=newSpecialBindRow(type,`draft-${type}`);
    assert.deepEqual(draft,{id:`draft-${type}`,type,value,keys:[],originalKeys:[]});
    assert.deepEqual(applyBindEdits([],[]),[]);
  }
});

test('adding a preset and assigning a key creates only that binding; removing it leaves no phantom row',()=>{
  const draft=newSpecialBindRow('fps','draft-1');
  const assigned=assignSpecialKey([draft],draft.id,1,'Q');
  assert.deepEqual(assigned[0].keys,['Q']);
  let edits=assigned[0].keys.map(key=>({kind:'special',key,special:'fps',value:'240'}));
  edits=edits.map(edit=>({...edit,value:'144'}));
  assert.deepEqual(applyBindEdits([],edits),[
    {key:'Q',action:'fps',special:'fps',value:'144'},
  ]);
  const cleared=removeSpecialKey(assigned,draft.id,0);
  assert.deepEqual(cleared[0].keys,[]);
  assert.deepEqual(cleared[0].value,'240');
});

test('missing values fall back to legacy defaults without collapsing FPS and FOV rows',()=>{
  assert.deepEqual(specialBindRows([
    {key:'Q',special:'fps',value:null},
    {key:'R',special:'fov',value:null},
  ]).map(({type,value,keys})=>[type,value,keys]),[['fps','240',['Q']],['fov','110',['R']]]);
});

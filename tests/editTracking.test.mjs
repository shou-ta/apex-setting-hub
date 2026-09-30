import assert from 'node:assert/strict';
import test from 'node:test';
import { rowSettingIds, editsForAction, groupEdits } from '../src/editTracking.ts';
import { gameCatalog } from '../src/gameCatalog.ts';
import { controllerState } from '../src/controllerState.ts';

const snapshot={root:'fixture',files:[],settings:{},binds:[
  {key:'SPACE',action:'jump',special:null,value:null},
  {key:'R',action:'reload',special:null,value:null},
]};
test('compound row undo removes its fields and leaves unrelated changes staged',()=>{
  const edits=[{kind:'setting',id:'width',value:'1728'},{kind:'setting',id:'height',value:'1080'},{kind:'setting',id:'sensitivity',value:'0.3'}];
  const ids=rowSettingIds({control:'resolution',id:'width'});
  assert.deepEqual(edits.filter(edit=>!ids.includes(edit.id)),[edits[2]]);
  assert.deepEqual(rowSettingIds({control:'reflex'}),['reflex_enabled','reflex_boost']);
  assert.deepEqual(rowSettingIds({control:'color',id:'laser_customized'}),['laser_customized','laser_color']);
});
test('moving or removing a key marks the source and destination actions; undo restores both',()=>{
  const edits=[{kind:'remove_bind',key:'SPACE'},{kind:'bind',key:'r',action:'jump'},{kind:'setting',id:'fov',value:'104'}];
  assert.deepEqual(editsForAction(edits,snapshot,'jump'),edits.slice(0,2));
  assert.deepEqual(editsForAction(edits,snapshot,'reload'),[edits[1]]);
  const targets=editsForAction(edits,snapshot,'jump');
  assert.deepEqual(edits.filter(edit=>!targets.includes(edit)),[edits[2]]);
});
test('collapsed group counts include hidden scope values and deduplicate the shared ADS field',()=>{
  const edits=[{kind:'setting',id:'controller_ads_sensitivity',value:'2'},{kind:'setting',id:'controller_alc_optic_seer_passive',value:'2.6'},{kind:'setting',id:'width',value:'1728'}];
  assert.deepEqual(groupEdits(gameCatalog.controller[1].rows,edits,snapshot),edits.slice(0,2));
});
test('ALC and numeric optics states are independent from ALC scope multipliers',()=>{
  for(const alc of ['0','1'])for(const numeric of ['0','1'])for(const multipliers of ['0','1']){
    const values={controller_custom_aim:alc,controller_per_optic_ads:numeric,controller_alc_per_optic:multipliers};
    const state=controllerState(id=>values[id]);
    assert.equal(state.base,alc==='1'?'alc':'presets');
    assert.equal(state.numericOpticsActive,alc==='0'&&numeric==='1');
    assert.equal(state.multipliersActive,multipliers==='1');
  }
  const unknown=controllerState(()=> '—');
  assert.equal(unknown.base,'unknown');
  assert.equal(unknown.numericOptics,null);
  assert.equal(unknown.multipliers,null);
});

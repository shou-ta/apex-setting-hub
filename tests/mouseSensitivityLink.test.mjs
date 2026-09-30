import assert from 'node:assert/strict';
import test from 'node:test';
import {effectiveMouseAdsSensitivity,mouseAdsSensitivityPairs,mouseAdsSensitivityEdits} from '../src/mouseSensitivityLink.ts';
import {removeUnchangedEdits} from '../src/pendingEdits.ts';

test('when per-optic sensitivity is off, the ADS multiplier reads from the 1x optic value',()=>{
  assert.equal(effectiveMouseAdsSensitivity({per_optic:'0',ads_sensitivity:'0.2',optic_1x:'1.35'}),'1.35');
});

test('when the 1x value is absent, disabled per-optic mode falls back to the saved ADS multiplier',()=>{
  assert.equal(effectiveMouseAdsSensitivity({per_optic:'0',ads_sensitivity:'0.8'}),'0.8');
  assert.equal(effectiveMouseAdsSensitivity({per_optic:'0',ads_sensitivity:'0.8',optic_1x:'—'}),'0.8');
});

test('an unknown toggle value does not assume that the 1x and base sensitivities are linked',()=>{
  assert.equal(effectiveMouseAdsSensitivity({ads_sensitivity:'0.8',optic_1x:'1.4'}),'0.8');
});

test('switching per-optic on keeps the visible 1x multiplier',()=>{
  assert.equal(effectiveMouseAdsSensitivity({per_optic:'1',ads_sensitivity:'0.6',optic_1x:'1.4'}),'1.4');
});

test('editing ADS while per-optic mode is off stages matching values for both saved keys',()=>{
  const snapshot={root:'fixture',files:[],settings:{ads_sensitivity:'0.2',optic_1x:'1.35'},binds:[]};
  const edits=mouseAdsSensitivityPairs('0.7',true).map(({id,value})=>({kind:'setting',id,value}));
  assert.deepEqual(edits.map(({id,value})=>[id,value]),[['ads_sensitivity','0.7'],['optic_1x','0.7']]);
  assert.deepEqual(removeUnchangedEdits(snapshot,edits),edits);
});

test('changing ADS while per-optic mode is on only targets the base multiplier',()=>{
  assert.deepEqual(mouseAdsSensitivityPairs('0.7',false),[{id:'ads_sensitivity',value:'0.7'}]);
});

test('toggling per-optic off and back on changes only the toggle, even when saved multipliers differ',()=>{
  const snapshot={root:'fixture',files:[],settings:{per_optic:'0',ads_sensitivity:'0.2',optic_1x:'1.35'},binds:[]};
  const switched=removeUnchangedEdits(snapshot,[{kind:'setting',id:'per_optic',value:'1'}]);
  assert.deepEqual(switched,[{kind:'setting',id:'per_optic',value:'1'}]);
  assert.equal(effectiveMouseAdsSensitivity({...snapshot.settings,per_optic:'1'}),'1.35');
  assert.deepEqual(removeUnchangedEdits(snapshot,[{kind:'setting',id:'per_optic',value:'0'}]),[]);
});

test('editing ADS then toggling per-optic keeps the draft and returning to the original visible value clears it',()=>{
  const snapshot={root:'fixture',files:[],settings:{per_optic:'0',ads_sensitivity:'0.2',optic_1x:'1.35'},binds:[]};
  const draft=mouseAdsSensitivityEdits('0.7',true,snapshot.settings).map(({id,value})=>({kind:'setting',id,value}));
  assert.deepEqual(draft.map(edit=>edit.id),['ads_sensitivity','optic_1x']);
  assert.equal(effectiveMouseAdsSensitivity({...snapshot.settings,optic_1x:'0.7',per_optic:'1'}),'0.7');
  assert.deepEqual(mouseAdsSensitivityEdits('1.35',true,snapshot.settings),[]);
  assert.deepEqual(removeUnchangedEdits(snapshot,[{kind:'setting',id:'per_optic',value:'0'},...mouseAdsSensitivityEdits('1.35',true,snapshot.settings)]),[]);
});

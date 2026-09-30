import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { sameSettingValue } from '../src/settingValues.ts';
import { controllerState } from '../src/controllerState.ts';
import { spotShadowChoice, spotShadowEdits, spotShadowIds } from '../src/spotShadows.ts';
import { rowSettingIds } from '../src/editTracking.ts';
import { removeUnchangedEdits } from '../src/pendingEdits.ts';
import { gameCatalog } from '../src/gameCatalog.ts';
test('serialized decimal choices match while absent and compound values remain distinct',()=>{
  for(const [a,b] of [['1','1.000000'],['0.6','0.600000'],['-1','-1.0']]) assert.ok(sameSettingValue(a,b));
  for(const [a,b] of [['','0'],[' ','0'],['—','0'],['1 2 3','123'],['garbage','NaN']]) assert.equal(sameSettingValue(a,b),false);
  assert.equal(controllerState(()=> '1.000000').alc,true);
});
test('spot shadow presets update every dependent value and reset without a pending change',()=>{
  for(const value of ['0','128','256','512']){
    const settings=Object.fromEntries(spotShadowEdits(value).map(edit=>[edit.id,edit.value]));
    assert.equal(spotShadowChoice(id=>Number(settings[id]).toFixed(6)),value);
    const snapshot={root:'fixture',files:[],binds:[],settings};
    assert.deepEqual(removeUnchangedEdits(snapshot,spotShadowEdits(value).map(edit=>({kind:'setting',...edit}))),[]);
  }
  assert.equal(spotShadowChoice(()=> '—'),'custom');
  assert.equal(spotShadowChoice(id=>id==='shadows'?'0':id==='spot_detail_observed'?'128':'2'),'custom');
  assert.deepEqual(rowSettingIds({control:'spot-shadow'}),[...spotShadowIds]);
  assert.throws(()=>spotShadowEdits('1024'));
});
test('confirmed rows are editable while unconfirmed rows remain visible',()=>{
  const rows=Object.values(gameCatalog).flatMap(groups=>groups.flatMap(group=>group.rows));
  for(const id of ['auto_mute_observed','output_config_observed','spot_detail_observed']) assert.notEqual(rows.find(row=>row.id===id).control,'observed');
  assert.deepEqual(rows.filter(row=>row.control==='observed').map(row=>row.id).sort(),['voice_lines_observed','voice_mode_observed']);
});

test('UI layout choices use game-observed values in the game menu order',()=>{
  const row=gameCatalog.video.flatMap(group=>group.rows).find(row=>row.id==='ui_layout_observed');
  assert.equal(row.control,'choice');
  assert.deepEqual(row.choices.map(option=>[option.value,option.ja]),[['0','オート'],['2','フル'],['1','コンパクト']]);
  const snapshot={root:'fixture',files:[],binds:[],settings:{ui_layout_observed:'1'}};
  assert.equal(removeUnchangedEdits(snapshot,[{kind:'setting',id:'ui_layout_observed',value:'2'}]).length,1);
  assert.deepEqual(removeUnchangedEdits(snapshot,[{kind:'setting',id:'ui_layout_observed',value:'1'}]),[]);
});

test('choice UI selects the named preset and bar for decimal config values', async()=>{
  const ts=await import('typescript');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const React=await import('react');
  let source=fs.readFileSync(new URL('../src/SettingChoice.tsx',import.meta.url),'utf8');
  let js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText;
  js=js.replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')))
    .replace("'./settingValues'",JSON.stringify(new URL('../src/settingValues.ts',import.meta.url).href));
  const Choice=(await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))).default;
  const html=renderToStaticMarkup(React.createElement(Choice,{value:'0.600000',options:[{value:'0.6',label:'Low'},{value:'0.8',label:'Medium'}],label:'Detail',onChange:()=>{},lang:'en'}));
  assert.match(html,/<option value="0.6" selected="">Low/);
  assert.equal((html.match(/class="current"/g)||[]).length,1);
  assert.doesNotMatch(html,/Saved value/);
});

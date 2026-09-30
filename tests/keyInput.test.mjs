import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeKey, displayKey, captureKeyInput } from '../src/keyInput.ts';
import { gameCatalog } from '../src/gameCatalog.ts';

const input=(code,key=code)=>({code,key,location:0});
test('physical keypad, modifiers and punctuation retain their Apex key names',()=>{
  for(const [code,key,expected] of [['Numpad8','ArrowUp','KP_UPARROW'],['Numpad8','8','KP_UPARROW'],['NumpadMultiply','*','KP_MULTIPLY'],['NumpadDivide','/','KP_SLASH'],['ControlRight','Control','RCTRL'],['Digit1','!','1'],['KeyA','a','A'],['Quote',"'","'"],['BracketLeft','[','[[']])assert.equal(normalizeKey(input(code,key)),expected);
  assert.equal(displayKey('KP_UPARROW'),'NUMPAD8');
  assert.equal(displayKey('kp_multiply'),'NUMPAD*');
  assert.equal(normalizeKey(input('Escape','Escape')),null);
});
const dispatch=(target,type,values)=>{const event=new Event(type,{cancelable:true});Object.assign(event,values);target.dispatchEvent(event);return event;};
test('ESC cancels without selecting a key; repeat and unsupported inputs keep waiting',()=>{
  const target=new EventTarget();const picked=[];let cancelled=0;
  const cleanup=captureKeyInput(target,key=>picked.push(key),()=>cancelled++);
  dispatch(target,'keydown',{code:'KeyA',key:'a',repeat:true});
  dispatch(target,'keydown',{code:'Unidentified',key:'Unidentified'});
  assert.deepEqual(picked,[]);
  assert.ok(dispatch(target,'keydown',{code:'Escape',key:'Escape'}).defaultPrevented);
  dispatch(target,'keydown',{code:'KeyB',key:'b'});
  assert.equal(cancelled,1);assert.deepEqual(picked,[]);cleanup();
});
test('mouse and wheel capture once and cleanup releases keyboard input',()=>{
  for(const [type,values,expected] of [['mousedown',{button:2},'MOUSE2'],['wheel',{deltaY:-1},'MWHEELUP']]){
    const target=new EventTarget();const picked=[];const cleanup=captureKeyInput(target,key=>picked.push(key),()=>{});
    dispatch(target,type,values);dispatch(target,'keydown',{code:'KeyA',key:'a'});
    assert.deepEqual(picked,[expected]);cleanup();
    assert.equal(dispatch(target,'contextmenu',{}).defaultPrevented,false);
  }
});
test('communication and observer sections follow the supplied game screenshots',()=>{
  const comm=gameCatalog.input.find(group=>group.en==='Communication');
  assert.deepEqual(comm.rows.map(row=>row.ja),['レジェンドアップグレード/エモートホイール/ありがとう','ピン','ピン（敵発見）','ピン（移動）','ピン（アイテム探索）','ピン（防衛）','ピン（監視）','ピン（何者かの痕跡）','ピン（合流）','ピン（エリア回避）','ピン（攻撃）','ピン（敵の音）','プッシュ（ホールド）/マイクの切り替え','チームにメッセージ（マッチ中）']);
  const observer=gameCatalog.input.find(group=>group.en==='Private Match Observer');
  assert.equal(observer.rows.length,23);
  assert.equal(observer.rows[12].ja,'自動マップカメラ切り替え');
  assert.deepEqual(observer.rows.slice(-3).map(row=>row.ja),['回転モード切り替え','時計回りに回転','反時計回りに回転']);
  assert.equal(gameCatalog.input.find(group=>group.en==='Other').rows[0].id,'screenshot');
});

test('every user-confirmed action has an editable row and a backend command',async()=>{
  const fs=await import('node:fs');
  const rust=fs.readFileSync(new URL('../src-tauri/src/config.rs',import.meta.url),'utf8');
  const rows=gameCatalog.input.flatMap(group=>group.rows);
  for(const id of ['movement_ability','selected_health','ping_regroup','ping_avoid','ping_attack','ping_audio','observer_auto_mapcam','observer_altitude_lock','observer_smoothcam','observer_roll_mode','observer_roll_clockwise','observer_roll_counterclockwise']){
    assert.equal(rows.find(row=>row.id===id)?.control,'bind');
    assert.ok(rust.includes(`("${id}",`),id);
  }
});

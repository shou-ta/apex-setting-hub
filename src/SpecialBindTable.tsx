import {useEffect,useState} from 'react';
import KeyCapture from './KeyCapture';
import NumericSlider from './NumericSlider';
import type {Edit,Snapshot} from './pendingEdits';
import {assignSpecialKey,removeSpecialKey} from './specialBindSlots';
import {newSpecialBindRow,specialBindRows,type SpecialBindRow} from './specialBindRows';

export default function SpecialBindTable({snapshot,binds,edits,lang,t,onAssign,onValue,onRemove}:{snapshot:Snapshot;binds:Snapshot['binds'];edits:Edit[];lang:'ja'|'en';t:(id:string)=>string;onAssign:(key:string,type:'fps'|'fov',value:string,replacedKey?:string)=>boolean;onValue:(keys:string[],type:'fps'|'fov',value:string)=>void;onRemove:(key:string)=>void}){
 const [rows,setRows]=useState<SpecialBindRow[]>(()=>specialBindRows(binds));
 useEffect(()=>{if(!edits.length)setRows(specialBindRows(binds));},[snapshot,edits.length]);
 const label=(type:'fps'|'fov')=>type==='fps'?t('fps'):t('fov_special');
 const add=(type:'fps'|'fov')=>setRows(old=>[...old,newSpecialBindRow(type,`draft-${Date.now()}-${old.length}`)]);
 const setValue=(row:SpecialBindRow,value:string)=>{onValue(row.keys,row.type,value);setRows(old=>old.map(item=>item.id===row.id?{...item,value}:item));};
 const capture=(row:SpecialBindRow,slot:number,key:string)=>{const replacedKey=row.keys[slot];if(!onAssign(key,row.type,row.value,replacedKey))return;setRows(old=>assignSpecialKey(old,row.id,slot,key));};
 const removeSlot=(row:SpecialBindRow,slot:number)=>{const key=row.keys[slot];if(key)onRemove(key);setRows(old=>removeSpecialKey(old,row.id,slot));};
 const removeRow=(row:SpecialBindRow)=>{row.keys.forEach(onRemove);setRows(old=>old.filter(item=>item.id!==row.id));};
 return <>
  <p className="page-hint">{lang==='ja'?'登録した値をキーで切り替えます。設定を増やすには下のFPS制限またはFOV切替を追加してください。':'Switch between registered values with keys. Add an FPS limit or FOV preset below to create another value.'}</p>
  <div className="special-bind-table bind-table">
   <div className="bind-table-head"><span>{t('action')}</span><span>{lang==='ja'?'設定値':'Value'}</span><span>{t('key')}1</span><span>{t('key')}2</span><span/></div>
   {rows.map(row=><div className="tracked-row" key={row.id}><div className="bind-table-row"><div className="bind-action"><strong>{label(row.type)}</strong></div><div className="special-bind-value"><NumericSlider label={label(row.type)} value={row.value} min={row.type==='fps'?0:70} max={row.type==='fps'?300:120} step={row.type==='fps'?1:2} onChange={value=>setValue(row,value)}/></div>{[0,1].map(slot=><div className="bind-slot" key={slot}><KeyCapture lang={lang} actionLabel={`${label(row.type)} ${row.value}`} value={row.keys[slot]} placeholder="—" className="bind-slot-capture" ariaLabel={`${label(row.type)} ${row.value}: ${t('key')}${slot+1}`} t={t} onPick={key=>capture(row,slot,key)} onClear={()=>removeSlot(row,slot)}/></div>)}<div className="special-switch-remove"><button className="ghost" aria-label={`${label(row.type)} ${row.value}: ${lang==='ja'?'行を削除':'Delete row'}`} onClick={()=>removeRow(row)}>{lang==='ja'?'削除':'Remove'}</button></div></div></div>)}
  </div>
  <div className="special-bind-add"><div className="special-bind-add-guide"><strong>{lang==='ja'?'新しい切替設定を追加':'Add a setting to switch'}</strong><span>{lang==='ja'?'追加した行にキーを割り当てると、ゲーム内で値を切り替えられます。':'Assign a key to the new row to switch to that value in game.'}</span></div><div><button className="ghost" onClick={()=>add('fps')}>＋ {lang==='ja'?'FPS制限を追加':'Add FPS limit'}</button><button className="ghost" onClick={()=>add('fov')}>＋ {lang==='ja'?'FOV切替を追加':'Add FOV preset'}</button></div></div>
 </>;
}

import {useEffect,useState} from 'react';
import SettingChoice from './SettingChoice';

export default function FpsBindValue({value,options,lang,label,onChange}:{value:string;options:{value:string;label:string}[];lang:'ja'|'en';label:string;onChange:(value:string)=>void}){
  const [draft,setDraft]=useState(value==='0'?'':value);
  useEffect(()=>setDraft(value==='0'?'':value),[value]);
  return <div className="fps-bind-value">
    <SettingChoice value={value} options={options.some(option=>option.value===value)?options:[...options,{value,label:`${value} FPS`}]} label={label} lang={lang} onChange={onChange}/>
    <form className="fps-manual" onSubmit={e=>{e.preventDefault();const fps=Number(draft);if(/^\d+$/.test(draft)&&Number.isInteger(fps)&&fps>=1&&fps<=300)onChange(String(fps));}}>
      <span>{lang==='ja'?'手動':'Manual'}</span>
      <input type="number" min="1" max="300" step="1" required aria-label={lang==='ja'?'FPS制限: 手動入力（1〜300）':'FPS limit: manual input (1–300)'} placeholder="1–300" value={draft} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setDraft(value==='0'?'':value);}}/>
      <button className="ghost" type="submit">{lang==='ja'?'設定':'Set'}</button>
    </form>
  </div>;
}

import { sameSettingValue } from './settingValues';
type Option = {value:string;label:string};

export default function SettingChoice({value,options,label,onChange,disabled=false,lang}:{value:string;options:Option[];label:string;onChange:(value:string)=>void;disabled?:boolean;lang:'ja'|'en'}) {
  const index=options.findIndex(option=>sameSettingValue(option.value,value));
  const move=(direction:number)=>{
    if(!options.length)return;
    const next=index<0?0:(index+direction+options.length)%options.length;
    onChange(options[next].value);
  };
  return <div className="choice-control">
    <button type="button" disabled={disabled||!options.length} aria-label={`${label}: ${lang==='ja'?'前の選択肢':'Previous option'}`} onClick={()=>move(-1)}>‹</button>
    <div className={`choice-value ${disabled?'choice-disabled':''}`}>
    <select aria-label={label} disabled={disabled} value={index<0?value:options[index].value} onChange={e=>onChange(e.target.value)}>
      {index<0&&<option value={value}>{value==='—'?(lang==='ja'?'未設定':'Not set'):(lang==='ja'?`保存値 ${value}`:`Saved value ${value}`)}</option>}
      {options.map(option=><option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
    <div className="choice-bars" aria-hidden="true">{options.map((option,position)=><span key={option.value} className={position===index?'current':''}/>)}</div>
    </div>
    <button type="button" disabled={disabled||!options.length} aria-label={`${label}: ${lang==='ja'?'次の選択肢':'Next option'}`} onClick={()=>move(1)}>›</button>
  </div>;
}

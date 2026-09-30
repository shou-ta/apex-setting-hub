import { useEffect, useState } from 'react';

export default function NumericSlider({value,min,max,step,decimals=0,label,disabled,onChange}:{value:string;min:number;max:number;step:number;decimals?:number;label:string;disabled?:boolean;onChange:(value:string)=>void}) {
  const [draft,setDraft]=useState(value);
  useEffect(()=>setDraft(value),[value]);
  const parsed=Number(value);
  const numeric=Number.isFinite(parsed)?Math.min(max,Math.max(min,parsed)):min;
  const format=(v:number)=>decimals?Number(v).toFixed(decimals):String(Math.round(v));
  const commit=(raw:string)=>{
    setDraft(raw);
    if(raw.trim()==='')return;
    const next=Number(raw);
    if(!Number.isFinite(next))return;
    const clamped=Math.min(max,Math.max(min,next));
    onChange(format(clamped));
  };
  const finish=()=>{if(draft.trim()===''){setDraft(value);return;}const n=Number(draft);if(!Number.isFinite(n)){setDraft(value);return;}const clamped=Math.min(max,Math.max(min,n));const snapped=min+Math.round((clamped-min)/step)*step;commit(format(Math.min(max,Math.max(min,snapped))));};
  return <div className="numeric-slider-control"><input type="range" min={min} max={max} step={step} value={numeric} disabled={disabled} aria-label={label} onChange={event=>{const next=format(Number(event.target.value));setDraft(next);onChange(next);}}/><input className="numeric-slider-value" type="number" min={min} max={max} step={step} value={draft} disabled={disabled} aria-label={`${label} ${decimals?'':'値'}`} onChange={event=>setDraft(event.target.value)} onBlur={finish} onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/></div>;
}

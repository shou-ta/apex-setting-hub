import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { captureKeyInput, displayKey } from './keyInput';
export default function KeyCapture({value,onPick,onClear,t,placeholder,className,ariaLabel,actionLabel,lang}:{value?:string;onPick:(key:string)=>void;onClear?:()=>void;t:(s:string)=>string;placeholder?:string;className?:string;ariaLabel?:string;actionLabel:string;lang:'ja'|'en'}) {
  const [active,setActive]=useState(false);
  useEffect(()=>{
    if(!active)return;
    return captureKeyInput(window,key=>{setActive(false);onPick(key);},()=>setActive(false));
  },[active,onPick]);
  return <><button type="button" className={`keycap ${className||''} ${active?'active':''}`} aria-label={ariaLabel} onClick={()=>setActive(true)} onContextMenu={event=>{event.preventDefault();if(value)onClear?.();}}>{value?displayKey(value):placeholder||t('choose_key')}</button>
    {active&&createPortal(<div className="key-capture-cover"><div className="key-capture-dialog" role="dialog" aria-modal="true" aria-labelledby="key-capture-title" aria-describedby="key-capture-help">
      <h2 id="key-capture-title">{lang==='ja'?<><strong>{actionLabel}</strong>に割り当て</>:<>Assign <strong>{actionLabel}</strong></>}</h2>
      <p id="key-capture-help">{lang==='ja'?'割り当てたいキーを押してください':'Press the key you want to assign'}（<kbd>ESC</kbd>{lang==='ja'?'でキャンセル':' to cancel'}）</p>
    </div></div>,document.body)}
  </>;
}

import { useState } from 'react';
import { resolutionLabel } from './resolutionFormat';

const presets = ['1728x1080', '1680x1050', '1440x1080', '2304x1440', '1920x1440'];
const storageKey = 'apex-setting-hub.custom-resolutions';
const min = 640, max = 16384;
const valid = (value: string) => /^\d+x\d+$/.test(value)
  && value.split('x').every(part => Number(part) >= min && Number(part) <= max);

function readCustom(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(saved) ? saved.filter((value): value is string => typeof value === 'string' && valid(value)) : [];
  } catch { return []; }
}

type Props = {
  lang: 'ja' | 'en';
  width: string;
  height: string;
  modes: string[];
  onChange: (width: string, height: string) => void;
};

export default function ResolutionControl({lang,width,height,modes,onChange}: Props) {
  const ja = lang === 'ja';
  const [custom, setCustom] = useState(readCustom);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({width: 1728, height: 1080});
  const current = `${width}x${height}`;
  const available = new Set(modes.filter(valid));
  available.delete(current);
  const stretch = presets.filter(value => value !== current && !available.has(value));
  const saved = custom.filter(value => value !== current && !available.has(value) && !stretch.includes(value));
  const option = (value: string) => <option key={value} value={value}>{resolutionLabel(value,lang)}</option>;
  const choose = (value: string) => {
    if (!valid(value)) return;
    const [w,h] = value.split('x');
    onChange(w,h);
  };
  const add = () => {
    const value = `${draft.width}x${draft.height}`;
    const next = Array.from(new Set([...custom,value]));
    setCustom(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* The selected config value remains usable without local storage. */ }
    choose(value);
    setExpanded(false);
  };
  return <div className="resolution-control">
    <div className="resolution-picker">
      <select aria-label={ja?'解像度':'Resolution'} value={current} onChange={event=>choose(event.target.value)}>
        <option value={current}>{resolutionLabel(current,lang)}{ja?'（現在値）':' (Current)'}</option>
        {available.size>0&&<optgroup label={ja?'Windowsの表示モード':'Windows display modes'}>{Array.from(available).map(option)}</optgroup>}
        {stretch.length>0&&<optgroup label={ja?'引き伸ばし用プリセット':'Stretched resolution presets'}>{stretch.map(option)}</optgroup>}
        {saved.length>0&&<optgroup label={ja?'追加した解像度':'Custom resolutions'}>{saved.map(option)}</optgroup>}
      </select>
      <button className="text-link" aria-expanded={expanded} aria-controls="custom-resolution" onClick={()=>setExpanded(!expanded)}>{ja?'カスタム解像度を追加':'Add custom resolution'}</button>
    </div>
    {expanded&&<div id="custom-resolution" className="resolution-custom">
      {(['width','height'] as const).map(dimension=>{
        const label = dimension==='width'?(ja?'幅':'Width'):(ja?'高さ':'Height');
        const update = (value: number) => setDraft(old=>({...old,[dimension]:Math.min(max,Math.max(min,value))}));
        return <div className="resolution-dimension" key={dimension}>
          <span>{label}</span>
          <input aria-label={label} type="range" min={min} max={max} step={1} value={draft[dimension]} onChange={event=>update(Number(event.target.value))}/>
          <div className="stepper"><button aria-label={`${label} −1`} disabled={draft[dimension]===min} onClick={()=>update(draft[dimension]-1)}>−</button><span>{draft[dimension]}</span><button aria-label={`${label} +1`} disabled={draft[dimension]===max} onClick={()=>update(draft[dimension]+1)}>+</button></div>
        </div>;
      })}
      <button className="ghost" onClick={add}>{ja?'追加して選択':'Add and select'} · {resolutionLabel(`${draft.width}x${draft.height}`,lang)}</button>
    </div>}
    <small className="resolution-hint">{ja?'一覧外の解像度はGPU側でのカスタム登録が必要な場合があります。引き伸ばしは全画面スケーリングとフルスクリーンを確認してください。':'Resolutions not listed by Windows may require a custom mode in your GPU settings. For stretching, check full-screen scaling and fullscreen mode.'}</small>
  </div>;
}

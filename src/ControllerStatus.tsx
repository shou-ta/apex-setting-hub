import { controllerState } from './controllerState';

export default function ControllerStatus({setting,lang}:{setting:(id:string)=>string;lang:'ja'|'en'}) {
  const state=controllerState(setting);
  const ja=lang==='ja';
  const unknown=ja?'値なし':'Unknown';
  return <section className="controller-status" aria-label={ja?'PAD感度の状態':'Controller sensitivity state'}>
    <strong>{ja?'現在の感度モード':'Current sensitivity mode'}: {state.base==='alc'?(ja?'詳細感度（ALC）':'Advanced Look Controls'):state.base==='presets'?(ja?'数字感度':'Preset sensitivity'):unknown}</strong>
    <div><span>{ja?'数字スコープ感度':'Preset per-optic sensitivity'}</span><b>{state.alc===true?(ja?'ALC使用中は無効':'Inactive while ALC is on'):state.alc===null||state.numericOptics===null?unknown:state.numericOpticsActive?(ja?'有効':'Active'):(ja?'オフ':'Off')}</b></div>
    <div><span>{ja?'ALCスコープ倍率':'ALC per-optic multipliers'}</span><b>{state.multipliers===null?unknown:state.multipliersActive?(ja?'オン':'On'):(ja?'オフ':'Off')}</b></div>
    {state.multipliersActive&&<details className="setting-note"><summary>{ja?'倍率の適用について':'About these multipliers'}</summary><p>{ja?'ALC本体がオフでも数字感度に重ねて使う保存状態です。表示は保存倍率そのものです。ゲーム更新後の効果は実機で未検証です。':'This saved state uses ALC multipliers alongside preset sensitivity even with ALC off. Values shown are the stored multipliers. Effects after game updates have not been tested in game.'}</p></details>}
  </section>;
}

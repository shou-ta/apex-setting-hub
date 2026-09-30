import { sameSettingValue } from './settingValues';
import ControllerStatus from './ControllerStatus';
import { gameCatalog } from './gameCatalog';
import { controllerAdvancedOpticIds } from './settings';

type Props = {
  lang: 'ja' | 'en';
  t: (id: string) => string;
  setting: (id: string) => string;
  files: { name: string; readonly: boolean }[];
  pending: boolean;
  onNavigate: (page: string) => void;
};

export default function Dashboard({lang,t,setting,files,pending,onNavigate}: Props) {
  const number = (id: string, digits?: number) => {
    const raw = setting(id);
    return raw.trim() !== '' && Number.isFinite(Number(raw))
      ? digits === undefined ? raw : Number(raw).toFixed(digits)
      : '—';
  };
  const width=number('width'), height=number('height');
  const resolution=width==='—'||height==='—'?'—':`${width} × ${height}`;
  const toggle = (id: string) => sameSettingValue(setting(id),'1')?t('on'):sameSettingValue(setting(id),'0')?t('off'):'—';
  const advancedLook=sameSettingValue(setting('controller_custom_aim'),'1');
  const controllerChoice=(id: string) => {
    const row=gameCatalog.controller.flatMap(group=>group.rows).find(row=>row.id===id);
    const choice=row?.choices?.find(choice=>sameSettingValue(choice.value,setting(id)));
    return choice?choice[lang]:'—';
  };
  const controllerIds=advancedLook
    ? ['controller_alc_yaw','controller_alc_pitch','controller_alc_ads_yaw','controller_alc_ads_pitch']
    : ['controller_look_sensitivity','controller_ads_sensitivity','controller_response_curve'];
  return <section className="dashboard-overview" aria-label={t('overview')}>
    <div className="dashboard-caption">
      <span>{pending?(lang==='ja'?'編集中の設定':'Edited configuration'):t('overview')}</span>
      {pending&&<small>{lang==='ja'?'まだファイルには保存されていません':'Not yet saved to files'}</small>}
    </div>
    <div className="dashboard-main">
    <div className="dashboard-left">
    <div className="dashboard-values">
      {[
        {id:'sensitivity',value:number('sensitivity',2),page:'input'},
        {id:'fov',value:number('fov'),page:'video'},
        {id:'resolution',value:resolution,page:'video'},
      ].map(item=><button className="dashboard-value" key={item.id} onClick={()=>onNavigate(item.page)}>
        <span>{t(item.id)}</span><strong>{item.value}</strong><span className="dashboard-edit">{lang==='ja'?'変更':'Edit'} <span aria-hidden="true">↗</span></span>
      </button>)}
    </div>
    <div className="dashboard-basics">
      {['vsync','auto_sprint','per_optic'].map(id=><div key={id}><span>{t(id)}</span><strong>{toggle(id)}</strong></div>)}
    </div>
    <section className="dashboard-files" aria-label={t('protection')}>
      <div className="dashboard-files-heading"><span>{t('protection')}</span><button className="text-link" onClick={()=>onNavigate('protection')}>{lang==='ja'?'管理':'Manage'} <span aria-hidden="true">→</span></button></div>
      <div className="dashboard-file-list">{files.map(file=><div key={file.name}><span>{file.name}</span><strong className={file.readonly?'warning':'good'}>{file.readonly?t('readonly'):t('writable')}</strong></div>)}</div>
    </section>
    </div>
    <section className="card dashboard-controller">
      <div className="card-title"><h3>{lang==='ja'?'PAD感度':'Controller Sensitivity'}</h3><button className="text-link" onClick={()=>onNavigate('controller')}>{lang==='ja'?'変更':'Edit'} <span aria-hidden="true">→</span></button></div>
      <ControllerStatus setting={setting} lang={lang}/>
      {controllerIds.map(id=><div className="summary-row" key={id}><span>{t(id)}</span><strong>{advancedLook?number(id):controllerChoice(id)}</strong></div>)}
      <div className="summary-row"><span>{lang==='ja'?'ALCスコープ倍率':'ALC Per-optic Multipliers'}</span><strong>{toggle('controller_alc_per_optic')}</strong></div>
      {sameSettingValue(setting('controller_alc_per_optic'),'1')&&<div className="dashboard-optics">
        <p className="page-hint">{advancedLook
          ? (lang==='ja'?'詳細感度に適用するスコープ倍率':'Per-optic multipliers for Advanced Look Controls')
          : (lang==='ja'?'ALCはオフ・数字感度に重ねて使うスコープ倍率':'ALC is off · Per-optic multipliers used with preset sensitivity')}</p>
        <div className="dashboard-optic-values">{controllerAdvancedOpticIds.map(id=>{
          const value=number(id,1);
          return <div key={id}><span>{t(id)}</span><strong>{value==='—'?value:`× ${value}`}</strong></div>;
        })}</div>
      </div>}
    </section>
    </div>
  </section>;
}

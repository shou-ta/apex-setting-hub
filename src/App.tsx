import KeyCapture from './KeyCapture';
import NumericSlider from './NumericSlider';
import SpecialBindTable from './SpecialBindTable';
import { spotShadowChoice, spotShadowEdits } from './spotShadows';
import { sameSettingValue } from './settingValues';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { labels, opticIds, controllerNumericOpticIds, controllerAdvancedOpticIds, controllerAlcRows } from './settings';
import { gameCatalog, controllerAdsChoices, controllerOpticChoices, type GameRow } from './gameCatalog';
import { applyBindEdits, removeUnchangedEdits, type Edit, type Snapshot } from './pendingEdits';
import Dashboard from './Dashboard';
import ControllerStatus from './ControllerStatus';
import SettingNote from './SettingNote';
import { controllerState } from './controllerState';
import { effectiveMouseAdsSensitivity, mouseAdsSensitivityEdits } from './mouseSensitivityLink';
import { rowSettingIds, editsForAction, groupEdits } from './editTracking';
import ResolutionControl from './ResolutionControl';
import SettingChoice from './SettingChoice';
import { aspectRatio } from './resolutionFormat';
import { splitBackupGroups, zipExportFilename, zipExportTimestamp } from './backupPresentation';
import SidebarFooter from './SidebarFooter';

const appIcon = new URL('../src-tauri/icons/icon.png', import.meta.url).href;

type Preview = { changes: { label: string; file: string; before: string; after: string }[]; conflict: string | null };
type Backup = { id: string; created: number; root: string; readonly: Record<string,boolean>; name: string; locked: boolean };
type Invoke = <T>(cmd: string, args?: Record<string,unknown>) => Promise<T>;
type DialogOpen = (options: { directory: true; multiple: false }) => Promise<string | null>;
type DialogSave = (options: { defaultPath: string; filters: { name: string; extensions: string[] }[] }) => Promise<string | null>;

const catalogNames = Object.fromEntries(Object.values(gameCatalog).flatMap(groups=>groups.flatMap(group=>group.rows)).filter(row=>row.id).map(row=>[row.id!,{ja:row.ja,en:row.en}]));
const actionIds = gameCatalog.input.flatMap(group=>group.rows).filter(row=>row.control==='bind'&&row.id).map(row=>row.id!);
const brightnessPercent = (gamma: string) => Number.isFinite(Number(gamma)) ? Math.max(0,Math.min(100,Math.round((1.75-Number(gamma))/0.015))) : 50;
const brightnessGamma = (percent: number) => (1.75-0.015*percent).toFixed(6);
const colorPresets = [
  {value:'255 0 0',ja:'赤',en:'Red',hex:'#ff0000'},
  {value:'0 255 0',ja:'緑',en:'Green',hex:'#00ff00'},
  {value:'0 255 255',ja:'シアン',en:'Cyan',hex:'#00ffff'},
  {value:'255 0 255',ja:'マゼンタ',en:'Magenta',hex:'#ff00ff'},
  {value:'255 255 0',ja:'黄',en:'Yellow',hex:'#ffff00'},
  {value:'255 255 255',ja:'白',en:'White',hex:'#ffffff'},
];
const colorHex = (raw:string):string|null => {
  const parts=raw.trim().split(/\s+/).map(Number);
  if(parts.length===3&&parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255))return `#${parts.map(n=>n.toString(16).padStart(2,'0')).join('')}`;
  if(parts.length===1&&Number.isInteger(parts[0])&&parts[0]>=0&&parts[0]<=0xffffff)return `#${parts[0].toString(16).padStart(6,'0')}`;
  return null;
};
const transparentCrosshair = '2147483648 2147483648 2147483648';
const isTransparentCrosshair = (value:string) => value===transparentCrosshair||value==='-2147483648 -2147483648 -2147483648';
const jp: Record<string,string> = {
  launch_options:'起動オプション',
  dashboard:'ダッシュボード', input:'マウス/キーボード', gameplay:'ゲームプレイ', video:'ビデオ', keybinds:'キー割当', special:'特殊機能', special_binds:'特殊キー', disable_shadows:'影を消す', shadow_hint:'サンシャドウの保存値をオフにします。現行版で見た目が変わらない可能性があります。', transparent_crosshair:'透明クロスヘア', transparent_hint:'特殊な色コードをレティクルに設定します。表示効果は照準器やゲーム更新によって異なる場合があります。', brightness:'明るさ', adaptive_resolution:'解像度適応の目標fps', adaptive_fps_min:'解像度適応の基準時間（短）', adaptive_fps_max:'解像度適応の基準時間（長）', impact_marks:'衝撃マーク（壁・地形）', impact_marks_models:'衝撃マーク（モデル）', reticle_color:'レティクル', laser_color:'レーザーサイトの色', health_ammo_popups:'体力と弾薬のポップアップ', share_usage:'使用状況のシェア', protection:'ファイル保護', backup:'バックアップ', export:'ZIP書き出し', other:'その他の操作',
  gibs:'破片の描画', ragdoll_self_collision:'ラグドールの自己衝突', fade_distance:'小物の表示距離', dynamic_streaming_budget:'動的ストリーミング', experimental_video:'追加の描画設定', experimental_hint:'破片・ラグドール・小物の現行版での効果は未検証です。', dynamic_hint:'以前はゲーム内で変更できました。2025年にメニューから削除。VRAM不足時だけテクスチャとモデルの読み込み量を一時的に下げるため、通常はオンを推奨します。', file_missing:'この設定はファイルにありません。適用すると新しい行を追加します。',
  overview:'現在の設定', settings:'設定', advanced:'詳細', sensitivity:'マウス感度', fov:'視野角', resolution:'解像度', vsync:'垂直同期', auto_sprint:'オートスプリント', per_optic:'スコープ別感度', backup_zip:'バックアップ＆ZIP', zip_current:'今の設定をZIP保存', zip_backup:'ZIP保存', show_older_backups:'他 {count} 件のバックアップを表示',
  jump:'ジャンプ',reload:'リロード',ping:'ピン',melee:'近接攻撃',interact:'インタラクト',shield_battery:'シールドバッテリー',shield_cell:'シールドセル',med_kit:'医療キット',syringe:'注射器',phoenix_kit:'フェニックスキット',
  apply:'適用',review:'差分を確認',cancel:'キャンセル',add:'追加',remove:'削除',key:'キー',action:'アクション',fps:'FPS制限',fov_special:'FOV切替',current:'現在のファイル',edited:'編集中の設定',selected_backup:'選択したバックアップ',writable:'書き込み可能',readonly:'読み取り専用',normal:'通常書込',replace:'置換書込',choose:'フォルダを選択',empty:'設定フォルダが見つかりません',press:'キーを押してください…',source:'対象',download:'ZIPを保存',restore:'復元',no_changes:'未適用の変更はありません',conflict:'外部変更との競合',game_running:'Apexが起動中です。終了後に適用できます。', higher_fov:'110を超える値はゲーム内の通常範囲を超えます。', create_backup:'今の設定をバックアップ',manual_backup_hint:'現在のファイルを保存します。未適用の編集内容は含みません。',backup_created:'バックアップを作成しました',backup_hint:'設定の保存前に自動バックアップします。プリセット以外の最新10件を保持します。', key_hint:'キー1・キー2の欄をクリックして入力し、右クリックで解除します。使用中のキーは割当先を確認してから移動します。', preview_title:'変更内容の確認',file:'ファイル',status:'状態', special_count:'特殊キー数',bind_count:'割当数', language:'言語',folder:'設定フォルダ', write_mode:'書込方法', load:'読込', choose_key:'キーを記録', on:'オン', off:'オフ', unlimited:'無制限', no_backup:'バックアップがありません', restore_confirm:'このバックアップを復元しますか？ 現在の設定を置き換えます。', replace_warning:'置換書込では新ファイルを検証してから入れ替えます。', success:'完了しました', rename_backup:'名前を変更',lock_backup:'プリセットに登録',unlock_backup:'通常に戻す',locked_backup:'プリセット',backup_lock_hint:'プリセットは件数制限の対象外です。復元時はバックアップを追加しません。',low_video:'画質最低',low_video_hint:'ビデオの画質項目を最低にします。解像度・明るさ・画面モードと他のファイルは維持します。',low_video_done:'画質最低を適用しました',low_video_confirm:'未適用の変更を破棄して画質最低を適用しますか？',preset_hint:'画質最低はvideoconfig.txtのみ変更します。保存したプリセットの復元は3ファイルが対象です。',inspect:'内容を確認'
};
const en: Record<string,string> = {
  launch_options:'Launch options',
  dashboard:'Dashboard', input:'Mouse/Keyboard', gameplay:'Gameplay', video:'Video', keybinds:'Keybinds', special:'Special Features', special_binds:'Special Binds', disable_shadows:'Disable Shadows', shadow_hint:'Sets the sun-shadow value to off. The current game may show no visible change.', transparent_crosshair:'Transparent Crosshair', transparent_hint:'Sets a special reticle color code. Appearance may vary by optic and game update.', brightness:'Brightness', adaptive_resolution:'Adaptive Resolution FPS Target', adaptive_fps_min:'Adaptive Resolution Frame Time (short)', adaptive_fps_max:'Adaptive Resolution Frame Time (long)', impact_marks:'Impact Marks (surfaces)', impact_marks_models:'Impact Marks (models)', reticle_color:'Reticle', laser_color:'Laser Sight Color', health_ammo_popups:'Health and Ammo Popups', share_usage:'Share Usage Data', protection:'File Protection', backup:'Backup', export:'ZIP Export', other:'Other action',
  gibs:'Gib Rendering', ragdoll_self_collision:'Ragdoll Self Collision', fade_distance:'Small Object Fade Distance', dynamic_streaming_budget:'Dynamic Streaming', experimental_video:'Additional Rendering Options', experimental_hint:'Current-game effects of gibs, ragdolls and small-object fade have not been tested.', dynamic_hint:'This was once an in-game option, removed from the menu in 2025. It temporarily lowers texture and model streaming when VRAM is nearly full, so On is normally recommended.', file_missing:'This key is absent from your file. Applying will add a line.',
  overview:'Current settings', settings:'Settings', advanced:'Advanced', sensitivity:'Sensitivity', fov:'FOV', resolution:'Resolution', vsync:'VSync', auto_sprint:'Auto Sprint', per_optic:'Per Optic', backup_zip:'Backups & ZIP', zip_current:'Save current settings as ZIP', zip_backup:'Save ZIP', show_older_backups:'Show {count} older backups',
  jump:'Jump',reload:'Reload',ping:'Ping',melee:'Melee',interact:'Interact',shield_battery:'Shield Battery',shield_cell:'Shield Cell',med_kit:'Med Kit',syringe:'Syringe',phoenix_kit:'Phoenix Kit',
  apply:'Apply',review:'Review Diff',cancel:'Cancel',add:'Add',remove:'Remove',key:'Key',action:'Action',fps:'FPS Limit',fov_special:'FOV preset',current:'Current Files',edited:'Edited Configuration',selected_backup:'Selected Backup',writable:'Writable',readonly:'Read-only',normal:'Normal',replace:'Replace',choose:'Choose folder',empty:'Apex config folder was not found',press:'Press a key…',source:'Source',download:'Save ZIP',restore:'Restore',no_changes:'No pending changes',conflict:'External change conflict',game_running:'Apex is running. Close it before applying changes.',higher_fov:'Values above 110 exceed the normal in-game range.',create_backup:'Back up current settings',manual_backup_hint:'Saves the current files. Pending edits are not included.',backup_created:'Backup created',backup_hint:'A backup is created before saving settings. The latest 10 non-preset backups are retained.',key_hint:'Click a Key 1 or Key 2 cell to assign a key, or right-click to clear it. A key already in use requires confirmation before it moves.',preview_title:'Review changes',file:'File',status:'Status',special_count:'Special binds',bind_count:'Bindings',language:'Language',folder:'Config folder',write_mode:'Write mode',load:'Load',choose_key:'Capture key',on:'On',off:'Off',unlimited:'Unlimited',no_backup:'No backups yet',restore_confirm:'Restore this backup? This replaces the current settings.',replace_warning:'Replace verifies a staged file before swapping it in.',success:'Done',rename_backup:'Rename',lock_backup:'Save as preset',unlock_backup:'Move to backups',locked_backup:'Presets',backup_lock_hint:'Presets are excluded from the 10 backup limit. Restoring does not create a backup.',low_video:'Lowest graphics',low_video_hint:'Sets video quality options to their minimum. Resolution, brightness, display mode and other files stay unchanged.',low_video_done:'Lowest graphics applied',low_video_confirm:'Discard pending changes and apply Lowest graphics?',preset_hint:'Lowest graphics changes only videoconfig.txt. Restoring a saved preset replaces all three files.',inspect:'Inspect'
};

export default function App({invoke,open,save}:{invoke:Invoke;open:DialogOpen;save:DialogSave}) {
  const [lang,setLang]=useState<'ja'|'en'>('ja'); const t=(id:string)=>(lang==='ja'?jp:en)[id]||catalogNames[id]?.[lang]||labels[id]?.[lang==='ja'?0:1]||id;
  const [page,setPage]=useState('dashboard'); const [roots,setRoots]=useState<string[]>([]); const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [edits,setEdits]=useState<Edit[]>([]); const [preview,setPreview]=useState<Preview|null>(null); const [review,setReview]=useState(false);
  const [writeMode,setWriteMode]=useState<'normal'|'replace'>('normal'); const [backups,setBackups]=useState<Backup[]>([]);
  const [modes,setModes]=useState<string[]>([]); const [running,setRunning]=useState(false); const [inspected,setInspected]=useState<Snapshot|null>(null);
  const [renameId,setRenameId]=useState(''); const [backupName,setBackupName]=useState('');
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const [collapsedGroups,setCollapsedGroups]=useState<Set<string>>(()=>new Set());
  const [audioDetailsOpen,setAudioDetailsOpen]=useState(false);
  useEffect(()=>{if(!message)return;const timer=window.setTimeout(()=>setMessage(''),3200);return()=>window.clearTimeout(timer);},[message]);

  const values=useMemo(()=>{ const v={...snapshot?.settings}; for(const e of edits) if(e.kind==='setting') v[e.id]=e.value; return v; },[snapshot,edits]);
  const fileStates=useMemo(()=>{ const v=Object.fromEntries((snapshot?.files||[]).map(f=>[f.name,f.readonly])); for(const e of edits) if(e.kind==='readonly') v[e.file]=e.value; return v as Record<string,boolean>; },[snapshot,edits]);
  const binds=useMemo(()=>applyBindEdits(snapshot?.binds||[],edits),[snapshot,edits]);
  const loadPath=async(path:string)=>{ if(snapshot&&edits.length&&!window.confirm(lang==='ja'?'未適用の変更を破棄して設定を再読込しますか？':'Discard pending changes and reload the config?'))return; setBusy(true);setMessage('');try{const s=await invoke<Snapshot>('load',{path});setSnapshot(s);setEdits([]);setPreview(null);setReview(false);setRoots(r=>r.includes(s.root)?r:[...r,s.root]);}catch(e){setMessage(String(e));}finally{setBusy(false);} };
  const refreshBackups=()=>invoke<Backup[]>('backups').then(setBackups).catch(e=>setMessage(String(e)));
  useEffect(()=>{ invoke<string[]>('detect').then(r=>{setRoots(r);if(r[0])void loadPath(r[0]);}).catch(e=>setMessage(String(e))); invoke<string[]>('resolutions').then(setModes).catch(()=>{}); invoke<boolean>('game_running').then(setRunning).catch(()=>{}); void refreshBackups(); },[]);
  useEffect(()=>{const timer=window.setInterval(()=>{invoke<boolean>('game_running').then(setRunning).catch(()=>{});},3000);return()=>window.clearInterval(timer);},[invoke]);
  useEffect(()=>{ if(!snapshot||!edits.length){setPreview(null);return;} let valid=true; const timer=setTimeout(()=>invoke<Preview>('get_preview',{edits}).then(p=>{if(valid)setPreview(p)}).catch(e=>{if(valid)setMessage(String(e))}),180);return()=>{valid=false;clearTimeout(timer)}; },[snapshot,edits]);
  const updateEdits=(next:(old:Edit[])=>Edit[])=>setEdits(old=>removeUnchangedEdits(snapshot,next(old)));
  const stage=(edit:Edit)=>{setReview(false);setPreview(null);setMessage('');updateEdits(old=>[...old.filter(e=>{if(edit.kind==='setting')return !(e.kind==='setting'&&e.id===edit.id);if(edit.kind==='readonly')return !(e.kind==='readonly'&&e.file===edit.file);if('key'in edit)return !('key'in e&&e.key.toUpperCase()===edit.key.toUpperCase());return true;}),edit]);};
  const stageBind=(edit:Extract<Edit,{kind:'bind'|'special'}>,replacedKey?:string)=>{
    if(replacedKey?.toUpperCase()===edit.key.toUpperCase())return false;
    const current=binds.find(b=>b.key.toUpperCase()===edit.key.toUpperCase());
    if(current){const label=t(current.action);if(!window.confirm(lang==='ja'?`${edit.key} は「${label}」で使用中です。割当を移しますか？`:`${edit.key} is used by ${label}. Move the key?`))return false;}
    setReview(false);setPreview(null);setMessage('');
    updateEdits(old=>[...old.filter(e=>!('key'in e&&[edit.key,replacedKey].some(key=>key&&e.key.toUpperCase()===key.toUpperCase()))),...(replacedKey?[{kind:'remove_bind' as const,key:replacedKey}]:[]),edit]);
    return true;
  };
  const chooseFolder=async()=>{const path=await open({directory:true,multiple:false});if(path)await loadPath(path);};
  const apply=async()=>{if(!edits.length)return;setBusy(true);setMessage('');try{const s=await invoke<Snapshot>('apply_edits',{edits,mode:writeMode});setSnapshot(s);setEdits([]);setReview(false);setMessage(t('success'));await refreshBackups();}catch(e){setMessage(String(e));}finally{setBusy(false);} };
  const restore=async(id:string)=>{if(!window.confirm(t('restore_confirm')))return;setBusy(true);try{const s=await invoke<Snapshot>('restore',{id});setSnapshot(s);setEdits([]);setInspected(null);setPreview(null);setReview(false);setMessage(t('success'));await refreshBackups();}catch(e){setMessage(String(e));}finally{setBusy(false);} };
  const applyLowVideo=async()=>{
    if(edits.length&&!window.confirm(t('low_video_confirm')))return;
    setBusy(true);setMessage('');
    try{
      const s=await invoke<Snapshot>('apply_low_video_preset',{mode:writeMode});
      setSnapshot(s);setEdits([]);setPreview(null);setReview(false);
      setMessage(t('low_video_done'));await refreshBackups();
    }catch(e){setMessage(String(e));}finally{setBusy(false);}
  };
  const createBackup=async()=>{setBusy(true);setMessage('');try{await invoke<Backup>('create_backup');await refreshBackups();setMessage(t('backup_created'));}catch(e){setMessage(String(e));}finally{setBusy(false);}};
  const updateBackup=async(id:string,name?:string,locked?:boolean)=>{setBusy(true);setMessage('');try{await invoke<Backup>('update_backup',{id,name:name??null,locked:locked??null});await refreshBackups();setRenameId('');}catch(e){setMessage(String(e));}finally{setBusy(false);}};
  const inspect=async(id:string)=>{try{setInspected(await invoke<Snapshot>('inspect_backup',{id}));}catch(e){setMessage(String(e));}};
  const exportZip=async(source:'current'|'backup',backup?:Backup)=>{
    if(source==='backup'&&!backup)return;
    setBusy(true);setMessage('');
    try{
      const generatedAt=new Date();
      const destination=await save({defaultPath:zipExportFilename(generatedAt),filters:[{name:'ZIP',extensions:['zip']}]});
      if(!destination)return;
      await invoke('export',{source,backupId:source==='backup'?backup!.id:null,destination,edits:[],savedAt:zipExportTimestamp(generatedAt)});setMessage(t('success'));
    }
    catch(e){setMessage(String(e));}finally{setBusy(false);}
  };
  const sections=[{label:'',items:['dashboard']},{label:'settings',items:['gameplay','input','controller','video','audio','launch_options']},{label:'advanced',items:['special','protection','backup']}];
  const tabChangeCount=(tab:string)=>edits.filter(edit=>{
    if(edit.kind==='setting'){
      if(tab==='special')return ['disable_shadows','reticle_color','gibs','ragdoll_self_collision','fade_distance','dynamic_streaming_budget'].includes(edit.id);
      return (gameCatalog[tab]||[]).some(group=>group.rows.some(row=>row.id===edit.id));
    }
    if(tab==='special'){
      if(edit.kind==='special')return true;
      if(edit.kind==='remove_bind'){const key=edit.key.toUpperCase();return snapshot?.binds.some(bind=>bind.key.toUpperCase()===key&&!!bind.special);}
    }
    if(tab!=='input')return false;
    if(edit.kind==='bind')return actionIds.includes(edit.action);
    if(edit.kind==='remove_bind'){const key=edit.key.toUpperCase();return snapshot?.binds.some(bind=>bind.key.toUpperCase()===key&&!bind.special&&actionIds.includes(bind.action));}
    return false;
  }).length;
  const setting=(id:string)=>id==='ads_sensitivity'?effectiveMouseAdsSensitivity(values):values[id]||'—';
  const padState=controllerState(setting);
  const tracked=(content:ReactNode,targets:Edit[],key?:string|number)=><div className={`tracked-row${targets.length?' is-edited':''}`} key={key}>{content}</div>;
  const trackedSetting=(content:ReactNode,ids:string[],key?:string|number)=>tracked(content,edits.filter(edit=>edit.kind==='setting'&&ids.includes(edit.id)),key);
  const note=(text:string,label=lang==='ja'?'補足':'Details')=><SettingNote label={label} text={text}/>;
  const presetReason=padState.alc===true?(lang==='ja'?'ALC使用中は無効。ALCをオフにすると使用できます。':'Inactive while ALC is on. Turn ALC off to use this setting.'):undefined;
  const presetIds=['controller_look_sensitivity','controller_ads_sensitivity','controller_response_curve','controller_look_deadzone'];
  const metric=(id:string,value:string,hint?:string)=><div className="metric" key={id}><span>{t(id)}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;
  const select=(value:string,options:string[],onChange:(value:string)=>void,label?:string)=><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{options.map(v=><option value={v} key={v}>{v==='0'&&(label==='fps'||label===t('fps'))?t('unlimited'):t(v)}</option>)}</select>;
  const diffText=(value:string)=>value.split(' / ').map(part=>part==='Read-only'?t('readonly'):part==='Writable'?t('writable'):part.startsWith('fps ')?`${t('fps')} ${part.slice(4)}`:part.startsWith('fov ')?`${t('fov')} ${part.slice(4)}`:t(part)).join(' / ');
  const diffValue=(id:string,value:string)=>{
    if(id==='disable_shadows')return value==='0'?t('on'):value==='1'?t('off'):value;
    if(['gibs','ragdoll_self_collision','dynamic_streaming_budget'].includes(id))return value==='0'?t('off'):value==='1'?t('on'):value;
    if(id==='fade_distance')return value==='0.75'?(lang==='ja'?'近い':'Near'):value==='1.0'?(lang==='ja'?'標準':'Standard'):value;
    if(id==='brightness'&&value!=='—')return `${brightnessPercent(value)}%`;
    if(id==='adaptive_resolution')return value==='0'?t('off'):value==='1'?t('on'):value;
    if((id==='adaptive_fps_min'||id==='adaptive_fps_max')&&value!=='—')return `${value} μs`;
    if(id==='impact_marks')return value==='0'?(lang==='ja'?'無効':'Disabled'):value==='256'?(lang==='ja'?'有効':'Enabled'):value;
    if(id==='impact_marks_models')return value==='0'?(lang==='ja'?'なし':'No'):value==='1'?(lang==='ja'?'あり':'Yes'):value;
    if(id==='reticle_color'||id==='laser_color'){
      if(value===' ')return lang==='ja'?'デフォルト':'Default';
      if(id==='reticle_color'&&isTransparentCrosshair(value))return `${t('transparent_crosshair')} (${value})`;
      const preset=colorPresets.find(color=>color.hex===colorHex(value));
      return preset?(lang==='ja'?preset.ja:preset.en):colorHex(value)?.toUpperCase()||(lang==='ja'?'保存済みのカスタム色':'Existing custom color');
    }
    if(id==='controller_survival_slot')return value==='0'?t('on'):value==='1'?t('off'):value;
    if(id==='share_usage'||id==='laser_customized')return value==='0'?t('off'):value==='1'?t('on'):value;
    if(value==='-1'&&(controllerNumericOpticIds as readonly string[]).includes(id))return id==='controller_ads_sensitivity'?(lang==='ja'?'視点感度と同じ':'Same as Look Sensitivity'):(lang==='ja'?'デフォルト':'Default');
    if(value!=='—'&&(controllerNumericOpticIds as readonly string[]).includes(id)&&/^[0-7]$/.test(value))return String(Number(value)+1);
    if(value!=='—'&&controllerAlcRows.some(row=>row.id===id&&row.unit==='%')&&Number.isFinite(Number(value)))return `${Math.round(Number(value)*100)}%`;
    const choice=Object.values(gameCatalog).flatMap(groups=>groups.flatMap(group=>group.rows)).find(row=>row.id===id)?.choices?.find(option=>sameSettingValue(option.value,value));
    return choice?(lang==='ja'?choice.ja:choice.en):diffText(value);
  };
  const stageSettings=(ids:readonly string[],value:string)=>{setReview(false);setPreview(null);updateEdits(old=>[...old.filter(e=>!(e.kind==='setting'&&ids.includes(e.id))),...ids.map(id=>({kind:'setting' as const,id,value}))]);};
  const stagePairs=(pairs:{id:string;value:string}[],clearIds=pairs.map(pair=>pair.id))=>{setReview(false);setPreview(null);setMessage('');updateEdits(old=>[...old.filter(e=>!(e.kind==='setting'&&clearIds.includes(e.id))),...pairs.map(pair=>({kind:'setting' as const,...pair}))]);};
  const stageMouseAdsSensitivity=(value:string)=>{
    const linked=sameSettingValue(setting('per_optic'),'0');
    stagePairs(mouseAdsSensitivityEdits(value,linked,snapshot?.settings),linked?['ads_sensitivity','optic_1x']:['ads_sensitivity']);
  };
  const togglePerOptic=(enabled:boolean)=>stage({kind:'setting',id:'per_optic',value:enabled?'1':'0'});
  const stageReflex=(mode:string)=>{setReview(false);setPreview(null);updateEdits(old=>[...old.filter(e=>!(e.kind==='setting'&&(e.id==='reflex_enabled'||e.id==='reflex_boost'))),{kind:'setting',id:'reflex_enabled',value:mode==='off'?'0':'1'},{kind:'setting',id:'reflex_boost',value:mode==='boost'?'1':'0'}]);};
  const rawstepRow=(id:string,min:number,max:number,step:number,decimals=2)=><div className="setting-row"><div><strong>{t(id)}</strong><small>{min.toFixed(decimals)} – {max.toFixed(decimals)}</small></div><NumericSlider label={t(id)} value={setting(id)} min={min} max={max} step={step} decimals={decimals} onChange={value=>stage({kind:'setting',id,value})}/></div>;
  const rawvolumeRow=(id:string)=><div className="setting-row volume-row"><div><strong>{t(id)}</strong><small>{Math.round((Number(setting(id))||0)*100)}%</small></div><input type="range" min="0" max="1" step="0.01" value={Number.isFinite(Number(setting(id)))?Number(setting(id)):0} aria-label={t(id)} onChange={e=>stage({kind:'setting',id,value:Number(e.target.value).toFixed(2)})}/></div>;
  const rawcontrollerToggle=(id:string,name=t(id),disabled=false)=><div className="setting-row"><strong>{name}</strong><div className="segmented"><button disabled={disabled} className={sameSettingValue(setting(id),'0')?'selected':''} onClick={()=>stage({kind:'setting',id,value:'0'})}>{t('off')}</button><button disabled={disabled} className={sameSettingValue(setting(id),'1')?'selected':''} onClick={()=>stage({kind:'setting',id,value:'1'})}>{t('on')}</button></div></div>;
  const rawalcSlider=(id:string,min:number,max:number,step:number,unit?:'%')=>{const raw=Number(setting(id));const valid=Number.isFinite(raw);const value=valid?Math.min(max,Math.max(min,raw)):min;const label=unit?`${Math.round(raw*100)}%`:step<1?raw.toFixed(1):String(raw);return <div className="setting-row alc-slider" key={id}><strong>{t(id)}</strong><div className="alc-control"><input type="range" min={min} max={max} step={step} value={value} aria-label={t(id)} onChange={e=>stage({kind:'setting',id,value:unit?Number(e.target.value).toFixed(2):String(Number(e.target.value))})}/><span>{valid?label:'—'}</span></div></div>};
  const stepRow=(id:string,min:number,max:number,step:number,decimals=2)=>trackedSetting(rawstepRow(id,min,max,step,decimals),[id],id);
  const volumeRow=(id:string)=>trackedSetting(rawvolumeRow(id),[id],id);
  const controllerToggle=(id:string,name=t(id),disabled=false)=>trackedSetting(rawcontrollerToggle(id,name,disabled),[id],id);
  const alcSlider=(id:string,min:number,max:number,step:number,unit?:'%')=>trackedSetting(rawalcSlider(id,min,max,step,unit),[id],id);
  const bindTableRow=(row:GameRow,index:number)=>{
    const name=lang==='ja'?row.ja:row.en;
    const action=row.control==='bind'?row.id:undefined;
    const assigned=action?binds.filter(b=>b.action===action):[];
    return tracked(<div className={`bind-table-row ${action?'':'bind-table-unavailable'}`} key={index}>
      <div className="bind-action"><strong>{name}</strong>{!action&&<small>{lang==='ja'?'ゲーム内で変更':'Change in game'}</small>}{assigned.length>2&&<div className="bind-overflow">{assigned.slice(2).map(b=><span className="key-pill" key={b.key} onContextMenu={event=>{event.preventDefault();stage({kind:'remove_bind',key:b.key});}}>{b.key.toUpperCase()}</span>)}</div>}</div>
      {[0,1].map(slot=><div className="bind-slot" key={slot}>{action?<KeyCapture lang={lang} actionLabel={name} value={assigned[slot]?.key} placeholder="—" className="bind-slot-capture" ariaLabel={`${name} ${t('key')}${slot+1}`} t={t} onPick={key=>stageBind({kind:'bind',key,action},assigned[slot]?.key)} onClear={()=>assigned[slot]&&stage({kind:'remove_bind',key:assigned[slot].key})}/>:<span className="bind-slot-disabled">—</span>}</div>)}
    </div>,action?editsForAction(edits,snapshot,action):[],index);
  };
  const rawCatalogRow=(row:GameRow,index:number)=>{
    const name=lang==='ja'?row.ja:row.en;
    const id=row.id;
    if(row.control==='audio-details')return <div className="controller-submenu" key={index}><button className="details-toggle" aria-expanded={audioDetailsOpen} onClick={()=>setAudioDetailsOpen(v=>!v)}>{audioDetailsOpen?'▾':'▸'} {name}</button>{audioDetailsOpen&&<div className="controller-subrows">{['audio_dialogue','audio_music_game','audio_music_lobby','audio_sfx'].map(volumeRow)}{controllerToggle('audio_focus')}{controllerToggle('audio_reduced_music')}{controllerToggle('voice_enabled')}</div>}</div>;
    if(row.control==='derived-aspect')return <div className="setting-row" key={index}><strong>{name}</strong><span className="observed-value">{aspectRatio(Number(setting('width')),Number(setting('height')),lang)}</span></div>;
    if(row.control==='reflex'){const mode=sameSettingValue(setting('reflex_enabled'),'0')?'off':sameSettingValue(setting('reflex_boost'),'1')?'boost':'on';return <div className="setting-row" key={index}><strong>{name}</strong><SettingChoice lang={lang} label={name} value={mode} onChange={stageReflex} options={[{value:'off',label:lang==='ja'?'無効':'Disabled'},{value:'on',label:lang==='ja'?'有効':'Enabled'},{value:'boost',label:lang==='ja'?'有効＋ブースト':'Enabled + Boost'}]}/></div>}
    if(!id||!row.control)return <div className="setting-row unavailable-row" key={index}><div><strong>{name}</strong>{note(lang==='ja'?'このアプリでは安全な保存先・選択肢の対応をまだ確認できていません。ゲーム内で変更してください。':'The app has not verified a safe saved location or option mapping. Change this in game.',lang==='ja'?'未対応':'Unavailable')}</div><span className="unavailable-badge">{lang==='ja'?'ゲーム内で変更':'Change in game'}</span></div>;
    if(row.control==='mouse-ads'){
      const perOpticOn=sameSettingValue(setting('per_optic'),'1');
      const linked=sameSettingValue(setting('per_optic'),'0');
      const targets=linked?['ads_sensitivity','optic_1x']:[id];
      const help=linked?(lang==='ja'?'スコープ別感度がオフの間は1倍スコープと連動します':'Linked to the 1× optic while Per Optic Sensitivity is off'):perOpticOn?(lang==='ja'?'スコープ別エイム感度がオンの間は1倍スコープ側で変更します':'Change the 1× optic value while Per Optic Sensitivity is on'):(lang==='ja'?'スコープ別感度の状態を確認できないため、通常の倍率を表示しています':'Per Optic status is unknown; showing the saved ADS multiplier');
      return tracked(<div className={`setting-row mouse-ads-row${perOpticOn?' is-disabled-setting':''}`}><div><strong>{name}</strong><small>{help}</small></div><NumericSlider label={name} value={setting(id)} min={0.1} max={20} step={0.1} decimals={1} disabled={perOpticOn} onChange={stageMouseAdsSensitivity}/></div>,edits.filter(edit=>edit.kind==='setting'&&targets.includes(edit.id)),id);
    }
    if(row.control==='optic')return <div key={index}>{tracked(<div className="setting-row"><div><strong>{name}</strong><small>{lang==='ja'?'オンにするとスコープごとの倍率を設定できます':'Turn on to configure each optic multiplier'}</small></div><div className="segmented"><button className={sameSettingValue(setting(id),'0')?'selected':''} onClick={()=>togglePerOptic(false)}>{t('off')}</button><button className={sameSettingValue(setting(id),'1')?'selected':''} onClick={()=>togglePerOptic(true)}>{t('on')}</button></div></div>,edits.filter(edit=>edit.kind==='setting'&&edit.id===id))}{sameSettingValue(setting(id),'1')&&<div className="optic-inline">{opticIds.map(optic=><div key={optic}>{stepRow(optic,0.1,20,0.01)}</div>)}<div className="form-row"><button className="ghost" onClick={()=>stageSettings(opticIds,'1.00')}>{t('reset_optics')}</button><button className="ghost" onClick={()=>stageSettings(opticIds,(Number(setting('optic_1x'))||1).toFixed(2))}>{t('copy_optic')}</button></div></div>}</div>;
    if(row.control==='controller-optic')return <div key={index} className="controller-submenu">{presetReason&&<p className="inactive-reason">{presetReason}</p>}{controllerToggle(id,lang==='ja'?'スコープ倍率エイム感度':'Per-optic ADS Sensitivity',padState.alc===true)}{sameSettingValue(setting(id),'1')&&<div className="controller-subrows">{controllerNumericOpticIds.map((optic,i)=>trackedSetting(<div className="setting-row"><strong>{i===0?(lang==='ja'?'1倍スコープ/アイアンサイト':'1× Optic / Iron Sights'):t(optic)}</strong><SettingChoice lang={lang} label={i===0?(lang==='ja'?'1倍スコープ/アイアンサイト':'1× Optic / Iron Sights'):t(optic)} value={setting(optic)} disabled={padState.alc===true} options={(i===0?controllerAdsChoices:controllerOpticChoices).map(option=>({value:option.value,label:lang==='ja'?option.ja:option.en}))} onChange={value=>stage({kind:'setting',id:optic,value})}/></div>,[optic],optic))}</div>}</div>;
    if(row.control==='controller-alc')return <div key={index} className="controller-submenu">{controllerToggle(id,lang==='ja'?'カスタムの視点操作':'Custom Look Controls')}{sameSettingValue(setting(id),'1')&&<div className="controller-subrows">{controllerAlcRows.slice(0,3).map(spec=>alcSlider(spec.id,spec.min,spec.max,spec.step,spec.unit))}{controllerAlcRows.slice(3).map(spec=>alcSlider(spec.id,spec.min,spec.max,spec.step,spec.unit))}<div className="controller-subheading">{lang==='ja'?'ターゲット補正':'Target Compensation'}</div>{controllerToggle('controller_alc_target_compensation')}{controllerToggle('controller_alc_melee_compensation')}</div>}<div className="controller-subheading">{lang==='ja'?'ALCスコープ倍率（数字感度にも反映）':'ALC Per-optic Multipliers (also used with presets)'}</div>{controllerToggle('controller_alc_per_optic')}{sameSettingValue(setting('controller_alc_per_optic'),'1')&&<div className="controller-subrows controller-optic-sliders">{controllerAdvancedOpticIds.map(optic=>alcSlider(optic,0.1,20,0.1))}</div>}</div>;
    if(row.control==='bind')return bindTableRow(row,index);
    if(id==='controller_cursor_speed'){const raw=Number(setting(id));const value=Number.isFinite(raw)?Math.min(4300,Math.max(1300,raw)):1300;return <div className="setting-row" key={index}><strong>{name}</strong><div className="cursor-speed-control"><button aria-label={`${name} −`} onClick={()=>stage({kind:'setting',id,value:String(Math.max(1300,value-100))})}>−</button><input type="range" min="1300" max="4300" step="100" value={value} aria-label={name} onChange={e=>stage({kind:'setting',id,value:e.target.value})}/><output>{Number.isFinite(raw)?String(raw):'—'}</output><button aria-label={`${name} +`} onClick={()=>stage({kind:'setting',id,value:String(Math.min(4300,value+100))})}>+</button></div></div>;}
    if(row.control==='step')return <div key={index}>{stepRow(id,0.01,20,0.01,2)}</div>;
    if(row.control==='volume')return <div key={index}>{volumeRow(id)}</div>;
    if(row.control==='threshold')return <div key={index}>{alcSlider(id,0,10000,100)}</div>;
    if(row.control==='color'){
      const laser=id==='laser_customized';
      const colorId=laser?'laser_color':'reticle_color';
      const rawColor=setting(colorId);
      const custom=laser?sameSettingValue(setting(id),'1'):rawColor!==' '&&rawColor!=='—';
      const currentHex=colorHex(rawColor);
      const preset=colorPresets.find(color=>color.hex===currentHex);
      const setDefault=()=>laser?stage({kind:'setting',id,value:'0'}):stage({kind:'setting',id:colorId,value:' '});
      const setCustom=()=>{if(custom)return;if(laser)stage({kind:'setting',id,value:'1'});else stage({kind:'setting',id:colorId,value:colorPresets[0].value});};
      const chooseColor=(value:string)=>stagePairs(laser?[{id,value:'1'},{id:colorId,value}]:[{id:colorId,value}]);
      const rgb=currentHex?[1,3,5].map(offset=>parseInt(currentHex.slice(offset,offset+2),16)):null;
      const setChannel=(channel:number,next:number)=>{if(!rgb)return;const updated=[...rgb];updated[channel]=Math.max(0,Math.min(255,Math.round(next)));chooseColor(updated.join(' '));};
      return <div className="setting-row color-setting-row" key={index}>
        <div><strong>{name}</strong>{custom&&<small>{currentHex&&<span className="current-color" style={{backgroundColor:currentHex}}/>}{isTransparentCrosshair(rawColor)?t('transparent_crosshair'):preset?(lang==='ja'?preset.ja:preset.en):currentHex?.toUpperCase()||(lang==='ja'?'現在のカスタム色':'Current custom color')}</small>}</div>
        <div className="color-controls">
          <div className="segmented"><button className={!custom?'selected':''} onClick={setDefault}>{lang==='ja'?'デフォルト':'Default'}</button><button className={custom?'selected':''} onClick={setCustom}>{lang==='ja'?'カスタマイズ':'Customize'}</button></div>
          {custom&&<><div className="color-presets">{colorPresets.map(color=><button key={color.value} className={preset?.value===color.value?'selected':''} style={{backgroundColor:color.hex}} title={lang==='ja'?color.ja:color.en} aria-label={`${name}: ${lang==='ja'?color.ja:color.en}`} aria-pressed={preset?.value===color.value} onClick={()=>chooseColor(color.value)}/>)}</div>
          {rgb?<div className="rgb-editor"><input type="color" aria-label={`${name} RGB`} value={currentHex||'#ff0000'} onChange={e=>{const hex=e.target.value;chooseColor([1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)).join(' '));}}/>{rgb.map((value,channel)=><label key={channel}><span>{'RGB'[channel]}</span><input type="range" min="0" max="255" step="1" value={value} aria-label={`${name} ${'RGB'[channel]}`} onChange={e=>setChannel(channel,Number(e.target.value))}/><output>{value}</output></label>)}</div>:<small>{lang==='ja'?'通常のRGBへ変更するには色を選択してください':'Select a color to switch to standard RGB.'}</small>}</>}
        </div>
      </div>;
    }
    if(row.control==='brightness'){
      const percent=brightnessPercent(setting(id));
      return <div className="setting-row volume-row" key={index}><strong>{name}</strong><div className="alc-control"><input type="range" min="0" max="100" step="1" value={percent} aria-label={name} onChange={e=>stage({kind:'setting',id,value:brightnessGamma(Number(e.target.value))})}/><span>{percent}%</span></div></div>;
    }
    if(row.control==='adaptive-fps'){
      const rawMin=Number(setting('adaptive_fps_min'));
      const current=sameSettingValue(setting(id),'0')?0:rawMin>0?Math.round(950000/rawMin):0;
      const choose=(fps:number)=>{
        if(fps===0){stagePairs([{id,value:'0'}],[id,'adaptive_fps_min','adaptive_fps_max']);return;}
        const pairs=[{id,value:'1'},{id:'adaptive_fps_min',value:String(Math.round(950000/fps))},{id:'adaptive_fps_max',value:String(Math.round(980000/fps))}];
        if(sameSettingValue(setting('anti_aliasing'),'0'))pairs.push({id:'anti_aliasing',value:'12'});
        stagePairs(pairs);
      };
      return <div className="setting-row" key={index}><div><strong>{name}</strong>{note(lang==='ja'?'0でオフ、1〜100 FPS。オンにするとTSAAも有効化します。':'0 disables it; 1–100 FPS. Enabling this also enables TSAA.')}</div><NumericSlider label={name} value={String(current)} min={0} max={100} step={1} onChange={value=>choose(Number(value))}/></div>;
    }
    if(row.control==='spot-shadow')return <div className="setting-row" key={index}><strong>{name}</strong><SettingChoice lang={lang} label={name} value={spotShadowChoice(setting)} options={[{value:'custom',label:lang==='ja'?'現在の個別設定':'Current custom settings'},...(row.choices||[]).map(choice=>({value:choice.value,label:choice[lang]}))].filter(option=>option.value!=='custom'||spotShadowChoice(setting)==='custom')} onChange={value=>{if(value!=='custom')stagePairs(spotShadowEdits(value));}}/></div>;
    if(row.control==='impact-marks'){
      const mode=sameSettingValue(setting(id),'0')?'off':sameSettingValue(setting('impact_marks_models'),'1')?'high':'low';
      const choose=(next:string)=>stagePairs([{id,value:next==='off'?'0':'256'},{id:'impact_marks_models',value:next==='high'?'1':'0'}]);
      return <div className="setting-row" key={index}><strong>{name}</strong><SettingChoice lang={lang} label={name} value={mode} onChange={choose} options={[{value:'off',label:lang==='ja'?'無効':'Disabled'},{value:'low',label:lang==='ja'?'低':'Low'},{value:'high',label:lang==='ja'?'高':'High'}]}/></div>;
    }
    const raw=setting(id);
    if(row.control==='observed'){const match=row.choices?.find(option=>Number(option.value)===Number(raw));const shown=match?(lang==='ja'?match.ja:match.en):raw==='—'?(lang==='ja'?'値なし':'No value'):(lang==='ja'?`保存値 ${raw}`:`Saved value ${raw}`);return <div className="setting-row observed-row" key={index}><div><strong>{name}</strong>{note(lang==='ja'?'保存値は読み取れますが、他の選択肢との対応が未確定のため表示のみです。変更はゲーム内で行ってください。':'The saved value can be read, but other choices are unverified. This row is read-only; change it in game.',lang==='ja'?'表示のみ':'Read-only')}</div><span className="observed-value">{shown}</span></div>};
    let control;
    if(row.control==='toggle'||row.control==='inverse-toggle'){
      const inverted=row.control==='inverse-toggle';
      const on=inverted?'0':'1',off=inverted?'1':'0';
      control=<div className="segmented"><button className={sameSettingValue(raw,off)?'selected':''} onClick={()=>stage({kind:'setting',id,value:off})}>{t('off')}</button><button className={sameSettingValue(raw,on)?'selected':''} onClick={()=>stage({kind:'setting',id,value:on})}>{t('on')}</button></div>;
    } else if(row.control==='display')control=<SettingChoice lang={lang} label={name} value={sameSettingValue(setting('fullscreen'),'1')?'fullscreen':sameSettingValue(setting('borderless'),'1')?'borderless':'windowed'} onChange={mode=>stagePairs([{id:'fullscreen',value:mode==='fullscreen'?'1':'0'},{id:'borderless',value:mode==='borderless'?'1':'0'}])} options={[{value:'fullscreen',label:lang==='ja'?'フルスクリーン':'Fullscreen'},{value:'borderless',label:lang==='ja'?'ボーダーレス':'Borderless'},{value:'windowed',label:lang==='ja'?'ウィンドウ':'Windowed'}]}/>;
    else if(row.control==='fov')control=<NumericSlider label={name} value={raw} min={70} max={120} step={2} onChange={value=>stage({kind:'setting',id,value})}/>;
    else if(row.control==='choice')control=<SettingChoice lang={lang} label={name} value={raw} disabled={id==='hold_sprint'&&sameSettingValue(setting('auto_sprint'),'1')||presetIds.includes(id)&&padState.alc===true||id==='controller_ads_sensitivity'&&padState.numericOptics===true} options={(row.choices||[]).map(option=>({value:option.value,label:lang==='ja'?option.ja:option.en}))} onChange={value=>stage({kind:'setting',id,value})}/>;
    else if(row.control==='select')control=<SettingChoice lang={lang} label={name} value={raw} options={(row.options||[]).map(value=>({value,label:t(value)}))} onChange={value=>stage({kind:'setting',id,value})}/>;
    else if(row.control==='resolution')control=<ResolutionControl lang={lang} width={setting('width')} height={setting('height')} modes={modes} onChange={(width,height)=>stagePairs([{id:'width',value:width},{id:'height',value:height}])}/>;
    return <div className={`setting-row${id==='hold_sprint'&&sameSettingValue(setting('auto_sprint'),'1')?' is-disabled-setting':''}`} key={index}><div><strong>{name}</strong>{id==='hold_sprint'&&sameSettingValue(setting('auto_sprint'),'1')&&<small>{lang==='ja'?'常時スプリントがオンの間は変更できません':'Unavailable while Always Sprint is on'}</small>}{presetIds.includes(id)&&presetReason&&<small className="inactive-reason">{presetReason}</small>}{id==='controller_ads_sensitivity'&&!presetReason&&padState.numericOptics===true&&<small className="inactive-reason">{lang==='ja'?'スコープ設定の1倍感度で変更します。':'Edit the 1× value in Per Optic Settings.'}</small>}{id==='controller_button_layout'&&note(lang==='ja'?'カスタムはゲーム内で保存済みの配置を使用します。個々のボタンの編集はゲーム内で行ってください。':'Custom uses your saved in-game layout. Edit individual controller buttons in game.')}{id==='arsenal_icons'&&note(lang==='ja'?'小・中の保存値は選択順から推定しています。ゲーム内での実機検証は未実施です。':'Small/Medium values are inferred from option order and have not been tested in game.',lang==='ja'?'推定対応':'Inferred mapping')}{row.control==='fov'&&Number(raw)>110&&note(t('higher_fov'),lang==='ja'?'通常範囲外':'Extended range')}</div>{control}</div>;
  };
  const catalogRow=(row:GameRow,index:number)=>['step','volume','threshold','controller-optic','controller-alc','audio-details','bind'].includes(row.control||'')?rawCatalogRow(row,index):trackedSetting(rawCatalogRow(row,index),rowSettingIds(row),index);
  const catalogPage=gameCatalog[page]&&<>{gameCatalog[page].map((group,index)=>{
    const isBindGroup=page==='input'&&index>0;
    const groupKey=`${page}-${index}`;
    const collapsed=collapsedGroups.has(groupKey);
    const changed=groupEdits(group.rows,edits,snapshot).length;
    const title=lang==='ja'?group.ja:group.en;
    return <section className={`card settings-card collapsible-card ${isBindGroup?'bind-table-card':''} ${changed>0?'has-edits':''}`} key={index}>
      <div className="card-title"><button className="group-toggle" aria-expanded={!collapsed} aria-controls={`group-${groupKey}`} onClick={()=>setCollapsedGroups(old=>{const next=new Set(old);if(next.has(groupKey))next.delete(groupKey);else next.add(groupKey);return next;})}><span className="group-chevron" aria-hidden="true">{collapsed?'▸':'▾'}</span><span className="group-heading">{title}</span><span className="group-count">{group.rows.length}</span></button></div>
      <div id={`group-${groupKey}`} hidden={collapsed}>
        {page==='input'&&index===1&&<p className="page-hint">{t('key_hint')}</p>}
        {isBindGroup?<div className="bind-table"><div className="bind-table-head"><span>{t('action')}</span><span>{t('key')}1</span><span>{t('key')}2</span></div>{group.rows.map(bindTableRow)}</div>:group.rows.map(catalogRow)}
      </div>
    </section>;
  })}</>;

  const specialGroup=(key:string,title:string,content:ReactNode)=>{
    const groupKey=`special-${key}`; const collapsed=collapsedGroups.has(groupKey);
    return <section className="card settings-card collapsible-card"><div className="card-title"><button className="group-toggle" aria-expanded={!collapsed} aria-controls={groupKey} onClick={()=>setCollapsedGroups(old=>{const next=new Set(old);if(next.has(groupKey))next.delete(groupKey);else next.add(groupKey);return next;})}><span className="group-chevron" aria-hidden="true">{collapsed?'▸':'▾'}</span><span className="group-heading">{title}</span></button></div><div id={groupKey} hidden={collapsed}>{content}</div></section>;
  };
  const experimentalOptions=[
    {id:'gibs',options:[['0','オフ','Off'],['1','オン','On']]},
    {id:'ragdoll_self_collision',options:[['0','オフ','Off'],['1','オン','On']]},
    {id:'fade_distance',options:[['0.75','近い','Near'],['1.0','標準','Standard']]},
    {id:'dynamic_streaming_budget',options:[['0','オフ','Off'],['1','オン','On']]},
  ];
  const specialPage=<>
    {specialGroup('features',t('special'),<>
      {trackedSetting(<div className="setting-row"><div><strong>{t('disable_shadows')}</strong>{note(t('shadow_hint'))}</div><div className="segmented"><button className={sameSettingValue(setting('disable_shadows'),'1')?'selected':''} onClick={()=>stage({kind:'setting',id:'disable_shadows',value:'1'})}>{t('off')}</button><button className={sameSettingValue(setting('disable_shadows'),'0')?'selected':''} onClick={()=>stage({kind:'setting',id:'disable_shadows',value:'0'})}>{t('on')}</button></div></div>,['disable_shadows'])}
      {trackedSetting(<div className="setting-row"><div><strong>{t('transparent_crosshair')}</strong>{note(t('transparent_hint'))}</div><div className="segmented"><button className={setting('reticle_color')===' '?'selected':''} onClick={()=>stage({kind:'setting',id:'reticle_color',value:' '})}>{t('off')}</button><button className={isTransparentCrosshair(setting('reticle_color'))?'selected':''} onClick={()=>stage({kind:'setting',id:'reticle_color',value:transparentCrosshair})}>{t('on')}</button></div></div>,['reticle_color'])}
    </>)}
    {specialGroup('video',t('experimental_video'),<>
      <div className="page-hint">{note(t('experimental_hint'),lang==='ja'?'効果の検証状況':'Verification status')}</div>
      {experimentalOptions.map(feature=>trackedSetting(<div className="setting-row"><div><strong>{t(feature.id)}</strong>{feature.id==='dynamic_streaming_budget'&&note(t('dynamic_hint'))}{setting(feature.id)==='—'&&note(t('file_missing'))}</div>{feature.id==='fade_distance'?<SettingChoice lang={lang} label={t(feature.id)} value={setting(feature.id)} options={feature.options.map(([value,ja,en])=>({value,label:lang==='ja'?ja:en}))} onChange={value=>stage({kind:'setting',id:feature.id,value})}/>:<div className="segmented">{feature.options.map(([value,ja,en])=><button key={value} className={sameSettingValue(setting(feature.id),value)?'selected':''} onClick={()=>stage({kind:'setting',id:feature.id,value})}>{lang==='ja'?ja:en}</button>)}</div>}</div>,[feature.id],feature.id))}
    </>)}
    {snapshot&&specialGroup('binds',lang==='ja'?'キーで設定を切り替える':'Switch settings with a key',<SpecialBindTable snapshot={snapshot} binds={binds} edits={edits} lang={lang} t={t} onAssign={(key,special,value,replacedKey)=>stageBind({kind:'special',key,special,value},replacedKey)} onRemove={key=>stage({kind:'remove_bind',key})} onValue={(keys,special,value)=>{setReview(false);setPreview(null);setMessage('');updateEdits(old=>[...old.filter(edit=>!('key'in edit&&keys.some(key=>key.toUpperCase()===edit.key.toUpperCase()))),...keys.filter(Boolean).map(key=>({kind:'special' as const,key,special,value}))]);}}/>)}
  </>;
  const backupGroups=splitBackupGroups(backups,snapshot?.root||'');
  const backupRow=(b:Backup)=><div className="backup-row" key={b.id}>
    <div className="backup-description">{renameId===b.id?<form className="backup-rename" onSubmit={e=>{e.preventDefault();void updateBackup(b.id,backupName);}}>
      <input autoFocus aria-label={t('rename_backup')} maxLength={100} value={backupName} onChange={e=>setBackupName(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setRenameId('');}}/>
      <button className="ghost" disabled={busy}>{lang==='ja'?'保存':'Save'}</button><button type="button" className="ghost" disabled={busy} onClick={()=>setRenameId('')}>{t('cancel')}</button>
    </form>:<><strong>{b.name||new Date(b.created).toLocaleString(lang==='ja'?'ja-JP':'en-US')}{b.locked&&<span className="backup-lock-badge">{t('locked_backup')}</span>}</strong>
      <small>{b.name?new Date(b.created).toLocaleString(lang==='ja'?'ja-JP':'en-US'):b.id}</small></>}</div>
    <div className="row-actions">
      <button className="ghost" disabled={busy} onClick={()=>{setRenameId(b.id);setBackupName(b.name||'');}}>{t('rename_backup')}</button>
      <button className={'ghost '+(b.locked?'backup-locked':'')} disabled={busy} onClick={()=>void updateBackup(b.id,undefined,!b.locked)}>{t(b.locked?'unlock_backup':'lock_backup')}</button>
      <button className="ghost" disabled={busy} onClick={()=>void inspect(b.id)}>{t('inspect')}</button>
      <button className="ghost" disabled={busy} onClick={()=>void exportZip('backup',b)}>{t('zip_backup')}</button>
      <button className="ghost" onClick={()=>void restore(b.id)} disabled={busy}>{t('restore')}</button>
    </div>
  </div>;
  const backupGroup=(locked:boolean)=>{
    const items=locked?backupGroups.locked:backupGroups.normalVisible;
    const count=locked?backupGroups.locked.length:backupGroups.normalCount;
    return <section className="card backup-group" key={String(locked)}>
      <div className="card-title"><h3>{locked?t('locked_backup'):(lang==='ja'?'通常のバックアップ':'Regular backups')}</h3><span>{locked?count+1:count}</span></div>
      {locked&&<p className="page-hint">{t('preset_hint')}</p>}
      {locked&&<div className="backup-row builtin-preset"><div className="backup-description"><strong>{t('low_video')}</strong><small>{t('low_video_hint')}</small></div><div className="row-actions"><button className="primary" disabled={busy||running} onClick={()=>void applyLowVideo()}>{t('apply')}</button></div></div>}
      {items.map(backupRow)}
      {!locked&&backupGroups.normalCollapsed.length>0&&<details className="backup-overflow">
        <summary>{t('show_older_backups').replace('{count}',String(backupGroups.normalCollapsed.length))}</summary>
        {backupGroups.normalCollapsed.map(backupRow)}
      </details>}
      {count===0&&!locked&&<p className="muted">{t('no_backup')}</p>}
    </section>;
  };
  return <div className="shell">
    <aside className="sidebar"><div className="brand"><img className="brand-mark" src={appIcon} alt=""/><div><strong>APEX</strong><span>SETTING HUB</span></div></div>
      {sections.map(section=><div className="nav-section" key={section.label}>{section.label&&<div className="nav-label">{t(section.label)}</div>}{section.items.map(item=><button className={`nav-item ${page===item?'current':''}${item==='launch_options'?' upcoming':''}`} key={item} disabled={item==='launch_options'} onClick={()=>setPage(item)}>{t(item)}{item==='launch_options'&&<small>{lang==='ja'?'近日追加予定':'Coming soon'}</small>}{['gameplay','input','controller','video','audio','special'].includes(item)&&tabChangeCount(item)>0&&<em>{tabChangeCount(item)}</em>}</button>)}</div>)}
      <SidebarFooter lang={lang} setLang={setLang} invoke={invoke}/>
    </aside>
    <main className={`main ${gameCatalog[page]||page==='special'?'settings-page':''}${page==='dashboard'?' dashboard-page':''}`}><header className="topbar"><div><div className="eyebrow">APEX SETTING HUB</div><h1>{t(page)}</h1><p className="path" title={snapshot?.root}>{snapshot?.root||t('empty')}</p></div><div className="top-actions"><span className={`game-indicator ${running?'running':''}`}>{running?t('game_running'):(lang==='ja'?'Apex 停止中':'Apex offline')}</span>{snapshot&&<button className="ghost" onClick={()=>void loadPath(snapshot.root)} disabled={busy}>{t('refresh')}</button>}<button className="ghost" onClick={chooseFolder}>{t('choose')}</button></div></header>
      {message&&<div className="app-toast notice" role="status"><span>{message}</span><button onClick={()=>setMessage('')}>×</button></div>}
      {!snapshot?<section className="empty-state"><div className="empty-icon">⌁</div><h2>{t('empty')}</h2><p>Saved Games / Respawn / Apex</p><button className="primary" onClick={chooseFolder}>{t('choose')}</button></section>:<>
      {roots.length>1&&<div className="folder-picker"><span>{t('folder')}</span>{select(snapshot.root,roots,v=>void loadPath(v),t('folder'))}</div>}
      {page==='controller'&&<ControllerStatus setting={setting} lang={lang}/>}
      {catalogPage}
      {page==='dashboard'&&<Dashboard lang={lang} t={t} setting={setting} files={snapshot.files.map(file=>({...file,readonly:fileStates[file.name]}))} pending={edits.length>0} onNavigate={setPage}/>}
      {page==='special'&&specialPage}
      {page==='protection'&&<section className="card settings-card"><div className="card-title"><h3>{t('protection')}</h3></div>{snapshot.files.map(f=>tracked(<div className="setting-row protection-file-row"><div><strong>{f.name}</strong><small>{fileStates[f.name]?t('readonly'):t('writable')}</small></div><div className="segmented"><button className={!fileStates[f.name]?'selected':''} onClick={()=>stage({kind:'readonly',file:f.name,value:false})}>{t('writable')}</button><button className={fileStates[f.name]?'selected':''} onClick={()=>stage({kind:'readonly',file:f.name,value:true})}>{t('readonly')}</button></div></div>,edits.filter(edit=>edit.kind==='readonly'&&edit.file===f.name),f.name))}<div className="divider"/><div className="setting-row"><div><strong>{t('write_mode')}</strong><small>{writeMode==='replace'?t('replace_warning'):t('backup_hint')}</small></div><div className="segmented"><button className={writeMode==='normal'?'selected':''} onClick={()=>setWriteMode('normal')}>{t('normal')}</button><button className={writeMode==='replace'?'selected':''} onClick={()=>setWriteMode('replace')}>{t('replace')}</button></div></div></section>}
      {page==='backup'&&<>
        <section className="card backup-create-card">
          <div className="card-title"><h3>{t('backup_zip')}</h3><span>{backupGroups.normalCount} / 10 · {t('locked_backup')} {backupGroups.locked.length+1}</span></div>
          <p className="page-hint">{t('backup_hint')} {t('backup_lock_hint')}</p>
          <div className="setting-row"><div><strong>{t('create_backup')}</strong><small>{t('manual_backup_hint')}</small></div>
            <div className="backup-create-actions"><button className="primary" disabled={busy} onClick={()=>void createBackup()}>{t('create_backup')}</button><button className="ghost" disabled={busy} onClick={()=>void exportZip('current')}>{t('zip_current')}</button></div>
          </div>
        </section>
        {backupGroup(true)}
        {backupGroup(false)}
      </>}
      </>}
    </main>
    {snapshot&&<div className="apply-bar"><div><strong>{edits.length} {lang==='ja'?'件の変更':'pending changes'}</strong><span>{edits.length?t('backup_hint'):t('no_changes')}</span></div><div className="apply-actions"><button className="ghost" disabled={!edits.length||busy} onClick={()=>setEdits([])}>{t('cancel')}</button><button className="primary" disabled={!edits.length||busy} onClick={()=>setReview(true)}>{t('review')}</button></div></div>}
    {review&&<div className="modal-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setReview(false)}}><div className="modal"><div className="modal-head"><div><span className="eyebrow">REVIEW BEFORE APPLY</span><h2>{t('preview_title')}</h2></div><button className="icon-button" onClick={()=>setReview(false)}>×</button></div>{preview?.conflict&&<div className="notice danger">{t('conflict')}: {preview.conflict}</div>}<div className="diff-list">{preview?.changes.map((c,i)=><div className="diff-row" key={i}><div><strong>{c.label.startsWith('Key ')?`${t('key')} ${c.label.slice(4).toUpperCase()}`:t(c.label)}</strong><small>{c.file}</small></div><div><span className="before">{diffValue(c.label,c.before||'—')}</span><span className="arrow">→</span><span className="after">{diffValue(c.label,c.after)}</span></div></div>)}</div><div className="modal-foot"><span>{writeMode==='replace'?t('replace'):t('normal')}</span><button className="ghost" onClick={()=>setReview(false)}>{t('cancel')}</button><button className="primary" disabled={busy||!!preview?.conflict||running||!preview?.changes.length} onClick={()=>void apply()}>{t('apply')}</button></div></div></div>}
    {inspected&&<div className="modal-cover" onMouseDown={e=>{if(e.target===e.currentTarget)setInspected(null)}}><div className="modal"><div className="modal-head"><h2>{t('backup')} · {t('inspect')}</h2><button className="icon-button" onClick={()=>setInspected(null)}>×</button></div><div className="metrics backup-metrics">{['sensitivity','fov','width','height','vsync','auto_sprint','per_optic'].map(id=>metric(id,inspected.settings[id]||'—'))}{metric('bind_count',String(inspected.binds.length))}{metric('special_count',String(inspected.binds.filter(b=>b.special).length))}</div><div className="card-title"><h3>{t('keybinds')}</h3></div>{actionIds.filter(id=>inspected.binds.some(b=>b.action===id)).map(id=><div className="summary-row" key={id}><span>{t(id)}</span><span>{inspected.binds.filter(b=>b.action===id).map(b=>b.key.toUpperCase()).join(' / ')}</span></div>)}{inspected.binds.filter(b=>b.special).map(b=><div className="summary-row" key={b.key}><span>{b.key.toUpperCase()} · {t(b.action)}</span><span>{b.value}</span></div>)}<div className="card-title backup-subtitle"><h3>{t('protection')}</h3></div>{inspected.files.map(f=><div className="file-row" key={f.name}><span>{f.name}</span><strong>{f.readonly?t('readonly'):t('writable')}</strong></div>)}</div></div>}
  </div>;
}

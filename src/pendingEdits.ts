import { sameSettingValue } from './settingValues.ts';
export type Edit = { kind: 'setting'; id: string; value: string } | { kind: 'bind'; key: string; action: string } | { kind: 'special'; key: string; special: string; value: string } | { kind: 'remove_bind'; key: string } | { kind: 'readonly'; file: string; value: boolean };
export type Snapshot = { root: string; files: { name: string; readonly: boolean; hash: string }[]; settings: Record<string,string>; binds: { key: string; action: string; special: string | null; value: string | null }[] };


export const removeUnchangedEdits = (snapshot:Snapshot|null, edits:Edit[]):Edit[] => {
  if(!snapshot)return edits;
  return edits.filter(edit=>{
    if(edit.kind==='setting'){
      const saved=snapshot.settings[edit.id];
      return saved===undefined || !sameSettingValue(saved,edit.value);
    }
    if(edit.kind==='readonly')return snapshot.files.find(file=>file.name===edit.file)?.readonly!==edit.value;
    const saved=snapshot.binds.filter(bind=>bind.key.toUpperCase()===edit.key.toUpperCase());
    if(edit.kind==='remove_bind')return saved.length>0;
    if(edit.kind==='bind')return !saved.length || saved.some(bind=>bind.special!==null || bind.action!==edit.action);
    return !saved.length || saved.some(bind=>bind.special!==edit.special || !sameSettingValue(bind.value??'',edit.value));
  });
};

export function applyBindEdits(saved: Snapshot['binds'], edits: Edit[]): Snapshot['binds'] {
  let binds=[...saved];
  for(const edit of edits){
    if(!('key' in edit))continue;
    binds=binds.filter(bind=>bind.key.toUpperCase()!==edit.key.toUpperCase());
    if(edit.kind==='bind')binds.push({key:edit.key,action:edit.action,special:null,value:null});
    if(edit.kind==='special')binds.push({key:edit.key,action:edit.special==='fps'?'fps':'fov_special',special:edit.special,value:edit.value});
  }
  return binds;
}

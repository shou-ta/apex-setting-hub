import type {Snapshot} from './pendingEdits.ts';

export type SpecialSwitchRow={id:string;type:'fps'|'fov';value:string;key:string;originalKey:string};
export function specialSwitchRows(binds:Snapshot['binds']):SpecialSwitchRow[]{
  return binds.flatMap((bind,index)=>bind.special==='fps'||bind.special==='fov'?[{id:`saved-${index}-${bind.key}`,type:bind.special,value:bind.value??(bind.special==='fps'?'240':'110'),key:bind.key,originalKey:bind.key}]:[]);
}
export function assignSwitchKey(rows:readonly SpecialSwitchRow[],id:string,key:string):SpecialSwitchRow[]{
  return rows.map(row=>({...row,key:row.id===id?key:row.key.toUpperCase()===key.toUpperCase()?'':row.key}));
}

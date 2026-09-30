import type {Snapshot} from './pendingEdits.ts';

export type SpecialBindRow={id:string;type:'fps'|'fov';value:string;keys:string[];originalKeys:string[]};

export function specialBindRows(binds:Snapshot['binds']):SpecialBindRow[]{
 const rows:SpecialBindRow[]=[newSpecialBindRow('fps','default-fps'),newSpecialBindRow('fov','default-fov')];
 for(const bind of binds){
  if(bind.special!=='fps'&&bind.special!=='fov')continue;
  const value=bind.value??(bind.special==='fps'?'240':'110');
  const existing=rows.find(row=>row.type===bind.special&&row.value===value);
  if(existing){
   if(!existing.keys.some(key=>key.toUpperCase()===bind.key.toUpperCase())){
    existing.keys.push(bind.key);
    existing.originalKeys.push(bind.key);
   }
  }else rows.push({id:`saved-${bind.special}-${value}-${rows.length}`,type:bind.special,value,keys:[bind.key],originalKeys:[bind.key]});
 }
 return rows;
}

export function newSpecialBindRow(type:'fps'|'fov',id:string):SpecialBindRow{
 return{id,type,value:type==='fps'?'240':'110',keys:[],originalKeys:[]};
}

export const compactSpecialKeys=(keys:readonly string[]):string[]=>keys.filter(key=>typeof key==='string'&&key.length>0);

export const specialKeySlot=(keys:readonly string[],requested:number):number=>Math.min(requested,compactSpecialKeys(keys).length);

export function assignSpecialKey<T extends {id:string;keys:string[]}>(rows:readonly T[],id:string,requested:number,key:string):T[]{
  return rows.map(row=>{
    const original=compactSpecialKeys(row.keys);
    const keys=original.map(saved=>saved.toUpperCase()===key.toUpperCase()?'':saved);
    if(row.id===id)keys[specialKeySlot(original,requested)]=key;
    return {...row,keys:compactSpecialKeys(keys)};
  });
}

export function removeSpecialKey<T extends {id:string;keys:string[]}>(rows:readonly T[],id:string,slot:number):T[]{
  return rows.map(row=>row.id===id?{...row,keys:compactSpecialKeys(row.keys).filter((_,index)=>index!==slot)}:row);
}

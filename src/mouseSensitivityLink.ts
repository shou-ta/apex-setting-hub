import { sameSettingValue } from './settingValues.ts';

export type MouseSensitivityValues=Record<string,string|undefined>;
export type MouseSensitivityPair={id:'ads_sensitivity'|'optic_1x';value:string};

export function effectiveMouseAdsSensitivity(values:MouseSensitivityValues):string{
 if(values.per_optic!=='0'&&values.per_optic!=='1')return values.ads_sensitivity||'—';
 return values.optic_1x&&values.optic_1x!=='—'?values.optic_1x:values.ads_sensitivity||'—';
}

export function mouseAdsSensitivityPairs(value:string,linked:boolean):MouseSensitivityPair[]{
 const pairs:MouseSensitivityPair[]=[{id:'ads_sensitivity',value}];
 if(linked)pairs.push({id:'optic_1x',value});
 return pairs;
}

export function mouseAdsSensitivityEdits(value:string,linked:boolean,saved?:MouseSensitivityValues):MouseSensitivityPair[]{
 if(linked&&saved&&sameSettingValue(effectiveMouseAdsSensitivity({...saved,per_optic:'0'}),value))return [];
 return mouseAdsSensitivityPairs(value,linked);
}

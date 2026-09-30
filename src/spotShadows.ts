import { sameSettingValue } from './settingValues.ts';
const presets: Record<string, readonly string[]> = {
  '0': ['0','0','0'], '128': ['128','2','1'], '256': ['256','2','1'], '512': ['512','3','1'],
};
export const spotShadowIds = ['spot_detail_observed','spot_shadow_upres','shadows'] as const;
export function spotShadowEdits(value: string) {
  const preset = presets[value];
  if (!preset) throw new Error('Unsupported spot shadow preset');
  return spotShadowIds.map((id,index)=>({id,value:preset[index]}));
}
export function spotShadowChoice(setting: (id: string)=>string) {
  return Object.entries(presets).find(([,values])=>spotShadowIds.every((id,index)=>sameSettingValue(setting(id),values[index])))?.[0] ?? 'custom';
}

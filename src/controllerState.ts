import { sameSettingValue } from './settingValues.ts';
export function controllerState(setting: (id: string) => string) {
  const flag = (id:string) => sameSettingValue(setting(id),'1') ? true : sameSettingValue(setting(id),'0') ? false : null;
  const alc = flag('controller_custom_aim');
  const numericOptics = flag('controller_per_optic_ads');
  const multipliers = flag('controller_alc_per_optic');
  return {
    alc, numericOptics, multipliers,
    base: alc===true ? 'alc' : alc===false ? 'presets' : 'unknown',
    numericOpticsActive: alc===false && numericOptics===true,
    // This independent saved flag remains relevant when ALC itself is off.
    multipliersActive: multipliers===true,
  };
}

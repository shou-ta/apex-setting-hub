import assert from 'node:assert/strict';
import test from 'node:test';
import { gameCatalog, controllerAdsChoices, controllerOpticChoices } from '../src/gameCatalog.ts';
import { controllerAlcRows, controllerNumericOpticIds } from '../src/settings.ts';

test('saved trigger thresholds resolve to named options, not option indices', () => {
  const choices = gameCatalog.controller.flatMap(group => group.rows)
    .find(row => row.id === 'controller_trigger_deadzone').choices;
  for (const [raw, label] of [['0','None'],['30','Default'],['64','Moderate'],['128','High'],['255','Max']]) {
    assert.equal(choices.find(option => option.value === raw)?.en, label);
  }
  assert.equal(choices.find(option => option.value === '1'), undefined);
});

test('ADS inheritance is available without shifting the 1 through 8 presets', () => {
  assert.equal(controllerAdsChoices.find(option => option.value === '-1')?.en, 'Same as Look Sensitivity');
  assert.equal(controllerOpticChoices.find(option => option.value === '-1')?.en, 'Default');
  for (const choices of [controllerAdsChoices, controllerOpticChoices]) {
    for (let preset = 1; preset <= 8; preset++) {
      assert.equal(choices.find(option => option.value === String(preset - 1))?.en, String(preset));
    }
  }
  assert.equal(controllerNumericOpticIds.length, 8);
  assert.equal(controllerNumericOpticIds[7], 'controller_numeric_optic_seer_passive');
});

test('ALC controls use separate deadzone, curve, speed and acceleration ranges', () => {
  for (const [id,min,max] of [
    ['controller_alc_deadzone',0,0.5],['controller_alc_outer_threshold',0.01,0.3],
    ['controller_alc_curve',0,30],['controller_alc_yaw',0,500],['controller_alc_ads_pitch',0,500],
    ['controller_alc_extra_yaw',0,250],['controller_alc_ads_extra_pitch',0,250],
    ['controller_alc_ads_ramp_delay',0,1],
  ]) {
    const row = controllerAlcRows.find(row => row.id === id);
    assert.deepEqual([row.min,row.max], [min,max]);
  }
});

test('sprint control describes input behavior rather than an on/off flag', () => {
  const row = gameCatalog.gameplay.flatMap(group => group.rows).find(row => row.id === 'hold_sprint');
  assert.equal(row.control, 'choice');
  assert.deepEqual(row.choices.map(option => [option.value,option.ja]), [['0','押す'],['1','ホールド']]);
});

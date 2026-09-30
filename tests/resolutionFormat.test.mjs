import assert from 'node:assert/strict';
import test from 'node:test';
import { aspectRatio, resolutionLabel } from '../src/resolutionFormat.ts';

test('rounded Windows display modes use conventional aspect ratios', () => {
  for (const [width,height] of [[1176,664],[1360,768],[1366,768]]) {
    assert.equal(aspectRatio(width,height),'16:9');
  }
});

test('stretched and other common ratios stay distinct', () => {
  for (const [width,height,expected] of [[1728,1080,'16:10'],[1680,1050,'16:10'],[1440,1080,'4:3'],[1280,1024,'5:4'],[1620,1080,'3:2']]) {
    assert.equal(aspectRatio(width,height),expected);
  }
  assert.equal(resolutionLabel('1366x768'),'1366 × 768 (16:9)');
});

test('nonstandard ratios keep exact values and invalid values stay unavailable', () => {
  assert.equal(aspectRatio(1234,1000),'617:500');
  for (const [width,height] of [[0,1080],[1920,0],[NaN,1080],[1920,Infinity]]) {
    assert.equal(aspectRatio(width,height),'—');
  }
  assert.equal(resolutionLabel('invalid'),'—');
});

test('requested wide modes use a localized 16:10 family label', () => {
  for (const value of ['1280x768','1600x1024']) {
    assert.ok(resolutionLabel(value,'ja').endsWith('(16:10系)'));
    assert.ok(resolutionLabel(value,'en').endsWith('(16:10 family)'));
  }
  assert.equal(resolutionLabel('1728x1080','ja'),'1728 × 1080 (16:10)');
});

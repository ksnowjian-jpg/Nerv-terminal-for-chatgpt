import {describe,it,expect} from 'vitest';
import {contrastRatio,parseColor,composite} from '../src/core/compatibility/readability';
import tokens from '../themes/nerv/tokens.json';
import manifest from '../themes/nerv/manifest.json';
describe('readability calculations',()=>{
  it('measures the full black/white range and detects identical colors',()=>{
    expect(contrastRatio([0,0,0,1],[255,255,255,1])).toBe(21);
    expect(contrastRatio([17,17,17,1],[17,17,17,1])).toBe(1);
    expect(contrastRatio([231,230,223,1],[16,17,17,1])).toBeGreaterThan(15);
  });
  it('composites translucent text before calculating its visible contrast',()=>{
    expect(composite([0,0,0,.5],[255,255,255,1])).toEqual([127.5,127.5,127.5,1]);
    expect(contrastRatio([0,0,0,.5],[255,255,255,1])).toBeCloseTo(3.976,2);
    expect(contrastRatio([146,149,141,.5],[28,30,29,1])).toBeLessThan(4.5);
    expect(contrastRatio([146,149,141,1],[28,30,29,1])).toBeGreaterThan(4.5);
  });
  it('parses actual browser RGB values and rejects unsupported values',()=>{
    expect(parseColor('rgba(26, 28, 31, 0.494)')).toEqual([26,28,31,.494]);
    expect(parseColor('rgb(231 230 223 / 1)')).toEqual([231,230,223,1]);
    expect(parseColor('#e7e6df')).toEqual([231,230,223,1]);
    expect(parseColor('transparent')).toEqual([0,0,0,0]);expect(parseColor('invalid')).toBeNull();
  });
  it('keeps body and muted text readable even over the brightest possible backdrop pixel',()=>{
    // Conservatively stack the peak of every ambient gradient and a pure white
    // artwork pixel. This catches image effects the DOM color audit cannot see.
    let background=parseColor(tokens.chatBackground)!;
    background=composite([143,151,169,.035],background);
    background=composite([66,122,119,.09],background);
    background=composite([113,79,158,.13],background);
    background=composite([255,255,255,manifest.presentation.watermark.opacity],background);
    expect(contrastRatio(parseColor(tokens.chatText)!,background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(parseColor(tokens.chatMuted)!,background)).toBeGreaterThanOrEqual(4.5);
  });
});

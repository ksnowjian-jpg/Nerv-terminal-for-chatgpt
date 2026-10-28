import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {discoverThemes} from '../../scripts/catalog';
import path from 'node:path';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';

const chat='<main id="chat"><h1>Chat fixture</h1><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Host draft</div></div></main>';
test('settings round trips rebind fresh chat nodes, preserve collapse and respect explicit restore',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}aside.app-shell-left-panel{width:220px;flex-shrink:0}#workspace{flex:1;min-width:0}main{width:100%;height:100%}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"></nav></aside><div id="workspace">${chat}</div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  const bundle=await build({entryPoints:['src/core/injector/runtime.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(theme=>window.__CTE_LOCAL__!.install(theme),theme);
  await expect(page.locator('[data-cte-panel]')).toHaveCount(1);await page.getByRole('button',{name:'收起驾驶舱'}).click();
  await page.evaluate(startFrameTrace);
  for(let round=0;round<3;round++) {
    await page.locator('#workspace').evaluate(el=>{el.innerHTML='<section id="settings"><h1>Settings fixture</h1><button>Back to chat</button></section>';});
    await expect(page.locator('[data-cte-panel]')).toHaveCount(0);await expect(page.locator('[data-cte-reserve]')).toHaveCount(0);await expect(page.locator('#settings')).toBeVisible();
    await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('suspended');
    await expect(page.locator('html')).toHaveAttribute('data-cte-root');await expect(page.locator('[data-cte-style],[data-cte-runtime]')).toHaveCount(2);
    await page.locator('#workspace').evaluate((el,html)=>{el.innerHTML=html;},chat);
    await expect(page.locator('[data-cte-panel]')).toHaveCount(1);await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-collapsed');
    await expect(page.locator('#chat')).toBeVisible();await expect(page.locator('.ProseMirror')).toHaveText('Host draft');
    const size=await page.locator('#chat').boundingBox();expect(size!.width).toBeGreaterThan(500);
  }
  await page.getByRole('button',{name:'展开驾驶舱'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.passed)).toBe(true);
  // A modal settings surface may leave the chat nodes mounted but inert.
  await page.locator('#layout').evaluate(el=>{el.setAttribute('inert','');const dialog=document.createElement('div');dialog.id='settings-dialog';dialog.setAttribute('role','dialog');document.body.append(dialog);});
  await expect(page.locator('[data-cte-panel]')).toHaveCount(0);
  await page.evaluate(()=>{document.querySelector('#layout')!.removeAttribute('inert');document.querySelector('#settings-dialog')!.remove();});
  await expect(page.locator('[data-cte-panel]')).toHaveCount(1);await expect(page.locator('.ProseMirror')).toBeVisible();
  const frames=await page.evaluate(stopFrameTrace) as {frames:number};expect(frames).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});expect(frames.frames).toBeGreaterThan(10);
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());
  await page.locator('#workspace').evaluate((el,html)=>{el.innerHTML=html;},chat);
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('disabled');
  await expect(page.locator('[data-cte-panel], [data-cte-backdrop], [data-cte-reserve]')).toHaveCount(0);
});

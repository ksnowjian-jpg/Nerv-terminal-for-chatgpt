import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {discoverThemes} from '../../scripts/catalog';
import path from 'node:path';

test('refresh opens only the account menu, reads delayed quota, closes it and preserves pre-existing menus',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}#workspace{flex:1;min-width:0}main{width:100%;height:100%}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px}[role=menu]{position:fixed;left:0;top:60px;background:var(--cte-surface);z-index:2000;padding:12px}</style>
    <div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button id="account" aria-label="Account" aria-haspopup="menu" aria-controls="account-menu" aria-expanded="false">Avatar</button><button id="settings">Settings</button></nav></aside><div id="workspace"><main><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div><p>使用情况 剩余 99% (conversation fixture)</p></main></div></div>`);
  await page.evaluate(()=>{
    const trigger=document.querySelector('#account')!;
    trigger.setAttribute('data-open-count','0');
    const close=()=>{document.querySelector('#account-menu')?.remove();trigger.setAttribute('aria-expanded','false');(trigger as HTMLElement).focus();};
    trigger.addEventListener('pointerdown',()=>{
      if(document.querySelector('#account-menu')){close();return;}
      trigger.setAttribute('data-open-count',String(Number(trigger.getAttribute('data-open-count'))+1));trigger.setAttribute('aria-expanded','true');
      const menu=document.createElement('div');menu.id='account-menu';menu.setAttribute('role','menu');menu.tabIndex=-1;menu.innerHTML='<div role="menuitem">Loading</div>';document.body.append(menu);menu.focus();
      setTimeout(()=>{if(menu.isConnected)menu.innerHTML='<div role="menuitem">使用情况 · 剩余 61% 重置时间：明天 08:00</div>';},120);
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    document.querySelector('#settings')!.addEventListener('click',()=>{throw new Error('Must not navigate settings');});
  });
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  const bundle=await build({entryPoints:['src/core/injector/runtime.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(theme=>window.__CTE_LOCAL__!.install(theme),theme);
  const refresh=page.getByRole('button',{name:'能量校正'});
  await refresh.click();await expect(refresh).toBeDisabled();await expect(page.locator('[data-usage-value]')).toHaveText('61');await expect(refresh).toBeEnabled();
  await expect(page.locator('#account-menu')).toHaveCount(0);await expect(page.locator('[data-usage-reset]')).toHaveText('明天 08:00');await expect(page.locator('.ProseMirror')).toHaveText('Draft fixture');await expect(refresh).toBeFocused();
  await page.waitForTimeout(5200);await expect(page.locator('#account')).toHaveAttribute('data-open-count','1');await expect(page.locator('[data-usage-status]')).toHaveText('保留能量读数 · 非实时');
  await page.locator('main').evaluate(el=>el.replaceWith(el.cloneNode(true)));await expect(page.locator('[data-cte-panel]')).toHaveCount(1);await expect(page.locator('[data-usage-value]')).toHaveText('61');
  // A menu already open before the refresh must remain open.
  await page.locator('#account').dispatchEvent('pointerdown',{button:0,pointerType:'mouse'});await expect(page.locator('#account-menu')).toBeVisible();await page.waitForTimeout(150);
  await refresh.evaluate(el=>(el as HTMLButtonElement).click());await expect(refresh).toBeEnabled();await expect(page.locator('#account-menu')).toBeVisible();await expect(page.locator('#account')).toHaveAttribute('data-open-count','2');
  // Missing quota is a bounded failure, never a conversation percentage.
  await page.keyboard.press('Escape');await page.locator('#account').evaluate(el=>el.replaceWith(el.cloneNode(true)));await refresh.click();await expect(refresh).toBeEnabled({timeout:4000});
  await expect(page.locator('[data-usage-value]')).toHaveText('61');await expect(page.locator('[data-usage-note]')).toContainText('未能打开');
});

import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {discoverThemes} from '../../scripts/catalog';
import path from 'node:path';
import {probeExpression,verifyExpression} from '../../scripts/renderer';
test('local DOM fixture: preserve official controls, read visible quota and fail closed after drift',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  // This is a local synthetic fixture, never an official account or compatibility claim.
  await page.setContent('<nav id="history"><button id="history-control">History</button></nav><main><textarea id="prompt-textarea">Existing draft</textarea><button id="model-control">Model</button></main><div role="menu"><div role="menuitem">使用情况 · 剩余 96%</div></div>');
  const inspection=await page.evaluate(await probeExpression());
  expect(inspection).toMatchObject({compatible:true,ownedEnhancement:false,anchors:{main:1,history:1,composer:1}});
  expect(await page.evaluate(()=>typeof window.__CTE_LOCAL__)).toBe('undefined');
  const bundle=await build({entryPoints:['src/core/injector/runtime.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
  const catalog=await discoverThemes(path.resolve('themes'));const theme=catalog.themes.find(t=>t.manifest.id==='nerv')!;
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  const result=await page.evaluate(theme=>window.__CTE_LOCAL__!.install(theme),theme);expect(result.compatible).toBe(true);
  const panel=page.locator('[data-cte-panel]');await expect(panel).toBeVisible();await expect(panel.locator('[data-usage-value]')).toHaveText('96');await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow','96');
  await page.locator('#prompt-textarea').fill('Still editable');await expect(page.locator('#prompt-textarea')).toHaveValue('Still editable');
  await page.locator('[role="menu"]').evaluate(el=>el.remove());await panel.getByRole('button',{name:'能量校正'}).click();await expect(panel.locator('[data-usage-status]')).toHaveText('保留能量读数 · 非实时');await expect(panel.locator('[data-usage-time]')).not.toHaveText('尚未校正');
  await panel.getByRole('button',{name:'收起驾驶舱'}).click();await expect(panel).toHaveAttribute('data-collapsed');await panel.getByRole('button',{name:'展开驾驶舱'}).click();
  await page.locator('#prompt-textarea').evaluate(el=>el.remove());await expect(panel).toHaveCount(0);await expect(page.locator('style[data-cte-style]')).toHaveCount(1);await expect(page.locator('#history')).not.toHaveAttribute('data-cte-region');await expect(page.locator('#model-control')).toBeVisible();
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());await expect(page.locator('style[data-cte-style]')).toHaveCount(0);
});
test('observed desktop shell: reserve panel width, collapse, restore and preserve official nodes',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent('<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}#workspace{flex:1;min-width:0}#chat{width:100%;height:100%}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px}</style><main hidden></main><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button aria-label="Home"><svg width="20" height="20"></svg></button></nav></aside><div id="workspace"><main id="chat"><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div></main></div></div>');
  await page.getByRole('button',{name:'Home',exact:true}).evaluate(el=>el.addEventListener('click',()=>el.setAttribute('data-clicked','yes')));
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  // A paused native color transition must not leave the old light foreground
  // on a newly dark surface, even before the delayed audit runs.
  await page.addStyleTag({content:'.sidebar-navigation button{color:var(--app-color-icon-tertiary);background:transparent;transition:color 10s,opacity 10s}'});
  const transitionBundle=await build({entryPoints:['src/core/injector/runtime.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
  await page.addScriptTag({content:transitionBundle.outputFiles[0].text});
  const immediateColor=await page.evaluate(theme=>{window.__CTE_LOCAL__!.install(theme);return getComputedStyle(document.querySelector('.sidebar-navigation button')!).color;},theme);
  expect(immediateColor).toBe('rgb(146, 149, 141)');
  const result=await page.evaluate(await verifyExpression(theme,''));
  expect(result).toMatchObject({compatible:true,profile:'desktop-2026',checksPassed:true,collapsedWidth:54,expanded:{panelVisible:true,panelWidth:296,editorEndsBeforePanel:true}});
  const assets=(result as {assets:{fonts:Array<{family:string;loaded:boolean}>}}).assets;
  expect(assets).toMatchObject({illustrations:true,brandMark:true,watermark:true});expect(assets.fonts).toEqual([{family:'Share Tech Mono',loaded:true},{family:'Barlow Condensed',loaded:true}]);
  await expect(page.locator('.cte-brand-wordmark')).toHaveAttribute('alt','初号機');await expect(page.locator('.cte-theme-diagram img')).toBeVisible();await expect(page.locator('[data-cte-backdrop]')).toHaveCount(1);
  await expect(page.locator('[data-cte-native-replacement]')).toBeVisible();await expect(page.getByRole('button',{name:'Home',exact:true}).locator('svg')).toBeHidden();
  await expect(page.locator('[data-cte-panel]')).toBeVisible();
  await page.locator('.ProseMirror').fill('Local fixture draft');await expect(page.locator('.ProseMirror')).toHaveText('Local fixture draft');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());await expect(page.locator('[data-cte-panel]')).toHaveCount(0);
  await expect(page.locator('.ProseMirror')).toHaveText('Local fixture draft');await expect(page.locator('#layout')).not.toHaveAttribute('data-cte-reserve');
  await expect(page.locator('[data-cte-backdrop], [data-cte-native-replacement]')).toHaveCount(0);await expect(page.getByRole('button',{name:'Home',exact:true}).locator('svg')).toBeVisible();
  await page.getByRole('button',{name:'Home',exact:true}).click();await expect(page.getByRole('button',{name:'Home',exact:true})).toHaveAttribute('data-clicked','yes');
});
test('light native palette: text, icon and placeholder remain readable; unsafe colors roll back',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>
    :root{--app-color-text-foreground:#1a1c1f;--app-color-icon-tertiary:rgba(26,28,31,.495);--color-text:#1a1c1f;--color-text-prose:#1a1c1f;--color-text-tertiary:rgba(26,28,31,.495);color-scheme:light}
    body{margin:0;color:var(--color-text)}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation button{width:40px;height:40px;color:var(--app-color-icon-tertiary);background:transparent;border:0}.sidebar-navigation [data-invisible]{opacity:0}.sidebar-navigation .sr-only{position:absolute;width:1px;height:1px;overflow:hidden}
    #workspace{flex:1;min-width:0}#chat{width:100%;height:100%}h1{color:var(--color-text-prose)}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px;color:var(--app-color-text-foreground)}[data-placeholder]{height:28px;margin:0}[data-placeholder]::before{content:attr(data-placeholder);color:var(--color-text-tertiary);opacity:.5}
    </style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button><svg width="20" height="20" viewBox="0 0 20 20"><path stroke="currentColor" d="M1 10h18"/></svg></button><button data-invisible>hidden</button><button class="sr-only">screen reader only</button></nav></aside><div id="workspace"><main id="chat"><h1>Fixture welcome</h1><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"><p data-placeholder="Fixture prompt"></p></div></div></main></div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  const result=await page.evaluate(await verifyExpression(theme,''));
  expect(result).toMatchObject({checksPassed:true,readability:{passed:true}});
  await expect(page.locator('h1')).toHaveCSS('color','rgb(236, 233, 242)');
  await expect(page.locator('.sidebar-navigation button').first()).toHaveCSS('color','rgb(146, 149, 141)');
  const placeholder=await page.locator('[data-placeholder]').evaluate(el=>({color:getComputedStyle(el,'::before').color,opacity:getComputedStyle(el,'::before').opacity}));
  expect(placeholder).toEqual({color:'rgb(189, 184, 201)',opacity:'1'});
  const broken=await page.addStyleTag({content:'.ProseMirror{color:#101111!important}'});
  await page.evaluate(theme=>window.__CTE_LOCAL__!.install(theme),theme);
  await expect(page.locator('[data-cte-panel]')).toHaveCount(0);
  const failed=await page.evaluate(()=>window.__CTE_LOCAL__!.readability());expect(failed?.passed).toBe(false);
  await broken.evaluate(el=>el.parentNode?.removeChild(el));await expect(page.locator('h1')).toHaveCSS('color','rgb(26, 28, 31)');
  expect(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme)).toBe('light');
});

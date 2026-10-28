import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {verifyExpression} from '../../scripts/renderer';
import path from 'node:path';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';

test('branding uses flow layout, preserves controls, rebinds after collapse and clears on restore',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{display:flex;width:290px;flex-shrink:0}.rail{width:52px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column;width:238px;min-height:0}.native-sidebar{display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%;min-height:0}.native-body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px}button{min-height:32px}</style>
    <div id="layout"><aside class="app-shell-left-panel"><nav class="rail"><button id="home" aria-label="Home"><svg width="20" height="20"></svg></button></nav><div id="column" class="sidebar-navigation"><div class="native-sidebar"><button id="search">Search fixture</button><button>History fixture</button></div></div></aside><div id="workspace"><main><div class="native-body"><button id="toolbar">Native toolbar fixture</button><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></div></main></div></div>`);
  const before=await page.evaluate(()=>({search:document.querySelector('#search')!.getBoundingClientRect().top,toolbar:document.querySelector('#toolbar')!.getBoundingClientRect().top}));
  await page.evaluate(()=>{const overlay=document.createElement('div');overlay.setAttribute('role','toolbar');overlay.id='external-title';overlay.style.cssText='position:absolute;top:0;left:290px;right:0;height:52px;pointer-events:none';document.body.append(overlay);});
  for(const id of ['home','search','toolbar'])await page.locator('#'+id).evaluate(el=>el.addEventListener('click',()=>el.setAttribute('data-clicked','yes')));
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await verifyExpression(theme,''))).toMatchObject({checksPassed:true,assets:{chrome:{navigation:true,header:true}}});
  await expect(page.locator('[data-cte-chrome="navigation"]')).toHaveCount(1);await expect(page.locator('[data-cte-chrome="header"]')).toHaveCount(1);
  await expect(page.locator('.cte-nav-badge-label')).toHaveText('NERV');await expect(page.locator('.cte-brand-wordmark')).toHaveAttribute('alt','初号機');await expect(page.locator('.cte-brand-logo')).toHaveCount(0);expect(await page.locator('.cte-brand-wordmark').evaluate(el=>(el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const flow=await page.evaluate(()=>({badge:document.querySelector('[data-cte-chrome="navigation"]')!.getBoundingClientRect().bottom,search:document.querySelector('#search')!.getBoundingClientRect().top,band:document.querySelector('[data-cte-chrome="header"]')!.getBoundingClientRect().bottom,toolbar:document.querySelector('#toolbar')!.getBoundingClientRect().top}));
  expect(flow.search).toBeGreaterThanOrEqual(flow.badge);expect(flow.toolbar).toBeGreaterThanOrEqual(flow.band);
  expect((await page.locator('[data-cte-chrome="header"]').boundingBox())!.y).toBeGreaterThanOrEqual(52);
  for(const id of ['home','search','toolbar']){await page.locator('#'+id).click();await expect(page.locator('#'+id)).toHaveAttribute('data-clicked','yes');}
  await page.locator('.ProseMirror').fill('Still editable');await expect(page.locator('.ProseMirror')).toHaveText('Still editable');
  await page.locator('#column').evaluate(el=>el.setAttribute('hidden',''));await expect(page.locator('[data-cte-chrome="navigation"]')).toHaveCount(0);await expect(page.locator('[data-cte-chrome="header"]')).toHaveCount(1);
  await page.locator('#column').evaluate(el=>el.removeAttribute('hidden'));await expect(page.locator('[data-cte-chrome="navigation"]')).toHaveCount(1);
  await page.locator('.ProseMirror').evaluate(el=>el.setAttribute('role','none'));await expect(page.locator('[data-cte-chrome]')).toHaveCount(0);await expect(page.locator('[data-cte-style],[data-cte-runtime]')).toHaveCount(2);
  await page.locator('.ProseMirror').evaluate(el=>el.setAttribute('role','textbox'));await expect(page.locator('[data-cte-chrome]')).toHaveCount(2);
  await page.getByRole('button',{name:'退出初号机',exact:true}).click();await expect(page.locator('[data-cte-chrome]')).toHaveCount(0);
  await expect(page.locator('[data-cte-chrome-host]')).toHaveCount(0);
  expect(await page.evaluate(()=>({search:document.querySelector('#search')!.getBoundingClientRect().top,toolbar:document.querySelector('#toolbar')!.getBoundingClientRect().top}))).toEqual(before);
  await expect(page.locator('.ProseMirror')).toHaveText('Still editable');
});

test('Chat and Work title variants resize in place, including delayed and internal overlays',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:290px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column;height:100%}#workspace{flex:1;min-width:0}main{position:relative;display:flex;flex-direction:column;height:100%}.native-body{flex:1;min-height:0}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}</style><style id="resize-rules">#native-title{height:52px}</style>
    <div id="layout"><aside class="app-shell-left-panel"><div class="sidebar-navigation"><button>History fixture</button></div></aside><div id="workspace"><main><div class="native-body"><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></div></main></div></div>
    <div hidden><div role="toolbar" style="position:absolute;top:0;left:290px;right:0;height:110px"></div></div>
    <div id="native-title" class="@container/app-shell-header-toolbar" style="position:absolute;top:-8px;left:290px;right:0;pointer-events:none"><span>Native title fixture</span></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await verifyExpression(theme,''))).toMatchObject({checksPassed:true});
  const band=page.locator('[data-cte-chrome="header"]');
  await expect(band).toHaveCSS('margin-top','44px');
  await band.evaluate(el=>el.setAttribute('data-test-identity','kept'));await page.locator('[data-cte-panel]').evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.evaluate(startFrameTrace);
  // CSSOM changes do not produce DOM mutations: ResizeObserver must update it.
  await page.evaluate(()=>{const sheet=(document.querySelector('#resize-rules') as HTMLStyleElement).sheet!;sheet.insertRule('#native-title{height:76px}',sheet.cssRules.length);});
  await expect(band).toHaveCSS('margin-top','68px');
  await page.locator('#native-title').evaluate(el=>{el.classList.remove('@container/app-shell-header-toolbar');el.setAttribute('role','toolbar');(el as HTMLElement).style.top='0px';});
  await expect(band).toHaveCSS('margin-top','76px');
  await page.locator('#native-title').evaluate(el=>{el.classList.add('@container/app-shell-header-toolbar');el.removeAttribute('role');(el as HTMLElement).style.cssText='position:absolute;top:4px;left:0;right:0;pointer-events:none';document.querySelector('main')!.append(el);});
  await expect(band).toHaveCSS('margin-top','80px');
  // In-flow content is already displaced by the band; it needs no extra inset.
  await page.locator('#native-title').evaluate(el=>(el as HTMLElement).style.cssText='position:static;pointer-events:none');await expect(band).toHaveCSS('margin-top','0px');
  await page.locator('#native-title').evaluate(el=>el.remove());
  await page.evaluate(()=>{const title=document.createElement('div');title.id='native-title';title.className='@container/app-shell-header-toolbar';title.style.cssText='position:absolute;top:12px;left:290px;right:0;pointer-events:none';document.body.append(title);});
  await expect(band).toHaveCSS('margin-top','88px');
  const geometry=await page.evaluate(()=>({titleBottom:document.querySelector('#native-title')!.getBoundingClientRect().bottom,bandTop:document.querySelector('[data-cte-chrome="header"]')!.getBoundingClientRect().top}));expect(geometry.bandTop).toBeGreaterThanOrEqual(geometry.titleBottom);
  await expect(band).toHaveAttribute('data-test-identity','kept');await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());await page.locator('#native-title').evaluate(el=>(el as HTMLElement).style.height='90px');await expect(page.locator('[data-cte-chrome]')).toHaveCount(0);
});

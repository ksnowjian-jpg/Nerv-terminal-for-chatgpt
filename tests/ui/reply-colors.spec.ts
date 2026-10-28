import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import path from 'node:path';

test('styled native cards repair only unreadable text and preserve their backgrounds, native styles and lifecycle',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}main{display:flex;flex-direction:column;flex:1;padding:20px}.ProseMirror{min-height:50px}._Box_fixture{padding:12px;margin:8px}._TextBase_fixture{color:var(--text-base-color,var(--color-text-prose))}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><main><div class="_DilResponseRoot_fixture"><div class="_Box_fixture" style="background:#303641;color:white"><p id="safe" class="_TextBase_fixture" style="color:white">Safe fixture</p><div id="yellow-card" class="_Box_fixture" style="background:#fff0bd"><p id="yellow" class="_TextBase_fixture _Text_fixture" style="color:#b06d00">Yellow fixture</p></div><div id="orange-card" class="_Box_fixture" style="background:#f59a23"><p id="orange" class="_TextBase_fixture _Text_fixture" style="color:white">Orange fixture</p></div><pre><code id="syntax" class="_TextBase_fixture" style="color:#f59a23">Syntax fixture</code></pre></div></div><div class="codex-docx-preview-wrapper" style="background:#f59a23"><p id="document" class="_TextBase_fixture" style="color:white">Independent fixture</p></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div>`);
  const before=await page.locator('#yellow,#orange,#safe,#document,#syntax').evaluateAll(els=>els.map(el=>el.getAttribute('style')));
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true,readability:{passed:true}});
  await page.locator('[data-cte-panel]').evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await expect(page.locator('#yellow')).toHaveCSS('color','rgb(0, 0, 0)');await expect(page.locator('#orange')).toHaveCSS('color','rgb(0, 0, 0)');
  await expect(page.locator('#yellow-card')).toHaveCSS('background-color','rgb(255, 240, 189)');await expect(page.locator('#orange-card')).toHaveCSS('background-color','rgb(245, 154, 35)');
  for(const id of ['safe','document','syntax'])await expect(page.locator('#'+id)).not.toHaveAttribute('data-cte-reply-ink');
  for(let round=0;round<3;round++){
    await page.locator('#orange-card').evaluate((el,dark)=>(el as HTMLElement).style.backgroundColor=dark?'#172029':'#f59a23',round%2===0);
    if(round%2===0){await expect(page.locator('#orange')).not.toHaveAttribute('data-cte-reply-ink');await expect(page.locator('#orange')).toHaveCSS('color','rgb(255, 255, 255)');}
    else await expect(page.locator('#orange')).toHaveAttribute('data-cte-reply-ink','dark');
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
  }
  await page.locator('#yellow').evaluate(el=>{const next=el.cloneNode(true) as HTMLElement;next.removeAttribute('data-cte-reply-ink');el.replaceWith(next);});
  await expect(page.locator('#yellow')).toHaveAttribute('data-cte-reply-ink','dark');
  await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());
  await expect(page.locator('[data-cte-reply-ink]')).toHaveCount(0);
  expect(await page.locator('#yellow,#orange,#safe,#document,#syntax').evaluateAll(els=>els.map(el=>el.getAttribute('style')))).toEqual(before);
  await expect(page.locator('.ProseMirror')).toHaveText('Draft fixture');
});

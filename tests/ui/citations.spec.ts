import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';
import path from 'node:path';

test('DIL source badges retain readable paired colors through hover and fresh conversation content',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const content=(index:number)=>`<div class="_PortalBoundary_fixture"><div class="_DilResponseRoot_fixture"><p>Reply fixture ${index} <span class="_Trigger_fixture" role="button" tabindex="0" aria-haspopup="dialog"><span><span class="_Badge_fixture" data-d-component="badge" data-color="secondary" data-variant="soft" data-pill ${index%2===0?'style="background-color:var(--gray-75)"':''}><span class="_TextBase_fixture">Source fixture</span><span class="_TextBase_fixture">+1</span></span></span></span></p></div></div>`;
  await page.setContent(`<style>
    body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%}#conversation{flex:1;padding:20px}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}
    ._PortalBoundary_fixture{--gray-75:#f3f3f3;--color-text-prose:#1a1c1f;--color-text-tertiary:#666;--color-background-secondary-soft-alpha:#f3f3f3;--color-background-secondary-soft-hover:#e9e9e9;--color-background-secondary-soft-alpha-active:#ddd}
    ._DilResponseRoot_fixture{color:var(--color-text-prose)}._Badge_fixture{display:inline-flex;gap:4px;padding:4px 8px;border-radius:20px;--badge-background-color:var(--color-background-secondary-soft-alpha);background:var(--badge-background-color);color:var(--color-text-secondary-soft)}._Badge_fixture:hover{--badge-background-color:var(--color-background-secondary-soft-hover)}._Badge_fixture:active{--badge-background-color:var(--color-background-secondary-soft-alpha-active)}._TextBase_fixture{color:var(--color-text-tertiary)}
    </style><div id="layout"><aside class="app-shell-left-panel"><div class="sidebar-navigation"><button>Home</button></div></aside><div id="workspace"><main><div id="conversation">${content(0)}</div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true,readability:{passed:true}});
  await page.locator('[data-cte-panel]').evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.evaluate(startFrameTrace);
  for(let i=0;i<5;i++){
    if(i)await page.locator('#conversation').evaluate((el,html)=>el.innerHTML=html,content(i));
    const badge=page.locator('._Badge_fixture');
    await expect(badge).toHaveCSS('background-color','rgb(36, 35, 50)');
    await expect(badge.locator('._TextBase_fixture').first()).toHaveCSS('color','rgb(189, 184, 201)');
    await badge.hover();await expect(badge).toHaveCSS('background-color','rgb(68, 64, 79)');
    await page.locator('._Trigger_fixture').evaluate(el=>el.addEventListener('click',()=>el.setAttribute('data-opened','yes')));
    await badge.click();await expect(page.locator('._Trigger_fixture')).toHaveAttribute('data-opened','yes');
    await page.mouse.move(400,500);await page.waitForTimeout(900);
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status())).toMatchObject({phase:'active',enabled:true});
    const report=await page.evaluate(()=>window.__CTE_LOCAL__!.readability());
    expect(report?.passed).toBe(true);expect(report?.samples.filter(s=>s.area.startsWith('message-span')).length).toBeGreaterThanOrEqual(2);
  }
  await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
  await expect(page.locator('.ProseMirror')).toHaveText('Draft fixture');
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});
  // Keep the real readability guard: broken reply text still withdraws safely.
  await page.locator('._TextBase_fixture').first().evaluate(el=>(el as HTMLElement).style.setProperty('-webkit-text-fill-color','#242332','important'));
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('blocked');
  expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.samples.some(s=>s.detail?.ancestors.some(a=>a.classes.includes('_TextBase_fixture'))))).toBe(true);
});

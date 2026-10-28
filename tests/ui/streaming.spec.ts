import {test,expect,type Page} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';
import path from 'node:path';

async function fixture(page:Page){
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%}#stream{flex:1;padding:20px}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><div id="workspace"><main><div id="stream"><p><span id="word">Reply fixture</span></p></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>`);
  return (await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
}

test('startup preserves a native JS-driven text fade and automatically audits its settled result',async({page})=>{
  const theme=await fixture(page);
  await page.locator('#stream').evaluate(el=>{
    el.setAttribute('class','_MarkdownRoot_fixture _AdaptiveStreaming_fixture');(el as HTMLElement).style.opacity='0.160824';
    const word=el.querySelector<HTMLElement>('#word')!;word.className='_FadeIn_fixture';word.style.opacity='0.428';
    setTimeout(()=>{(el as HTMLElement).style.removeProperty('opacity');word.style.removeProperty('opacity');},1800);
  });
  const started=await page.evaluate(await startupExpression(theme,''));
  expect(started).toMatchObject({compatible:true,checksPassed:false,pending:true,readability:{passed:false,pending:true}});
  await page.locator('[data-cte-panel]').evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.evaluate(startFrameTrace);
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.passed)).toBe(true);
  expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.pending)).toBe(false);
  await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});
});

test('new parent and child opacity animations remain active across successive streamed chunks',async({page})=>{
  const theme=await fixture(page);expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  await page.evaluate(startFrameTrace);
  for(let i=0;i<3;i++){
    await page.locator('#stream').evaluate((el,index)=>{
      el.innerHTML=`<div><p><span>Parent fade ${index}</span></p></div><p><span>Child fade ${index}</span></p>`;
      for(const target of [el.firstElementChild!,el.lastElementChild!.firstElementChild!])target.animate([{opacity:index===0?0:.0688208,offset:0},{opacity:index===0?0:.160824,offset:.75},{opacity:1,offset:1}],{duration:1400,fill:'forwards'});
    },i);
    await page.waitForTimeout(850);
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.pending)).toBe(true);
    await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.passed)).toBe(true);
  }
  await expect(page.locator('.ProseMirror')).toHaveText('Draft fixture');
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});
});

test('a fade that settles to genuinely unreadable text still triggers confirmed withdrawal',async({page})=>{
  const theme=await fixture(page);expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true});
  await page.locator('#word').evaluate(el=>{
    (el as HTMLElement).style.color='#15141c';
    el.animate([{opacity:.06,offset:0},{opacity:.06,offset:.7},{opacity:1,offset:1}],{duration:1400,fill:'forwards'});
  });
  await page.waitForTimeout(850);expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('blocked');
  expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability())).toMatchObject({passed:false,pending:false});
  await expect(page.locator('[data-cte-panel],[data-cte-runtime]')).toHaveCount(0);
});

test('static, paused and infinite low-opacity text cannot bypass the guard',async({page})=>{
  for(const mode of ['static','paused','infinite']){
    const theme=await fixture(page);
    await page.locator('#word').evaluate((el,kind)=>{
      if(kind==='static'){(el as HTMLElement).style.opacity='.06';return;}
      const animation=el.animate([{opacity:.06},{opacity:kind==='paused'?1:.06}],{duration:5000,iterations:kind==='infinite'?Infinity:1,fill:'both'});
      if(kind==='paused'){animation.pause();animation.currentTime=0;}
    },mode);
    expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:false,failedChecks:['readability'],readability:{passed:false,pending:false}});
    await expect(page.locator('[data-cte-panel]')).toHaveCount(0);
  }
});

test('background-paused fades wait for visibility; a stuck native fade has a bounded grace',async({page})=>{
  const theme=await fixture(page);
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{value:true,configurable:true}));
  await page.locator('#word').evaluate(el=>{(el as HTMLElement).style.opacity='.06';el.setAttribute('class','_FadeIn_fixture');});
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,pending:true});
  await page.waitForTimeout(1100);expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase),{timeout:6000}).toBe('blocked');
  expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability())).toMatchObject({passed:false,pending:false});
});

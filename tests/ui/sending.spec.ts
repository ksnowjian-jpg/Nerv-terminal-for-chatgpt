import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';
import path from 'node:path';

for(const replaced of ['composer','main','cached main'] as const)test(`a replacement ${replaced} receives its theme before its first frame`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  const composer='<div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div>';
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0;--color-surface:white}main{display:flex;flex-direction:column;height:100%;background:var(--color-surface)}[data-composer-body]{background:white}.ProseMirror{min-height:50px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><div id="workspace"><main>${composer}</main></div></div>`);
  if(replaced==='cached main')await page.locator('#workspace').evaluate((el,html)=>{
    const first=document.createElement('section'),cached=document.createElement('section');first.style.height=cached.style.height='100%';
    first.append(el.querySelector('main')!);cached.innerHTML=`<main>${html}</main>`;cached.hidden=true;el.append(first,cached);
  },composer);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  for(let i=0;i<3;i++){
    const firstFrame=await page.evaluate(async({replaced,composer})=>{
      if(replaced==='cached main'){
        for(const section of document.querySelectorAll<HTMLElement>('#workspace >section'))section.hidden=!section.hidden;
      }else{
        const template=document.createElement('template');template.innerHTML=replaced==='main'?`<main>${composer}</main>`:composer;
        document.querySelector(replaced==='main'?'main':'[data-composer-body]')!.replaceWith(template.content.firstElementChild!);
      }
      await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
      const main=[...document.querySelectorAll('main')].find(el=>el.getBoundingClientRect().width>0)!,input=main.querySelector('[data-composer-body]')!;
      return {phase:window.__CTE_LOCAL__!.status().phase,main:main.getAttribute('data-cte-region'),composer:input.getAttribute('data-cte-region'),background:getComputedStyle(main).backgroundColor,panel:!!document.querySelector('[data-cte-panel]'),backdrop:!!main.querySelector('[data-cte-backdrop]')};
    },{replaced,composer});
    expect(firstFrame).toEqual({phase:'active',main:'main',composer:'composer',background:'rgb(21, 20, 28)',panel:true,backdrop:true});
  }
});

test('sending temporarily locks the native editor without removing the cockpit, backdrop or palette',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0;--color-surface:white}main{display:flex;flex-direction:column;height:100%;background:var(--color-surface)}#messages{flex:1}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}button{min-height:32px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><div id="workspace"><main class="_MainContentSurface_fixture"><div id="messages"></div><form data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div><button type="submit" id="send">Send fixture</button></form></main></div></div>`);
  await page.locator('form').evaluate(form=>{
    const editor=form.querySelector<HTMLElement>('.ProseMirror')!,send=form.querySelector<HTMLButtonElement>('#send')!;
    form.setAttribute('data-submissions','0');
    form.addEventListener('submit',event=>{
      event.preventDefault(); // Local fixture only: no request or real message.
      form.setAttribute('data-submissions',String(Number(form.getAttribute('data-submissions'))+1));
      const message=document.createElement('p');message.textContent=editor.textContent;document.querySelector('#messages')!.append(message);
      editor.textContent='';editor.setAttribute('contenteditable','false');send.disabled=true;
      setTimeout(()=>{editor.setAttribute('contenteditable','true');send.disabled=false;},500);
    });
    editor.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();(form as HTMLFormElement).requestSubmit();}});
  });
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  for(const selector of ['[data-cte-panel]','[data-cte-backdrop]'])await page.locator(selector).evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.evaluate(startFrameTrace);
  for(let i=0;i<3;i++){
    await page.getByRole('textbox').fill(`Local draft ${i}`);
    if(i%2)await page.getByRole('textbox').press('Enter');else await page.locator('#send').click();
    await expect(page.getByRole('textbox')).toHaveAttribute('contenteditable','false');
    await page.waitForTimeout(250);
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
    await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
    await expect(page.locator('[data-cte-backdrop]')).toHaveAttribute('data-test-identity','kept');
    await expect(page.getByRole('textbox')).toHaveAttribute('contenteditable','true');
  }
  await expect(page.locator('form')).toHaveAttribute('data-submissions','3');
  const trace=await page.evaluate(stopFrameTrace) as {phases:Record<string,number>;colors:Record<string,number>};
  expect(trace).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0,detachedPanelFrames:0,detachedBackdropFrames:0});
  expect(Object.keys(trace.phases)).toEqual(['active']);expect(Object.keys(trace.colors)).toEqual(['rgb(21, 20, 28)']);
});

test('an established chat keeps the same artwork while its native input is unavailable',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent('<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}main{display:flex;flex-direction:column;flex:1}.ProseMirror{min-height:50px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><main><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div></main></div>');
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  for(const selector of ['[data-cte-panel]','[data-cte-backdrop]'])await page.locator(selector).evaluate(el=>el.setAttribute('data-test-identity','kept'));
  const editor=(await page.locator('.ProseMirror').elementHandle())!;
  await page.evaluate(startFrameTrace);
  for(const unavailable of ['role','hidden','inert','removed'] as const){
    await editor.evaluate((el,mode)=>{
      if(mode==='role')el.removeAttribute('role');
      else if(mode==='hidden')el.parentElement!.setAttribute('hidden','');
      else if(mode==='inert')el.parentElement!.setAttribute('inert','');
      else el.remove();
    },unavailable);
    await page.waitForTimeout(unavailable==='role'?1500:500);
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
    for(const selector of ['[data-cte-panel]','[data-cte-backdrop]'])await expect(page.locator(selector)).toHaveAttribute('data-test-identity','kept');
    // The engine must preserve these native restrictions until the host clears them.
    expect(await editor.evaluate((el,mode)=>mode==='role'?!el.hasAttribute('role'):mode==='removed'?!el.isConnected:el.parentElement!.hasAttribute(mode),unavailable)).toBe(true);
    await editor.evaluate(el=>{
      const host=document.querySelector('[data-composer-body]')!;host.removeAttribute('hidden');host.removeAttribute('inert');
      if(!el.isConnected)host.append(el);el.setAttribute('role','textbox');
    });
  }
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0,detachedPanelFrames:0,detachedBackdropFrames:0});
  // Retention must not exempt visible replies from the readability guard.
  await editor.evaluate(el=>{el.removeAttribute('role');const p=document.createElement('p');p.textContent='Unreadable local fixture';p.style.cssText='color:#15141c!important;-webkit-text-fill-color:#15141c!important';document.querySelector('main')!.prepend(p);});
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('blocked');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());
  await expect(page.locator('[data-cte-panel],[data-cte-backdrop]')).toHaveCount(0);
});

import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';
import path from 'node:path';

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

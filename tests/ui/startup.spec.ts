import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression,verifyExpression} from '../../scripts/renderer';
import path from 'node:path';

async function fixture(page:import('@playwright/test').Page){
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent('<style>body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%;width:100%}[data-composer-body]{width:100%}.ProseMirror{width:100%;min-height:50px}</style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home fixture</button></nav></aside><div id="workspace"><main><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>');
  return (await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
}

test('normal startup tolerates unused decorative fonts and native editor replacement',async({page})=>{
  const theme=await fixture(page);
  const withUnusedFace={...theme,fonts:[...theme.fonts!,{...theme.fonts![0],family:'Unused Decorative Face'}]};
  const strict=await page.evaluate(await verifyExpression(withUnusedFace,''));
  // Reproduces the reported path: cosmetic self-test failure withdraws a fully
  // readable theme. The ordinary launcher must not invoke that self-test.
  expect(strict).toMatchObject({checksPassed:false,failedChecks:['fonts'],readability:{passed:true}});
  await expect(page.locator('[data-cte-style]')).toHaveCount(0);
  await page.evaluate(()=>setTimeout(()=>{const editor=document.querySelector('.ProseMirror')!;editor.replaceWith(editor.cloneNode(true));},150));
  const started=await page.evaluate(await startupExpression(withUnusedFace,''));
  expect(started).toMatchObject({compatible:true,checksPassed:true,phase:'active',failedChecks:[]});
  await expect(page.locator('[data-cte-panel]')).toHaveCount(1);await expect(page.locator('.ProseMirror')).toHaveText('Draft fixture');
  await page.locator('.ProseMirror').fill('Still editable');await expect(page.locator('.ProseMirror')).toHaveText('Still editable');
});

test('normal startup still rejects unreadable content and exposes its failed check',async({page})=>{
  const theme=await fixture(page);
  await page.addStyleTag({content:'.ProseMirror{color:#15141c!important;-webkit-text-fill-color:#15141c!important}'});
  const result=await page.evaluate(await startupExpression(theme,''));
  expect(result).toMatchObject({compatible:false,checksPassed:false,failedChecks:['readability'],readability:{passed:false}});
  await expect(page.locator('[data-cte-panel],[data-cte-style],[data-cte-runtime]')).toHaveCount(0);
});

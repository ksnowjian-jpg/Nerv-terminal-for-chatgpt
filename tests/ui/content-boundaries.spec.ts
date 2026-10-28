import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import {startFrameTrace,stopFrameTrace} from '../../scripts/frame-trace';
import path from 'node:path';

test('document and web previews can reopen without withdrawing the theme; real reply text is still guarded',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>
    body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%}.split{display:flex;flex:1;min-height:0}.conversation{flex:1;min-width:0}.preview{width:42%;overflow:auto}.codex-docx-preview{background:white;color:black;padding:20px}td{padding:8px}._PageDocumentTheme_fixture{background:white;--color-text-prose:#1a1c1f;color:var(--color-text-prose)}._MarkdownRoot_fixture p{color:var(--color-text-prose)}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}iframe{width:100%;height:100px}
    </style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><div id="workspace"><main><div class="split"><div class="conversation"><div class="_DilResponseRoot_fixture"><p id="reply">Visible reply</p><table id="chat-table"><tr><td style="color:black;background:#233b53"><p><span style="color:white">White text in a dark chat table</span></p></td></tr></table></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></div><div id="preview" class="preview bg-background-artifact-preview"><div class="codex-docx-preview-wrapper"><section class="codex-docx-preview"><h1>Document title</h1><table><tr><td style="background:#233b53"><p><span id="document-text" style="color:white">White header</span></p></td></tr></table></section></div><div class="_PageDocumentTheme_fixture"><div class="_MarkdownRoot_fixture"><p id="editor-text">Independent document editor</p></div></div><iframe srcdoc="<p style='color:black;background:white'>Web preview</p>"></iframe></div></div></main></div></div>`);
  const original=await page.locator('#preview').evaluate(el=>el.outerHTML);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true,readability:{passed:true}});
  await expect(page.locator('#document-text')).toHaveCSS('color','rgb(255, 255, 255)');
  await expect(page.locator('#editor-text')).toHaveCSS('color','rgb(26, 28, 31)');
  await expect(page.locator('#reply')).toHaveCSS('color','rgb(236, 233, 242)');
  await expect(page.frameLocator('iframe').locator('p')).toHaveCSS('color','rgb(0, 0, 0)');
  expect(await page.locator('#preview').evaluate(el=>el.outerHTML)).toBe(original);
  await page.locator('[data-cte-panel]').evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.evaluate(startFrameTrace);
  for(let i=0;i<8;i++){
    await page.locator('#preview').evaluate(el=>{el.setAttribute('hidden','');(el as HTMLElement).style.display='none';});
    await page.locator('.ProseMirror').fill(`Draft ${i}`);
    await page.locator('#preview').evaluate(el=>{const next=el.cloneNode(true) as HTMLElement;next.removeAttribute('hidden');next.style.removeProperty('display');el.replaceWith(next);});
    await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.passed)).toBe(true);
    await page.waitForTimeout(900); // Allow each deferred guard to run, not just the last one.
    expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status())).toMatchObject({phase:'active',enabled:true});
  }
  await expect(page.locator('[data-cte-panel]')).toHaveAttribute('data-test-identity','kept');
  expect(await page.evaluate(stopFrameTrace)).toMatchObject({missingPalette:0,replacedStyles:0,whiteFrames:0});
  // An unreadable nested text run inside a real reply must still withdraw it.
  await page.locator('#chat-table span').evaluate(el=>(el as HTMLElement).style.color='#233b53');
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('blocked');
  await expect(page.locator('[data-cte-panel],[data-cte-style],[data-cte-runtime]')).toHaveCount(0);
  await expect(page.locator('.ProseMirror')).toHaveText('Draft 7');
});

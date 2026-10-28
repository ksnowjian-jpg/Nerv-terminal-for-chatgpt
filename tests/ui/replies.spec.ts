import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {verifyExpression} from '../../scripts/renderer';
import path from 'node:path';

test('visible rich replies override local light palettes, preserve user bubbles and audit new content',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>
    body{margin:0}#layout{display:flex;width:100vw;min-height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}#workspace{flex:1;min-width:0}main{min-height:90vh}[data-composer-body]{width:100%}.ProseMirror{min-height:50px}
    ._PortalBoundary_fixture{--color-text-prose:#1a1c1f;--color-text:#1a1c1f;--app-color-text-foreground:#1a1c1f;color:var(--color-text)}
    ._DilResponseRoot_fixture p,._DilResponseRoot_fixture li{color:var(--color-text-prose);-webkit-text-fill-color:var(--color-text-prose)}
    .prose{--tw-prose-body:#1a1c1f;--tw-prose-bold:#1a1c1f;--tw-prose-links:#034cba;color:var(--tw-prose-body)}.prose strong{color:var(--tw-prose-bold)}.prose a{color:var(--tw-prose-links)}
    #user{--color-text-user-message:#102b50;background:#e7f3ff;color:#102b50;padding:16px;border-radius:20px}#syntax{color:#a6e3a1}
    ._MarkdownRoot_fixture p{color:var(--color-text-prose);-webkit-text-fill-color:var(--color-text-prose)}._MarkdownRoot_fixture strong{color:var(--tw-prose-bold)}
    </style><main hidden id="cached"><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div></main>
    <div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><div id="workspace"><main id="chat">
    <div id="user" data-message-author-role="user"><div id="user-markdown" class="_MarkdownRoot_fixture rich-text-user-turn" data-markdown-text-tone="user"><p>User fixture <strong>Bold fixture</strong></p></div><div id="user-prose" class="prose"><p>Alternate user fixture</p></div></div>
    <div class="_PortalBoundary_fixture"><div class="_DilResponseRoot_fixture"><p id="reply">Assistant fixture</p><ul><li>List fixture</li></ul></div></div>
    <div data-message-author-role="assistant"><div class="prose"><p>Markdown fixture <strong>Bold</strong> <a href="#local">Link</a></p><pre><code><span id="syntax">Syntax fixture</span></code></pre><table><tr><th>Header</th><td>Cell</td></tr></table></div></div>
    <div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  const result=await page.evaluate(await verifyExpression(theme,'')) as {readability:{samples:Array<{area:string}>}};
  expect(result).toMatchObject({checksPassed:true,readability:{passed:true},restored:{editorNodePreserved:true}});
  await expect(page.locator('#chat')).toHaveAttribute('data-cte-region','main');await expect(page.locator('#cached')).not.toHaveAttribute('data-cte-region');
  await expect(page.locator('#reply')).toHaveCSS('color','rgb(236, 233, 242)');await expect(page.locator('#reply')).toHaveCSS('-webkit-text-fill-color','rgb(236, 233, 242)');
  await expect(page.locator('#user')).toHaveCSS('background-color','rgb(231, 243, 255)');await expect(page.locator('#user')).toHaveCSS('color','rgb(16, 43, 80)');await expect(page.locator('#syntax')).toHaveCSS('color','rgb(166, 227, 161)');
  await expect(page.locator('#user-markdown')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(page.locator('#user-markdown p')).toHaveCSS('-webkit-text-fill-color','rgb(16, 43, 80)');await expect(page.locator('#user-markdown strong')).toHaveCSS('color','rgb(16, 43, 80)');await expect(page.locator('#user-prose')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  expect(result.readability.samples.filter((sample:{area:string})=>sample.area.startsWith('message-')).length).toBeGreaterThan(8);
  await page.locator('._DilResponseRoot_fixture').evaluate(el=>{const p=document.createElement('p');p.id='streamed';p.textContent='New reply fixture';el.append(p);});
  await expect(page.locator('#streamed')).toHaveCSS('color','rgb(236, 233, 242)');
  // A later unsupported hardcoded color must also trigger the guard.
  await page.locator('#streamed').evaluate(el=>(el as HTMLElement).style.setProperty('-webkit-text-fill-color','#101111','important'));
  await expect.poll(()=>page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('blocked');
  expect(await page.evaluate(()=>window.__CTE_LOCAL__!.readability()?.passed)).toBe(false);
  await expect(page.locator('[data-cte-panel],[data-cte-style],[data-cte-runtime]')).toHaveCount(0);
});

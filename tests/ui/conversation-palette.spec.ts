import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {verifyExpression} from '../../scripts/renderer';
import path from 'node:path';

test('conversation palette pairs purple bubbles with readable text and keeps monitor colors independent',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>
    :root{--color-background-user-message:#e8f3fe;--color-text-user-message:#0c274a}
    body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}#workspace{flex:1;min-width:0}main{height:100%}
    #user{padding:16px;border-radius:20px;background:var(--color-background-user-message);color:var(--color-text-user-message)}.rich-text-user-turn p{color:var(--color-text-prose)}
    [data-composer-body]{width:100%;background:var(--app-color-background-editor-opaque)}.ProseMirror{min-height:50px;color:var(--app-color-text-foreground)}
    </style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"></nav></aside><div id="workspace"><main><div id="user"><div class="_MarkdownRoot_fixture rich-text-user-turn"><p>User fixture</p></div></div><div data-message-author-role="assistant"><p>Assistant fixture</p></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await verifyExpression(theme,''))).toMatchObject({checksPassed:true,readability:{passed:true}});
  await expect(page.locator('main')).toHaveCSS('background-color','rgb(21, 20, 28)');
  await expect(page.locator('#user')).toHaveCSS('background-color','rgb(52, 45, 71)');await expect(page.locator('.rich-text-user-turn')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(page.locator('.rich-text-user-turn p')).toHaveCSS('color','rgb(240, 237, 246)');
  await expect(page.locator('[data-message-author-role="assistant"]')).toHaveCSS('color','rgb(236, 233, 242)');
  await expect(page.locator('[data-composer-body]')).toHaveCSS('background-color','rgb(36, 35, 50)');await expect(page.locator('[data-composer-body]')).toHaveCSS('border-left-color','rgb(183, 223, 135)');
  await expect(page.locator('.cte-brand-wordmark')).toBeVisible();await expect(page.locator('.cte-brand-name')).toHaveCount(0);
  const backdrop=page.locator('[data-cte-backdrop]');await expect(backdrop).toHaveAttribute('data-cte-render','image');await expect(backdrop).toHaveCSS('pointer-events','none');await expect(backdrop).toHaveCSS('z-index','-1');await expect(backdrop).toHaveCSS('opacity','0.14');await expect(page.locator('main')).toHaveCSS('isolation','isolate');
  const art=await backdrop.evaluate(el=>({image:getComputedStyle(el).backgroundImage.startsWith('url('),mask:getComputedStyle(el).maskImage}));expect(art.image).toBe(true);expect(art.mask).toContain('linear-gradient');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());await expect(page.locator('#user')).toHaveCSS('background-color','rgb(232, 243, 254)');await expect(page.locator('#user')).toHaveCSS('color','rgb(12, 39, 74)');
  // Variant token overrides also apply to the conversation and user bubble.
  expect(await page.evaluate(await verifyExpression(theme,'eva-00'))).toMatchObject({checksPassed:true});await expect(page.locator('main')).toHaveCSS('background-color','rgb(16, 28, 41)');await expect(page.locator('#user')).toHaveCSS('background-color','rgb(35, 64, 91)');
});

import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import path from 'node:path';

test('home welcome copy survives native rerenders and restores without touching messages or drafts',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;height:100vh}.app-shell-left-panel{width:290px}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%}.home-composer-anchor{flex:1;display:flex;align-items:center;justify-content:center}.heading-xl{font-size:28px}.ProseMirror{min-height:50px}</style>
    <div id="layout"><aside class="app-shell-left-panel"><div class="sidebar-navigation"><button>Home</button></div></aside><div id="workspace"><main><div class="home-composer-anchor"><div id="welcome" class="heading-xl"><span>我们要做什么？</span></div></div><div data-message-author-role="assistant"><div class="home-composer-anchor"><h2 id="message" class="heading-xl">我们要做什么？</h2></div></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true">Draft fixture</div></div></main></div></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  const copy=page.locator('[data-cte-welcome]');
  await expect(copy.locator('[data-cte-welcome-title]')).toHaveText('系统已就绪，等待指令。');await expect(copy).toBeVisible();
  await expect(copy.locator('[data-cte-welcome-caption]')).toHaveText('NERV TERMINAL / SYSTEM ONLINE');
  await expect(page.locator('#welcome')).toHaveText('我们要做什么？');await expect(page.locator('#welcome')).toBeHidden();
  await expect(page.locator('#message')).toBeVisible();await expect(page.locator('#message')).toHaveText('我们要做什么？');
  await copy.evaluate(el=>el.setAttribute('data-test-identity','kept'));
  await page.locator('.ProseMirror').fill('New draft');await expect(copy).toHaveAttribute('data-test-identity','kept');
  // React can replace the native hero without replacing main or composer.
  await page.locator('#welcome').evaluate(el=>{const next=el.cloneNode(true) as HTMLElement;next.removeAttribute('data-cte-welcome-original');el.replaceWith(next);});
  await expect(copy).toHaveCount(1);await expect(page.locator('#welcome')).toBeHidden();await expect(copy).toBeVisible();
  // Native greetings rotate after route changes; identify the home hero by
  // structure rather than maintaining an incomplete list of greeting strings.
  await page.locator('#welcome span').evaluate(el=>el.textContent='Different native greeting');
  await expect(copy).toHaveCount(1);await expect(page.locator('[data-cte-welcome-title]')).toHaveText('系统已就绪，等待指令。');
  await page.locator('#welcome').evaluate(el=>{const button=document.createElement('button');button.textContent='Native action';el.append(button);});
  await expect(copy).toHaveCount(0);await expect(page.locator('#welcome')).toBeVisible();
  await page.locator('#welcome button').evaluate(el=>el.remove());await expect(copy).toHaveCount(1);
  await page.locator('#welcome span').evaluate(el=>el.textContent='今天想聊点什么？');
  await expect(copy).toHaveCount(1);await expect(page.locator('[data-cte-welcome-title]')).toHaveText('系统已就绪，等待指令。');
  await page.locator('#welcome span').evaluate(el=>el.textContent='我们要做什么？');await expect(copy).toHaveCount(1);
  // Unsupported route, then back: palette remains and the greeting rebinds once.
  await page.locator('.ProseMirror').evaluate(el=>el.setAttribute('role','none'));await expect(copy).toHaveCount(0);
  await page.locator('.ProseMirror').evaluate(el=>el.setAttribute('role','textbox'));await expect(copy).toHaveCount(1);
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());
  await expect(copy).toHaveCount(0);await expect(page.locator('[data-cte-welcome-original]')).toHaveCount(0);
  await expect(page.locator('#welcome')).toBeVisible();await expect(page.locator('#welcome')).toHaveText('我们要做什么？');await expect(page.locator('.ProseMirror')).toHaveText('New draft');
});

test('themed composer prompt preserves the native placeholder, draft and submit controls across rerenders',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>body{margin:0}#layout{display:flex;height:100vh}.app-shell-left-panel{width:290px}.sidebar-navigation{display:flex;flex-direction:column}#workspace{flex:1;min-width:0}main{display:flex;flex-direction:column;height:100%}[data-composer-body]{margin-top:auto}.ProseMirror{min-height:50px}p[data-placeholder]::before{content:attr(data-placeholder)}</style>
    <div id="layout"><aside class="app-shell-left-panel"><div class="sidebar-navigation"><button>Home</button></div></aside><div id="workspace"><main><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"><p data-placeholder="Native prompt"><br></p></div><button id="submit">Send fixture</button></div></main></div></div>`);
  await page.locator('#submit').evaluate(el=>el.addEventListener('click',()=>el.setAttribute('data-submitted',document.querySelector('.ProseMirror')!.textContent!)));
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id==='nerv')!;
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true});
  const prompt=page.locator('[data-placeholder]'),editor=page.locator('.ProseMirror'),composer=page.locator('[data-composer-body]');
  await expect(prompt).toHaveAttribute('data-placeholder','Native prompt');
  expect(await prompt.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('"输入消息或指令…"');
  await editor.fill('Draft remains editable');await expect(composer).not.toHaveAttribute('data-cte-composer-prompt');
  await page.locator('#submit').click();await expect(page.locator('#submit')).toHaveAttribute('data-submitted','Draft remains editable');
  await editor.evaluate(el=>el.innerHTML='<p data-placeholder="New native prompt"><br></p>');
  await expect(composer).toHaveAttribute('data-cte-composer-prompt','native');
  // The same composer can get a new editor from React without a route change.
  await editor.evaluate(el=>el.replaceWith(el.cloneNode(true)));
  await expect(composer).toHaveAttribute('data-cte-composer-prompt','native');
  // Observed home-page variant: one whitespace character, no native attribute.
  await editor.evaluate(el=>el.innerHTML='<p> </p>');
  await expect(composer).toHaveAttribute('data-cte-composer-prompt','plain');
  expect(await editor.evaluate(el=>el.textContent)).toBe(' ');
  expect(await editor.locator('p').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('"输入消息或指令…"');
  expect(await editor.locator('p').evaluate(el=>el.outerHTML)).toBe('<p> </p>');
  await editor.fill('Another draft');await expect(composer).not.toHaveAttribute('data-cte-composer-prompt');
  await editor.evaluate(el=>el.innerHTML='<p data-placeholder="New native prompt"><br></p>');await expect(composer).toHaveAttribute('data-cte-composer-prompt','native');
  expect(await prompt.evaluate(el=>el.outerHTML)).toBe('<p data-placeholder="New native prompt"><br></p>');
  await editor.evaluate(el=>el.setAttribute('role','none'));await expect(composer).not.toHaveAttribute('data-cte-composer-prompt');
  await editor.evaluate(el=>el.setAttribute('role','textbox'));await expect(composer).toHaveAttribute('data-cte-composer-prompt','native');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());
  await expect(composer).not.toHaveAttribute('data-cte-composer-prompt');await expect(prompt).toHaveAttribute('data-placeholder','New native prompt');
  expect(await prompt.evaluate(el=>getComputedStyle(el,'::before').content)).toBe('"New native prompt"');
});

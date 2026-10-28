import {test,expect} from '@playwright/test';
import {discoverThemes} from '../../scripts/catalog';
import {startupExpression} from '../../scripts/renderer';
import path from 'node:path';

for(const [id,color] of [['nerv','rgb(255, 138, 128)'],['default','rgb(180, 35, 24)']])test(`${id}: native danger text stays red and readable across titles, paragraphs and tables`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.setContent(`<style>
    :root{--color-text-danger:#e02e2a}body{margin:0}#layout{display:flex;width:100vw;height:100vh}.app-shell-left-panel{width:220px;flex-shrink:0}.sidebar-navigation{display:flex;flex-direction:column}main{display:flex;flex:1;flex-direction:column;padding:20px}.ProseMirror{min-height:50px}
    ._PortalBoundary_fixture{--color-text-danger:#e02e2a;color-scheme:light}._TextBase_fixture{color:var(--text-base-color,var(--color-text-prose))}.codex-docx-preview-wrapper{--color-text-danger:#b42318;color-scheme:light;background:white}
    </style><div id="layout"><aside class="app-shell-left-panel"><nav class="sidebar-navigation"><button>Home</button></nav></aside><main><div class="_PortalBoundary_fixture"><div class="_DilResponseRoot_fixture"><h1 class="_TextBase_fixture _Title_fixture" style="color:var(--color-text-danger)">Title fixture</h1><p><span class="_TextBase_fixture" style="color:var(--color-text-danger)">Risk fixture</span></p><table><tbody><tr><td><p class="_TextBase_fixture"><span id="table-tone" class="_TextBase_fixture _Text_fixture" style="color:var(--color-text-danger)">Risk fixture</span></p></td></tr></tbody></table></div></div><div class="codex-docx-preview-wrapper"><span id="document-tone" style="color:var(--color-text-danger)">Independent fixture</span></div><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div></main></div>`);
  const theme=(await discoverThemes(path.resolve('themes'))).themes.find(t=>t.manifest.id===id)!;
  const original=await page.locator('#table-tone').getAttribute('style');
  expect(await page.evaluate(await startupExpression(theme,''))).toMatchObject({compatible:true,checksPassed:true,readability:{passed:true}});
  for(const element of await page.locator('._DilResponseRoot_fixture [style]').all())await expect(element).toHaveCSS('color',color);
  await expect(page.locator('#document-tone')).toHaveCSS('color','rgb(180, 35, 24)');
  await expect(page.locator('#table-tone')).toHaveAttribute('style',original!);
  await page.waitForTimeout(1000);expect(await page.evaluate(()=>window.__CTE_LOCAL__!.status().phase)).toBe('active');
  await page.evaluate(()=>window.__CTE_LOCAL__!.restore());await expect(page.locator('#table-tone')).toHaveCSS('color','rgb(224, 46, 42)');
});

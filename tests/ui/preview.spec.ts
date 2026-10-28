import {test,expect} from '@playwright/test';
test('honest preview, theme switching, variants, settings persistence and complete disable',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
  await expect(page.getByText('独立 UI 预览 · 尚未连接或修改 ChatGPT 官方客户端')).toBeVisible();await expect(page.locator('[data-usage-value]')).toHaveText('—');await expect(page.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  await page.getByRole('button',{name:'管理主题',exact:true}).click();await expect(page.getByRole('heading',{name:'选择一种表达.'})).toBeVisible();
  await page.locator('[data-select-theme="default"]').click();await expect(page.locator('#theme-select')).toHaveValue('default');await expect(page.locator('#app')).toHaveCSS('--cte-accent','#30685e');
  await page.reload();await expect(page.locator('#theme-select')).toHaveValue('default');await page.locator('#theme-select').selectOption('nerv');await page.locator('#variant-select').selectOption('eva-01');await expect(page.locator('#app')).toHaveCSS('--cte-accent','#b797e6');
  await page.getByRole('button',{name:'收起监控面板'}).click();await expect(page.locator('.rail-content')).toBeHidden();await page.reload();await expect(page.locator('.rail-content')).toBeHidden();await page.getByRole('button',{name:'展开监控面板'}).click();
  await page.getByRole('button',{name:'关闭增强',exact:true}).click();await expect(page.locator('#app')).not.toHaveAttribute('data-cte-root');await expect(page.locator('.status-rail')).toBeHidden();await expect(page.locator('style[data-cte-style]')).toHaveCount(0);await page.reload();await expect(page.locator('.status-rail')).toBeHidden();
  await page.getByRole('button',{name:/主题库/}).click();await page.locator('#enabled-setting').check();await expect(page.locator('.status-rail')).toBeVisible();await page.getByRole('button',{name:'重新扫描'}).click();await expect(page.getByRole('status')).toContainText('发现 2 个有效主题');expect(errors).toEqual([]);
});
test('responsive layout, empty quota refresh and compatibility disclosure',async({page})=>{
  await page.goto('/');await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.getByRole('button',{name:'刷新使用额度'}).click();await expect(page.getByRole('status')).toContainText('没有生成示例数据');await page.getByRole('button',{name:'兼容性检查',exact:true}).click();await expect(page.getByRole('heading',{name:'尚未连接官方客户端'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

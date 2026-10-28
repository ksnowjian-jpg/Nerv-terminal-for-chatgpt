import { chromium } from '@playwright/test';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:5173');await page.locator('[data-cte-root]').waitFor();
  await page.screenshot({path:'docs/preview-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'docs/preview-mobile.png',fullPage:true});
} finally {await browser.close();}

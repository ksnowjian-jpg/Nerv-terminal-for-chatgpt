import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui', fullyParallel:false, workers:1,
  use:{baseURL:'http://127.0.0.1:5174',channel:process.env.BROWSER_CHANNEL||'msedge',screenshot:'only-on-failure'},
  webServer:{command:'node scripts/run.mjs serve',url:'http://127.0.0.1:5174',env:{PORT:'5174'},reuseExistingServer:false},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1100}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true}}]
});

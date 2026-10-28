import { build } from 'esbuild';
import type { ThemePackage } from '../src/core/theme-manager/schema';

export async function probeExpression() {
  const bundle = await build({entryPoints:['src/core/injector/probe.ts'],bundle:true,write:false,format:'iife',globalName:'cteProbe',platform:'browser',target:'es2022'});
  return `(()=>{${bundle.outputFiles[0].text}\nreturn cteProbe.inspectRenderer()})()`;
}
export async function anchorsExpression() {
  const bundle=await build({entryPoints:['src/core/injector/probe.ts'],bundle:true,write:false,format:'iife',globalName:'cteProbe',platform:'browser',target:'es2022'});
  return `(()=>{${bundle.outputFiles[0].text}\nreturn cteProbe.getAnchors()})()`;
}
export async function installExpression(theme: ThemePackage, variant: string) {
  const bundle=await build({entryPoints:['src/core/injector/runtime.ts'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
  return `${bundle.outputFiles[0].text}\nwindow.__CTE_LOCAL__.install(${JSON.stringify(theme)},${JSON.stringify(variant)})`;
}
export async function startupExpression(theme:ThemePackage,variant:string) {
  const install=await installExpression(theme,variant);
  const probe=await build({entryPoints:['src/core/injector/probe.ts'],bundle:true,write:false,format:'iife',globalName:'cteStartup',platform:'browser',target:'es2022'});
  return `(async()=>{${install};const installed=window.__CTE_LOCAL__?.status();if(!installed?.enabled)return {compatible:false,checksPassed:false,reason:installed?.reason,failedChecks:['installation']};await new Promise(resolve=>setTimeout(resolve,850));${probe.outputFiles[0].text}\nlet result=cteStartup.inspectStartup();for(let attempt=0;attempt<4&&!result.compatible&&window.__CTE_LOCAL__?.status().enabled;attempt++){await new Promise(resolve=>setTimeout(resolve,200));result=cteStartup.inspectStartup();}if(!result.compatible&&!result.pending)window.__CTE_LOCAL__?.restore();return result})()`;
}
export async function verifyExpression(theme: ThemePackage, variant: string) {
  const probe=await probeExpression();
  const install=await installExpression(theme,variant);
  const anchors=await anchorsExpression();
  return `(async()=>{
    window.__CTE_LOCAL__?.restore();
    const before=(${probe});
    if(!before.compatible)return {compatible:false,reason:before.reason};
    const nodes=(${anchors});
    const editor=nodes.composer.querySelector('.ProseMirror[role="textbox"]')||nodes.composer;
    const navigation=nodes.navigation;
    const nativeColor=getComputedStyle(document.documentElement).getPropertyValue('--color-token-main-surface-primary');
    ${install};
    await new Promise(resolve=>setTimeout(resolve,850));
    await document.fonts.ready;
    const backdropSource=${JSON.stringify(theme.manifest.presentation?.watermark?theme.images?.[theme.manifest.presentation.watermark.image]??null:null)};
    let backdropImageLoaded=!backdropSource;
    if(backdropSource){try{const image=new Image();image.src=backdropSource;await image.decode();backdropImageLoaded=image.naturalWidth>0;}catch{backdropImageLoaded=false;}}
    const readability=window.__CTE_LOCAL__.readability();
    const panel=document.querySelector('[data-cte-panel]');
    if(!panel)return {compatible:false,reason:readability?.reason||'Panel installation failed',readability};
    const expectedFonts=${JSON.stringify((theme.fonts??[]).map(font=>({family:font.family,weight:String(font.weight)})))};
    const faces=[...document.fonts];
    await Promise.all([...panel.querySelectorAll('img')].map(image=>image.decode().catch(()=>{})));
    const brandArt=panel.querySelector('.cte-brand-logo');
    const wordmarkArt=panel.querySelector('.cte-brand-wordmark');
    const brandWordmark=${!!theme.manifest.presentation?.brandWordmark}?wordmarkArt instanceof HTMLImageElement&&wordmarkArt.complete&&wordmarkArt.naturalWidth>0:true;
    const brandMark=${!!theme.manifest.presentation?.brandImage}?brandArt instanceof HTMLImageElement&&brandArt.complete&&brandArt.naturalWidth>0:${!!theme.manifest.presentation&&!!theme.emblem&&!theme.manifest.presentation?.brandWordmark}?!['none',''].includes(getComputedStyle(brandArt).maskImage):true;
    const assets={fonts:expectedFonts.map(font=>({family:font.family,loaded:faces.some(face=>face.family.replace(/['"]/g,'')===font.family&&face.weight===font.weight&&face.status==='loaded')})),illustrations:[...panel.querySelectorAll('.cte-theme-diagram img')].every(img=>img.complete&&img.naturalWidth>0),brandMark,brandWordmark,watermark:${!!theme.manifest.presentation?.watermark}?!!document.querySelector('[data-cte-backdrop]'):true};
    const expectedChrome={navigation:!!before.decorationHosts?.navigation&&${!!theme.manifest.presentation?.navigationBadge},header:!!before.decorationHosts?.header&&${!!theme.manifest.presentation?.headerBand}};
    const chromeChecks=()=>{
      const checks=Object.fromEntries(Object.entries(expectedChrome).map(([key,enabled])=>[key,document.querySelectorAll('[data-cte-chrome="'+key+'"]').length===(enabled?1:0)]));
      if(expectedChrome.header){const band=document.querySelector('[data-cte-chrome="header"]');checks.header=checks.header&&!!band&&band.getBoundingClientRect().top+1>=nodes.main.getBoundingClientRect().top+(before.decorationHosts.headerInset||0);}
      return checks;
    };
    const firstChrome=chromeChecks();
    const rect=panel.getBoundingClientRect();
    const editorRect=editor.getBoundingClientRect();
    const panelVisible=getComputedStyle(panel).display!=='none';
    const expanded={panelVisible,panelWidth:rect.width,viewportWidth:innerWidth,panelWithinViewport:!panelVisible||(rect.left>=0&&rect.right<=innerWidth+1),editorEndsBeforePanel:!panelVisible||editorRect.right<=rect.left+1};
    panel.querySelector('[data-collapse]').click();
    const collapsedWidth=panel.getBoundingClientRect().width;
    window.__CTE_LOCAL__.restore();
    const restored={panelRemoved:!document.querySelector('[data-cte-panel]'),stylesRemoved:!document.querySelector('[data-cte-style], [data-cte-runtime]'),decorationsRemoved:!document.querySelector('[data-cte-backdrop],[data-cte-chrome]'),markersRemoved:!document.querySelector('[data-cte-region], [data-cte-reserve], [data-cte-chrome-host]'),editorNodePreserved:editor.isConnected,navigationNodePreserved:navigation.isConnected,nativeColorRestored:getComputedStyle(document.documentElement).getPropertyValue('--color-token-main-surface-primary')===nativeColor};
    const final=window.__CTE_LOCAL__.install(${JSON.stringify(theme)},${JSON.stringify(variant)});
    await new Promise(resolve=>setTimeout(resolve,850));
    const finalReadability=window.__CTE_LOCAL__.readability();
    const readable=before.profile!=='desktop-2026'||!!(readability?.passed&&finalReadability?.passed);
    const chrome=chromeChecks();
    const checks={initialChrome:Object.values(firstChrome).every(Boolean),finalChrome:Object.values(chrome).every(Boolean),restoration:Object.values(restored).every(Boolean),readability:readable,backdropImage:backdropImageLoaded,fonts:assets.fonts.every(font=>font.loaded),illustrations:assets.illustrations,brandMark:assets.brandMark,brandWordmark:assets.brandWordmark,watermark:assets.watermark,panelWithinViewport:expanded.panelWithinViewport,composerNotCovered:expanded.editorEndsBeforePanel,collapse:!panelVisible||collapsedWidth===54};
    const failedChecks=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
    const checksPassed=failedChecks.length===0;
    if(!checksPassed)window.__CTE_LOCAL__.restore();
    return {compatible:final.compatible,profile:before.profile,checksPassed,checks,failedChecks,assets:{...assets,backdropImageLoaded,chrome},readability:finalReadability,expanded,collapsedWidth,restored,finalState:checksPassed?'Theme enabled; resources, readability and restoration checks passed':'Enhancement removed after a failed check'};
  })()`;
}

import { CompatibilityAdapter, type CompatibilityResult } from '../compatibility';
import { nativeTokenCss,userBubbleTokenCss } from '../compatibility/styles';
import {refreshOfficialUsage} from '../compatibility/usage';
import {finishPaletteTransitions} from '../compatibility/transitions';
import {createReplyColors} from '../compatibility/reply-colors';
import { measureReadability,resetReadabilityMotion, type ReadabilityReport } from '../compatibility/readability';
import { ThemeManager } from '../theme-manager';
import type { ThemePackage } from '../theme-manager/schema';
import { UsageMonitor,unavailable } from '../../features/usage-monitor';
import { paintUsage } from '../../features/status-panel';
import {resolvePanelText,applyPanelText} from '../../features/status-panel/text';
import {decoratePanel,decorateMain,decorateChrome,themeArtBaseCss} from '../../components/theme-art';
import {createWelcomeCopy} from '../../components/welcome-copy';
import {createComposerCopy,composerCopyCss} from '../../components/composer-copy';

type Phase='disabled'|'active'|'suspended'|'blocked';
interface Runtime { restore(): void; status():{phase:Phase;enabled:boolean;reason:string;collapsed:boolean}; readability(): ReadabilityReport|null; install(theme: ThemePackage, variant?: string): { compatible: boolean; reason: string } }
declare global { interface Window { __CTE_LOCAL__?: Runtime } }

const panelCss = `
[data-cte-panel]{position:fixed;inset:0 0 0 auto;width:var(--cte-panel-width);background:var(--cte-surface);color:var(--cte-text);border-left:1px solid var(--cte-border);z-index:1000;font:12px var(--cte-font);box-sizing:border-box;overflow:auto;padding:20px;line-height:1.7}
[data-cte-panel] *{box-sizing:border-box}
[data-cte-root] [data-cte-welcome-original]{display:none!important}
[data-cte-root] [data-cte-welcome]{display:flex;flex-direction:column;align-items:center;gap:10px;max-width:100%;padding:0 12px;text-align:center}
[data-cte-root] [data-cte-welcome-title]{font-size:clamp(22px,2vw,30px);font-weight:700;line-height:1.4;letter-spacing:.025em;color:var(--cte-text)}
[data-cte-root] [data-cte-welcome-caption]{font:11px/1.5 var(--cte-display-font);letter-spacing:.13em;color:var(--cte-muted);overflow-wrap:anywhere}
[data-cte-panel] button{font:inherit;background:var(--cte-elevated);color:var(--cte-text);border:1px solid var(--cte-border);border-radius:var(--cte-radius);padding:7px 10px;cursor:pointer;margin:8px 0}
[data-cte-panel] button:focus-visible{outline:2px solid var(--cte-accent);outline-offset:2px}
[data-cte-panel] header{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--cte-border);padding-bottom:12px}
[data-cte-panel] strong{font-weight:500}
[data-cte-panel] .cte-value{font:48px var(--cte-display-font);color:var(--cte-accent);margin-top:22px}
[data-cte-panel] p{margin:12px 0;color:var(--cte-muted)}
[data-cte-panel] [role="progressbar"]{background:var(--cte-elevated);height:7px;border:1px solid var(--cte-border);margin:14px 0}
[data-cte-panel] [role="progressbar"] span{display:block;width:var(--remaining,0%);height:100%;background:var(--cte-accent)}
[data-cte-panel] dl{font-size:11px;margin:20px 0}[data-cte-panel] dd{margin:0 0 12px;color:var(--cte-muted)}
[data-cte-panel][data-collapsed]{width:54px;padding:8px}[data-cte-panel][data-collapsed] .cte-detail{display:none}[data-cte-panel][data-collapsed] header{border:0}
[data-cte-reserve="margin"]{margin-inline-end:var(--cte-panel-width)!important}
[data-cte-reserve="padding"]{padding-inline-end:var(--cte-panel-width)!important;box-sizing:border-box!important}
html[data-cte-collapsed] [data-cte-reserve="margin"]{margin-inline-end:54px!important}
html[data-cte-collapsed] [data-cte-reserve="padding"]{padding-inline-end:54px!important}
@media(max-width:1000px){[data-cte-panel]{display:none}[data-cte-reserve="margin"],html[data-cte-collapsed] [data-cte-reserve="margin"]{margin-inline-end:0!important}[data-cte-reserve="padding"],html[data-cte-collapsed] [data-cte-reserve="padding"]{padding-inline-end:0!important}}
`;
window.__CTE_LOCAL__?.restore();
let cleanup = () => {};
let readability:ReadabilityReport|null=null;
let desired:{theme:ThemePackage;variant:string}|null=null;
let appearance:{manager:ThemeManager;style:HTMLStyleElement}|null=null;
let attachment:{compatibility:CompatibilityResult;intact:()=>boolean;audit:()=>void;syncChrome:()=>void}|null=null;
let shell:ReturnType<typeof createShell>|null=null;
let watcher:MutationObserver|undefined;
let check:ReturnType<typeof setTimeout>|undefined;
let phase:Phase='disabled';
let stateReason='增强已关闭';
let collapsed=false;
let lastUsage=unavailable();
const adapter=new CompatibilityAdapter(document);
function sameAnchors(a:CompatibilityResult,b:CompatibilityResult) {return a.main===b.main&&a.navigation===b.navigation&&a.composer===b.composer&&a.layout===b.layout;}
function detach() {const remove=cleanup;cleanup=()=>{};attachment=null;remove();}
function clearShell() {shell?.clear();shell=null;}
function clearAppearance() {appearance?.style.remove();appearance?.manager.restore();appearance=null;}
function applyAppearance(theme:ThemePackage,variant:string) {
  const manager=new ThemeManager(document.documentElement);manager.apply(theme,variant);
  const tokens={...theme.tokens,...theme.manifest.variants.find(item=>item.id===variant)?.tokens};
  const style=document.createElement('style');style.dataset.cteRuntime='';style.textContent=nativeTokenCss+(tokens.userBubbleBackground&&tokens.userBubbleText?userBubbleTokenCss:'')+panelCss+themeArtBaseCss+composerCopyCss(theme.manifest.presentation?.composerPlaceholder);document.head.append(style);
  appearance={manager,style};
}
function stopWatching() {watcher?.disconnect();watcher=undefined;if(check)clearTimeout(check);check=undefined;}
function block(reason:string) {desired=null;stopWatching();detach();clearShell();clearAppearance();phase='blocked';stateReason=reason;}
function reconcile(next=adapter.inspect()) {
  if(!desired)return;
  if(!next.compatible) {
    // Loss of input readiness is not loss of an established chat surface.
    // Keep the same layout and artwork while its native composer is busy.
    if(attachment&&adapter.retainsChat(attachment.compatibility)){attachment.syncChrome();attachment.audit();return;}
    if(attachment)detach();
    clearShell();
    phase='suspended';stateReason='当前页面不支持增强，等待返回可识别的聊天页';return;
  }
  if(attachment&&sameAnchors(attachment.compatibility,next)){attachment.syncChrome();if(attachment.intact()){attachment.audit();return;}}
  detach();mount(next,desired.theme,desired.variant);
}
function scheduleCheck() {if(check||!desired)return;check=setTimeout(()=>{check=undefined;reconcile();},150);}
// The cockpit belongs to the window, not to one cached conversation. Keep its
// monitor, navigation decoration and layout reservation across chat rebinds.
function createShell(compatibility:CompatibilityResult,theme:ThemePackage) {
  const root=document.documentElement,reserve=compatibility.layout??compatibility.main!;
  const saved:Array<[Element,string,string|null]>=[];
  const mark=(el:Element,key:string,value:string)=>{saved.push([el,key,el.getAttribute(key)]);el.setAttribute(key,value);};
  const panelText=resolvePanelText(theme.manifest.presentation?.panelText);
  let navigationHost:HTMLElement|undefined,navigationPrevious:string|null=null,navigationChrome:HTMLElement[]=[];
  let nativeReplacement:HTMLElement|undefined,monitor:UsageMonitor|undefined;
  const panel=document.createElement('aside');panel.dataset.ctePanel='';panel.setAttribute('aria-label','Theme Engine 状态监控');
  const clearNavigation=()=>{
    navigationChrome.forEach(node=>node.remove());navigationChrome=[];
    if(navigationHost){if(navigationPrevious===null)navigationHost.removeAttribute('data-cte-chrome-host');else navigationHost.setAttribute('data-cte-chrome-host',navigationPrevious);}
    navigationHost=undefined;
  };
  const clear=()=>{monitor?.stop();panel.remove();nativeReplacement?.remove();clearNavigation();for(const [el,key,value] of saved.reverse()){if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}};
  const syncNavigation=(current:CompatibilityResult)=>{
    const next=adapter.decorationHosts(current).navigation;
    if(next===navigationHost&&navigationChrome.every(node=>node.isConnected))return;
    clearNavigation();
    if(next&&theme.manifest.presentation?.navigationBadge){navigationHost=next;navigationPrevious=next.getAttribute('data-cte-chrome-host');next.setAttribute('data-cte-chrome-host','navigation');}
    navigationChrome=decorateChrome({navigation:next,headerInset:0},theme);
  };
  try{
    mark(compatibility.navigation!,'data-cte-region','navigation');
    mark(reserve,'data-cte-reserve',compatibility.layout?'padding':'margin');
    mark(root,'data-cte-collapsed','');root.toggleAttribute('data-cte-collapsed',collapsed);
    panel.innerHTML=`<header><strong class="cte-detail">THEME ENGINE</strong><button data-collapse aria-label="收起监控面板" aria-expanded="true">›</button></header><div class="cte-detail"><p data-panel-intro>本机增强层 · 已通过基础结构检查</p><h3 data-usage-title>使用额度</h3><p data-usage-status></p><div class="cte-value"><span data-usage-value>—</span><small>%</small></div><div role="progressbar" aria-label="剩余使用额度" aria-valuemin="0" aria-valuemax="100"><span></span></div><p data-usage-note aria-live="polite"></p><dl><dt data-usage-time-label>最近读取</dt><dd data-usage-time></dd><dt data-usage-reset-label>额度重置</dt><dd data-usage-reset></dd></dl><button data-refresh>刷新可见额度</button><p data-theme-name></p><button data-restore>关闭增强 / 恢复原版</button></div>`;
    applyPanelText(panel,panelText);panel.querySelector('[data-theme-name]')!.textContent=`${panelText.themeLabel}${theme.manifest.name}`;
    decoratePanel(panel,theme);document.body.append(panel);syncNavigation(compatibility);
    const homeIcon=theme.icons?.home?adapter.findActionIcon('home'):null;
    if(homeIcon){mark(homeIcon,'data-cte-hidden-icon','');nativeReplacement=document.createElement('span');nativeReplacement.dataset.cteNativeReplacement='home';nativeReplacement.setAttribute('aria-hidden','true');homeIcon.before(nativeReplacement);}
    const applyCollapsed=()=>{
      panel.toggleAttribute('data-collapsed',collapsed);root.toggleAttribute('data-cte-collapsed',collapsed);
      const btn=panel.querySelector<HTMLButtonElement>('[data-collapse]')!;btn.textContent=collapsed?'‹':'›';btn.setAttribute('aria-expanded',String(!collapsed));btn.setAttribute('aria-label',collapsed?panelText.expand:panelText.collapse);
    };
    applyCollapsed();panel.querySelector<HTMLButtonElement>('[data-collapse]')!.onclick=()=>{collapsed=!collapsed;applyCollapsed();};
    panel.querySelector<HTMLButtonElement>('[data-restore]')!.onclick=()=>window.__CTE_LOCAL__?.restore();
    monitor=new UsageMonitor(()=>adapter.readUsageItem(),data=>{lastUsage={...data,refreshing:false};paintUsage(panel,data,panelText);},lastUsage);monitor.start();
    panel.querySelector<HTMLButtonElement>('[data-refresh]')!.onclick=()=>{const focus=document.activeElement instanceof HTMLElement?document.activeElement:null;void monitor!.refreshOfficial(signal=>refreshOfficialUsage(document,signal,focus));};
    return {panel,clear,syncNavigation,intact:()=>panel.isConnected&&navigationChrome.every(node=>node.isConnected),matches:(next:CompatibilityResult)=>next.navigation===compatibility.navigation&&(next.layout??next.main)===reserve&&panel.isConnected};
  }catch(error){clear();throw error;}
}
function mount(compatibility:CompatibilityResult,theme:ThemePackage,variant:string) {
    readability=null;resetReadabilityMotion();
    const saved: Array<[Element,string,string|null]> = [];
    const mark=(el:Element,key:string,value:string)=>{saved.push([el,key,el.getAttribute(key)]);el.setAttribute(key,value);};
    let audit: ReturnType<typeof setTimeout>|undefined;
    let unsettledFailures=0;
    let visibilityCheck:(()=>void)|undefined;
    let backdrop: HTMLElement|undefined;
    let welcome:ReturnType<typeof createWelcomeCopy>|undefined;
    let composerCopy:ReturnType<typeof createComposerCopy>|undefined;
    let replyColors:ReturnType<typeof createReplyColors>|undefined;
    let chrome:HTMLElement[]=[];
    let chromeHosts=adapter.decorationHosts(compatibility);
    let chromeSizer:ResizeObserver|undefined;
    let sizedTargets:Element[]=[];
    let chromeActive=true;
    cleanup=()=>{
      if(audit)clearTimeout(audit);backdrop?.remove();
      if(visibilityCheck)document.removeEventListener('visibilitychange',visibilityCheck);
      chromeActive=false;chromeSizer?.disconnect();
      welcome?.clear();
      composerCopy?.clear();
      replyColors?.clear();
      chrome.forEach(node=>node.remove());
      for(const [el,key,value] of saved.reverse()) {if(value===null)el.removeAttribute(key);else el.setAttribute(key,value);}
    };
    try {
      if(!shell?.matches(compatibility)){clearShell();shell=createShell(compatibility,theme);}
      shell.syncNavigation(compatibility);
      mark(compatibility.main!,'data-cte-region','main');mark(compatibility.composer!,'data-cte-region','composer');
      backdrop=decorateMain(compatibility.main!,theme);
      chrome=decorateChrome({...chromeHosts,navigation:undefined},theme);
      welcome=createWelcomeCopy(compatibility,theme.manifest.presentation?.welcomeText,theme.manifest.presentation?.welcomeCaption);
      composerCopy=createComposerCopy(compatibility,theme.manifest.presentation?.composerPlaceholder);
      replyColors=createReplyColors(compatibility);
      const watchChromeSizes=()=>{
        const targets=[compatibility.main!,...chromeHosts.headerOverlays];
        if(targets.length===sizedTargets.length&&targets.every(target=>sizedTargets.includes(target)))return;
        chromeSizer?.disconnect();targets.forEach(target=>chromeSizer?.observe(target));sizedTargets=targets;
      };
      const syncChrome=()=>{
        if(!chromeActive||!compatibility.main?.isConnected)return;
        welcome?.sync();
        composerCopy?.sync();
        shell?.syncNavigation(compatibility);
        const next=adapter.decorationHosts(compatibility);
        if(next.header!==chromeHosts.header)return;
        if(next.headerInset!==chromeHosts.headerInset)chrome.find(node=>node.dataset.cteChrome==='header')?.style.setProperty('--cte-header-inset',`${next.headerInset}px`);
        chromeHosts=next;watchChromeSizes();
      };
      if(typeof ResizeObserver!=='undefined'&&chrome.some(node=>node.dataset.cteChrome==='header')){chromeSizer=new ResizeObserver(syncChrome);watchChromeSizes();}
      finishPaletteTransitions(compatibility);
      replyColors.sync();finishPaletteTransitions(compatibility);
      const runAudit=()=>{
        audit=undefined;
        const current=adapter.inspect();
        if(current.compatible?!sameAnchors(current,compatibility):!adapter.retainsChat(compatibility)){scheduleCheck();return;}
        finishPaletteTransitions(compatibility);
        replyColors?.sync();finishPaletteTransitions(compatibility);
        readability=measureReadability(compatibility);
        if(readability.passed){unsettledFailures=0;return;}
        if(readability.pending){unsettledFailures=0;audit=setTimeout(runAudit,document.hidden?1000:250);return;}
        // A single frame is insufficient to withdraw the entire session. Still
        // fail closed when a settled problem survives the confirmation audit.
        if(++unsettledFailures<2){audit=setTimeout(runAudit,250);return;}
        block(readability.reason);
      };
      const scheduleAudit=()=>{
        if(compatibility.profile!=='desktop-2026')return;
        if(audit)clearTimeout(audit);
        audit=setTimeout(runAudit,600);
      };
      visibilityCheck=()=>{if(!document.hidden){resetReadabilityMotion();scheduleAudit();}};
      document.addEventListener('visibilitychange',visibilityCheck);
      attachment={compatibility,audit:scheduleAudit,syncChrome,intact:()=>{const hosts=adapter.decorationHosts(compatibility);return !!(shell?.intact()&&appearance?.style.isConnected&&document.querySelector('style[data-cte-style]')&&compatibility.main?.getAttribute('data-cte-region')==='main'&&chrome.every(node=>node.isConnected)&&hosts.header===chromeHosts.header);}};
      scheduleAudit();
      phase='active';stateReason=compatibility.reason;
      return {compatible:true,reason:compatibility.reason};
    } catch(error) {
      const reason=error instanceof Error?error.message:'增强层安装失败';block(reason);return {compatible:false,reason};
    }
}
window.__CTE_LOCAL__ = {
  restore() {desired=null;stopWatching();detach();clearShell();clearAppearance();lastUsage=unavailable();phase='disabled';stateReason='增强已关闭';},
  status() {return {phase,enabled:!!desired,reason:stateReason,collapsed};},
  readability() {return readability;},
  install(theme,variant='') {
    this.restore();collapsed=false;
    const compatibility=adapter.inspect();
    if(!compatibility.compatible){stateReason=compatibility.reason;return compatibility;}
    desired={theme,variant};
    try{applyAppearance(theme,variant);}catch(error){const reason=error instanceof Error?error.message:'主题配色安装失败';block(reason);return {compatible:false,reason};}
    const result=mount(compatibility,theme,variant);
    if(result.compatible) {
      // Keep the session alive across SPA routes, even while no supported chat exists.
      // Explicit restore and readability failures disconnect this watcher completely.
      watcher=new MutationObserver(records=>{
        if(records.some(record=>!(record.target instanceof Element?record.target:record.target.parentElement)?.closest('[data-cte-panel],[data-cte-backdrop],[data-cte-chrome],[data-cte-welcome]'))){
          const current=attachment?.compatibility;
          // React may replace the composer or the whole chat during submission.
          // Bind a recognized replacement in this mutation checkpoint, before
          // its first paint; the debounce otherwise exposes native light colors.
          // Unsupported/incomplete routes still use the normal delayed check.
          if(!current||[current.main,current.navigation,current.composer,current.layout].some(node=>node&&!node.isConnected)||current.profile==='desktop-2026'&&!adapter.retainsChat(current)){
            const next=adapter.inspect();
            if(next.compatible){if(check)clearTimeout(check);check=undefined;reconcile(next);return;}
          }
          attachment?.syncChrome();scheduleCheck();
        }
      });
      watcher.observe(document.documentElement,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['id','data-testid','class','role','contenteditable','hidden','inert','aria-hidden','style']});
    }
    return result;
  }
};

import { CompatibilityAdapter } from '../compatibility';
import {measureReadability} from '../compatibility/readability';
import {finishPaletteTransitions} from '../compatibility/transitions';

// Return structural facts only: no message text, input values or account data.
export function getAnchors() {return new CompatibilityAdapter(document).inspect();}
// Normal launch checks the currently rendered page, without collapsing,
// restoring or comparing React nodes captured before application startup.
export function inspectStartup() {
  const anchors=getAnchors(),session=window.__CTE_LOCAL__?.status();
  const styles=!!document.querySelector('[data-cte-style]')&&!!document.querySelector('[data-cte-runtime]')&&document.documentElement.hasAttribute('data-cte-root');
  if(!session?.enabled||!styles){const readability=window.__CTE_LOCAL__?.readability();return {compatible:false,checksPassed:false,phase:session?.phase,pending:false,reason:session?.reason??'主题未启用',readability,failedChecks:readability?.passed===false?['readability']:['themeEnabled']};}
  if(!anchors.compatible)return {compatible:true,checksPassed:true,phase:session.phase,pending:true,reason:'配色已启用，返回支持的聊天页后会恢复驾驶舱',failedChecks:[]};
  finishPaletteTransitions(anchors);
  const readability=anchors.profile==='desktop-2026'?measureReadability(anchors):null;
  const panel=document.querySelector<HTMLElement>('[data-cte-panel]');
  const editor=anchors.composer!.querySelector<HTMLElement>('.ProseMirror[role="textbox"]')??anchors.composer!;
  const rect=editor.getBoundingClientRect(),panelRect=panel?.getBoundingClientRect();
  const panelVisible=!!panel&&getComputedStyle(panel).display!=='none';
  const pending=readability?.pending===true;
  const checks={themeEnabled:!!session?.enabled&&styles,panelMounted:!!panel,composerVisible:rect.width>4&&rect.height>4,readability:!readability||readability.passed||pending,panelWithinViewport:!panelVisible||!!panelRect&&panelRect.left>=0&&panelRect.right<=innerWidth+1,composerNotCovered:!panelVisible||!!panelRect&&rect.right<=panelRect.left+1};
  const failedChecks=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
  return {compatible:failedChecks.length===0,checksPassed:failedChecks.length===0&&!pending,phase:session?.phase,pending:pending&&failedChecks.length===0,checks,failedChecks,readability,reason:failedChecks.length?`启动检查未通过：${failedChecks.join(', ')}`:pending?'主题已启用，等待原生文字渐入结束后复查':'主题已启用，当前页面可读性与布局检查通过'};
}
export function inspectRenderer() {
  const result = getAnchors();
  const hosts=new CompatibilityAdapter(document).decorationHosts(result);
  const shape = (element: Element) => ({tag:element.tagName.toLowerCase(),role:element.getAttribute('role'),classes:[...element.classList].slice(0,12)});
  const ancestry = (element: Element) => {const nodes=[];let current:Element|null=element;while(current&&nodes.length<6){nodes.push(shape(current));current=current.parentElement;}return nodes;};
  return {
    compatible: result.compatible,
    profile: result.profile,
    decorationHosts:{navigation:!!hosts.navigation,header:!!hosts.header,headerInset:hosts.headerInset},
    reason: result.reason,
    ownedEnhancement: typeof window.__CTE_LOCAL__?.status==='function'?window.__CTE_LOCAL__.status().enabled:!!document.querySelector('[data-cte-panel]'),
    session: typeof window.__CTE_LOCAL__?.status==='function'?window.__CTE_LOCAL__.status():null,
    anchors: {
      main: document.querySelectorAll('main').length,
      history: document.querySelectorAll('#history, [data-testid="sidebar"]').length,
      composer: document.querySelectorAll('#prompt-textarea').length
    },
    structure: {
      desktopComposerBodies: document.querySelectorAll('[data-composer-body]').length,
      desktopComposers: document.querySelectorAll('[data-composer-body] .ProseMirror[contenteditable="true"][role="textbox"]').length,
      nativeColorTokens: [...getComputedStyle(document.documentElement)].filter(name=>/^--.*(?:surface|accent|border|foreground|background|text-primary|text-secondary)/.test(name)).slice(0,120),
      editors: [...document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')].slice(0,8).map(ancestry),
      navigation: [...document.querySelectorAll('nav, aside, [role="navigation"]')].slice(0,8).map(ancestry),
      main: [...document.querySelectorAll('main')].slice(0,3).map(el=>({path:ancestry(el),siblings:[...(el.parentElement?.children??[])].slice(0,10).map(shape)}))
    }
  };
}

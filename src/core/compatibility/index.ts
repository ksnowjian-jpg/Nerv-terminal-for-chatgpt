import {independentContentSelector} from './content-boundaries';
export interface CompatibilityResult { compatible: boolean; reason: string; profile?: 'web'|'desktop-2026'; main?: HTMLElement; navigation?: HTMLElement; composer?: HTMLElement; layout?: HTMLElement }
export class CompatibilityAdapter {
  constructor(private doc: Document) {}
  private available(element:HTMLElement) {
    if(!element.isConnected||element.closest('[hidden], [inert], [aria-hidden="true"]'))return false;
    for(let node:HTMLElement|null=element;node;node=node.parentElement) {
      const style=this.doc.defaultView?.getComputedStyle(node);
      if(style?.display==='none'||style?.visibility==='hidden'||style?.visibility==='collapse')return false;
    }
    return true;
  }
  findActionIcon(action:'home'):Element|null {
    if(action!=='home')return null;
    const navigation=this.doc.querySelector('aside.app-shell-left-panel');
    if(!navigation)return null;
    for(const button of navigation.querySelectorAll('nav button')) {
      const label=button.getAttribute('aria-label')||button.getAttribute('title')||'';
      if(/^(home|首页|主页)$/i.test(label.trim()))return button.querySelector('svg');
    }
    return null;
  }
  welcomeHeading(result:CompatibilityResult):HTMLElement|undefined {
    const matches=[...result.main!.querySelectorAll<HTMLElement>('.home-composer-anchor .heading-xl:not([data-cte-welcome])')].filter(el=>
      this.available(el.hasAttribute('data-cte-welcome-original')?el.parentElement!:el)&&!el.matches('[hidden],[inert],[aria-hidden="true"]')&&!!el.textContent?.trim()&&el.textContent.trim().length<=160&&!el.closest(`[data-message-author-role],[class*="_MarkdownRoot_"],[class*="_DilResponseRoot_"],[contenteditable="true"],${independentContentSelector}`)&&!el.querySelector('button,a,input,textarea,[contenteditable="true"]'));
    return matches.length===1?matches[0]:undefined;
  }
  decorationHosts(result:CompatibilityResult):{navigation?:HTMLElement;header?:HTMLElement;headerInset:number;headerOverlays:HTMLElement[]} {
    const column=result.navigation?.querySelector<HTMLElement>('.sidebar-navigation');
    const isColumn=(element?:HTMLElement|null)=>!!element&&this.available(element)&&this.doc.defaultView?.getComputedStyle(element).display==='flex'&&this.doc.defaultView.getComputedStyle(element).flexDirection==='column';
    const header=isColumn(result.main)?result.main:undefined;
    let headerInset=0;
    const headerOverlays:HTMLElement[]=[];
    if(header){
      const main=header.getBoundingClientRect();
      // Chat and Work share this stable shell marker, but only Work supplies
      // role=toolbar. Do not rely on the compiled class suffix or title text.
      for(const toolbar of this.doc.querySelectorAll<HTMLElement>('[role="toolbar"],[class~="@container/app-shell-header-toolbar"]')){
        if(!this.available(toolbar)||toolbar.closest('[data-cte-chrome],[data-cte-panel]'))continue;
        if(header.contains(toolbar)){
          // A normal in-flow toolbar moves with our band already. Reserve only
          // a fixed overlay or an absolute overlay positioned against main.
          let overlay=false;
          for(let node:HTMLElement|null=toolbar;node&&node!==header;node=node.parentElement){
            const position=this.doc.defaultView!.getComputedStyle(node).position;
            if(position==='fixed'||position==='absolute'&&(node.offsetParent===header||!header.contains(node.offsetParent))){overlay=true;break;}
          }
          if(!overlay)continue;
        }
        headerOverlays.push(toolbar);
        const rect=toolbar.getBoundingClientRect(),overlap=Math.min(rect.right,main.right)-Math.max(rect.left,main.left);
        const shellHeader=toolbar.classList.contains('@container/app-shell-header-toolbar');
        if(rect.height>0&&rect.height<=120&&rect.bottom>main.top&&rect.top<=main.top+(shellHeader?80:2)&&rect.bottom<=main.top+160&&overlap>=main.width*.5)headerInset=Math.max(headerInset,Math.ceil(rect.bottom-main.top));
      }
    }
    return {navigation:isColumn(column)?column!:undefined,header,headerInset,headerOverlays};
  }
  inspect(): CompatibilityResult {
    const navigation = [...this.doc.querySelectorAll<HTMLElement>('#history, [data-testid="sidebar"]')].find(el=>this.available(el));
    const composers = [...this.doc.querySelectorAll<HTMLElement>('#prompt-textarea')].filter(el=>this.available(el));
    const composer = composers.length===1?composers[0]:undefined;
    const main = composer?.closest<HTMLElement>('main');
    if(main && navigation && composer) return {compatible:true, profile:'web', reason:'已匹配经典页面结构；仍需验证原生交互。',main,navigation,composer};
    // Observed in ChatGPT display-name / OpenAI.Codex 26.1007.2314.0.
    // Avoid hidden menu surfaces, the quick window and Work document editors.
    const desktopNavigation=[...this.doc.querySelectorAll<HTMLElement>('aside.app-shell-left-panel')].find(el=>this.available(el));
    // Sending briefly makes this same textbox read-only. That is still the
    // chat surface, not navigation away from it; preserve its appearance.
    const editors=[...this.doc.querySelectorAll<HTMLElement>('[data-composer-body] .ProseMirror[role="textbox"]')].filter(el=>this.available(el));
    if(desktopNavigation?.querySelector('.sidebar-navigation') && editors.length===1) {
      const editor=editors[0];
      const desktopMain=editor.closest<HTMLElement>('main');
      const desktopComposer=editor.closest<HTMLElement>('[data-composer-body]');
      let layout:HTMLElement|null=desktopMain?.parentElement??null;
      while(layout && !layout.contains(desktopNavigation))layout=layout.parentElement;
      if(desktopMain && desktopComposer && layout && layout!==this.doc.body && layout!==this.doc.documentElement) return {
        compatible:true,profile:'desktop-2026',reason:'已匹配当前 ChatGPT 桌面主窗口结构。',main:desktopMain,navigation:desktopNavigation,composer:desktopComposer,layout
      };
    }
    return {compatible:false, reason:'未匹配已知的主区域、历史导航与输入框；增强层已停用。'};
  }
  readUsageItem(): string | null {
    const menuItems = this.doc.querySelectorAll<HTMLElement>('[role="menu"] [role="menuitem"], [data-testid="account-menu"] [role="menuitem"]');
    const readings: string[] = [];
    for (const item of menuItems) {
      if (item.closest('[data-cte-panel]') || !this.available(item) || !item.getClientRects().length) continue;
      const text = item.innerText ?? item.textContent ?? '';
      if (/(?:使用情况|Usage)/i.test(text)) readings.push(text);
    }
    // Ambiguous menu values are deliberately unavailable.
    return readings.length === 1 ? readings[0] : null;
  }
}

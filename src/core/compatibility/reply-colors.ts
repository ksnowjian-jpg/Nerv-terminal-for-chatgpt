import type {CompatibilityResult} from './index';
import {independentContentSelector} from './content-boundaries';
import {composite,contrastRatio,parseColor} from './readability';

// DIL cards may specify their own complete palette. Repair only the actual
// text runs in styled native components, keeping card backgrounds and layout.
// Plain reply text, syntax, inputs and interactive badges keep the usual guard.
export function createReplyColors(anchors:CompatibilityResult) {
  const main=anchors.main!,doc=main.ownerDocument,view=doc.defaultView!;
  const saved=new Map<HTMLElement,string|null>(),key='data-cte-reply-ink';
  const reset=(element:HTMLElement,value:string|null)=>{if(value===null)element.removeAttribute(key);else element.setAttribute(key,value);};
  const clear=()=>{for(const [element,value] of saved)reset(element,value);saved.clear();};
  const sync=()=>{
    clear();
    if(anchors.profile!=='desktop-2026')return;
    let inspected=0;
    const excluded=`${independentContentSelector},[data-message-author-role="user"],.rich-text-user-turn,pre,code,[data-d-component="badge"],button,a,[role="button"],[contenteditable]`;
    for(const element of main.querySelectorAll<HTMLElement>('[class*="_TextBase_"]')){
      if(inspected>=160)break;
      const response=element.closest('[class*="_DilResponseRoot_"]');
      if(!response||element.closest(excluded)||element.querySelector('button,a,[role="button"],[data-d-component="badge"],pre,code')||element.closest('[hidden],[inert],[aria-hidden="true"]')||![...element.childNodes].some(node=>node.nodeType===view.Node.TEXT_NODE&&!!node.textContent?.trim()))continue;
      const rect=element.getBoundingClientRect();
      if(rect.width<4||rect.height<4||rect.bottom<=0||rect.top>=view.innerHeight||rect.right<=0||rect.left>=view.innerWidth)continue;
      inspected++;
      const chain:HTMLElement[]=[];let styled=false;
      for(let node:HTMLElement|null=element;node;node=node.parentElement){
        chain.unshift(node);
        if(response.contains(node)&&node.matches('[class*="_Box_"],[class*="_TextBase_"]')&&(node.style.color||node.style.backgroundColor||node.style.getPropertyValue('--text-base-color')))styled=true;
      }
      if(!styled)continue;
      const style=view.getComputedStyle(element);
      if(style.visibility!=='visible')continue;
      const foreground=parseColor(style.getPropertyValue('-webkit-text-fill-color'))??parseColor(style.color);
      if(!foreground)continue;
      let background:[number,number,number,number]=[255,255,255,1],hidden=false;
      for(const node of chain){const css=view.getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'){hidden=true;break;}const color=parseColor(css.backgroundColor);if(color)background=composite(color,background);}
      if(hidden||contrastRatio(foreground,background)>=4.5)continue;
      const dark=contrastRatio([0,0,0,1],background),light=contrastRatio([255,255,255,1],background);
      saved.set(element,element.getAttribute(key));element.setAttribute(key,dark>=light?'dark':'light');
    }
  };
  return {sync,clear};
}

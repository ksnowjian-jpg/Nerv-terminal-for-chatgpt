import type { CompatibilityResult } from './index';
import {independentContentSelector} from './content-boundaries';

type RGBA = [number,number,number,number];
export function parseColor(value: string): RGBA | null {
  if(value==='transparent')return [0,0,0,0];
  if(/^#[\da-f]{6}$/i.test(value))return [...value.slice(1).match(/../g)!.map(v=>parseInt(v,16)),1] as RGBA;
  const match=value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if(!match)return null;
  return [Number(match[1]),Number(match[2]),Number(match[3]),match[4]===undefined?1:Number(match[4])];
}
export function composite(front: RGBA,back: RGBA): RGBA {
  const alpha=front[3]+back[3]*(1-front[3]);
  if(!alpha)return [0,0,0,0];
  return [0,1,2].map(i=>(front[i]*front[3]+back[i]*back[3]*(1-front[3]))/alpha).concat(alpha) as RGBA;
}
export function contrastRatio(front: RGBA,back: RGBA) {
  const luminance=(color:RGBA)=>color.slice(0,3).map(c=>{const s=c/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
  const a=luminance(composite(front,back)),b=luminance(back);
  return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
export interface ReadabilityReport { passed: boolean; samples: Array<{area:string;ratio:number;minimum:number;detail?:{foreground:RGBA;background:RGBA;opacity:number;ancestors:Array<{tag:string;classes:string[];color:string;fill:string;background:string;opacity:string}>}}>; reason: string }
export function measureReadability(result: CompatibilityResult): ReadabilityReport {
  const doc=result.main!.ownerDocument;
  const view=doc.defaultView!;
  const targets:Array<{element:HTMLElement;area:string;minimum:number;pseudo?:'::before'}>=[{element:result.main!,area:'main',minimum:4.5},{element:result.composer!,area:'composer',minimum:4.5},{element:result.navigation!,area:'navigation',minimum:4.5}];
  [...result.composer!.querySelectorAll<HTMLElement>('[role="textbox"]')].slice(0,4).forEach((element,i)=>targets.push({element,area:`editor-${i}`,minimum:4.5}));
  // Measure the element that actually paints each text run. A cell/paragraph
  // can inherit black while all of its text is painted by white child spans.
  // Work's sibling document preview has its own palette and is not a reply.
  const walker=doc.createTreeWalker(result.main!,view.NodeFilter.SHOW_TEXT);
  const seen=new Set<HTMLElement>();
  const excluded=`[data-composer-body],#prompt-textarea,[data-cte-panel],[data-cte-chrome],[data-cte-welcome-original],${independentContentSelector}`;
  let visited=0;
  for(let node=walker.nextNode();node&&seen.size<160&&visited<10000;node=walker.nextNode()) {
    visited++;
    const element=node.parentElement;
    if(!node.textContent?.trim()||!element||seen.has(element)||element.closest(excluded)||!element.closest('p,li,strong,em,a,code,pre,td,th,h1,h2,h3,h4,[data-cte-welcome]'))continue;
    const rect=element.getBoundingClientRect();
    if(!element.getClientRects().length||rect.bottom<=0||rect.top>=view.innerHeight||rect.right<=0||rect.left>=view.innerWidth||element.closest('[hidden],[inert],[aria-hidden="true"]'))continue;
    seen.add(element);targets.push({element,area:`message-${element.tagName.toLowerCase()}-${seen.size-1}`,minimum:4.5});
  }
  [...result.navigation!.querySelectorAll<HTMLElement>('button,a,[role="button"]')].slice(0,18).forEach((element,i)=>targets.push({element,area:`navigation-control-${i}`,minimum:3}));
  [...result.composer!.querySelectorAll<HTMLElement>('[data-placeholder]'+(result.composer!.getAttribute('data-cte-composer-prompt')==='plain'?',.ProseMirror >p:only-child':''))].slice(0,4).forEach((element,i)=>targets.push({element,area:`placeholder-${i}`,minimum:4.5,pseudo:'::before'}));
  const samples:ReadabilityReport['samples']=[];
  for(const {element,area,minimum,pseudo} of targets) {
    const rect=element.getBoundingClientRect();
    if(element.closest('[disabled],[aria-disabled="true"],[hidden],[inert],[aria-hidden="true"]')||!element.getClientRects().length||rect.width<4||rect.height<4||rect.bottom<=0||rect.top>=view.innerHeight||rect.right<=0||rect.left>=view.innerWidth)continue;
    const style=view.getComputedStyle(element,pseudo);
    if(pseudo&&['none','normal',''].includes(style.content))continue;
    if(style.visibility!=='visible'||Number(style.opacity)===0)continue;
    const foreground=parseColor(style.getPropertyValue('-webkit-text-fill-color'))??parseColor(style.color);if(!foreground)continue;
    const chain:HTMLElement[]=[];for(let node:HTMLElement|null=element;node;node=node.parentElement)chain.unshift(node);
    let background:RGBA=[255,255,255,1];
    let opacity=1;
    let hidden=false;
    for(const node of chain){const css=view.getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden'||css.visibility==='collapse'){hidden=true;break;}const color=parseColor(css.backgroundColor);if(color)background=composite(color,background);opacity*=Number(css.opacity)||0;}
    if(hidden)continue;
    if(pseudo)opacity*=Number(style.opacity);
    if(opacity<=.01)continue;
    foreground[3]*=opacity;
    const ratio=contrastRatio(foreground,background);
    samples.push({area,ratio,minimum,...(ratio<minimum?{detail:{foreground,background,opacity,ancestors:chain.slice(-6).map(node=>{const css=view.getComputedStyle(node);return {tag:node.tagName,classes:[...node.classList].slice(0,8),color:css.color,fill:css.getPropertyValue('-webkit-text-fill-color'),background:css.backgroundColor,opacity:css.opacity};})}}:{})});
  }
  const failed=samples.filter(sample=>sample.ratio<sample.minimum);
  const passed=samples.length>=3&&failed.length===0;
  return {passed,samples,reason:passed?'关键区域对比度检查通过':failed.length?'存在低对比度文字或控件，已撤回主题':'无法完成关键区域可读性检查，已撤回主题'};
}

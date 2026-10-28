import {writeFile,mkdir} from 'node:fs/promises';
import {listTargets,evaluate,captureClip} from './cdp';
import {probeExpression,anchorsExpression} from './renderer';
import {independentContentSelector} from '../src/core/compatibility/content-boundaries';

const port=9335;
const candidates=[];
for(const target of await listTargets(port)){const report=await evaluate(target,port,await probeExpression()) as {compatible:boolean};if(report.compatible)candidates.push(target);}
if(candidates.length!==1)throw new Error('Expected a single compatible main window');
const target=candidates[0];
if(process.argv.includes('--homepage')){
  const result=await evaluate(target,port,`(()=>{
    const anchors=(${await anchorsExpression()}),main=anchors.main;
    const editor=anchors.composer.querySelector('.ProseMirror[role="textbox"]')||anchors.composer;
    const panel=document.querySelector('[data-cte-panel]'),welcome=main.querySelector('[data-cte-welcome]');
    const visible=el=>{const r=el.getBoundingClientRect();if(r.width<=0||r.height<=0||r.bottom<=0||r.top>=innerHeight||el.closest('[hidden],[inert],[aria-hidden="true"]'))return false;for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility!=='visible'||Number(s.opacity)===0)return false;}return true};
    const fail=reason=>({reason});
    if(window.__CTE_LOCAL__?.status().phase!=='active'||!welcome||!visible(welcome)||!panel||!visible(panel))return fail('Open the themed new-chat homepage with the cockpit expanded.');
    if(editor.textContent.trim()||[...anchors.composer.querySelectorAll('[data-composer-attachments] >*')].some(visible))return fail('A draft or attachment is present; no screenshot was written.');
    if([...main.querySelectorAll('[data-message-author-role],[data-dil-message-id],.rich-text-user-turn')].some(visible))return fail('Conversation content is visible; no screenshot was written.');
    if([...document.querySelectorAll('[role="menu"],[role="dialog"],'+${JSON.stringify(independentContentSelector)})].some(visible))return fail('Close menus, dialogs and independent previews before capturing.');
    // The cockpit starts at the top of the renderer, above main's native
    // title inset. Keep that header intact while excluding the left sidebar.
    const rect=main.getBoundingClientRect(),x=Math.ceil(rect.left),y=0;
    if(x<0||y<0||innerWidth-x<400||innerHeight-y<300)return fail('The homepage capture region is outside the viewport.');
    return {clip:{x,y,width:Math.floor(innerWidth-x),height:Math.floor(innerHeight-y)}};
  })()`) as {reason?:string;clip?:{x:number;y:number;width:number;height:number}};
  if(!result.clip)throw new Error(result.reason||'Homepage privacy checks failed.');
  await mkdir('.local-tools',{recursive:true});
  const file='.local-tools/client-homepage.png';
  await writeFile(file,Buffer.from(await captureClip(target,port,result.clip),'base64'));
  console.log(JSON.stringify({file,source:'actual-client',excluded:'history navigation and account area',clip:result.clip}));
  process.exit(0);
}
const clips=await evaluate(target,port,`(()=>{
  const anchors=(${await anchorsExpression()});
  const editor=anchors.composer.querySelector('.ProseMirror[role="textbox"]')||anchors.composer;
  const main=anchors.main;
  const rect=el=>{const r=el.getBoundingClientRect();return {x:Math.max(0,r.x),y:Math.max(0,r.y),width:Math.min(r.width,innerWidth-Math.max(0,r.x)),height:Math.min(r.height,innerHeight-Math.max(0,r.y))}};
  const rail=anchors.navigation.querySelector('nav')||anchors.navigation;
  const heading=[...main.querySelectorAll('h1')].find(el=>getComputedStyle(el).visibility==='visible');
  const reply=${process.argv.includes('--reply')}?[...main.querySelectorAll('[class*="_DilResponseRoot_"] p')].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>0&&r.bottom<innerHeight}):null;
  let userBubble=${process.argv.includes('--user-bubble')}?[...main.querySelectorAll('.rich-text-user-turn')].find(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.top>0&&r.bottom<innerHeight}):null;
  while(userBubble&&userBubble!==main&&['transparent','rgba(0, 0, 0, 0)'].includes(getComputedStyle(userBubble).backgroundColor))userBubble=userBubble.parentElement;
  let background=null;
  const mark=main.querySelector('[data-cte-backdrop]');
  if(${process.argv.includes('--background')}&&mark){
    const frame=mark.getBoundingClientRect();
    const protectedRects=[...main.querySelectorAll('p,h1,h2,h3,li,button,a,[role="textbox"],img,canvas')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight);
    for(const width of [260,220,180])for(const offset of [40,150,260]){
      const candidate={x:frame.right-width-12,y:frame.top+offset,width,height:300};
      if(!background&&candidate.x>=frame.left&&candidate.y+candidate.height<innerHeight&&protectedRects.every(r=>r.right<=candidate.x||r.left>=candidate.x+candidate.width||r.bottom<=candidate.y||r.top>=candidate.y+candidate.height))background=candidate;
    }
  }
  return {navigationBrand:document.querySelector('[data-cte-chrome="navigation"]')?rect(document.querySelector('[data-cte-chrome="navigation"]')):null,headerBand:document.querySelector('[data-cte-chrome="header"]')?rect(document.querySelector('[data-cte-chrome="header"]')):null,rail:rail?{...rect(rail),height:Math.min(240,rect(rail).height)}:null,heading:heading?rect(heading):null,reply:reply?rect(reply):null,userBubble:userBubble&&userBubble!==main?rect(userBubble):null,background,composer:editor.textContent.length===0?rect(editor.closest('[data-composer-body]')):null,panel:document.querySelector('[data-cte-panel]')?rect(document.querySelector('[data-cte-panel]')):null};
})()`) as Record<string,{x:number;y:number;width:number;height:number}|null>;
await mkdir('.local-tools',{recursive:true});
for(const [name,clip] of Object.entries(clips)) {
  if(!clip||clip.width<=0||clip.height<=0)continue;
  const file=`.local-tools/client-${name}.png`;
  await writeFile(file,Buffer.from(await captureClip(target,port,clip),'base64'));
  console.log(file);
}

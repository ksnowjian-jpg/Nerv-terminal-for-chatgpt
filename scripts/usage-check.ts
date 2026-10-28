import {listTargets,evaluate,clickAt} from './cdp';
const args=process.argv.slice(2),index=args.indexOf('--target');
if(index<0)throw new Error('Pass an explicit --target ID');
const target=(await listTargets(9335)).find(t=>t.id===args[index+1]);
if(!target)throw new Error('Target unavailable');
const action=args[0]?.startsWith('--')?'scan':args[0]||'scan';
if(action==='close'){
  console.log(await evaluate(target,9335,`(()=>{const menus=[...document.querySelectorAll('[role="menu"]')].filter(menu=>/使用情况|Usage/i.test(menu.innerText||'')&&menu.getBoundingClientRect().width>0);if(menus.length!==1)return {closed:false};menus[0].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));return {closed:true}})()`));process.exit(0);
}
if(action==='refresh'){
  const point=await evaluate(target,9335,`(()=>{const el=document.querySelector('[data-cte-panel] [data-refresh]');if(!el||el.disabled)return null;const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`) as {x:number;y:number}|null;
  if(!point)throw new Error('Refresh button unavailable');
  await clickAt(target,9335,point.x,point.y);
  console.log(JSON.stringify(await evaluate(target,9335,`(async()=>{const button=document.querySelector('[data-refresh]');const end=Date.now()+3500;while(button?.getAttribute('aria-busy')==='true'&&Date.now()<end)await new Promise(resolve=>setTimeout(resolve,50));return {value:document.querySelector('[data-usage-value]')?.textContent,status:document.querySelector('[data-usage-status]')?.textContent,note:document.querySelector('[data-usage-note]')?.textContent,busy:button?.getAttribute('aria-busy'),menuCount:[...document.querySelectorAll('[role="menu"]')].filter(el=>el.getBoundingClientRect().width>0).length,session:window.__CTE_LOCAL__?.status()}})()`),null,2));process.exit(0);
}
console.log(JSON.stringify(await evaluate(target,9335,`(()=>{
  const visible=el=>{const r=el.getBoundingClientRect();return r.width>3&&r.height>3&&!el.closest('[hidden],[inert],[aria-hidden="true"]')&&getComputedStyle(el).visibility==='visible'};
  const menus=[...document.querySelectorAll('[role="menu"],[data-testid="account-menu"]')].filter(visible);
  return menus.map(menu=>({tag:menu.tagName,classes:[...menu.classList].slice(0,6),items:[...menu.querySelectorAll('[role="menuitem"],button')].filter(visible).map(el=>{
    const text=(el.innerText||'').trim();const usage=/使用情况|使用量|用量|额度|Usage|limits?|credits?/i.test(text);return {role:el.getAttribute('role'),classes:[...el.classList].slice(0,4),usage,settings:/^(设置|Settings|Preferences)/i.test(text),quotaText:usage?text.slice(0,1000):null,popup:el.getAttribute('aria-haspopup'),rect:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}};
  })}));
})()`),null,2));

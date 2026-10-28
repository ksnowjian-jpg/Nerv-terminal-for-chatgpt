import {listTargets,evaluate,clickAt} from './cdp';
import {anchorsExpression} from './renderer';
const args=process.argv.slice(2),id=args[args.indexOf('--target')+1];
const target=(await listTargets(9335)).find(item=>item.id===id);if(!target)throw new Error('Pass an explicit --target ID');
const action=args[0]||'snapshot';
if(action==='select'){
  const key=args[args.indexOf('--conversation')+1];
  const labels:Record<string,string>={skincare:'德美乐嘉面膜能用吗',agreement:'审查产品授权协议风险'};
  if(!labels[key])throw new Error('Choose skincare or agreement from the user screenshots');
  const point=await evaluate(target,9335,`(()=>{const items=[...document.querySelectorAll('aside.app-shell-left-panel [role="button"],aside.app-shell-left-panel a')].filter(el=>(el.innerText||'').trim()===${JSON.stringify(labels[key])}).filter(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>4&&r.height>4&&hit&&(hit===el||el.contains(hit))});if(items.length!==1)return null;const r=items[0].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`) as {x:number;y:number}|null;
  if(!point)throw new Error('Known conversation is not uniquely visible');await clickAt(target,9335,point.x,point.y);console.log(JSON.stringify({selected:key}));
}else{
 console.log(JSON.stringify(await evaluate(target,9335,`(()=>{
  const main=(${await anchorsExpression()}).main;if(!main)return {available:false};
  const shape=el=>{if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName.toLowerCase(),classes:[...el.classList].slice(0,6),role:el.getAttribute('role'),rect:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},position:s.position,display:s.display,visibility:s.visibility}};
  const band=document.querySelector('[data-cte-chrome="header"]'),m=main.getBoundingClientRect();
  const topLabels=[...document.querySelectorAll("div,span,button,h1,h2,header")].filter(el=>{const r=el.getBoundingClientRect();return !el.closest("[data-cte-chrome],[data-cte-panel],[hidden],[inert],[aria-hidden=true]")&&el.childElementCount===0&&r.width>70&&r.height>8&&r.height<44&&r.top>=m.top-20&&r.bottom<=m.top+120&&r.left>=m.left&&r.left<m.left+500&&getComputedStyle(el).visibility==="visible"}).slice(0,6).map(el=>{const chain=[];for(let node=el;node&&chain.length<9;node=node.parentElement)chain.push(shape(node));return chain});
  return {available:true,topLabels,phase:window.__CTE_LOCAL__?.status().phase,main:shape(main),band:shape(band),inset:band?getComputedStyle(band).marginTop:null,tokens:Object.fromEntries(['--app-shell-header-height','--height-toolbar'].map(key=>[key,getComputedStyle(main).getPropertyValue(key)])),toolbars:[...document.querySelectorAll('[role="toolbar"],[class~="@container/app-shell-header-toolbar"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>m.top-100&&r.top<m.top+150&&!el.closest('[hidden],[inert],[aria-hidden="true"]')}).map(el=>{const chain=[];for(let node=el;node&&chain.length<5;node=node.parentElement)chain.push(shape(node));return {insideMain:main.contains(el),chain}})};
 })()`),null,2));
}

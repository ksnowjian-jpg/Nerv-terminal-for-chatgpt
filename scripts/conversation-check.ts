import {listTargets,evaluate,clickAt} from './cdp';
const args=process.argv.slice(2);const id=args[args.indexOf('--target')+1];
const target=(await listTargets(9335)).find(target=>target.id===id);if(!target)throw new Error('Pass the explicit main-window --target ID');
const result=await evaluate(target,9335,`(()=>{
  const labels=['查找游戏名称','寻找Steam游戏名字'];
  const candidates=[...document.querySelectorAll('aside.app-shell-left-panel [role="button"],aside.app-shell-left-panel a')].filter(el=>labels.includes((el.innerText||'').trim())).filter(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>4&&r.height>4&&!!hit&&(el===hit||el.contains(hit))});
  if(candidates.length!==1)return {matched:false,count:candidates.length};
  const r=candidates[0].getBoundingClientRect();return {matched:true,point:{x:r.x+r.width/2,y:r.y+r.height/2}};
})()`) as {matched:boolean;point?:{x:number;y:number}};
if(result.point)await clickAt(target,9335,result.point.x,result.point.y);
console.log(JSON.stringify({matched:result.matched},null,2));

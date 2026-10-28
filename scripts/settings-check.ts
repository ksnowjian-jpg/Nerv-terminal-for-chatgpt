import {listTargets,evaluate,clickAt} from './cdp';
import {startFrameTrace,stopFrameTrace} from './frame-trace';

const args=process.argv.slice(2);
const action=args[0]||'list';
const idIndex=args.indexOf('--target');
if(idIndex<0)throw new Error('Pass an explicit --target ID for this real-client UI check');
const target=(await listTargets(9335)).find(target=>target.id===args[idIndex+1]);
if(!target)throw new Error('The selected main-window test target is unavailable');
if(action==='trace-start'||action==='trace-stop'){
  console.log(JSON.stringify(await evaluate(target,9335,action==='trace-start'?startFrameTrace:stopFrameTrace),null,2));
  process.exit(0);
}
if(action==='scan') {
  const reports=[];
  for(const candidate of await listTargets(9335)) {
    const result=await evaluate(candidate,9335,`(()=>{const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>4&&r.height>4&&s.visibility==='visible'&&r.y>=0&&r.y<innerHeight};const elements=[...document.querySelectorAll('button,[role="button"],[role="menuitem"]')].filter(visible);return {settings:elements.filter(el=>/^(设置|偏好设置|Settings|Preferences)(?:[.。…]|\\s|$)/i.test((el.innerText||'').trim())).length,back:elements.filter(el=>/^(返回|返回聊天|关闭设置|Back|Go back|Back to chat|Close settings)(?:\\s|$|[(（])/i.test((el.getAttribute('aria-label')||el.getAttribute('title')||'').trim())).length,menus:document.querySelectorAll('[role="menuitem"]').length,editors:document.querySelectorAll('[data-composer-body]').length,session:window.__CTE_LOCAL__?.status?.()??null}})()`);
    reports.push({id:candidate.id,result});
  }
  console.log(JSON.stringify(reports,null,2));
  process.exit(0);
}
if(action!=='list') {
  if(!['account','settings','back'].includes(action))throw new Error('Expected list, account, settings or back');
  const result=await evaluate(target,9335,`(()=>{
    const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>4&&r.height>4&&s.visibility==='visible'&&r.y>=0&&r.y<innerHeight&&!!hit&&(el===hit||el.contains(hit))};
    const action=${JSON.stringify(action)};
    let candidates=[];
    if(action==='account')candidates=[...document.querySelectorAll('aside.app-shell-left-panel button[aria-haspopup="menu"]')].filter(el=>visible(el)&&/account|profile|账户|账号|个人资料/i.test((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')));
    if(action==='settings')candidates=[...document.querySelectorAll('[role="menuitem"], [role="menu"] button')].filter(el=>visible(el)&&/^(设置|偏好设置|Settings|Preferences)(?:[.。…]|\\s|$)/i.test((el.innerText||'').trim()));
    if(action==='back')candidates=[...document.querySelectorAll('button')].filter(el=>visible(el)&&/^(返回|返回聊天|关闭设置|Back|Go back|Back to chat|Close settings)(?:\\s|$|[(（])/i.test((el.getAttribute('aria-label')||el.getAttribute('title')||'').trim()));
    if(candidates.length!==1)return {clicked:false,candidates:candidates.length};
    if(action==='account'&&(candidates[0].getAttribute('aria-expanded')==='true'||candidates[0].getAttribute('data-state')==='open'))return {clicked:true,action,alreadyOpen:true};
    const r=candidates[0].getBoundingClientRect();return {clicked:false,action,point:{x:r.x+r.width/2,y:r.y+r.height/2}};
  })()`) as {clicked:boolean;action?:string;point?:{x:number;y:number}};
  if(result.point){await clickAt(target,9335,result.point.x,result.point.y);result.clicked=true;}
  console.log(JSON.stringify(result,null,2));
} else {
const report=await evaluate(target,9335,`(()=>{
  const root=document.querySelector('aside.app-shell-left-panel');
  const controls=root?[...root.querySelectorAll('button,[role="button"]')]:[];
  const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>4&&r.height>4&&r.y>=0&&r.y<innerHeight&&s.visibility==='visible'};
  const buttons=controls.map((el,index)=>{const r=el.getBoundingClientRect();const aria=el.getAttribute('aria-label')||'',title=el.getAttribute('title')||'';return {index,tag:el.tagName.toLowerCase(),popup:el.getAttribute('aria-haspopup'),settingsLabel:/settings|preferences|设置|偏好/i.test(aria+' '+title),accountLabel:/account|profile|账户|账号|个人资料/i.test(aria+' '+title),visible:visible(el),rect:{x:r.x,y:r.y,width:r.width,height:r.height},classes:[...el.classList].slice(0,3)}}).filter(b=>b.visible&&(b.settingsLabel||b.accountLabel||b.rect.y>innerHeight*.75));
  return {buttons,menus:[...document.querySelectorAll('[role="menuitem"]')].filter(visible).map((el,index)=>({index,settings:/^(设置|偏好设置|Settings|Preferences)(?:[.。…]|\\s|$)/i.test((el.innerText||'').trim())})),backButtons:[...document.querySelectorAll('button')].filter(el=>visible(el)&&/返回|关闭设置|back|close settings/i.test((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||''))).map(el=>({tag:el.tagName.toLowerCase(),classes:[...el.classList].slice(0,3)})),session:window.__CTE_LOCAL__?.status?.()??null};
})()`);
console.log(JSON.stringify(report,null,2));
}

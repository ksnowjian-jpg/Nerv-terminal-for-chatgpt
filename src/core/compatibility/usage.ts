import {parseUsage,type UsageReadResult} from '../../features/usage-monitor';

function visible(doc:Document,element:HTMLElement) {
  const rect=element.getBoundingClientRect();
  if(!element.isConnected||element.closest('[hidden],[inert],[aria-hidden="true"]')||rect.width<4||rect.height<4||rect.bottom<=0||rect.top>=doc.defaultView!.innerHeight)return false;
  for(let node:HTMLElement|null=element;node;node=node.parentElement){const css=doc.defaultView!.getComputedStyle(node);if(css.display==='none'||css.visibility!=='visible')return false;}
  return true;
}
function accountTrigger(doc:Document) {
  const candidates=[...doc.querySelectorAll<HTMLButtonElement>('aside.app-shell-left-panel button[aria-haspopup="menu"], [data-testid="account-menu-button"], button[data-testid="user-menu-button"]')].filter(button=>
    !button.disabled&&visible(doc,button)&&(/account|profile|账户|账号|个人资料/i.test(`${button.getAttribute('aria-label')||''} ${button.getAttribute('title')||''}`)||button.matches('[data-testid="account-menu-button"],[data-testid="user-menu-button"]')));
  return candidates.length===1?candidates[0]:null;
}
function ownedMenu(doc:Document,trigger:HTMLElement) {
  const id=trigger.getAttribute('aria-controls');
  const linked=id?doc.getElementById(id):null;
  if(linked?.matches('[role="menu"],[data-testid="account-menu"]')&&visible(doc,linked))return linked;
  if(trigger.getAttribute('aria-expanded')!=='true'&&trigger.getAttribute('data-state')!=='open')return null;
  const menus=[...doc.querySelectorAll<HTMLElement>('[role="menu"],[data-testid="account-menu"]')].filter(menu=>visible(doc,menu)&&!menu.closest('[data-cte-panel]'));
  return menus.length===1?menus[0]:null;
}
function quotaText(menu:HTMLElement) {
  const texts=[...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(item=>visible(menu.ownerDocument,item)).map(item=>item.innerText??item.textContent??'').filter(text=>parseUsage(text));
  return texts.length===1?texts[0]:null;
}
function pointerDown(element:HTMLElement) {
  element.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,button:0,buttons:1,pointerType:'mouse',isPrimary:true}));
  element.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,button:0,buttons:0,pointerType:'mouse',isPrimary:true}));
}
const pause=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));

// Called only by the user's refresh action. It navigates no settings or billing pages.
export async function refreshOfficialUsage(doc:Document,signal:AbortSignal,returnFocus?:HTMLElement|null):Promise<UsageReadResult> {
  const trigger=accountTrigger(doc);
  if(!trigger)return {text:null,reason:'未找到唯一可见的官方头像按钮，请手动打开账户菜单后再刷新'};
  const originalFocus=returnFocus??(doc.activeElement instanceof HTMLElement?doc.activeElement:null);
  const wasOpen=trigger.getAttribute('aria-expanded')==='true'||trigger.getAttribute('data-state')==='open';
  let opened=false,menu:HTMLElement|null=ownedMenu(doc,trigger);
  try {
    if(signal.aborted)return {text:null,reason:'读取已取消'};
    if(!wasOpen){
      const r=trigger.getBoundingClientRect(),hit=doc.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      if(!hit||!trigger.contains(hit))return {text:null,reason:'官方头像按钮被其他窗口遮挡，请关闭弹窗后重试'};
      pointerDown(trigger);await pause(30);
      if(!signal.aborted&&trigger.getAttribute('aria-expanded')!=='true'&&trigger.getAttribute('data-state')!=='open')trigger.click();
      opened=true;
    }
    const deadline=Date.now()+2500;
    while(!signal.aborted&&Date.now()<deadline){
      menu=ownedMenu(doc,trigger);
      const text=menu?quotaText(menu):null;
      if(text)return {text,reason:'读取自可见的官方账户菜单'};
      if(!trigger.isConnected)return {text:null,reason:'页面已切换，读取已取消'};
      await pause(50);
    }
    return {text:null,reason:signal.aborted?'读取已取消':menu?'官方账户菜单未提供可识别的剩余额度，请查看原菜单':'未能打开官方账户菜单，请手动打开后重试'};
  } finally {
    // Close only the menu opened by this action, never a pre-existing menu.
    const current=ownedMenu(doc,trigger);
    if(opened&&current&&(!menu||current===menu)){
      const focus=doc.activeElement;
      const mayRestoreFocus=focus===doc.body||focus===trigger||!!focus&&current.contains(focus);
      current.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));
      await pause(30);
      // The refresh control is disabled until its promise resolves. Restore focus
      // on the next frame, after the caller has enabled it, without overriding
      // a different control the user focused while the menu was loading.
      if(mayRestoreFocus)doc.defaultView!.requestAnimationFrame(()=>{
        if(!signal.aborted&&originalFocus?.isConnected&&!originalFocus.matches(':disabled')&&!originalFocus.closest('[inert],[hidden]')&&(doc.activeElement===trigger||doc.activeElement===doc.body))originalFocus.focus({preventScroll:true});
      });
    }
  }
}

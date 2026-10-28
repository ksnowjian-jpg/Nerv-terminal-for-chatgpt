import type { UsageSnapshot } from '../usage-monitor';
import {defaultPanelText,type PanelText} from './text';
export function paintUsage(host: HTMLElement, data: UsageSnapshot,text:PanelText=defaultPanelText) {
  const value = host.querySelector<HTMLElement>('[data-usage-value]');
  const bar = host.querySelector<HTMLElement>('[role="progressbar"]');
  const status = host.querySelector<HTMLElement>('[data-usage-status]');
  const time = host.querySelector<HTMLElement>('[data-usage-time]');
  const reset = host.querySelector<HTMLElement>('[data-usage-reset]');
  const note=host.querySelector<HTMLElement>('[data-usage-note]');
  const refresh=host.querySelector<HTMLButtonElement>('[data-refresh]');
  if (value) value.textContent = data.remaining === null ? '—' : `${data.remaining}`;
  host.dataset.usageState=data.refreshing?'refreshing':data.state;
  if (status) status.textContent = data.refreshing?text.statusRefreshing:data.state === 'cached' ? text.statusCached : data.state === 'live' ? text.statusLive : text.statusUnavailable;
  const reasons:Record<string,string>={'未读取到官方界面中的使用情况':text.noteInitial,'读取自可见的官方账户菜单':text.noteLive,'菜单当前不可见，显示最近一次读取':text.noteCached,'正在打开官方账户菜单…':text.noteRefreshing};
  if(note)note.textContent=reasons[data.reason]??data.reason;
  if(refresh){refresh.disabled=!!data.refreshing;refresh.setAttribute('aria-busy',String(!!data.refreshing));}
  if (bar) {
    bar.style.setProperty('--remaining',`${data.remaining ?? 0}%`);
    bar.setAttribute('aria-valuetext', data.remaining === null ? '不可用' : `${data.remaining}% 剩余${data.state === 'cached' ? '，缓存数据' : ''}`);
    if (data.remaining === null) bar.removeAttribute('aria-valuenow'); else bar.setAttribute('aria-valuenow',String(data.remaining));
  }
  if (time) time.textContent = data.observedAt ? new Date(data.observedAt).toLocaleString('zh-CN',{hour12:false}) : text.neverRead;
  if (reset) reset.textContent = data.resetText || text.resetUnknown;
}

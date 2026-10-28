import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseUsage, UsageMonitor } from '../src/features/usage-monitor';
import { CompatibilityAdapter } from '../src/core/compatibility';
import { paintUsage } from '../src/features/status-panel';
import {resolvePanelText,applyPanelText} from '../src/features/status-panel/text';
import manifest from '../themes/nerv/manifest.json';

afterEach(()=>{vi.useRealTimers();document.body.replaceChildren();});
describe('visible official quota',()=>{
  it('parses labelled Chinese and English remaining values with timestamps',()=>{
    const now=new Date('2026-10-27T11:00:00Z');expect(parseUsage('使用情况 · 剩余 96%',now)).toMatchObject({state:'live',remaining:96,observedAt:now.toISOString()});
    expect(parseUsage('Usage · 84.5% remaining · Resets tomorrow')?.remaining).toBe(84.5);expect(parseUsage('Usage remaining 0%')?.remaining).toBe(0);
    expect(parseUsage('使用情况 · 剩余 55% 重置时间：明天 08:00')?.resetText).toBe('明天 08:00');
  });
  it('never treats arbitrary conversation percentages or invalid ranges as quota',()=>{
    for(const value of ['96%','电量剩余 96%','Usage 96%','使用情况 剩余 101%','Usage -1% remaining','使用情况 剩余 -5%','Usage 1096% remaining','Usage 70% remaining, 90% remaining'])expect(parseUsage(value)).toBeNull();
  });
  it('keeps last-read time and explicitly marks cached data when the menu disappears',()=>{
    vi.useFakeTimers();let text:string|null='使用情况 · 剩余 96%';const changed=vi.fn();const monitor=new UsageMonitor(()=>text,changed);monitor.start();const observed=monitor.snapshot.observedAt;text=null;vi.advanceTimersByTime(5000);expect(monitor.snapshot).toMatchObject({state:'cached',remaining:96,observedAt:observed});monitor.stop();expect(vi.getTimerCount()).toBe(0);expect(monitor.snapshot.remaining).toBeNull();
  });
  it('reads only a single visible account menu item, never body or conversation text',()=>{
    document.body.innerHTML='<main>使用情况 · 剩余 99%</main><div role="menu"><div role="menuitem">使用情况 · 剩余 52%</div></div>';
    const adapter=new CompatibilityAdapter(document);expect(adapter.readUsageItem()).toBeNull();const item=document.querySelector<HTMLElement>('[role="menuitem"]')!;item.getClientRects=()=>[{}] as unknown as DOMRectList;expect(adapter.readUsageItem()).toContain('52%');
    const duplicate=item.cloneNode(true) as HTMLElement;duplicate.getClientRects=item.getClientRects;item.parentElement!.append(duplicate);expect(adapter.readUsageItem()).toBeNull();
  });
  it('does not render an invented numeric progress value for unavailable data',()=>{
    const panel=document.createElement('div');panel.innerHTML='<span data-usage-value></span><span data-usage-status></span><div role="progressbar"></div>';
    paintUsage(panel,{state:'unavailable',remaining:null,observedAt:null,resetText:null,reason:'not connected'});expect(panel.querySelector('[data-usage-value]')?.textContent).toBe('—');expect(panel.querySelector('[role="progressbar"]')?.hasAttribute('aria-valuenow')).toBe(false);
  });
  it('theme wording preserves official values, cache time, failure reasons and literal text safety',()=>{
    const host=document.createElement('aside');host.innerHTML='<h3 data-usage-title></h3><button data-refresh></button><button data-restore></button><span data-usage-value></span><span data-usage-status></span><p data-usage-note></p><span data-usage-time></span><span data-usage-reset></span><div role="progressbar"></div>';
    const text=resolvePanelText(manifest.presentation.panelText);applyPanelText(host,text);
    const reading={state:'live' as const,remaining:92,observedAt:'2026-10-28T00:30:00+08:00',resetText:null,reason:'读取自可见的官方账户菜单'};
    paintUsage(host,reading,text);expect(host.querySelector('[data-usage-title]')!.textContent).toBe('剩余能量');expect(host.querySelector('[data-refresh]')!.textContent).toBe('能量校正');expect(host.querySelector('[data-restore]')!.getAttribute('title')).toContain('恢复 ChatGPT 原版界面');expect(host.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('92');expect(host.querySelector('[data-usage-note]')!.textContent).toContain('官方剩余使用额度');
    const time=host.querySelector('[data-usage-time]')!.textContent;
    paintUsage(host,{...reading,state:'cached',reason:'菜单当前不可见，显示最近一次读取'},text);expect(host.querySelector('[data-usage-status]')!.textContent).toContain('非实时');expect(host.querySelector('[data-usage-time]')!.textContent).toBe(time);
    paintUsage(host,{...reading,state:'cached',reason:'官方头像被弹窗遮挡'},text);expect(host.querySelector('[data-usage-note]')!.textContent).toBe('官方头像被弹窗遮挡');
    paintUsage(host,{state:'unavailable',remaining:null,observedAt:null,resetText:null,reason:'未读取到官方界面中的使用情况'},text);expect(host.querySelector('[data-usage-value]')!.textContent).toBe('—');expect(host.querySelector('[role="progressbar"]')!.hasAttribute('aria-valuenow')).toBe(false);
    applyPanelText(host,resolvePanelText({title:'<img src=x onerror=alert(1)>'}));expect(host.querySelector('img')).toBeNull();expect(host.querySelector('[data-usage-title]')!.textContent).toBe('<img src=x onerror=alert(1)>');
  });
  it('coalesces active requests and preserves cached quota with a useful failure reason',async()=>{
    const changed=vi.fn();const monitor=new UsageMonitor(()=> '使用情况 剩余 52%',changed);monitor.refresh();
    let finish!:(value:{text:string|null;reason:string})=>void;
    const read=vi.fn(()=>new Promise<{text:string|null;reason:string}>(resolve=>{finish=resolve;}));
    const pending=monitor.refreshOfficial(read);await monitor.refreshOfficial(read);monitor.refresh();expect(read).toHaveBeenCalledTimes(1);expect(changed).toHaveBeenLastCalledWith(expect.objectContaining({refreshing:true}));
    finish({text:null,reason:'Official menu unavailable'});await pending;expect(monitor.snapshot).toMatchObject({state:'cached',remaining:52,reason:'Official menu unavailable'});
  });
  it('aborts a pending menu request on stop and ignores late results',async()=>{
    const changed=vi.fn();const monitor=new UsageMonitor(()=>null,changed);
    let finish!:(value:{text:string|null;reason:string})=>void;let signal!:AbortSignal;
    const pending=monitor.refreshOfficial(abort=>{signal=abort;return new Promise(resolve=>{finish=resolve;});});
    monitor.stop();expect(signal.aborted).toBe(true);const calls=changed.mock.calls.length;
    finish({text:'使用情况 剩余 88%',reason:'late'});await pending;expect(changed).toHaveBeenCalledTimes(calls);expect(monitor.snapshot.remaining).toBeNull();
  });
});

import type { FeatureModule } from '../types';
export interface UsageSnapshot {
  state: 'unavailable' | 'live' | 'cached'; remaining: number | null;
  observedAt: string | null; resetText: string | null; reason: string;
  refreshing?: boolean;
}
export interface UsageReadResult {text:string|null;reason:string}
export const unavailable = (reason = '未读取到官方界面中的使用情况'): UsageSnapshot => ({state:'unavailable', remaining:null, observedAt:null, resetText:null, reason});
// Parse only a labelled usage item, never arbitrary percentages from conversation text.
export function parseUsage(text: string, now = new Date()): UsageSnapshot | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length > 240 || !/(?:使用情况|Usage)/i.test(normalized)) return null;
  const matches = [...normalized.matchAll(/(?:剩余\s*(\d{1,3}(?:\.\d+)?)\s*%|(?:remaining\s*[:·]?\s*(\d{1,3}(?:\.\d+)?)\s*%)|(?:(?<![\d.+-])(\d{1,3}(?:\.\d+)?)\s*%\s*(?:remaining|left)))/gi)];
  if(matches.length !== 1) return null;
  const match=matches[0];
  const remaining = match ? Number(match[1] ?? match[2] ?? match[3]) : NaN;
  if (!Number.isFinite(remaining) || remaining < 0 || remaining > 100) return null;
  const reset = normalized.match(/(?:重置(?:时间)?|resets?)\s*[:：]?\s*(.{1,80})$/i);
  return {state:'live', remaining, observedAt:now.toISOString(), resetText: reset?.[1] ?? null, reason:'读取自可见的官方账户菜单'};
}
export class UsageMonitor implements FeatureModule {
  id = 'usage'; snapshot = unavailable();
  private timer?: ReturnType<typeof setInterval>;
  private request?: AbortController;
  constructor(private read: () => string | null, private changed: (snapshot: UsageSnapshot) => void,initial=unavailable()) {this.snapshot={...initial,refreshing:false};}
  refresh() {
    if(this.request)return;
    const text = this.read();
    const next = text ? parseUsage(text) : null;
    this.snapshot = next ?? (this.snapshot.remaining !== null ? {...this.snapshot,state:'cached',reason:'菜单当前不可见，显示最近一次读取'} : unavailable());
    this.changed(this.snapshot);
  }
  async refreshOfficial(read:(signal:AbortSignal)=>Promise<UsageReadResult>) {
    if(this.request)return;
    const request=new AbortController();this.request=request;
    this.changed({...this.snapshot,refreshing:true,reason:'正在打开官方账户菜单…'});
    try {
      const result=await read(request.signal);
      if(request.signal.aborted||this.request!==request)return;
      const next=result.text?parseUsage(result.text):null;
      this.snapshot=next??(this.snapshot.remaining!==null?{...this.snapshot,state:'cached',reason:result.reason}:unavailable(result.reason));
      this.changed(this.snapshot);
    } catch {
      if(!request.signal.aborted){this.snapshot=this.snapshot.remaining!==null?{...this.snapshot,state:'cached',reason:'读取失败，请重试或手动打开官方菜单'}:unavailable('读取失败，请重试或手动打开官方菜单');this.changed(this.snapshot);}
    } finally {if(this.request===request)this.request=undefined;}
  }
  start() {const previous=this.snapshot;this.stop();this.snapshot=previous;this.refresh();this.timer = setInterval(()=>this.refresh(), 5000); }
  stop() {this.request?.abort();this.request=undefined;if (this.timer) clearInterval(this.timer); this.timer=undefined; this.snapshot=unavailable(); }
}

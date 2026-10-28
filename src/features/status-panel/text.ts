export const defaultPanelText={
  panelLabel:'Theme Engine 状态监控',intro:'本机增强层 · 已通过基础结构检查',title:'使用额度',refresh:'刷新可见额度',restore:'关闭增强 / 恢复原版',restoreHint:'关闭增强并恢复原版界面',collapse:'收起监控面板',expand:'展开监控面板',
  lastRead:'最近读取',reset:'额度重置',neverRead:'尚未读取',resetUnknown:'官方界面未提供',
  statusLive:'已读取 · 官方菜单',statusCached:'缓存数据 · 非实时',statusUnavailable:'额度暂不可用',statusRefreshing:'正在读取官方菜单…',
  noteInitial:'点击刷新会打开官方头像菜单，读取后自动收起。',noteLive:'读取自可见的官方账户菜单',noteCached:'菜单当前不可见，显示最近一次读取',noteRefreshing:'正在打开官方账户菜单…',progressLabel:'剩余使用额度',themeLabel:'主题：'
};
export type PanelText=typeof defaultPanelText;
export function resolvePanelText(overrides?:Partial<PanelText>):PanelText{return {...defaultPanelText,...overrides};}
export function applyPanelText(host:HTMLElement,text:PanelText){
  const fields:Array<[string,keyof PanelText]>=[['[data-panel-intro]','intro'],['[data-usage-title]','title'],['[data-refresh]','refresh'],['[data-restore]','restore'],['[data-usage-time-label]','lastRead'],['[data-usage-reset-label]','reset']];
  for(const [selector,key] of fields){const node=host.querySelector(selector);if(node)node.textContent=text[key];}
  host.setAttribute('aria-label',text.panelLabel);host.querySelector('[data-restore]')?.setAttribute('title',text.restoreHint);
  host.querySelector('[role="progressbar"]')?.setAttribute('aria-label',text.progressLabel);
}

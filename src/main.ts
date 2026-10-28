import './styles.css';
import { CoreEngine } from './core/engine';
import { SettingsStore } from './core/settings';
import { ENGINE_VERSION, type ThemePackage } from './core/theme-manager/schema';
import { arrangeSlots } from './core/layout-manager';
import { unavailable } from './features/usage-monitor';
import { paintUsage } from './features/status-panel';
import { icon, escapeHtml as esc } from './components/icons';

const root = document.querySelector<HTMLDivElement>('#app')!;
let storage: Storage | undefined;
try { storage=window.localStorage; } catch { /* Session-only mode. */ }
const engine = new CoreEngine(root,new SettingsStore(storage));
let page: 'workspace'|'themes'|'compatibility' = 'workspace';
let notice = ''; let busy=false;
const selected = () => engine.catalog.themes.find(t=>t.manifest.id===engine.settings.themeId);
const button = (id: string, text: string, glyph: string, cls='') => `<button id="${id}" class="${cls}" aria-label="${text}">${icon(glyph)}<span>${text}</span></button>`;
function render() {
  const theme=selected();
  const enabled=engine.settings.enabled && !!theme;
  const collapsed=engine.settings.panelCollapsed;
  root.className=`shell ${collapsed?'panel-collapsed':''} ${enabled?'':'enhancement-off'}`;
  root.innerHTML=`
    <aside class="sidebar" aria-label="主题引擎导航">
      <a class="brand" href="#" id="brand-home"><span class="brand-symbol">T<span>E</span></span><span>THEME ENGINE<small>DESKTOP ENHANCEMENT</small></span></a>
      <div class="project-label"><span class="status-dot"></span> LOCAL WORKSPACE <span>01</span></div>
      <nav>${(['workspace','themes','compatibility'] as const).map((id,i)=>`<button class="nav-item ${page===id?'active':''}" data-page="${id}" ${page===id?'aria-current="page"':''}>${icon(['grid','palette','shield'][i])}<span>${['工作空间','主题库','兼容性检查'][i]}</span>${i===1?`<small>${engine.catalog.themes.length.toString().padStart(2,'0')}</small>`:''}</button>`).join('')}</nav>
      <div class="sidebar-rule"></div><div class="sidebar-caption">ACTIVE APPEARANCE</div>
      <div class="active-theme">${theme?.emblem?`<img src="${esc(theme.emblem)}" alt=""/>`:`<span class="theme-monogram">${icon('palette')}</span>`}<div><strong>${enabled?esc(theme!.manifest.name):'增强已关闭'}</strong><small>${enabled?`v${esc(theme!.manifest.version)} · 本地主题`:'预览基础外观'}</small></div><span class="small-dot ${enabled?'':'dim'}"></span></div>
      <div class="sidebar-bottom"><div class="local-badge">${icon('code')}<span>LOCAL ONLY</span><span class="status-dot"></span></div><p>独立主题引擎<br/>不修改官方安装文件</p><div class="version">CORE ${ENGINE_VERSION}<span>PHASE 01</span></div></div>
    </aside>
    <div class="content-shell">
      <header class="topbar"><div class="breadcrumb">控制台 ${icon('chevron')} <strong>${page==='workspace'?'工作空间':page==='themes'?'主题库':'兼容性检查'}</strong></div><div class="top-actions"><span class="preview-chip">本地演示</span><span class="connection-label"><span class="small-dot dim"></span> 客户端未连接</span>${button('restore','关闭增强','power','icon-button')}</div></header>
      <div class="demo-banner">${icon('info')}<span>独立 UI 预览 · 尚未连接或修改 ChatGPT 官方客户端</span><span class="mono">PREVIEW ENVIRONMENT</span></div>
      <div class="workspace-body">
        <main class="main-content" id="main-content">${page==='workspace'?workspace(theme,enabled):page==='themes'?themesPage():compatibilityPage()}</main>
        <aside class="status-rail" aria-label="状态监控"><div class="rail-header"><span class="panel-heading">SYSTEM MONITOR</span><button id="collapse-panel" class="icon-only" aria-label="${collapsed?'展开':'收起'}监控面板" aria-expanded="${!collapsed}">${icon(collapsed?'expand':'chevron')}</button></div><div class="rail-content" ${collapsed?'hidden':''}><div id="slots"></div><div class="rail-bottom"><span class="small-dot"></span><span>ENHANCEMENT LAYER</span><strong>${enabled?'ON':'OFF'}</strong></div></div></aside>
      </div>
      <footer class="footer"><span><span class="small-dot"></span> 所有主题资源均在本机加载</span><span>NO API · NO ACCOUNT ACCESS</span><span>THEME ENGINE / ${ENGINE_VERSION}</span></footer>
    </div><div id="toast" role="status" class="toast" ${notice?'':'hidden'}>${esc(notice)}</div>`;
  renderSlots(theme,enabled);
  bind();
  const warning=engine.store.warning;
  if(warning) { const el=document.querySelector('#toast')!; el.textContent=warning; el.removeAttribute('hidden'); }
}
function workspace(theme: ThemePackage|undefined,enabled:boolean) {
  return `<div class="page-eyebrow"><span class="tiny-line"></span> PERSONAL INTERFACE / 001</div><div class="page-title"><div><h1>你的界面，你的秩序<span>.</span></h1><p>为熟悉的工作空间，赋予新的表达。</p></div><span class="page-number">01<span>/ 03</span></span></div>
    <section class="appearance-card"><div class="appearance-intro"><span class="section-label">当前主题 / ACTIVE THEME</span><div class="appearance-title"><h2>${enabled?esc(theme!.manifest.name):'增强层已关闭'}</h2><span class="outline-tag">${enabled?'已启用':'已恢复'}</span></div><p>${enabled?esc(theme!.manifest.description):'主题样式和自定义布局已移除。你可以随时重新启用。'}</p><div class="appearance-meta"><span><span class="small-dot"></span> ${enabled?'本地加载':'基础外观'}</span><span>ENGINE ${ENGINE_VERSION}</span></div></div><div class="emblem-art">${theme?.emblem?`<img src="${esc(theme.emblem)}" alt="主题几何徽标"/>`:`<span>${icon('palette')}</span>`}<span>INTERFACE<br/>PERSONALIZATION</span></div><div class="appearance-toolbar"><div class="swatches">${theme?['background','surface','accent','success','text'].map(k=>`<i style="background:${theme.tokens[k as keyof typeof theme.tokens]}" title="${k}"></i>`).join(''):''}<span>DECLARATIVE THEME PACK</span></div>${button('open-themes','管理主题','arrow','text-button')}</div></section>
    <div class="section-heading"><div><h2>界面预览</h2><span>CHAT WORKSPACE</span></div><span class="subtle-label">静态示意 · 非聊天客户端</span></div>
    <section class="chat-preview" aria-label="静态聊天布局示意"><div class="preview-top"><span>${icon('message')} ChatGPT <small>界面示意</small></span><span class="small-dot"></span></div><div class="preview-content"><div class="preview-kicker">A FAMILIAR SPACE. A NEW PERSPECTIVE.</div><h3>让灵感，保持在线。</h3><p>聊天、写作与思考，依然在原来的地方。<br/>主题只改变视觉，专注留给你。</p><div class="suggestion-row"><span>${icon('code')} 代码与构建</span><span>${icon('message')} 写作与灵感</span></div><div class="mock-composer"><span>这里是输入区域的布局预览</span><span class="send-preview">${icon('arrow')}</span></div><small class="preview-disclaimer">此区域不会发送消息，也不会调用 OpenAI API。</small></div><div class="preview-ruler"><span>01 / NAVIGATION</span><span>02 / CONVERSATION</span><span>03 / STATUS</span></div></section>
    <div class="lower-cards"><button id="discover-card" class="mini-card"><span class="mini-icon">${icon('palette')}</span><div><h3>可扩展主题包</h3><p>${engine.catalog.themes.length} 个已安装主题 · 动态发现</p></div>${icon('arrow')}</button><button class="mini-card" data-page="compatibility"><span class="mini-icon">${icon('shield')}</span><div><h3>兼容性优先</h3><p>结构不匹配时，自动停用增强</p></div>${icon('arrow')}</button></div>`;
}
function themesPage() {
  return `<div class="page-eyebrow"><span class="tiny-line"></span> APPEARANCE LIBRARY / 002</div><div class="page-title"><div><h1>选择一种表达<span>.</span></h1><p>独立主题，独立风格。核心始终如一。</p></div>${button('rescan','重新扫描','refresh','secondary')}</div><div class="library-count"><span>${engine.catalog.themes.length} 个本地主题</span><span>themes/</span></div><div class="theme-grid">${engine.catalog.themes.map(t=>`<article class="theme-card ${t.manifest.id===engine.settings.themeId?'selected':''}"><div class="theme-sample" style="background:${t.tokens.background};color:${t.tokens.accent};border-color:${t.tokens.border}"><div class="sample-sidebar" style="background:${t.tokens.surface};border-color:${t.tokens.border}"><i></i><i></i><i></i></div><div class="sample-main"><span>${t.emblem?`<img src="${esc(t.emblem)}" alt=""/>`:icon('palette')}</span><i style="background:${t.tokens.border}"></i><i style="background:${t.tokens.border}"></i><div style="border-color:${t.tokens.border}"></div></div><div class="sample-panel" style="border-color:${t.tokens.border}"><i></i><i></i></div></div><div class="theme-card-body"><div><h2>${esc(t.manifest.name)}</h2><small>v${esc(t.manifest.version)}</small></div><p>${esc(t.manifest.description)}</p><button class="${t.manifest.id===engine.settings.themeId&&engine.settings.enabled?'secondary':'primary'}" data-select-theme="${esc(t.manifest.id)}">${icon(t.manifest.id===engine.settings.themeId&&engine.settings.enabled?'check':'palette')}${t.manifest.id===engine.settings.themeId&&engine.settings.enabled?'当前主题':'应用主题'}</button></div></article>`).join('')}</div><section class="developer-note"><span>${icon('plus')}</span><div><h3>下一个主题，由你定义。</h3><p>在 themes/ 中添加 Manifest、Tokens 和资源文件，点击重新扫描即可发现。无需修改核心代码。</p><code>themes / your-theme / manifest.json</code></div></section>${engine.catalog.errors.length?`<div class="catalog-errors" role="alert">${engine.catalog.errors.map(esc).join('<br/>')}</div>`:''}<section class="settings-card"><h2>主题偏好</h2><label class="setting-row"><span>启用视觉增强<small>关闭后移除主题样式与监控布局</small></span><input type="checkbox" id="enabled-setting" ${engine.settings.enabled?'checked':''}/></label><label class="setting-row"><span>页面加载后动画<small>仅为主题覆盖动画，不代表客户端启动</small></span><input type="checkbox" id="startup-setting" ${engine.settings.startupEnabled?'checked':''}/></label><label class="setting-row"><span>动画时长<small>尊重系统减少动态效果设置</small></span><select id="duration-setting" aria-label="动画时长">${[500,1000,1500,3000].map(v=>`<option value="${v}" ${engine.settings.startupDurationMs===v?'selected':''}>${v/1000} 秒</option>`).join('')}</select></label><div class="setting-row"><span>主题音效<small>接口预留，第一阶段未提供音效资源</small></span><span class="subtle-label">已关闭</span></div></section>`;
}
function compatibilityPage() {
  return `<div class="page-eyebrow"><span class="tiny-line"></span> COMPATIBILITY / 003</div><div class="page-title"><div><h1>先确认，再增强<span>.</span></h1><p>保守连接，随时恢复。原有工作流优先。</p></div></div><section class="compat-hero">${icon('shield')}<div><span class="section-label">CLIENT STATUS</span><h2>尚未连接官方客户端</h2><p>当前页面是独立的本地 UI 演示，不读取你的账号、会话或使用额度。</p></div><span class="outline-tag">未验证</span></section><div class="compat-list">${[['本机环境检测','运行 npm run doctor，检测进程、可读版本与指定本机端口。'],['受限 CDP 连接','运行 npm run client -- probe --port 9335。仅访问 127.0.0.1，不自动重启客户端。'],['页面结构适配','注入前检查主区域、历史导航和输入框。离开支持页面时暂停，返回聊天后重新检查并恢复增强。'],['真实额度读取','只读取可见账户菜单中的带标签文本。未读取时显示不可用；缓存标明最近读取时间。'],['恢复原版','client restore 撤除注入节点、标记、样式、观察器和计时器；刷新客户端页面也会清除本次注入。']].map(([title,body],i)=>`<div class="compat-row"><span class="mono">0${i+1}</span><div><h3>${title}</h3><p>${body}</p></div>${icon('check')}</div>`).join('')}</div><div class="developer-note">${icon('info')}<div><h3>本机验证边界</h3><p>2026-10-27 实测：显示名 ChatGPT、内部包名 OpenAI.Codex，版本 26.1007.2314.0。已通过本机 CDP 完成 NERV 注入、布局、收起与恢复验证；此预览页本身不连接客户端。头像菜单额度读取已在实机验证；完整 Work 流程仍待验证。直接测试请双击项目中的“测试 NERV 主题.cmd”。</p></div></div>`;
}
function renderSlots(theme: ThemePackage|undefined,enabled:boolean) {
  const slots=document.querySelector<HTMLElement>('#slots')!;
  const make=(html:string)=>{const el=document.createElement('section');el.className='monitor-section';el.innerHTML=html;return el;};
  const usage=make(`<div class="monitor-title"><span class="panel-heading">01 / 使用额度</span><button id="refresh-usage" class="icon-only" aria-label="刷新使用额度">${icon('refresh')}</button></div><div class="quota-state"><span class="small-dot dim"></span><span data-usage-status></span></div><div class="quota-number"><strong data-usage-value>—</strong><span>%<small>REMAINING</small></span></div><div class="quota-track" role="progressbar" aria-label="剩余使用额度" aria-valuemin="0" aria-valuemax="100"><span></span></div><p class="quota-explanation">在真实客户端点击刷新，会打开官方头像菜单读取额度；此预览不连接账户。</p><dl class="quota-details"><div><dt>最近读取</dt><dd data-usage-time></dd></div><div><dt>额度重置</dt><dd data-usage-reset></dd></div></dl><div class="usage-foot"><span>DATA SOURCE</span><strong>官方可见界面</strong></div>`);
  const connection=make(`<div class="monitor-title"><span class="panel-heading">02 / 连接状态</span>${icon('link')}</div><div class="system-rows"><div><span>客户端连接</span><strong class="muted">未连接</strong></div><div><span>主题引擎</span><strong><span class="small-dot"></span> ${enabled?'就绪':'已关闭'}</strong></div><div><span>注入方式</span><strong>CDP / 本机</strong></div></div><div class="terminal-note"><span>&gt;_</span> ${enabled?'PREVIEW MODE ACTIVE':'ENHANCEMENT DISABLED'}<br/><span class="terminal-indent">NO CLIENT MODIFIED</span></div>`);
  const appearance=make(`<div class="monitor-title"><span class="panel-heading">03 / 主题控制</span>${icon('palette')}</div><label class="field-label" for="theme-select">已安装主题</label><select id="theme-select">${engine.catalog.themes.map(t=>`<option value="${esc(t.manifest.id)}" ${t.manifest.id===theme?.manifest.id?'selected':''}>${esc(t.manifest.name)}</option>`).join('')}</select>${theme?.manifest.variants.length?`<label class="field-label" for="variant-select">配色变体</label><select id="variant-select"><option value="">标准配色</option>${theme.manifest.variants.map(v=>`<option value="${esc(v.id)}" ${v.id===engine.settings.variantId?'selected':''}>${esc(v.name)}</option>`).join('')}</select>`:''}<label class="toggle-row"><span>启用增强</span><input type="checkbox" id="enhancement-toggle" ${enabled?'checked':''}/></label><button id="restore-panel" class="restore-link">${icon('power')} 关闭增强 / 恢复基础外观</button>`);
  arrangeSlots(slots,theme?.layout.slots??['usage','connection','theme'],{usage,connection,theme:appearance});
  paintUsage(usage,unavailable('演示环境未连接官方客户端'));
}
function notify(message:string) { notice=message; const el=document.querySelector<HTMLElement>('#toast'); if(el){el.textContent=message;el.hidden=false;} }
function changeTheme(id:string) {engine.update({themeId:id,variantId:'',enabled:true});render(); const t=selected();if(t)engine.startup.play(root,t,engine.settings);notify('主题已应用并保存到本机');}
function bind() {
  const on=(id:string,fn:()=>void)=>document.getElementById(id)?.addEventListener('click',fn);
  document.querySelectorAll<HTMLElement>('[data-page]').forEach(el=>el.onclick=()=>{page=el.dataset.page as typeof page;notice='';render();});
  on('brand-home',()=>{page='workspace';render();});
  on('open-themes',()=>{page='themes';render();});on('discover-card',()=>{page='themes';render();});
  on('collapse-panel',()=>{engine.update({panelCollapsed:!engine.settings.panelCollapsed});render();document.getElementById('collapse-panel')?.focus();});
  const restore=()=>{engine.restore();render();notify('已关闭增强。当前仅为演示页面，官方客户端未被修改。');};
  on('restore',restore);on('restore-panel',restore);
  on('refresh-usage',()=>notify('额度不可用：当前演示未连接官方客户端，没有生成示例数据。'));
  on('rescan',async()=>{if(busy)return;busy=true;try{await engine.discover();render();notify(`扫描完成，发现 ${engine.catalog.themes.length} 个有效主题${engine.catalog.errors.length?`，${engine.catalog.errors.length} 个已跳过`:''}`);}catch{notify('扫描失败，请确认本地服务正在运行。');}finally{busy=false;}});
  document.querySelectorAll<HTMLElement>('[data-select-theme]').forEach(el=>el.onclick=()=>changeTheme(el.dataset.selectTheme!));
  document.getElementById('theme-select')?.addEventListener('change',e=>changeTheme((e.target as HTMLSelectElement).value));
  document.getElementById('variant-select')?.addEventListener('change',e=>{engine.update({variantId:(e.target as HTMLSelectElement).value});render();notify('配色已保存');});
  for(const id of ['enhancement-toggle','enabled-setting'])document.getElementById(id)?.addEventListener('change',e=>{engine.update({enabled:(e.target as HTMLInputElement).checked});render();});
  document.getElementById('startup-setting')?.addEventListener('change',e=>{engine.update({startupEnabled:(e.target as HTMLInputElement).checked});const t=selected();if(t)engine.startup.play(root,t,engine.settings);});
  document.getElementById('duration-setting')?.addEventListener('change',e=>engine.update({startupDurationMs:Number((e.target as HTMLSelectElement).value)}));
}
try {await engine.discover();render();const t=selected();if(t&&engine.settings.enabled)engine.startup.play(root,t,engine.settings);} catch {root.className='boot-error';root.textContent='无法加载本地主目录。请使用 npm run dev 或构建后的 npm start 启动项目。';}
window.addEventListener('pagehide',()=>engine.dispose());

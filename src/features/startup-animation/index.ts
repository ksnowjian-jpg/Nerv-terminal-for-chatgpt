import type { ThemePackage } from '../../core/theme-manager/schema';
import type { Settings } from '../../core/settings';
// A post-document overlay, not a pre-launch animation or real loading progress.
export class StartupAnimation {
  private overlay?: HTMLElement; private timer?: ReturnType<typeof setTimeout>;
  play(root: HTMLElement, theme: ThemePackage, settings: Settings) {
    this.stop();
    if (!settings.startupEnabled || !theme.manifest.startup.enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const overlay = root.ownerDocument.createElement('div'); overlay.className='startup-overlay';
    overlay.setAttribute('role','status');
    const caption = root.ownerDocument.createElement('p'); caption.textContent='页面加载后主题动画 · 非真实加载进度';
    const line = root.ownerDocument.createElement('strong'); line.textContent=theme.manifest.startup.lines.join(' / ');
    const skip = root.ownerDocument.createElement('button'); skip.textContent='跳过动画'; skip.onclick=()=>this.stop();
    overlay.append(caption,line,skip); root.append(overlay); this.overlay=overlay;
    this.timer=setTimeout(()=>this.stop(), Math.min(settings.startupDurationMs,theme.manifest.startup.durationMs));
  }
  stop() { this.overlay?.remove(); this.overlay=undefined; if(this.timer) clearTimeout(this.timer); }
}

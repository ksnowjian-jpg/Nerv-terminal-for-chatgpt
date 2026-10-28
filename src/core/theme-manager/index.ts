import type { Catalog, ThemePackage } from './schema';
import { layoutVariables } from '../layout-manager';

export class ThemeManager {
  private style?: HTMLStyleElement;
  private previous: string | null;
  active?: ThemePackage;
  constructor(private root: HTMLElement, private doc = root.ownerDocument) { this.previous = root.getAttribute('data-cte-root'); }
  apply(theme: ThemePackage, variantId = '') {
    const variant = theme.manifest.variants.find(v => v.id === variantId);
    const tokens = {...theme.tokens, ...variant?.tokens};
    const variables = Object.entries(tokens).map(([key,value]) => `--cte-${key.replace(/[A-Z]/g,c=>`-${c.toLowerCase()}`)}:${key === 'radius' ? `${value}px` : value};`).join('');
    const rgb=tokens.background.slice(1).match(/../g)!.map(v=>parseInt(v,16));
    const dark=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<128;
    const resources=Object.entries({...theme.images,...(theme.emblem?{emblem:theme.emblem}:{}),...Object.fromEntries(Object.entries(theme.icons??{}).map(([id,url])=>[`icon-${id}`,url]))}).map(([id,url])=>`--cte-image-${id}:url("${url}");`).join('');
    const fonts=(theme.fonts??[]).map(font=>`@font-face{font-family:'${font.family}';font-style:normal;font-weight:${font.weight};font-display:swap;src:url("${font.data}") format('${font.format}');}`).join('');
    const css = fonts+`[data-cte-root]{${variables}${resources}${layoutVariables(theme.layout)}--cte-motion:${theme.manifest.motion.durationMs}ms;--cte-color-scheme:${dark?'dark':'light'};}` + theme.css;
    const next = this.doc.createElement('style');
    next.dataset.cteStyle = '';
    next.textContent = css;
    this.doc.head.append(next);
    this.style?.remove(); this.style = next;
    this.root.setAttribute('data-cte-root', '');
    this.active = theme;
  }
  restore() {
    this.style?.remove(); this.style = undefined;
    if (this.previous === null) this.root.removeAttribute('data-cte-root'); else this.root.setAttribute('data-cte-root', this.previous);
    this.active = undefined;
  }
}
export async function fetchCatalog(): Promise<Catalog> {
  const response = await fetch('/__themes', { cache: 'no-store' });
  if (!response.ok) throw new Error('无法读取本地主目录');
  return response.json();
}

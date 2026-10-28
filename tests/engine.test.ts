import { describe, it, expect, vi, afterEach } from 'vitest';
import { SettingsStore, defaults } from '../src/core/settings';
import { ThemeManager } from '../src/core/theme-manager';
import { CoreEngine } from '../src/core/engine';
import { arrangeSlots } from '../src/core/layout-manager';
import manifest from '../themes/nerv/manifest.json';
import tokens from '../themes/nerv/tokens.json';
import layout from '../themes/nerv/layout.json';
import type { ThemePackage } from '../src/core/theme-manager/schema';

const theme={manifest,tokens,layout,css:''} as ThemePackage;
afterEach(()=>{document.head.querySelectorAll('[data-cte-style]').forEach(el=>el.remove());localStorage.clear();vi.unstubAllGlobals();});
describe('engine lifecycle',()=>{
  it('switches variables, variants and restores only its own DOM state',()=>{
    const root=document.createElement('div');root.setAttribute('data-cte-root','existing');root.innerHTML='<input value="original"/>';
    const manager=new ThemeManager(root);manager.apply(theme);
    expect(document.querySelector('[data-cte-style]')?.textContent).toContain('--cte-accent:#f56b43');
    manager.apply(theme,'eva-01');expect(document.querySelectorAll('[data-cte-style]')).toHaveLength(1);expect(document.querySelector('[data-cte-style]')?.textContent).toContain('--cte-accent:#b797e6');
    manager.restore();expect(root.getAttribute('data-cte-root')).toBe('existing');expect(root.querySelector('input')?.value).toBe('original');expect(document.querySelector('[data-cte-style]')).toBeNull();manager.restore();
  });
  it('saves validated preferences and recovers from corrupt or unavailable storage',()=>{
    const store=new SettingsStore(localStorage);store.save({...defaults,panelCollapsed:true,themeId:'default'});expect(store.load().panelCollapsed).toBe(true);expect(store.load().themeId).toBe('default');
    localStorage.setItem('cte.settings.v1','broken');expect(store.load()).toEqual(defaults);expect(store.warning).not.toBe('');
    const broken=new SettingsStore({getItem(){throw Error();},setItem(){throw Error();},removeItem(){}});expect(broken.load()).toEqual(defaults);expect(()=>broken.save(defaults)).not.toThrow();expect(broken.warning).toContain('无法保存');
  });
  it('falls back after package removal and handles an empty catalog without stale CSS',async()=>{
    const root=document.createElement('div');const engine=new CoreEngine(root,new SettingsStore(localStorage));
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({themes:[theme],errors:[]})}));await engine.discover();expect(engine.themes.active?.manifest.id).toBe('nerv');
    engine.restore();expect(root.hasAttribute('data-cte-root')).toBe(false);expect(engine.settings.enabled).toBe(false);
    engine.update({enabled:true});vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({themes:[],errors:[]})}));await engine.discover();expect(engine.settings.themeId).toBe('');expect(engine.themes.active).toBeUndefined();expect(root.hasAttribute('data-cte-root')).toBe(false);
  });
  it('arranges independent feature slots in theme order',()=>{
    const host=document.createElement('aside');const elements={usage:document.createElement('div'),connection:document.createElement('div'),theme:document.createElement('div')};
    arrangeSlots(host,['theme','usage'],elements);expect([...host.children]).toEqual([elements.theme,elements.usage]);
  });
});

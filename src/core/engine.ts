import { SettingsStore, type Settings } from './settings';
import { ThemeManager, fetchCatalog } from './theme-manager';
import type { Catalog } from './theme-manager/schema';
import { StartupAnimation } from '../features/startup-animation';

export class CoreEngine {
  settings: Settings; catalog: Catalog = {themes:[],errors:[]};
  themes: ThemeManager; startup = new StartupAnimation();
  constructor(public root: HTMLElement, public store: SettingsStore) { this.settings=store.load(); this.themes=new ThemeManager(root); }
  async discover() {
    this.catalog = await fetchCatalog();
    if (!this.catalog.themes.some(t=>t.manifest.id === this.settings.themeId)) {
      this.settings.themeId = this.catalog.themes[0]?.manifest.id ?? '';
      this.settings.variantId='';
    }
    this.apply();
  }
  update(patch: Partial<Settings>) { Object.assign(this.settings,patch); this.apply(); }
  apply() {
    this.startup.stop();
    const theme = this.catalog.themes.find(t=>t.manifest.id===this.settings.themeId);
    if (this.settings.enabled && theme) this.themes.apply(theme,this.settings.variantId); else this.themes.restore();
    this.store.save(this.settings);
  }
  restore() { this.update({enabled:false}); }
  dispose() { this.startup.stop(); this.themes.restore(); }
}

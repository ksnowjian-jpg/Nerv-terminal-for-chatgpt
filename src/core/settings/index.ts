import { z } from 'zod';

const schema = z.object({
  version: z.literal(1), themeId: z.string().max(48), variantId: z.string().max(48),
  enabled: z.boolean(), panelCollapsed: z.boolean(),
  startupEnabled: z.boolean(), startupDurationMs: z.number().int().min(0).max(5000), soundEnabled: z.literal(false)
}).strict();
export type Settings = z.infer<typeof schema>;
export const defaults: Settings = { version: 1, themeId: 'nerv', variantId: '', enabled: true, panelCollapsed: false, startupEnabled: false, startupDurationMs: 1500, soundEnabled: false };
export class SettingsStore {
  warning = '';
  constructor(private storage: Pick<Storage,'getItem'|'setItem'|'removeItem'> | undefined) {}
  load(): Settings {
    try {
      const raw = this.storage?.getItem('cte.settings.v1');
      if (!raw) return {...defaults};
      return schema.parse(JSON.parse(raw));
    } catch { this.warning = '配置不可用，已使用默认值。'; return {...defaults}; }
  }
  save(settings: Settings) {
    try {
      if (!this.storage) throw new Error('Storage unavailable');
      this.storage.setItem('cte.settings.v1', JSON.stringify(schema.parse(settings)));
      this.warning = '';
    } catch { this.warning = '无法保存配置，本次设置仅在当前会话有效。'; }
  }
}

import type { Layout } from '../theme-manager/schema';
export const layoutVariables = (layout: Layout) => `--cte-nav-width:${layout.navigationWidth}px;--cte-panel-width:${layout.panelWidth}px;--cte-content-width:${layout.contentWidth}px;--cte-gap:${layout.gap}px;`;
export function arrangeSlots(host: HTMLElement, slots: Layout['slots'], elements: Record<Layout['slots'][number],HTMLElement>) {
  host.replaceChildren(...slots.map(slot => elements[slot]));
}

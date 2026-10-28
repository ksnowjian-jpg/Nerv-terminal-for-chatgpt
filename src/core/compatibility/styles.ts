// Official semantic variables belong in the adapter, never in individual themes.
import {outsideIndependentContent} from './content-boundaries';
// Rich replies inherit a separate light palette from their portal boundary.
// Reapply semantic tokens at the response root, without recoloring user bubbles.
const responseSelectors=['[class*="_DilResponseRoot_"]','[class*="_MarkdownRoot_"]','[data-message-author-role="assistant"]','[data-message-author-role="assistant"] .prose']
  .map(selector=>`[data-cte-root] ${selector}${outsideIndependentContent}:not(.rich-text-user-turn):not([data-message-author-role="user"]):not(.rich-text-user-turn *):not([data-message-author-role="user"] *)`);
const responseScopes=responseSelectors.join(',');
const neutralBadgeSelectors=responseSelectors.map(selector=>`${selector} [data-d-component="badge"][data-color="secondary"][data-variant="soft"][data-pill]${outsideIndependentContent}`);
const titleSelectors=responseSelectors.map(selector=>`${selector} :is(h1,h2,h3,h4,h5,h6)[class*="_TextBase_"][class*="_Title_"]${outsideIndependentContent}`);
const userTextScopes=['.rich-text-user-turn','[data-message-author-role="user"] [class*="_MarkdownRoot_"]','[data-message-author-role="user"] .prose'].map(selector=>`[data-cte-root] ${selector}${outsideIndependentContent}`).join(',');
export const nativeTokenCss = `[data-cte-root] {
  color:var(--cte-text);
  background-color:var(--cte-background);
  color-scheme:var(--cte-color-scheme);
}
[data-cte-root], [data-cte-root] [data-cte-region="main"], ${responseScopes} {
  --app-color-background-shell:var(--cte-background)!important;
  --app-color-background-application-menu:var(--cte-surface)!important;
  --app-color-foreground-application-menu:var(--cte-text)!important;
  --app-color-background-surface-under:var(--cte-surface)!important;
  --app-color-background-control:var(--cte-elevated)!important;
  --app-color-background-elevated-primary:var(--cte-elevated)!important;
  --app-color-background-elevated-primary-opaque:var(--cte-elevated)!important;
  --app-color-background-elevated-secondary-opaque:var(--cte-elevated)!important;
  --app-color-text-foreground:var(--cte-text)!important;
  --app-color-text-foreground-secondary:var(--cte-muted)!important;
  --app-color-text-foreground-tertiary:var(--cte-muted)!important;
  --app-color-icon-primary:var(--cte-text)!important;
  --app-color-icon-secondary:var(--cte-muted)!important;
  --app-color-icon-tertiary:var(--cte-muted)!important;
  --app-color-text-accent:var(--cte-accent)!important;
  --app-color-text-on-accent:var(--cte-accent-text)!important;
  --app-color-background-accent:var(--cte-elevated)!important;
  --app-color-background-accent-hover:var(--cte-elevated)!important;
  --app-color-background-accent-active:var(--cte-elevated)!important;
  --app-color-background-button-primary:var(--cte-accent)!important;
  --app-color-background-button-primary-hover:var(--cte-accent)!important;
  --app-color-background-button-primary-active:var(--cte-accent)!important;
  --app-color-text-button-primary:var(--cte-accent-text)!important;
  --app-color-background-button-secondary:var(--cte-elevated)!important;
  --app-color-background-button-secondary-hover:var(--cte-border)!important;
  --app-color-background-button-secondary-active:var(--cte-border)!important;
  --app-color-text-button-secondary:var(--cte-text)!important;
  --app-color-text-button-tertiary:var(--cte-muted)!important;
  --app-color-background-button-tertiary-hover:var(--cte-elevated)!important;
  --app-color-background-button-tertiary-active:var(--cte-border)!important;
  --app-color-border:var(--cte-border)!important;
  --app-color-border-light:var(--cte-border)!important;
  --app-color-border-heavy:var(--cte-border)!important;
  --app-color-border-focus:var(--cte-accent)!important;
  --app-color-border-application-menu-separator:var(--cte-border)!important;
  --color-text:var(--cte-text)!important;
  --color-text-prose:var(--cte-text)!important;
  --color-text-emphasis:var(--cte-text)!important;
  --color-text-tertiary:var(--cte-muted)!important;
  --color-text-disabled:var(--cte-muted)!important;
  --color-text-toolbar-action:var(--cte-muted)!important;
  --color-text-button-outline:var(--cte-text)!important;
  --color-text-primary-ghost:var(--cte-text)!important;
  --color-text-primary-ghost-hover:var(--cte-text)!important;
  --color-text-primary-outline:var(--cte-text)!important;
  --color-text-primary-outline-hover:var(--cte-text)!important;
  --color-text-primary-soft:var(--cte-text)!important;
  --color-text-primary-soft-alt:var(--cte-text)!important;
  --color-text-primary-surface:var(--cte-text)!important;
  --color-text-primary-solid:var(--cte-accent-text)!important;
  --color-text-secondary-ghost:var(--cte-muted)!important;
  --color-text-secondary-ghost-hover:var(--cte-text)!important;
  --color-text-secondary-outline:var(--cte-muted)!important;
  --color-text-secondary-outline-hover:var(--cte-text)!important;
  --color-text-secondary-soft:var(--cte-text)!important;
  --color-text-secondary-soft-alt:var(--cte-muted)!important;
  --color-text-secondary-solid:var(--cte-muted)!important;
  /* Native risk labels also appear inside table cells and ordinary text.
     Preserve their red meaning with paired light/dark foregrounds. */
  --color-text-danger:light-dark(#b42318,#ff8a80)!important;
  --color-surface-card:var(--cte-surface)!important;
  --color-surface-elevated:var(--cte-elevated)!important;
  --color-background-control-opaque:var(--cte-elevated)!important;
  --color-background-panel:var(--cte-surface)!important;
  --color-background-callout-surface:var(--cte-elevated)!important;
  --color-background-composer-surface:var(--cte-elevated)!important;
  --color-background-mode-toggle-selected:var(--cte-elevated)!important;
  --color-background-mode-toggle-track:var(--cte-surface)!important;
  --color-border-mode-toggle-selected:var(--cte-border)!important;
  --color-text-mode-toggle-primary:var(--cte-text)!important;
  --color-text-mode-toggle-inactive:var(--cte-muted)!important;
  --color-text-mode-toggle-accent:var(--cte-accent)!important;
  --color-background-segmented-form-selected:var(--cte-elevated)!important;
  --color-background-segmented-form-track:var(--cte-surface)!important;
  --color-background-primary-solid:var(--cte-accent)!important;
  --color-background-primary-solid-hover:var(--cte-accent)!important;
  --color-background-primary-solid-active:var(--cte-accent)!important;
  --color-background-primary-soft:var(--cte-elevated)!important;
  --color-background-primary-soft-alpha:var(--cte-elevated)!important;
  --color-background-primary-soft-alt:var(--cte-elevated)!important;
  --color-background-primary-soft-hover:var(--cte-elevated)!important;
  --color-background-primary-soft-active:var(--cte-border)!important;
  /* DIL soft badges (including source citations) pair these surfaces with the
     secondary text tokens. Their portal otherwise retains a light background. */
  --color-background-secondary-soft:var(--cte-elevated)!important;
  --color-background-secondary-soft-alpha:var(--cte-elevated)!important;
  --color-background-secondary-soft-alt:var(--cte-elevated)!important;
  --color-background-secondary-soft-hover:var(--cte-elevated)!important;
  --color-background-secondary-soft-alpha-hover:var(--cte-elevated)!important;
  --color-background-secondary-soft-active:var(--cte-border)!important;
  --color-background-secondary-soft-alpha-active:var(--cte-border)!important;
  --color-background-primary-ghost-hover:var(--cte-elevated)!important;
  --color-background-primary-ghost-active:var(--cte-border)!important;
  --color-background-secondary-soft:var(--cte-elevated)!important;
  --color-background-secondary-soft-alt:var(--cte-elevated)!important;
  --color-background-secondary-soft-hover:var(--cte-elevated)!important;
  --color-background-secondary-soft-active:var(--cte-border)!important;
  --color-background-secondary-solid:var(--cte-elevated)!important;
  --color-background-secondary-solid-hover:var(--cte-border)!important;
  --color-background-secondary-solid-active:var(--cte-border)!important;
  --color-border:var(--cte-border)!important;
  --color-border-strong:var(--cte-border)!important;
  --color-border-subtle:var(--cte-border)!important;
  --color-border-overlay:var(--cte-border)!important;
  --color-border-primary-outline:var(--cte-border)!important;
  --color-border-secondary-outline:var(--cte-border)!important;
  --color-border-button-outline:var(--cte-border)!important;
  --app-color-background-surface:var(--cte-background)!important;
  --app-color-background-card:var(--cte-surface)!important;
  --app-color-background-elevated-secondary:var(--cte-elevated)!important;
  --app-color-background-editor-opaque:var(--cte-elevated)!important;
  --color-token-main-surface-primary:var(--cte-background)!important;
  --color-token-side-bar-background:var(--cte-surface)!important;
  --color-surface:var(--cte-background)!important;
  --color-surface-primary:var(--cte-background)!important;
  --color-surface-secondary:var(--cte-surface)!important;
  --color-surface-tertiary:var(--cte-elevated)!important;
  --color-surface-canvas:var(--cte-background)!important;
  --color-surface-elevated-secondary:var(--cte-elevated)!important;
  --color-token-border-default:var(--cte-border)!important;
  --app-color-border-default:var(--cte-border)!important;
  --color-token-text-primary:var(--cte-text)!important;
  --app-color-text-primary:var(--cte-text)!important;
  --color-text-primary:var(--cte-text)!important;
  --app-color-text-secondary:var(--cte-muted)!important;
  --color-text-secondary:var(--cte-muted)!important;
  --app-color-accent:var(--cte-accent)!important;
  --app-color-icon-accent:var(--cte-accent)!important;
  --input-outline-border-color-focus:var(--cte-accent)!important;
  --color-token-input-border:var(--cte-border)!important;
  --color-background-composer-action-bar:var(--cte-elevated)!important;
}
${responseScopes} {
  color:var(--cte-text);
  color-scheme:var(--cte-color-scheme)!important;
  --text-primary:var(--cte-text)!important;
  --text-secondary:var(--cte-muted)!important;
  --tw-prose-body:var(--cte-text)!important;
  --tw-prose-headings:var(--cte-text)!important;
  --tw-prose-lead:var(--cte-text)!important;
  --tw-prose-links:var(--cte-accent)!important;
  --tw-prose-bold:var(--cte-text)!important;
  --tw-prose-counters:var(--cte-muted)!important;
  --tw-prose-bullets:var(--cte-muted)!important;
  --tw-prose-hr:var(--cte-border)!important;
  --tw-prose-quotes:var(--cte-text)!important;
  --tw-prose-quote-borders:var(--cte-border)!important;
  --tw-prose-captions:var(--cte-muted)!important;
  --tw-prose-kbd:var(--cte-text)!important;
  --tw-prose-code:var(--cte-text)!important;
  --tw-prose-pre-code:var(--cte-text)!important;
  --tw-prose-pre-bg:var(--cte-elevated)!important;
  --tw-prose-th-borders:var(--cte-border)!important;
  --tw-prose-td-borders:var(--cte-border)!important;
}
/* DIL titles can carry an inline --text-base-color from the light renderer.
   Pair their heading text with the theme just as Markdown headings already do. */
${titleSelectors.join(',')} {
  --text-base-color:var(--cte-text)!important;
}
/* The adapter marks only styled, non-interactive DIL text that needs repair.
   Keep the original card palette; give its text a readable foreground. */
[data-cte-root] [data-cte-region="main"] [data-cte-reply-ink="dark"] {
  color:#000!important;-webkit-text-fill-color:#000!important;
}
[data-cte-root] [data-cte-region="main"] [data-cte-reply-ink="light"] {
  color:#fff!important;-webkit-text-fill-color:#fff!important;
}
/* Citation pills explicitly paint an inline var(--gray-75), bypassing their
   semantic surface variables. Re-pair only neutral soft pills in replies. */
${neutralBadgeSelectors.join(',')} {
  background-color:var(--cte-elevated)!important;
  color:var(--cte-muted)!important;
  --badge-background-color:var(--cte-elevated)!important;
  --badge-text-color:var(--cte-muted)!important;
}
${neutralBadgeSelectors.map(selector=>`${selector}:hover`).join(',')} {
  background-color:var(--cte-border)!important;
}
/* User turns share the Markdown renderer, but have their own paired bubble
   colors. Keep the text wrapper transparent so only the rounded bubble paints. */
${userTextScopes} {
  background-color:transparent;
  color:var(--color-text-user-message,inherit);
  --color-text-prose:var(--color-text-user-message,currentColor)!important;
  --color-text:var(--color-text-user-message,currentColor)!important;
  --app-color-text-foreground:var(--color-text-user-message,currentColor)!important;
  --text-primary:var(--color-text-user-message,currentColor)!important;
  --tw-prose-body:var(--color-text-user-message,currentColor)!important;
  --tw-prose-headings:var(--color-text-user-message,currentColor)!important;
  --tw-prose-bold:var(--color-text-user-message,currentColor)!important;
  --tw-prose-code:var(--color-text-user-message,currentColor)!important;
  --tw-prose-quotes:var(--color-text-user-message,currentColor)!important;
}
[data-cte-root] [data-cte-region="composer"] .ProseMirror [data-placeholder]::before {
  color:var(--cte-muted)!important;
  opacity:1!important;
}`;
// Optional paired bubble colors are enabled only for themes that declare both.
export const userBubbleTokenCss=`[data-cte-root] [data-cte-region="main"] {
  --color-background-user-message:var(--cte-user-bubble-background)!important;
  --color-text-user-message:var(--cte-user-bubble-text)!important;
}`;

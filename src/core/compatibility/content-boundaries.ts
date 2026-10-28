// Independent documents and file previews share the outer Work <main>, but
// own their page formatting. Never treat their content as chat reply text.
export const independentContentSelector='.codex-docx-preview-wrapper,[class*="_PageDocumentTheme_"],[class~="bg-background-artifact-preview"],iframe,webview';
export const outsideIndependentContent=`:not(:is(${independentContentSelector})):not(:is(${independentContentSelector}) *)`;

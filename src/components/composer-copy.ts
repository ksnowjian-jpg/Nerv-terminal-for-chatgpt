import type {CompatibilityResult} from '../core/compatibility';

// Do not mutate nodes inside ProseMirror: its own DOM observer can redraw them
// and fight injected attributes. The outer composer controls CSS paint only.
export function composerCopyCss(text:string|undefined) {
  if(!text)return '';
  const quoted='"'+text.replace(/["\\\n\r\f]/g,char=>'\\'+char.codePointAt(0)!.toString(16)+' ')+'"';
  const root='[data-cte-root] [data-cte-region="composer"]';
  return `${root}[data-cte-composer-prompt="native"] .ProseMirror [data-placeholder]::before,${root}[data-cte-composer-prompt="plain"] .ProseMirror >p:only-child::before{content:${quoted}!important;color:var(--cte-muted)!important;opacity:1!important;pointer-events:none;float:left;height:0}`;
}
export function createComposerCopy(anchors:CompatibilityResult,text:string|undefined) {
  const root=anchors.composer!,key='data-cte-composer-prompt',saved=root.getAttribute(key);
  let changed=false;
  const sync=()=>{
    if(!text)return;
    const editor=root.querySelector<HTMLElement>('.ProseMirror[role="textbox"]');
    let mode:string|null=null;
    if(editor&&!editor.textContent?.trim()){
      if(editor.querySelector('[data-placeholder]'))mode='native';
      else if(editor.childElementCount===1){const paragraph=editor.firstElementChild as HTMLElement;if(paragraph.matches('p')&&!paragraph.querySelector(':not(br)'))mode='plain';}
    }
    if(root.getAttribute(key)===mode)return;
    changed=true;if(mode===null)root.removeAttribute(key);else root.setAttribute(key,mode);
  };
  if(text)root.addEventListener('input',sync,true);
  sync();return {sync,clear(){root.removeEventListener('input',sync,true);if(changed){if(saved===null)root.removeAttribute(key);else root.setAttribute(key,saved);}}};
}

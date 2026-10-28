import {CompatibilityAdapter,type CompatibilityResult} from '../core/compatibility';

// Leave React's text nodes intact. Only the observed home hero can receive a
// themed sibling; message headings and the editor are never candidates.
export function createWelcomeCopy(anchors:CompatibilityResult,text:string|undefined,caption?:string) {
  const main=anchors.main!,doc=main.ownerDocument,adapter=new CompatibilityAdapter(doc);
  let original:HTMLElement|undefined,copy:HTMLElement|undefined,saved:string|null=null;
  const clear=()=>{
    copy?.remove();copy=undefined;
    if(original){if(saved===null)original.removeAttribute('data-cte-welcome-original');else original.setAttribute('data-cte-welcome-original',saved);}
    original=undefined;
  };
  const sync=()=>{
    if(!text)return;
    const next=adapter.welcomeHeading(anchors);
    if(next===original&&copy?.isConnected&&copy.previousElementSibling===original)return;
    clear();if(!next)return;
    original=next;saved=next.getAttribute('data-cte-welcome-original');
    copy=doc.createElement(next.tagName);copy.className=next.className;
    copy.dataset.cteWelcome='';
    const title=doc.createElement('span');title.dataset.cteWelcomeTitle='';title.textContent=text;
    if(!/^H[1-6]$/.test(next.tagName)){title.setAttribute('role','heading');title.setAttribute('aria-level','1');}
    copy.append(title);
    if(caption){const small=doc.createElement('small');small.dataset.cteWelcomeCaption='';small.textContent=caption;copy.append(small);}
    next.setAttribute('data-cte-welcome-original','');next.after(copy);
  };
  sync();return {sync,clear};
}

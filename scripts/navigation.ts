import {anchorsExpression} from './renderer';
export async function navigationSnapshotExpression(){return `(()=>{
  const shape=el=>{if(!el)return null;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName.toLowerCase(),classes:[...el.classList].slice(0,6),connected:el.isConnected,rect:{x:r.x,y:r.y,width:r.width,height:r.height},display:s.display,visibility:s.visibility,opacity:s.opacity,overflow:s.overflow,pointerEvents:s.pointerEvents,position:s.position,background:s.backgroundColor}};
  const anchors=(${await anchorsExpression()});
  const editor=anchors.composer?.querySelector('.ProseMirror[role="textbox"]')||anchors.composer;
  const chain=[];for(let node=editor;node&&chain.length<12;node=node.parentElement)chain.push(shape(node));
  return {runtime:!!window.__CTE_LOCAL__,session:window.__CTE_LOCAL__?.status?.()??null,panelCount:document.querySelectorAll('[data-cte-panel]').length,styleCount:document.querySelectorAll('[data-cte-style], [data-cte-runtime]').length,reserved:document.querySelectorAll('[data-cte-reserve]').length,marked:document.querySelectorAll('[data-cte-region]').length,body:shape(document.body),main:[...document.querySelectorAll('main')].map(shape),editorAncestors:chain,dialogs:[...document.querySelectorAll('[role="dialog"]')].map(shape)};
})()`;}

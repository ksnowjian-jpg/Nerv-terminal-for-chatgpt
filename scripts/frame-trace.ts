// This observer exports colors and lifecycle counters, never page text or images.
export const startFrameTrace=`(()=>{
  window.__CTE_FRAME_TRACE__?.stop();
  const styles=[...document.querySelectorAll('[data-cte-style],[data-cte-runtime]')];
  const panel=document.querySelector('[data-cte-panel]'),backdrop=document.querySelector('[data-cte-backdrop]');
  let id,frames=0,missingPalette=0,replacedStyles=0,whiteFrames=0,detachedPanelFrames=0,detachedBackdropFrames=0;
  const phases={},colors={};
  const sample=()=>{
    frames++;
    if(!document.documentElement.hasAttribute('data-cte-root'))missingPalette++;
    if(styles.length!==2||styles.some(style=>!style.isConnected))replacedStyles++;
    if(panel&&!panel.isConnected)detachedPanelFrames++;
    if(backdrop&&!backdrop.isConnected)detachedBackdropFrames++;
    const hit=document.elementFromPoint(innerWidth*.5,innerHeight*.45);
    const surface=hit?.closest('main')||hit;
    let node=surface,bg='';
    for(;node;node=node.parentElement){const value=getComputedStyle(node).backgroundColor;if(!['transparent','rgba(0, 0, 0, 0)'].includes(value)){bg=value;break;}}
    colors[bg]=(colors[bg]||0)+1;
    const rgb=bg.match(/[\\d.]+/g)?.map(Number);
    if(rgb&&rgb.slice(0,3).every(channel=>channel>=220))whiteFrames++;
    const phase=window.__CTE_LOCAL__?.status().phase||'absent';phases[phase]=(phases[phase]||0)+1;
    id=requestAnimationFrame(sample);
  };
  sample();
  window.__CTE_FRAME_TRACE__={stop(){cancelAnimationFrame(id);return {frames,missingPalette,replacedStyles,whiteFrames,detachedPanelFrames,detachedBackdropFrames,phases,colors}}};
  return {started:true};
})()`;
export const stopFrameTrace=`(()=>{const result=window.__CTE_FRAME_TRACE__?.stop();delete window.__CTE_FRAME_TRACE__;return result})()`;

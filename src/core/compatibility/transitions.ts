import type {CompatibilityResult} from './index';

// Chromium can suspend CSS transition clocks in a background app window.
// Commit finite palette transitions so an installed theme has its final colors
// immediately. Leave transforms, opacity and non-CSS animations alone.
export function finishPaletteTransitions(anchors:CompatibilityResult) {
  if(typeof CSSTransition==='undefined')return;
  const properties=new Set(['color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color','fill','stroke','-webkit-text-fill-color']);
  const animations=new Set<Animation>();
  for(const element of [anchors.navigation,anchors.main,anchors.composer]){
    if(!element)continue;
    for(const animation of element.getAnimations({subtree:true}))animations.add(animation);
  }
  for(const animation of animations){
    if(!(animation instanceof CSSTransition)||!properties.has(animation.transitionProperty)||!Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))continue;
    try{animation.finish();}catch{/* A cancelled transition needs no intervention. */}
  }
}

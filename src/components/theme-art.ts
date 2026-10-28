import type {ThemePackage} from '../core/theme-manager/schema';

export const themeArtBaseCss=`
[data-cte-panel] .cte-theme-brand{margin:18px 0 22px}
[data-cte-panel] .cte-brand-kicker{font:10px var(--cte-display-font);letter-spacing:.15em;margin:0 0 12px}
[data-cte-panel] .cte-brand-lockup{display:flex;align-items:center;gap:14px}
[data-cte-panel] .cte-brand-logo{display:block;flex-shrink:0;width:80px;height:80px;background:var(--cte-accent);mask:var(--cte-image-emblem) center/contain no-repeat}
[data-cte-panel] .cte-brand-logo[data-cte-brand-render="image"]{background:none;mask:none;object-fit:contain}
[data-cte-panel] .cte-brand-copy{min-width:0;flex:1}
[data-cte-panel] .cte-brand-wordmark{display:block;max-width:100%;height:auto}
[data-cte-panel] .cte-brand-name{font:600 44px/1 var(--cte-heading-font,var(--cte-display-font));letter-spacing:.04em;color:var(--cte-accent)}
[data-cte-panel] .cte-brand-subtitle{font:10px/1.7 var(--cte-display-font);margin-top:7px;color:var(--cte-muted)}
[data-cte-panel] .cte-theme-diagram{margin:22px 0;border-top:1px solid var(--cte-border);padding-top:12px}
[data-cte-panel] .cte-theme-diagram figcaption{font:11px var(--cte-display-font);color:var(--cte-accent);letter-spacing:.06em}
[data-cte-panel] .cte-theme-diagram img{display:block;width:100%;height:136px;object-fit:contain;margin:10px 0 0}
[data-cte-panel] .cte-theme-diagram small{display:block;font:10px/1.5 var(--cte-font);color:var(--cte-muted)}
[data-cte-panel] .cte-action-icon{display:inline-block;vertical-align:middle;width:15px;height:15px;background:currentColor;mask-position:center;mask-repeat:no-repeat;mask-size:contain;margin-right:8px}
[data-cte-panel] [data-cte-icon="refresh"]{mask-image:var(--cte-image-icon-refresh)}
[data-cte-panel] [data-cte-icon="restore"]{mask-image:var(--cte-image-icon-restore)}
[data-cte-panel] [data-cte-icon="status"]{mask-image:var(--cte-image-icon-status)}
[data-cte-panel] .cte-theme-footer{border-top:1px solid var(--cte-border);margin-top:20px;padding-top:12px;font:10px/1.6 var(--cte-display-font);color:var(--cte-muted);letter-spacing:.08em}
[data-cte-backdrop]{position:absolute;pointer-events:none;right:4%;top:60px;width:210px;height:210px;opacity:var(--cte-backdrop-opacity,.06);mask:var(--cte-backdrop-image) center/contain no-repeat;background:var(--cte-accent);z-index:0}
[data-cte-backdrop][data-cte-render="image"]{mask:none;background:var(--cte-backdrop-image) center/contain no-repeat;z-index:-1}
[data-cte-root] [data-cte-hidden-icon]{display:none!important}
[data-cte-native-replacement]{display:inline-block;width:23px;height:23px;vertical-align:middle;background:var(--cte-accent);mask:var(--cte-image-icon-home) center/contain no-repeat;pointer-events:none}
[data-cte-chrome]{box-sizing:border-box;pointer-events:none;user-select:none;flex-shrink:0;min-width:0}
[data-cte-chrome="navigation"]{display:flex;align-items:center;gap:10px;overflow:hidden;margin:10px 12px 4px;padding:12px 0;border-bottom:1px solid var(--cte-border);color:var(--cte-text)}
.cte-nav-badge-logo{flex:0 0 42px;width:42px;height:42px;background:var(--cte-accent);mask:var(--cte-nav-badge-image) center/contain no-repeat}
.cte-nav-badge-copy{min-width:0}.cte-nav-badge-copy>*{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cte-nav-badge-label{font:600 28px/.95 var(--cte-heading-font,var(--cte-display-font));letter-spacing:.08em}
.cte-nav-badge-caption,.cte-nav-badge-detail{font:8px/1.5 var(--cte-display-font);letter-spacing:.08em;color:var(--cte-muted)}
[data-cte-chrome="header"]{display:flex;align-items:center;gap:14px;height:36px;margin-top:var(--cte-header-inset,0px);padding:0 20px;border-bottom:1px solid var(--cte-border);color:var(--cte-text);overflow:hidden;font:10px var(--cte-display-font)}
.cte-band-label{flex-shrink:0;letter-spacing:.12em;color:var(--cte-accent)}
.cte-band-caption{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9px;color:var(--cte-muted);letter-spacing:.1em}
.cte-band-lights{display:flex;gap:5px;flex-shrink:0}.cte-band-lights i{display:block;width:4px;height:10px;background:var(--cte-accent)}
.cte-band-serial{flex-shrink:0;font:600 22px var(--cte-heading-font,var(--cte-display-font));letter-spacing:.08em}
`;
function label(doc:Document,tag:string,className:string,text:string) {const el=doc.createElement(tag);el.className=className;el.textContent=text;return el;}
export function decoratePanel(panel:HTMLElement,theme:ThemePackage) {
  const presentation=theme.manifest.presentation;
  if(!presentation)return;
  const doc=panel.ownerDocument;
  const body=panel.querySelector<HTMLElement>('.cte-detail:not(strong)')!;
  if(presentation.panelTitle)panel.querySelector('header strong')!.textContent=presentation.panelTitle;
  const brand=doc.createElement('section');brand.className='cte-theme-brand';
  if(presentation.kicker)brand.append(label(doc,'p','cte-brand-kicker',presentation.kicker));
  const lockup=doc.createElement('div');lockup.className='cte-brand-lockup';
  lockup.dataset.cteBrandLayout=presentation.brandWordmark&&!presentation.brandImage?'wordmark':'lockup';
  if(presentation.brandImage&&theme.images?.[presentation.brandImage]){const mark=doc.createElement('img');mark.className='cte-brand-logo';mark.dataset.cteBrandRender='image';mark.src=theme.images[presentation.brandImage];mark.alt='';mark.setAttribute('aria-hidden','true');lockup.append(mark);}
  else if(theme.emblem&&!presentation.brandWordmark){const mark=doc.createElement('span');mark.className='cte-brand-logo';mark.setAttribute('aria-hidden','true');lockup.append(mark);}
  const words=doc.createElement('div');words.className='cte-brand-copy';
  if(presentation.brandWordmark&&theme.images?.[presentation.brandWordmark]){const wordmark=doc.createElement('img');wordmark.className='cte-brand-wordmark';wordmark.src=theme.images[presentation.brandWordmark];wordmark.alt=presentation.brandLabel??'';words.append(wordmark);}
  else if(presentation.brandLabel)words.append(label(doc,'div','cte-brand-name',presentation.brandLabel));
  if(presentation.brandSubtitle)words.append(label(doc,'div','cte-brand-subtitle',presentation.brandSubtitle));
  lockup.append(words);brand.append(lockup);body.prepend(brand);
  if(presentation.diagram&&theme.images?.[presentation.diagram.image]) {
    const diagram=doc.createElement('figure');diagram.className='cte-theme-diagram';
    diagram.append(label(doc,'figcaption','',presentation.diagram.title));
    const art=doc.createElement('img');art.src=theme.images![presentation.diagram.image];art.alt='';
    diagram.append(art,label(doc,'small','',presentation.diagram.caption));body.insertBefore(diagram,body.querySelector('[data-refresh]'));
  }
  for(const [id,selector] of [['refresh','[data-refresh]'],['restore','[data-restore]']] as const)if(theme.icons?.[id]) {
    const icon=doc.createElement('span');icon.className='cte-action-icon';icon.dataset.cteIcon=id;icon.setAttribute('aria-hidden','true');panel.querySelector(selector)!.prepend(icon);
  }
  if(presentation.footer){const footer=label(doc,'div','cte-theme-footer',presentation.footer);body.append(footer);}
}
export function decorateMain(main:HTMLElement,theme:ThemePackage) {
  const presentation=theme.manifest.presentation?.watermark;
  if(!presentation||!theme.images?.[presentation.image])return;
  const mark=main.ownerDocument.createElement('div');mark.dataset.cteBackdrop='';mark.setAttribute('aria-hidden','true');
  mark.dataset.cteRender=presentation.render??'mask';
  mark.style.setProperty('--cte-backdrop-image',`var(--cte-image-${presentation.image})`);
  mark.style.setProperty('--cte-backdrop-opacity',String(presentation.opacity));
  main.append(mark);return mark;
}
export function decorateChrome(hosts:{navigation?:HTMLElement;header?:HTMLElement;headerInset:number},theme:ThemePackage) {
  const nodes:HTMLElement[]=[];
  const badge=theme.manifest.presentation?.navigationBadge;
  if(hosts.navigation&&badge&&theme.images?.[badge.image]){
    const doc=hosts.navigation.ownerDocument,root=doc.createElement('div');root.dataset.cteChrome='navigation';root.setAttribute('aria-hidden','true');
    const logo=doc.createElement('span');logo.className='cte-nav-badge-logo';logo.style.setProperty('--cte-nav-badge-image',`var(--cte-image-${badge.image})`);
    const copy=doc.createElement('div');copy.className='cte-nav-badge-copy';copy.append(label(doc,'div','cte-nav-badge-label',badge.label),label(doc,'div','cte-nav-badge-caption',badge.caption));
    if(badge.detail)copy.append(label(doc,'div','cte-nav-badge-detail',badge.detail));root.append(logo,copy);hosts.navigation.prepend(root);nodes.push(root);
  }
  const band=theme.manifest.presentation?.headerBand;
  if(hosts.header&&band){
    const doc=hosts.header.ownerDocument,root=doc.createElement('div');root.dataset.cteChrome='header';root.setAttribute('aria-hidden','true');
    root.style.setProperty('--cte-header-inset',`${hosts.headerInset}px`);
    root.append(label(doc,'span','cte-band-label',band.label),label(doc,'span','cte-band-caption',band.caption));
    const lights=doc.createElement('span');lights.className='cte-band-lights';for(let i=0;i<3;i++)lights.append(doc.createElement('i'));root.append(lights);
    if(band.serial)root.append(label(doc,'span','cte-band-serial',band.serial));hosts.header.prepend(root);nodes.push(root);
  }
  return nodes;
}

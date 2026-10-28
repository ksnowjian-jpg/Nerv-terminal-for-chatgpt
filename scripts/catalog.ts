import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { manifestSchema, tokensSchema, layoutSchema, type Catalog } from '../src/core/theme-manager/schema';

// Themes are local appearance packages, never executable plug-ins.
export function validateCss(css: string) {
  const ast = postcss.parse(css);
  ast.walkAtRules(() => { throw new Error('CSS at-rules are not supported'); });
  ast.walkRules(rule => {
    for (const selector of rule.selector.split(',')) {
      if (!/^\[data-cte-root\](?:$|[\s[.:>])/.test(selector.trim()) || /[{}\\+~]|:has\(|:is\(|:where\(/i.test(selector)) throw new Error('CSS must stay inside [data-cte-root]');
    }
  });
  ast.walkDecls(decl => {
    if (/url\s*\(|image-set\s*\(|expression\s*\(|@|\\|behavior\s*:|-moz-binding/i.test(decl.toString())) throw new Error('CSS external resources and executable values are disabled');
  });
  return ast.toString();
}
export async function readSafeBytes(root: string, relative: string) {
  const base = await realpath(root);
  const resolved = await realpath(path.resolve(base, relative));
  const rel = path.relative(base, resolved);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Theme path escapes package');
  if ((await stat(resolved)).size > 256_000) throw new Error('Theme file exceeds 256 KB');
  return readFile(resolved);
}
export async function readSafe(root:string,relative:string){return (await readSafeBytes(root,relative)).toString('utf8');}
async function loadImage(dir:string,file:string) {
  const bytes=await readSafeBytes(dir,file);
  if(file.endsWith('.svg')) {
    const svg=bytes.toString('utf8');
    if(!/<svg\b/.test(svg)||/script|foreignObject|href\s*=|url\s*\(|<!DOCTYPE|<!ENTITY|\bon\w+\s*=/i.test(svg))throw new Error('Unsafe SVG');
    return `data:image/svg+xml;base64,${bytes.toString('base64')}`;
  }
  if(file.endsWith('.png')&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return `data:image/png;base64,${bytes.toString('base64')}`;
  if(file.endsWith('.webp')&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return `data:image/webp;base64,${bytes.toString('base64')}`;
  throw new Error('Unsupported or invalid image asset');
}
export async function discoverThemes(root: string): Promise<Catalog> {
  const catalog: Catalog = { themes: [], errors: [] };
  let entries;
  try { entries = await readdir(root, { withFileTypes: true }); } catch { return catalog; }
  for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    try {
      const dir = path.join(root, entry.name);
      const manifest = manifestSchema.parse(JSON.parse(await readSafe(dir, 'manifest.json')));
      if (catalog.themes.some(t => t.manifest.id === manifest.id)) throw new Error('Duplicate theme ID');
      const tokens = tokensSchema.parse(JSON.parse(await readSafe(dir, manifest.tokens)));
      const layout = layoutSchema.parse(JSON.parse(await readSafe(dir, manifest.layout)));
      const css = manifest.css ? validateCss(await readSafe(dir, manifest.css)) : '';
      const emblem=manifest.assets.emblem?await loadImage(dir,manifest.assets.emblem):undefined;
      const images:Record<string,string>={};const icons:Record<string,string>={};
      for(const [id,file] of Object.entries(manifest.assets.images))images[id]=await loadImage(dir,file);
      for(const [id,file] of Object.entries(manifest.assets.icons))icons[id]=await loadImage(dir,file);
      const fonts=[];
      for(const font of manifest.assets.fonts) {
        const bytes=await readSafeBytes(dir,font.file);
        const format=font.file.endsWith('.ttf')&&bytes.subarray(0,4).equals(Buffer.from([0,1,0,0]))?'truetype':font.file.endsWith('.woff2')&&bytes.toString('ascii',0,4)==='wOF2'?'woff2':null;
        if(!format)throw new Error('Unsupported or invalid font asset');
        fonts.push({family:font.family,weight:font.weight,format:format as 'truetype'|'woff2',data:`data:font/${format==='truetype'?'ttf':'woff2'};base64,${bytes.toString('base64')}`});
      }
      for(const image of [manifest.presentation?.diagram?.image,manifest.presentation?.watermark?.image,manifest.presentation?.navigationBadge?.image,manifest.presentation?.brandImage,manifest.presentation?.brandWordmark])if(image&&!images[image])throw new Error('Presentation refers to a missing image');
      catalog.themes.push({ manifest, tokens, layout, css, emblem,images,icons,fonts });
    } catch (error) {
      catalog.errors.push(`${entry.name}: ${error instanceof Error ? error.message : 'Invalid theme'}`);
    }
  }
  return catalog;
}

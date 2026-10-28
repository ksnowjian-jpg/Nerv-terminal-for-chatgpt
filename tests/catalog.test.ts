// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, cp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverThemes, readSafe, validateCss } from '../scripts/catalog';

const temporary:string[]=[];
const tempRoot=path.resolve('.test-temp');
afterEach(async()=>{for(const dir of temporary.splice(0)) { if(!path.basename(dir).startsWith('cte-test-')||path.dirname(dir)!==tempRoot)throw new Error('Unsafe test cleanup');await rm(dir,{recursive:true,force:true});}});
async function fixtures(){await mkdir(tempRoot,{recursive:true});const dir=await mkdtemp(path.join(tempRoot,'cte-test-'));temporary.push(dir);await cp(path.resolve('themes/default'),path.join(dir,'default'),{recursive:true});return dir;}
describe('theme packages',()=>{
  it('loads the two real independent packages with distinct tokens, slots and assets',async()=>{
    const result=await discoverThemes(path.resolve('themes'));
    expect(result.errors).toEqual([]);expect(result.themes.map(t=>t.manifest.id)).toEqual(['default','nerv']);
    const [first,second]=result.themes;expect(first.tokens.font).not.toBeUndefined();expect(first.tokens.accent).not.toBe(second.tokens.accent);expect(first.layout).not.toEqual(second.layout);expect(second.emblem).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(second.fonts?.map(font=>font.family)).toEqual(['Share Tech Mono','Barlow Condensed']);expect(second.fonts?.every(font=>font.data.startsWith('data:font/ttf;base64,'))).toBe(true);
    expect(second.images?.magi).toMatch(/^data:image\/svg\+xml;base64,/);expect(second.icons?.refresh).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(second.images?.['unit01-wordmark']).toMatch(/^data:image\/webp;base64,/);
  });
  it('discovers an added directory and survives deletion of the selected package',async()=>{
    const dir=await fixtures();await cp(path.join(dir,'default'),path.join(dir,'new-theme'),{recursive:true});
    const file=path.join(dir,'new-theme/manifest.json');const manifest=JSON.parse(await readFile(file,'utf8'));manifest.id='new-theme';manifest.name='New Theme';await writeFile(file,JSON.stringify(manifest));
    expect((await discoverThemes(dir)).themes.map(t=>t.manifest.id)).toEqual(['default','new-theme']);
    await rm(path.join(dir,'new-theme'),{recursive:true});expect((await discoverThemes(dir)).themes.map(t=>t.manifest.id)).toEqual(['default']);
    expect(await discoverThemes(path.join(dir,'missing'))).toEqual({themes:[],errors:[]});
  });
  it('isolates malformed, executable, incompatible and duplicate packages',async()=>{
    const dir=await fixtures();await mkdir(path.join(dir,'broken'));await writeFile(path.join(dir,'broken/manifest.json'),'{broken');
    await cp(path.join(dir,'default'),path.join(dir,'duplicate'),{recursive:true});
    await cp(path.join(dir,'default'),path.join(dir,'incompatible'),{recursive:true});
    const file=path.join(dir,'incompatible/manifest.json');const manifest=JSON.parse(await readFile(file,'utf8'));manifest.id='incompatible';manifest.engineVersion='^9.0.0';manifest.javascript='evil.js';await writeFile(file,JSON.stringify(manifest));
    const result=await discoverThemes(dir);expect(result.themes).toHaveLength(1);expect(result.errors).toHaveLength(3);
  });
  it('rejects path escape and unsafe CSS, including escaped URL syntax',async()=>{
    const dir=await fixtures();await expect(readSafe(path.join(dir,'default'),'../default/../outside.json')).rejects.toThrow();
    for(const css of ['body{color:red}','[data-cte-root] + body{color:red}','@import "https://x.test";','[data-cte-root]{background:url(https://x.test)}','[data-cte-root]{background:u\\72l(https://x.test)}','[data-cte-root]{background:image-set("https://x.test" 1x)}'])expect(()=>validateCss(css)).toThrow();
    expect(validateCss('[data-cte-root] .owned {color:var(--cte-accent)}')).toContain('owned');
  });
  it('rejects executable SVG, forged images and invalid fonts in declared resource slots',async()=>{
    const dir=await fixtures();const packageDir=path.join(dir,'default');const file=path.join(packageDir,'manifest.json');const base=JSON.parse(await readFile(file,'utf8'));
    await writeFile(path.join(packageDir,'unsafe.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.test/private"/></svg>');
    await writeFile(path.join(packageDir,'fake.png'),'not a PNG');await writeFile(path.join(packageDir,'fake.ttf'),'not a font');
    for(const assets of [{images:{art:'unsafe.svg'}},{emblem:'fake.png'},{fonts:[{family:'Test Font',file:'fake.ttf',weight:400}]},{fonts:[{family:'Injected; color:red',file:'fake.ttf',weight:400}]}]) {
      await writeFile(file,JSON.stringify({...base,assets}));const result=await discoverThemes(dir);expect(result.themes).toHaveLength(0);expect(result.errors).toHaveLength(1);
    }
    for(const presentation of [{brandImage:'missing'},{brandWordmark:'missing'},{panelText:{unknown:'not allowed'}}]){
      await writeFile(file,JSON.stringify({...base,presentation}));const result=await discoverThemes(dir);expect(result.themes).toHaveLength(0);expect(result.errors).toHaveLength(1);
    }
  });
});

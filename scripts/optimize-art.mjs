import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '@playwright/test';

// Format conversion / optional proportional downsampling: preserve composition
// and alpha. No image
// content is created or edited here; artwork comes from the imagegen tool.
const [input,output,maxWidthText]=process.argv.slice(2);
const maxWidth=maxWidthText?Number(maxWidthText):0;
if(maxWidthText&&(!Number.isInteger(maxWidth)||maxWidth<256||maxWidth>2048))throw new Error('Optional maximum width must be 256–2048');
if(!input||!output)throw new Error('Pass input PNG and workspace output WebP');
const out=path.resolve(output),relative=path.relative(process.cwd(),out);
if(relative.startsWith('..')||path.isAbsolute(relative)||!out.endsWith('.webp'))throw new Error('Output must be a WebP inside the workspace');
const source=await readFile(input);
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage();
  const result=await page.evaluate(async({data,maxWidth})=>{
    const image=new Image();image.src=data;await image.decode();
    const ratio=maxWidth?Math.min(1,maxWidth/image.naturalWidth):1;
    const canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*ratio);canvas.height=Math.round(image.naturalHeight*ratio);
    const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let minAlpha=255,maxAlpha=0,transparent=0;
    for(let i=3;i<pixels.length;i+=4){minAlpha=Math.min(minAlpha,pixels[i]);maxAlpha=Math.max(maxAlpha,pixels[i]);if(pixels[i]===0)transparent++;}
    let encoded,quality;
    for(const q of [.82,.74,.66,.58]){encoded=canvas.toDataURL('image/webp',q);quality=q;if((encoded.length-23)*.75<250000)break;}
    return {encoded,width:canvas.width,height:canvas.height,minAlpha,maxAlpha,transparent,quality};
  },{data:`data:image/png;base64,${source.toString('base64')}`,maxWidth});
  const bytes=Buffer.from(result.encoded.split(',')[1],'base64');if(bytes.length>256000)throw new Error('Encoded asset still exceeds package limit');
  await mkdir(path.dirname(out),{recursive:true});await writeFile(out,bytes,{flag:'wx'});
  console.log(JSON.stringify({file:relative,bytes:bytes.length,width:result.width,height:result.height,minAlpha:result.minAlpha,maxAlpha:result.maxAlpha,transparentPixels:result.transparent,quality:result.quality},null,2));
}finally{await browser.close();}

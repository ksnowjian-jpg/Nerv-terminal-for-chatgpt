import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export interface CdpTarget { id: string; type: string; url: string; webSocketDebuggerUrl: string }
export function validatePort(value: number) { if(!Number.isInteger(value)||value<1024||value>65535)throw new Error('Port must be an integer between 1024 and 65535');return value; }
export function loopbackSocket(value: string,port:number) {
  const url=new URL(value);
  if(url.protocol!=='ws:'||url.hostname!=='127.0.0.1'||Number(url.port)!==validatePort(port)||url.username||url.password||!/^\/devtools\/page\/[\w-]+$/.test(url.pathname)||url.search||url.hash)throw new Error('Refusing non-loopback or unexpected CDP socket');
  return url.toString();
}
export function allowedTarget(target:CdpTarget) {
  if(target.type!=='page')return false;
  try {const url=new URL(target.url);return url.protocol==='app:'||url.origin==='https://chatgpt.com';} catch{return false;}
}
export function validateBindings(addresses: string[]) {
  if(!addresses.length || addresses.some(address=>!['127.0.0.1','::1'].includes(address)))throw new Error('CDP must listen exclusively on loopback; wildcard and LAN listeners are refused');
}
async function assertLoopbackListener(port:number) {
  if(process.platform!=='win32')throw new Error('This client connector currently supports Windows only');
  try {
    const {stdout}=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-Command',`@(Get-NetTCPConnection -State Listen -LocalPort ${validatePort(port)} -ErrorAction Stop | Select-Object -ExpandProperty LocalAddress) | ConvertTo-Json -Compress`],{windowsHide:true,timeout:15000});
    const result:unknown=JSON.parse(stdout);
    const addresses=typeof result==='string'?[result]:Array.isArray(result)&&result.every(v=>typeof v==='string')?result:[];
    validateBindings(addresses);
  } catch(error) {throw new Error(`Cannot confirm a loopback-only CDP listener: ${error instanceof Error?error.message:'binding check failed'}`);}
}
export async function listTargets(port:number):Promise<CdpTarget[]> {
  await assertLoopbackListener(port);
  const response=await fetch(`http://127.0.0.1:${validatePort(port)}/json/list`,{redirect:'error',signal:AbortSignal.timeout(2000)});
  if(!response.ok)throw new Error(`CDP returned HTTP ${response.status}`);
  const targets:unknown=await response.json();
  if(!Array.isArray(targets))throw new Error('Invalid CDP target list');
  return targets.filter((t):t is CdpTarget=>!!t&&typeof t.id==='string'&&typeof t.type==='string'&&typeof t.url==='string'&&typeof t.webSocketDebuggerUrl==='string').filter(allowedTarget);
}
async function request(target:CdpTarget,port:number,method:'Runtime.evaluate'|'Page.bringToFront'|'Page.captureScreenshot'|'Input.dispatchMouseEvent',params:Record<string,unknown>):Promise<any> {
  const socket=new WebSocket(loopbackSocket(target.webSocketDebuggerUrl,port));
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error:unknown,result?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);socket.close();if(error)reject(error);else resolve(result);};
    const timer=setTimeout(()=>finish(new Error('CDP timed out')),5000);
    socket.addEventListener('error',()=>finish(new Error('CDP connection failed')),{once:true});
    socket.addEventListener('close',()=>finish(new Error('CDP connection closed before response')),{once:true});
    socket.addEventListener('open',()=>socket.send(JSON.stringify({id:1,method,params})),{once:true});
    socket.addEventListener('message',event=>{
      try {const message=JSON.parse(String(event.data));if(message.id!==1)return;
        if(message.error||message.result?.exceptionDetails)finish(new Error('Renderer rejected enhancement'));
        else finish(null,message.result);
      }catch{finish(new Error('Invalid CDP response'));}
    });
  });
}
export async function evaluate(target:CdpTarget,port:number,expression:string):Promise<unknown> {
  const result=await request(target,port,'Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  return result?.result?.value;
}
export async function bringToFront(target:CdpTarget,port:number) {await request(target,port,'Page.bringToFront',{});}
export async function clickAt(target:CdpTarget,port:number,x:number,y:number) {
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0)throw new Error('Invalid UI click coordinates');
  await request(target,port,'Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1});
  await request(target,port,'Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1});
}
export async function captureClip(target:CdpTarget,port:number,clip:{x:number;y:number;width:number;height:number}) {
  return (await request(target,port,'Page.captureScreenshot',{format:'png',captureBeyondViewport:false,clip:{...clip,scale:1}})).data as string;
}

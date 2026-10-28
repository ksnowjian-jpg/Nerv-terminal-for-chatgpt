import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import { discoverThemes } from './catalog';
import { listTargets, evaluate, validatePort, bringToFront } from './cdp';
import { probeExpression, startupExpression, verifyExpression } from './renderer';
import { paletteReportExpression } from './palette';
import { navigationSnapshotExpression } from './navigation';
import { messageColorsExpression } from './message-colors';

const args=process.argv.slice(2);
const command=args[0];
const option=(name:string)=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
async function saveReport(result:unknown){try{await mkdir('.local-tools',{recursive:true});await writeFile('.local-tools/client-last-result.json',JSON.stringify({command,result},null,2)+'\n','utf8');}catch{/* Diagnostics must not change installation behavior. */}}
try {
  if(!['probe','inspect','colors','messages','state','apply','apply-auto','verify-auto','restore','restore-auto'].includes(command))throw new Error('Usage: npm run client -- probe|inspect|colors|messages|state|apply|apply-auto|verify-auto|restore|restore-auto --port 9335 [--target ID] [--theme nerv] [--variant eva-01]');
  const port=validatePort(Number(option('--port')??9335));
  let targets=await listTargets(port);
  if(command==='probe') {
    // Expose only identifiers and origins. Never dump CDP metadata or conversation titles.
    console.log(JSON.stringify({port,targets:targets.map(t=>({id:t.id,origin:new URL(t.url).origin})),note:'Discovery only; no renderer was modified.'},null,2));
  } else {
    let targetId=option('--target');
    if(command==='inspect'||command==='colors'||(command==='messages'&&!targetId)||(command==='state'&&!targetId)||command.endsWith('-auto')) {
      const expression=await probeExpression();
      const waitSeconds=Number(option('--wait')??(['apply-auto','verify-auto'].includes(command)?30:0));
      if(!Number.isFinite(waitSeconds)||waitSeconds<0||waitSeconds>60)throw new Error('--wait must be between 0 and 60 seconds');
      const deadline=Date.now()+waitSeconds*1000;
      let reports:Array<{id:string;origin:string;result:{compatible?:boolean;ownedEnhancement?:boolean}}>=[];
      do {
        reports=[];
        for(const candidate of targets) {
          try {
            const result=await evaluate(candidate,port,expression) as {compatible?:boolean;ownedEnhancement?:boolean};
            reports.push({id:candidate.id,origin:new URL(candidate.url).protocol==='app:'?'app://':new URL(candidate.url).origin,result});
          } catch {reports.push({id:candidate.id,origin:'unavailable',result:{compatible:false,ownedEnhancement:false}});}
        }
        if(reports.some(r=>r.result.compatible)||Date.now()>=deadline)break;
        console.log('Waiting for the main ChatGPT window to finish loading...');
        await new Promise(resolve=>setTimeout(resolve,1500));
        targets=await listTargets(port);
      } while(true);
      if(command==='inspect') {console.log(JSON.stringify({port,reports},null,2));process.exit(0);}
      const matches=reports.filter(r=>command==='restore-auto'?r.result.ownedEnhancement:r.result.compatible);
      if(command==='restore-auto'&&!matches.length) {console.log('No owned enhancement found; nothing to restore.');process.exit(0);}
      if(matches.length!==1) {
        console.log(JSON.stringify({port,reports},null,2));
        throw new Error(matches.length?'Multiple matching windows. Use apply/restore with an explicit --target ID.':'Client is reachable, but its page structure is not supported yet. No theme was applied.');
      }
      targetId=matches[0].id;
      console.log(`Selected the single ${command==='restore-auto'?'owned':'compatible'} renderer: ${targetId}`);
    }
    if(!targetId)throw new Error('Select an explicit target ID from probe with --target ID');
    const target=targets.find(t=>t.id===targetId);if(!target)throw new Error('Selected target is unavailable or unsupported');
    if(command==='colors') {console.log(JSON.stringify(await evaluate(target,port,await paletteReportExpression()),null,2));process.exit(0);}
    if(command==='state') {console.log(JSON.stringify(await evaluate(target,port,await navigationSnapshotExpression()),null,2));process.exit(0);}
    if(command==='messages') {console.log(JSON.stringify(await evaluate(target,port,messageColorsExpression),null,2));process.exit(0);}
    if(command==='restore'||command==='restore-auto')console.log(await evaluate(target,port,'(()=>{window.__CTE_LOCAL__?.restore();delete window.__CTE_LOCAL__;return "Enhancement removed"})()'));
    else {
      const catalog=await discoverThemes(path.resolve('themes'));
      const id=option('--theme');if(!id)throw new Error('Specify --theme ID');
      const theme=catalog.themes.find(t=>t.manifest.id===id);if(!theme)throw new Error('Theme unavailable or failed validation');
      const variant=option('--variant')??'';if(variant&&!theme.manifest.variants.some(v=>v.id===variant))throw new Error('Unknown variant');
      if(command==='verify-auto')await bringToFront(target,port);
      const result=await evaluate(target,port,await (command==='verify-auto'?verifyExpression(theme,variant):startupExpression(theme,variant))) as {compatible?:boolean;checksPassed?:boolean;reason?:string;readability?:unknown;failedChecks?:string[]};
      await saveReport(result);
      console.log(JSON.stringify(result,null,2));
      if(result.failedChecks?.length)console.error(`Failed checks: ${result.failedChecks.join(', ')}. Report: .local-tools/client-last-result.json`);
      if(result?.compatible!==true)process.exitCode=2;
      else if(command==='verify-auto'&&!result.checksPassed)process.exitCode=3;
    }
  }
} catch(error){const message=error instanceof Error?error.message:'Client command failed';await saveReport({error:message});console.error(message);process.exitCode=1;}

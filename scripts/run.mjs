import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// Compile only our typed CLI tools; avoids a persistent TypeScript runtime loader.
const command=process.argv[2];
if(!['serve','client','capture-client','settings-check','conversation-check','usage-check','header-check'].includes(command))throw new Error('Unknown local tool');
const out=path.resolve('.local-tools',`${command}.mjs`);
await mkdir(path.dirname(out),{recursive:true});
await build({entryPoints:[`scripts/${command}.ts`],outfile:out,bundle:true,platform:'node',format:'esm',packages:'external',target:'node22'});
process.argv.splice(1,2,out);
await import(pathToFileURL(out).href);

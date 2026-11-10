import {access,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {parse} from 'smol-toml';
import {zipFunctions} from '@netlify/zip-it-and-ship-it';

const root=fileURLToPath(new URL('../',import.meta.url));
assert.equal(Number(process.versions.node.split('.')[0]),24,'Use Node.js 24 to build this project');
for(const file of ['netlify.toml','public/index.html','netlify/functions/status.ts','src/status/handle.ts','src/status/parse.ts','src/status/schema.ts','src/status/svg.ts','src/status/artwork.json','src/status/characters.json','src/status/motion.ts','src/status/motion.json','src/status/aura.ts'])await access(join(root,file));
const config=parse(await readFile(join(root,'netlify.toml'),'utf8'));
assert.equal(config.build.publish,'public');assert.equal(config.build.command,'npm run build');assert.equal(config.functions.directory,'netlify/functions');assert.equal(config.functions.node_bundler,'esbuild');
const publishEntries=await readdir(join(root,'public'));assert.deepEqual(publishEntries,['index.html'],'Publish only the minimal service notice');
const output=join(root,'.netlify','bundle-check');await mkdir(output,{recursive:true});
const functions=await zipFunctions(join(root,config.functions.directory),output,{
 archiveFormat:'none',basePath:root,repositoryRoot:root,manifest:join(output,'manifest.json'),
 config:{'*':{nodeBundler:config.functions.node_bundler,nodeVersion:'24.x',nodeModuleFormat:'esm'}},
});
assert.equal(functions.length,1);const fn=functions[0];assert.equal(fn.name,'status');assert.equal(fn.runtime,'js');assert.equal(fn.runtimeVersion,'nodejs24.x');assert.equal(fn.buildData?.runtimeAPIVersion,2);
assert.ok(fn.routes?.some(route=>route.pattern==='/v1/*'&&!route.methods?.length),'All methods must reach the v1 handler');
const modulePath=join(fn.path,'netlify','functions','status.mjs');
const compiled=await import(pathToFileURL(modulePath).href+'?build='+Date.now());
assert.equal(compiled.config.path,'/v1/*');assert.ok(!compiled.config.method);
const url='https://example.test/v1/red-r1/status.svg?mode=hero&scenario=daily&stage=0&reality=clear&arousal=30&shame=60&commands=known&phase=normal&loc=local&time=day&outfit=suit&thought=bundle-check';
const response=await compiled.default(new Request(url));assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/svg+xml; charset=utf-8');assert.equal(response.headers.get('cache-control'),'private, no-store');
const body=await response.text();assert.ok(body.includes('bundle-check'));assert.ok(body.includes('character-sprite'));assert.ok(body.includes('data:image/png;base64,'));
const head=await compiled.default(new Request(url,{method:'HEAD'}));assert.equal(head.body,null);
const post=await compiled.default(new Request(url,{method:'POST'}));assert.equal(post.status,405);assert.equal(post.headers.get('allow'),'GET, HEAD');
const svgBytes=Buffer.byteLength(body);assert.ok(4*Math.ceil(svgBytes/3)+1024<6_000_000,'Response payload is too large');
const motionUrl=new URL(url);motionUrl.searchParams.set('stage','2');motionUrl.searchParams.set('scenario','corruption');
const motionResponse=await compiled.default(new Request(motionUrl));assert.equal(motionResponse.status,200);
const motionBody=await motionResponse.text();assert.ok(motionBody.includes('data-motion="stage-2"'));assert.equal((motionBody.match(/class="motion-frame"/g)||[]).length,72);assert.ok(motionBody.includes('data-aura-motion="stage-2"'));
const motionSvgBytes=Buffer.byteLength(motionBody);assert.ok(4*Math.ceil(motionSvgBytes/3)+1024<6_000_000,'Animated response payload is too large');
motionUrl.searchParams.set('stage','3');
const stage3Response=await compiled.default(new Request(motionUrl));assert.equal(stage3Response.status,200);
const stage3Body=await stage3Response.text();assert.ok(stage3Body.includes('data-motion="stage-3"'));assert.ok(stage3Body.includes('data-aura-motion="stage-3"'));assert.equal((stage3Body.match(/class="motion-frame"/g)||[]).length,72);
assert.ok(4*Math.ceil(Buffer.byteLength(stage3Body)/3)+1024<6_000_000,'Stage 3 response payload is too large');
for(const stage of ['1','4']){
  motionUrl.searchParams.set('stage',stage);
  const response=await compiled.default(new Request(motionUrl));assert.equal(response.status,200);
  const body=await response.text();assert.ok(body.includes(`data-aura-motion="stage-${stage}"`));
  assert.ok(body.includes('id="character-sprite"'));assert.ok(!body.includes('class="motion-frame"'));
}
const report={function:fn.name,bundler:fn.bundler,runtime:fn.runtimeVersion,runtimeAPIVersion:fn.buildData.runtimeAPIVersion,routes:fn.routes,bundledModuleGet:200,bundledModuleHeadEmpty:true,bundledModulePost:405,svgBytes,motionSvgBytes,motionFrames:72,publishFiles:publishEntries,boundary:'Official local function bundle and imported compiled user module; not Lambda/Netlify deployment.'};
await writeFile(join(output,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

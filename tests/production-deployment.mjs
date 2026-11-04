import assert from 'node:assert/strict';
import { selectProductionDeployment, githubRequest } from '../scripts/select-production-deployment.mjs';
const sha='a'.repeat(40), newerSha='b'.repeat(40);
const bot={id:35613825,login:'vercel[bot]'};
const deployment=(id=10,commit=sha)=>({id,sha:commit,environment:'Production',creator:bot});
const status=state=>({state,creator:bot});
const event={repository:{id:1204386385,full_name:'doaner69/MyProspects'},sender:bot,deployment:deployment(),deployment_status:status('success')};
function api({deployments=[deployment()],statuses={10:'success'},comparison='ahead'}={}) {
 const calls=[];
 return {calls,request:async path=>{
  calls.push(path);
  if(path.startsWith('/deployments?'))return deployments;
  if(path.match(/^\/deployments\/\d+\/statuses\?per_page=1$/))return [status(statuses[path.split('/')[2]]||'inactive')];
  if(path===`/compare/${sha}...main`||path===`/compare/${newerSha}...main`)return {status:comparison};
  throw new Error('Unexpected API path '+path);
 }};
}
let fixture=api();
assert.deepEqual(await selectProductionDeployment({eventName:'deployment_status',event,request:fixture.request}),{run:true,sha,deploymentId:10});
assert.ok(fixture.calls.includes(`/compare/${sha}...main`),'deployed SHA must belong to main history');
assert.deepEqual(await selectProductionDeployment({eventName:'workflow_dispatch',event:{},request:api().request}),{run:true,sha,deploymentId:10});
for(const modified of [
 {...event,sender:{...bot,id:1}}, {...event,repository:{...event.repository,id:1}},
 {...event,deployment:{...event.deployment,creator:{...bot,id:1}}},
 {...event,deployment_status:{...status('success'),creator:{...bot,id:1}}},
 {...event,deployment:{...event.deployment,environment:'Preview'}}, {...event,deployment_status:status('failure')},
]) {
 fixture=api();const result=await selectProductionDeployment({eventName:'deployment_status',event:modified,request:fixture.request});
 assert.equal(result.run,false);assert.equal(fixture.calls.length,0,'untrusted/non-production events make no API calls');
}
fixture=api({deployments:[deployment(11,newerSha),deployment()],statuses:{10:'success',11:'success'}});
assert.equal((await selectProductionDeployment({eventName:'deployment_status',event,request:fixture.request})).run,false,'late old event skips newer live deployment');
fixture=api({deployments:[deployment(11,newerSha),deployment()],statuses:{10:'success',11:'in_progress'}});
assert.equal((await selectProductionDeployment({eventName:'deployment_status',event,request:fixture.request})).sha,sha,'newer building deployment does not replace active one');
fixture=api({statuses:{10:'inactive'}});
await assert.rejects(selectProductionDeployment({eventName:'workflow_dispatch',event:{},request:fixture.request}),/active/i);
for(const comparison of ['behind','diverged']) await assert.rejects(selectProductionDeployment({eventName:'workflow_dispatch',event:{},request:api({comparison}).request}),/main/i);
await assert.rejects(selectProductionDeployment({eventName:'deployment_status',event:{...event,deployment:{...event.deployment,sha:'bad'}},request:api().request}),/SHA/);
await assert.rejects(selectProductionDeployment({eventName:'workflow_dispatch',event:{},request:async()=>{throw new Error('API unavailable');}}),/API unavailable/);
const maliciousURL={...event,deployment_status:{...event.deployment_status,environment_url:'http://internal.invalid/'}};
assert.equal((await selectProductionDeployment({eventName:'deployment_status',event:maliciousURL,request:api().request})).sha,sha,'event URLs are never fetched');
let captured;
await assert.rejects(githubRequest('/deployments?environment=Production&per_page=100&page=1',{token:'test-token',fetcher:async(url,options)=>{captured={url,options};return {ok:false,status:403};}}),/HTTP 403/);
assert.equal(captured.url,'https://api.github.com/repos/doaner69/MyProspects/deployments?environment=Production&per_page=100&page=1');
assert.equal(captured.options.method,'GET');assert.ok(captured.options.signal,'API request has bounded timeout');assert.equal(captured.options.redirect,'error');
await assert.rejects(githubRequest('/deployments?environment=Production&per_page=100&page=1',{token:'test-token',fetcher:async()=>{throw new Error('sensitive-fetch-error');}}),error=>!error.message.includes('sensitive-fetch-error'),'network errors are sanitized');
await assert.rejects(githubRequest('/deployments?environment=Production&per_page=100&page=1',{token:'test-token',timeoutMs:10,fetcher:async(_url,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});setTimeout(resolve,30);})}),/timed out/,'metadata fetches are aborted on deadline');
for(const path of ['//evil.example', '/deployments', '/deployments/1/statuses?per_page=1&extra=true', '/compare/bad...main']) await assert.rejects(githubRequest(path,{token:'test-token',fetcher:async()=>{throw new Error('must not fetch');}}),/Unsupported metadata API path/);
console.log('production-deployment: trusted events, current active SHA, stale/building deployments, main ancestry, API errors and GET-only metadata');

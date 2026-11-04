import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { saveLeadWithNotification, notifySlack } = require('../api/_lead-submissions.js');
const fixtures = [
  ['contact', require('../api/contact-request.js'), { name:'PRIVATE_NAME', email:'private@example.test', message:'PRIVATE_MESSAGE' }],
  ['free_trial', require('../api/trial-request.js'), { firstName:'PRIVATE_FIRST', lastName:'PRIVATE_LAST', workEmail:'private@example.test', company:'PRIVATE_COMPANY', website:'https://private.example.test', useCase:'b2b', monthlyTraffic:'10k-50k', notes:'PRIVATE_NOTES', consent:true }],
];
const sensitive = ['PRIVATE_', 'private@example.test', 'private.example.test', 'postgres://SECRET', 'hooks.slack.com/services/SECRET', 'PRIVATE_USER_AGENT', 'FORGED_ID'];
const error = new Error('PRIVATE_MESSAGE postgres://SECRET https://hooks.slack.com/services/SECRET');
function response() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, end(body){this.body=JSON.parse(body);} }; }
for(const [type, api, valid] of fixtures) {
  for(const outcome of ['sent','skipped','failed','database_failed','injected_failure']) {
    const events=[];
    const logger=Object.fromEntries(['info','warn','error'].map(level=>[level, value=>events.push({level,...JSON.parse(value)})]));
    let ticks=0, saves=0, notifications=0;
    const handler=api.createHandler({
      logger, now:()=>ticks+=5,
      submitLead: async(input, options)=> {
        if(outcome==='injected_failure') throw error;
        return saveLeadWithNotification(input, { ...options,
          saveLead:async()=>{saves++;if(outcome==='database_failed')throw error;return{id:123};},
          notifySlack:async()=>{notifications++;if(outcome==='failed')throw error;if(outcome==='skipped')return notifySlack(input,{env:{}});return{status:'sent'};},
        });
      },
    });
    const res=response();
    await handler({method:'POST',body:valid,headers:{'x-request-id':'FORGED_ID','user-agent':'PRIVATE_USER_AGENT'}},res);
    assert.match(res.headers['X-Request-Id'], /^[0-9a-f-]{36}$/);
    assert.equal(res.statusCode,['database_failed','injected_failure'].includes(outcome)?503:200);
    assert.ok(events.length>=2);
    assert.ok(events.every(e=>e.requestId===res.headers['X-Request-Id']), 'all stages correlate to generated response ID');
    assert.ok(events.every(e=>Number.isInteger(e.durationMs)&&e.durationMs>=0),'all stages expose bounded duration');
    const requests=events.filter(e=>e.event==='lead.request');
    assert.equal(requests.length,1);
    assert.equal(requests[0].status,res.statusCode);
    const persist=events.filter(e=>e.event==='lead.persistence');
    assert.equal(persist.length,1,'persistence failure is not logged twice by handler and pipeline');
    assert.equal(persist[0].outcome,['database_failed','injected_failure'].includes(outcome)?'failed':'saved');
    if(outcome==='database_failed'||outcome==='injected_failure') {
      assert.equal(notifications,0);assert.equal(events.filter(e=>e.level==='error').length,1);
    } else {
      assert.equal(saves,1);assert.equal(notifications,1);
      const notification=events.find(e=>e.event==='lead.notification');
      assert.equal(notification.outcome,outcome);
      if(outcome==='skipped') assert.equal(notification.reason,'missing_webhook');
      if(outcome==='failed') assert.equal(notification.reason,'delivery_failed');
    }
    const encoded=JSON.stringify(events);
    for(const value of sensitive) assert.ok(!encoded.includes(value),'diagnostics exclude supplied data and error secrets');
  }
  const events=[];let persisted=false;
  const logger={info:value=>events.push(JSON.parse(value))};
  const handler=api.createHandler({logger,submitLead:async()=>{persisted=true;}});
  const ids=[];
  for(const [method,body,status,outcome] of [['GET',valid,405,'method_rejected'],['POST','{bad json',400,'malformed_json'],['POST',null,400,'validation_rejected'],['POST',{...valid,website_confirm:'PRIVATE_BOT'},200,'honeypot']]){
    const res=response();await handler({method,body,headers:{}},res);ids.push(res.headers['X-Request-Id']);
    assert.equal(res.statusCode,status);assert.equal(events.at(-1).outcome,outcome);
  }
  assert.equal(new Set(ids).size,ids.length,'distinct requests receive distinct IDs');
  assert.equal(persisted,false,'rejections and honeypots never enter the pipeline');
  assert.ok(events.every(e=>e.event==='lead.request'),'rejections have no database/notification events');
  const unavailableLogger=Object.fromEntries(['info','warn','error'].map(level=>[level,()=>{throw error;}]));
  const logFailureHandler=api.createHandler({logger:unavailableLogger,submitLead:(input,options)=>saveLeadWithNotification(input,{
    ...options,saveLead:async()=>({id:1}),notifySlack:async()=>({status:'skipped',reason:'missing_webhook'}),
  })});
  const logFailureResponse=response();
  await logFailureHandler({method:'POST',body:valid,headers:{}},logFailureResponse);
  assert.equal(logFailureResponse.statusCode,200,'an unavailable log sink cannot fail an already saved lead');
}
console.log('operational-logging: correlated generated IDs, safe timings/outcomes, notification skips/failures, single persistence failure and no submitted data or raw error leaks');

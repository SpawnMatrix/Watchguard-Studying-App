import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base=process.env.SMOKE_URL||'http://127.0.0.1:3000';
const username=process.env.SMOKE_USERNAME||`smoke_${randomBytes(5).toString('hex')}`;
const pin='482951';
const call=async(path,body,method='POST',cookie)=>{
 const response=await fetch(base+path,{method:body===undefined?'GET':method,headers:{'Content-Type':'application/json','X-Study-Request':'1',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal(response.status,200,`${path}: ${response.status}`);return {data:await response.json(),cookie:response.headers.get('set-cookie')};
};
await call('/api/session');await call('/api/features');
const release=(await call('/api/version')).data;
assert.equal(release.version,JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version);
if(process.env.SMOKE_EXPECT_COMMIT)assert.equal(release.commit,process.env.SMOKE_EXPECT_COMMIT);
const catalog=(await call('/api/questions')).data;assert.equal(catalog.count,425);assert.equal(catalog.templateCount,42);
const page=await fetch(base);assert.match(await page.text(),/<div id="root">/);
if(process.env.SMOKE_VERIFY==='true'){
 const {data}=await call('/api/account/login',{username,pin});assert.equal(data.snapshot.weakness_deck,'{"10001":1}');
 console.log('Container restart preserved the learner and study progress.');
}else{
 const {data,cookie}=await call('/api/account/register',{username,pin});assert.equal(data.username,username);assert.ok(cookie.includes('HttpOnly'));
 await call('/api/account/progress',{username,revision:0,snapshot:{weakness_deck:'{"10001":1}'}},'PUT',cookie);
 const graded=(await call('/api/quiz/evaluate',{questionId:10004,variant:{templateId:10004,seed:123,version:1},selectedOptions:['not a valid mask'],correctAnswer:'not a valid mask'})).data;assert.equal(graded.isCorrect,false);
 await call('/api/chat',{prompt:'Explain packet filters',history:[]});
 await call('/api/lab/diagnostic',{labName:'Initial Firebox setup',stepTitle:'Connect interface 1',stepInstruction:'Connect the management workstation to interface 1',technicianIssue:'The interface has no link'});
 console.log('Production page, legacy APIs, scenario grading and account saves passed.');
}

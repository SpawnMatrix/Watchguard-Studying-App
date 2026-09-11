import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import type { Server } from 'node:http';
import { AccountStore } from './accounts';
import { accountRoutes } from './accountRoutes';
import { validateSnapshot } from '../src/account/schema';

const stores:AccountStore[]=[];const directories:string[]=[];const servers:Server[]=[];
const open=(filename=':memory:')=>{const s=new AccountStore(filename);stores.push(s);return s;};
const snapshot={'weakness_deck':JSON.stringify({10001:1}),watchguard_mastered_flashcards:'[1,21000]'};
afterEach(async()=>{await Promise.all(servers.splice(0).map(server=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();})));for(const s of stores.splice(0)){try{s.close();}catch{}}for(const d of directories.splice(0))rmSync(d,{recursive:true,force:true});});
describe('durable study accounts',()=>{
  it('stores salted PIN hashes and only hashed session/recovery secrets',async()=>{
    const store=open(),a=await store.register('Pilot_One','482951'),b=await store.register('pilot_two','482951');
    expect(a.username).toBe('pilot_one');expect(store.identify(a.token)?.id).toBe(a.accountId);
    const rows=store.db.prepare('SELECT * FROM accounts').all();
    expect(rows[0].pin_hash).not.toBe(rows[1].pin_hash);
    expect(JSON.stringify(rows)).not.toContain('482951');expect(JSON.stringify(rows)).not.toContain(a.recoveryCode);
    expect(JSON.stringify(store.db.prepare('SELECT * FROM sessions').all())).not.toContain(a.token);
    await expect(store.register('PILOT_ONE','482951')).rejects.toMatchObject({status:409});
  });
  it('preserves progress after restart and isolates accounts',async()=>{
    const dir=mkdtempSync(path.join(tmpdir(),'study-test-'));directories.push(dir);const file=path.join(dir,'study.sqlite');
    const store=open(file),a=await store.register('one','482951'),b=await store.register('two','739162');
    store.save(a.accountId,0,snapshot);expect(store.progress(b.accountId).snapshot).toEqual({});store.close();
    const restored=open(file);expect(restored.identify(a.token)?.username).toBe('one');expect(restored.progress(a.accountId).snapshot).toEqual(snapshot);
    expect((await restored.login('one','482951')).revision).toBe(1);
  });
  it('rejects stale writes without losing either the saved revision or recovery history',async()=>{
    const s=open(),a=await s.register('pilot','482951');s.save(a.accountId,0,snapshot);
    expect(()=>s.save(a.accountId,0,{})).toThrow('Newer progress');expect(s.progress(a.accountId).snapshot).toEqual(snapshot);
    for(let revision=1;revision<=25;revision++)s.save(a.accountId,revision,{});
    const rows=s.db.prepare('SELECT revision FROM progress_backups WHERE account_id=?').all(a.accountId);
    expect(rows).toHaveLength(20);expect(s.progress(a.accountId).revision).toBe(26);
  });
  it('rotates recovery codes, invalidates previous sessions, and keeps study progress',async()=>{
    const s=open(),a=await s.register('pilot','482951');s.save(a.accountId,0,snapshot);
    const reset=await s.recover('pilot',a.recoveryCode,'739162');
    expect(s.identify(a.token)).toBeUndefined();expect(reset.recoveryCode).not.toBe(a.recoveryCode);expect(reset.snapshot).toEqual(snapshot);
    await expect(s.login('pilot','482951')).rejects.toMatchObject({status:401});
    await expect(s.recover('pilot',a.recoveryCode,'482951')).rejects.toMatchObject({status:401});
    const login=await s.login('pilot','739162');expect(login.username).toBe('pilot');s.logout(login.token);expect(s.identify(login.token)).toBeUndefined();
  });
  it('bounds PIN guessing, including parallel attempts, and expires sessions',async()=>{
    const s=open(),a=await s.register('pilot','482951');
    const attempts=await Promise.allSettled(Array.from({length:7},()=>s.login('pilot','000000')));
    expect(attempts.filter(r=>r.status==='rejected'&&r.reason.status===429)).toHaveLength(2);
    await expect(s.login('pilot','482951')).rejects.toMatchObject({status:429});
    s.db.prepare('UPDATE sessions SET expires_at=0').run();expect(s.identify(a.token)).toBeUndefined();
  });
  it('rejects secrets and malformed progress before it can replace a valid snapshot',()=>{
    expect(validateSnapshot(snapshot)).toEqual(snapshot);
    for(const input of [{gemini_api_key:'secret'},{weakness_deck:'null'},{weakness_deck:'[]'},{watchguard_mastered_flashcards:'{}'},{'watchguard-study-progress-v1':'{"quizStats":{}}'},{weakness_deck:'{"1":-1}'}])expect(()=>validateSnapshot(input)).toThrow();
  });
  it('enforces cookies, write intent, account identity and revision checks through HTTP',async()=>{
    const s=open(),app=express();app.use(express.json());app.use('/api/account',accountRoutes(s));
    const server=app.listen(0,'127.0.0.1');servers.push(server);await new Promise<void>(r=>server.once('listening',r));
    const base=`http://127.0.0.1:${(server.address() as any).port}/api/account`;
    const send=(endpoint:string,body:any,extra={},method='POST')=>fetch(base+endpoint,{method,headers:{'Content-Type':'application/json','X-Study-Request':'1',...extra},body:JSON.stringify(body)});
    const res=await send('/register',{username:'pilot',pin:'482951'});expect(res.status).toBe(200);
    const cookie=res.headers.get('set-cookie')!;expect(cookie).toContain('HttpOnly');expect(cookie).toContain('SameSite=Strict');
    const payload=await res.json();expect(payload.token).toBeUndefined();expect(payload.accountId).toBeUndefined();
    expect((await send('/progress',{username:'pilot',revision:0,snapshot},{},'PUT')).status).toBe(401);
    expect((await send('/progress',{username:'someone_else',revision:0,snapshot},{cookie},'PUT')).status).toBe(401);
    expect((await send('/progress',{username:'pilot',revision:0,snapshot},{cookie,'Sec-Fetch-Site':'cross-site'},'PUT')).status).toBe(403);
    expect((await send('/progress',{username:'pilot',revision:0,snapshot},{cookie},'PUT')).status).toBe(200);
    const conflict=await send('/progress',{username:'pilot',revision:0,snapshot:{}},{cookie},'PUT');expect(conflict.status).toBe(409);expect((await conflict.json()).snapshot).toEqual(snapshot);
    expect((await (await fetch(base+'/me',{headers:{cookie}})).json()).snapshot).toEqual(snapshot);
  });
});

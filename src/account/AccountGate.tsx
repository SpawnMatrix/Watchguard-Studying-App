import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ShieldCheck, Shuffle, KeyRound, Download, UserRound, LogOut, X } from 'lucide-react';
import { PROGRESS_EVENT, readJSON, restoreBrowser, snapshotBrowser } from './storage';
import type { StudySnapshot } from './schema';

type Saved={username:string;revision:number;snapshot:StudySnapshot;updatedAt:number};
type Cache={revision:number;snapshot:StudySnapshot;pending:boolean};
type Status='Saved'|'Saving…'|'Saved on this device'|'Choose a save'|'Sign in to sync';
const OWNER='watchguard-study-owner';
const cacheKey=(username:string)=>`watchguard-account-cache:${username}`;
const AccountContext=createContext<{username:string|null;status:Status;open:()=>void}>({username:null,status:'Saved on this device',open:()=>{}});
export const useAccount=()=>useContext(AccountContext);
async function request(action:string,body?:unknown,method='POST') {
  const response=await fetch('/api/account/'+action,{method:body===undefined?'GET':method,credentials:'same-origin',signal:AbortSignal.timeout(10000),
    headers:{'Content-Type':'application/json','X-Study-Request':'1'},body:body===undefined?undefined:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok) throw Object.assign(new Error(result.message||'Please try again.'),{status:response.status,result});
  return result;
}
function download(filename:string,text:string) {
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}

export default function AccountGate({children}:{children:ReactNode}) {
  const [ready,setReady]=useState(false),[username,setUsername]=useState<string|null>(null),[modal,setModal]=useState(false);
  const [mode,setMode]=useState<'register'|'login'|'recover'>('register'),[name,setName]=useState(''),[pin,setPin]=useState(''),[confirmation,setConfirmation]=useState(''),[code,setCode]=useState('');
  const [recovery,setRecovery]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState<Status>('Saved on this device');
  const [generation,setGeneration]=useState(0),[conflict,setConflict]=useState<Saved|null>(null);
  const active=useRef<string|null>(null),revision=useRef(0),pending=useRef(false),sending=useRef(false),conflicted=useRef(false);
  const dialogRef=useRef<HTMLDivElement>(null);
  const [bringLocal,setBringLocal]=useState(true);
  const owner=localStorage.getItem(OWNER);
  const hasLegacy=!owner&&Object.keys(snapshotBrowser()).length>0;

  function remember(snapshot=snapshotBrowser()) {
    if(active.current) localStorage.setItem(cacheKey(active.current),JSON.stringify({revision:revision.current,snapshot,pending:pending.current}));
  }
  function enter(saved:Saved,importLegacy=false) {
    const previousOwner=localStorage.getItem(OWNER);
    if(active.current) remember();
    const cache=readJSON<Cache|null>(cacheKey(saved.username),null);
    let snapshot=saved.snapshot;
    let needsSave=false;
    if(importLegacy && !previousOwner && saved.revision===0) {snapshot=snapshotBrowser();needsSave=true;}
    else if(cache?.pending) {snapshot=cache.snapshot;needsSave=true;}
    // Save the unclaimed browser copy before any account replaces it.
    if(!previousOwner&&Object.keys(snapshotBrowser()).length) localStorage.setItem('watchguard-legacy-progress-backup',JSON.stringify(snapshotBrowser()));
    restoreBrowser(snapshot);
    if(!snapshot['watchguard-study-profile-name-v1']) localStorage.setItem('watchguard-study-profile-name-v1',saved.username);
    active.current=saved.username;revision.current=saved.revision;pending.current=needsSave;
    localStorage.setItem(OWNER,saved.username);
    setUsername(saved.username);setReady(true);setGeneration(n=>n+1);setModal(false);
    if(cache?.pending&&cache.revision!==saved.revision) {
      conflicted.current=true;setConflict(saved);setStatus('Choose a save');
    }else{conflicted.current=false;setConflict(null);setStatus(needsSave?'Saving…':'Saved');}
    remember();
  }
  async function sync() {
    const user=active.current;
    if(!user||!pending.current||sending.current||conflicted.current) return;
    sending.current=true;
    const snapshot=snapshotBrowser();setStatus('Saving…');
    try {
      const result=await request('progress',{username:user,revision:revision.current,snapshot},'PUT');
      if(active.current!==user)return;
      revision.current=result.revision;
      pending.current=JSON.stringify(snapshotBrowser())!==JSON.stringify(snapshot);
      remember();setStatus(pending.current?'Saving…':'Saved');
    }catch(err:any){
      if(active.current!==user)return;
      if(err.status===409){conflicted.current=true;setConflict({...err.result,username:user});setStatus('Choose a save');}
      else setStatus(err.status===401?'Sign in to sync':'Saved on this device');
      remember();
    }finally{sending.current=false;}
  }
  useEffect(()=>{
    let cancelled=false;
    request('me').then(saved=>{
      if(cancelled)return;
      if(saved.username)enter(saved);
      else {setModal(true);setMode(localStorage.getItem(OWNER)?'login':'register');setName(localStorage.getItem(OWNER)||'');}
    }).catch(()=>{if(!cancelled){setModal(true);setError('The save server is unavailable. You can still study on this device.');}});
    return()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const changed=()=>{pending.current=true;remember();if(!conflicted.current)setStatus(active.current?'Saving…':'Saved on this device');clearTimeout(timer);timer=setTimeout(sync,600);};
    const online=()=>{void sync();};
    const otherTab=(event:StorageEvent)=>{if(event.key===OWNER&&event.newValue!==active.current){active.current=null;pending.current=false;setReady(false);setUsername(null);setModal(true);setMode('login');setError('The account changed in another tab. Sign in here to continue.');}};
    window.addEventListener('storage',otherTab);
    const visible=()=>{if(document.visibilityState==='visible')void sync();};
    window.addEventListener(PROGRESS_EVENT,changed);window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);
    const retry=setInterval(sync,15_000);
    if(ready&&pending.current)void sync();
    return()=>{window.removeEventListener('storage',otherTab);clearTimeout(timer);clearInterval(retry);window.removeEventListener(PROGRESS_EVENT,changed);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible);};
  },[ready,generation]);
  useEffect(()=>{
    if(!modal)return;
    const previous=document.activeElement as HTMLElement|null;
    dialogRef.current?.querySelector<HTMLElement>('input,button')?.focus();
    const trap=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&ready&&!recovery){setModal(false);return;}
      if(e.key!=='Tab')return;
      const items=Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input,button,a[href]')??[]) as HTMLElement[];
      const focusable=items.filter(el=>!(el as HTMLButtonElement).disabled&&el.offsetParent!==null);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',trap);return()=>{window.removeEventListener('keydown',trap);previous?.focus();};
  },[modal,ready,recovery]);
  async function submit(e:FormEvent) {
    e.preventDefault();setError('');
    if(mode!=='login'&&pin!==confirmation){setError('Those PINs do not match.');return;}
    setBusy(true);
    try {
      const saved=await request(mode,{username:name,pin,recoveryCode:code});
      enter(saved,mode==='register'&&bringLocal);setPin('');setConfirmation('');setCode('');
      if(saved.recoveryCode){setRecovery(saved.recoveryCode);setModal(true);}
    }catch(err:any){setError(err.message);}finally{setBusy(false);}
  }
  function localOnly() {
    if(!/^[a-zA-Z0-9_]{3,24}$/.test(name)){setError('Choose a username with 3–24 letters, numbers, or underscores.');return;}
    // Existing account caches stay associated with their original owner.
    if(owner && name.toLowerCase()!==owner){setError('Sign in to switch accounts. Your current device copy belongs to '+owner+'.');return;}
    if(owner){active.current=owner;const cache=readJSON<Cache|null>(cacheKey(owner),null);revision.current=cache?.revision??0;pending.current=cache?.pending??false;}
    localStorage.setItem('watchguard-study-profile-name-v1',name);
    setReady(true);setModal(false);setStatus('Saved on this device');
  }
  async function logout() {
    setBusy(true);setError('');
    try {
      await sync();remember();await request('logout',{});
      active.current=null;setUsername(null);setReady(false);setMode('login');setModal(true);setName('');setPin('');
      // Keep an account-scoped offline cache, but do not expose it to the next sign-in.
      restoreBrowser({});localStorage.removeItem(OWNER);setStatus('Sign in to sync');
    }catch(err:any){setError(err.message);}finally{setBusy(false);}
  }
  function resolveConflict(useRemote:boolean) {
    if(!conflict)return;
    // Preserve the displaced copy locally as well as retaining server revision backups.
    localStorage.setItem(`watchguard-conflict-backup:${conflict.username}`,JSON.stringify(useRemote?snapshotBrowser():conflict.snapshot));
    revision.current=conflict.revision;
    if(useRemote){restoreBrowser(conflict.snapshot);pending.current=false;setGeneration(n=>n+1);setStatus('Saved');}
    else pending.current=true;
    conflicted.current=false;setConflict(null);remember();if(!useRemote)void sync();
  }
  const suggest=()=>{
    const words=['packet','cipher','router','falcon','subnet','copper','signal','firebox'];
    const n=crypto.getRandomValues(new Uint32Array(1))[0];setName(`${words[n%words.length]}_${1000+n%9000}`);
  };
  return <AccountContext.Provider value={{username,status,open:()=>{setError('');setName(username||owner||'');setModal(true);}}}>
    <div inert={modal?true:undefined} key={generation}>{ready?children:<div className="account-welcome"><ShieldCheck size={44}/><h1>WatchGuard Study Lab</h1><p>Your next level starts here.</p></div>}</div>
    {conflict&&<aside className="save-conflict" role="alert"><strong>Two devices have different progress.</strong><p>Choose which copy to use. Both copies are kept as recovery backups.</p><div className="flex gap-3 flex-wrap"><button className="secondary-button" onClick={()=>resolveConflict(true)}>Use saved copy</button><button className="primary-button" onClick={()=>resolveConflict(false)}>Save this device’s copy</button></div></aside>}
    {modal&&<div className="account-overlay"><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-title" className="account-card">
      {ready&&!recovery&&<button className="account-close" aria-label="Close account" onClick={()=>setModal(false)}><X size={20}/></button>}
      <div className="account-emblem"><ShieldCheck size={30}/></div>
      <p className="eyebrow">WATCHGUARD STUDY LAB</p>
      <h1 id="account-title">{recovery?'Keep your recovery code':username?'Your study account':mode==='register'?'Claim your callsign':mode==='recover'?'Get back to your progress':'Welcome back'}</h1>
      {recovery?<>
        <p>This code gets you back in if you forget your PIN. Save it somewhere private; we only show it once.</p>
        <code className="recovery-code">{recovery}</code>
        <button className="secondary-button" onClick={()=>download('study-recovery-code.txt',`WatchGuard Study Lab\nUsername: ${username}\nRecovery code: ${recovery}\nKeep this code private.\n`)}><Download size={16}/> Download recovery code</button>
        <button className="primary-button w-full" onClick={()=>{setRecovery('');setModal(false);}}>I saved it — start studying</button>
      </>:username?<>
        <p className="account-username"><UserRound size={20}/>{username}</p><p>Your quizzes, lab completions, and flashcard progress follow this username. Current status: <strong>{status}</strong>.</p>
        <button className="secondary-button" onClick={()=>download(`study-progress-${username}.json`,JSON.stringify({username,exportedAt:new Date().toISOString(),snapshot:snapshotBrowser()},null,2))}><Download size={16}/> Download my progress</button>
        <button disabled={busy} className="secondary-button" onClick={logout}><LogOut size={16}/> Sign out</button>
      </>:<>
        <p>{mode==='register'?'Choose a username and a six-digit PIN. Your progress will be ready when you come back, even on another device.':mode==='recover'?'Enter your username, recovery code, and a new PIN.':'Your username and PIN bring back your saved progress.'}</p>
        <div className="account-tabs"><button aria-pressed={mode==='register'} onClick={()=>{setMode('register');setError('');}}>New learner</button><button aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('');}}>Sign in</button></div>
        <form onSubmit={submit} className="account-form">
          <label>Username<div className="username-input"><input required autoComplete="username" value={name} maxLength={24} minLength={3} pattern="[a-zA-Z0-9_]{3,24}" onChange={e=>setName(e.target.value)} placeholder="e.g. packet_pilot"/>{mode==='register'&&<button type="button" aria-label="Suggest a callsign" title="Suggest a callsign" onClick={suggest}><Shuffle size={18}/></button>}</div></label>
          {mode==='recover'&&<label>Recovery code<input required autoComplete="off" value={code} onChange={e=>setCode(e.target.value)}/></label>}
          <label>{mode==='recover'?'New six-digit PIN':'Six-digit PIN'}<input required type="password" inputMode="numeric" autoComplete={mode==='login'?'current-password':'new-password'} pattern="[0-9]{6}" minLength={6} maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/></label>
          {mode!=='login'&&<label>Confirm PIN<input required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{6}" minLength={6} maxLength={6} value={confirmation} onChange={e=>setConfirmation(e.target.value.replace(/\D/g,''))}/></label>}
          {mode==='register'&&hasLegacy&&<label className="checkbox-label"><input type="checkbox" checked={bringLocal} onChange={e=>setBringLocal(e.target.checked)}/> Bring my existing browser progress into this account</label>}
          <button disabled={busy} className="primary-button w-full" type="submit"><KeyRound size={17}/>{busy?'One moment…':mode==='register'?'Create my account':mode==='recover'?'Reset PIN':'Sign in'}</button>
        </form>
        <button className="text-button" onClick={()=>{setMode(mode==='recover'?'login':'recover');setError('');}}>{mode==='recover'?'Back to sign in':'Forgot your PIN?'}</button>
        <button className="text-button" onClick={localOnly}>Study on this device only</button>
      </>}
      {error&&<p role="alert" className="account-error">{error}</p>}
    </div></div>}
  </AccountContext.Provider>;
}

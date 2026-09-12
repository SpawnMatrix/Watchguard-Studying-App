import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function releaseProblems(manifest, lock, notes, baseVersion) {
  const errors=[];
  const parse=value=>typeof value==='string'&&/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)?value.split('.').map(Number):null;
  const current=parse(manifest.version),base=baseVersion===undefined?null:parse(baseVersion);
  if(!current)errors.push('Use a numeric major.minor.patch package version.');
  if(lock.version!==manifest.version||lock.packages?.['']?.version!==manifest.version)errors.push('package.json and both root package-lock.json versions must match.');
  if(typeof notes!=='string'||notes.trim().length<50)errors.push(`Add release notes at docs/releases/v${manifest.version}.md.`);
  if(baseVersion!==undefined){
    if(!base)errors.push('The base branch has an invalid version.');
    else if(current){const first=current.findIndex((part,i)=>part!==base[i]);if(first<0||current[first]<base[first])errors.push(`Every PR needs a version greater than ${baseVersion}; found ${manifest.version}.`);}
  }
  return errors;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    const root=fileURLToPath(new URL('../',import.meta.url));
    const read=name=>JSON.parse(readFileSync(new URL(`../${name}`,import.meta.url),'utf8'));
    const manifest=read('package.json'),lock=read('package-lock.json');
    const baseRef=process.argv[2]||'origin/main';
    if(baseRef!=='--current'&&!/^(origin\/main|[a-f0-9]{40})$/.test(baseRef))throw new Error('Expected origin/main, a base commit SHA, or --current.');
    const baseVersion=baseRef==='--current'?undefined:JSON.parse(execFileSync('git',['show',`${baseRef}:package.json`],{cwd:root,encoding:'utf8'})).version;
    let notes='';
    if(/^\d+\.\d+\.\d+$/.test(manifest.version)){try{notes=readFileSync(new URL(`../docs/releases/v${manifest.version}.md`,import.meta.url),'utf8');}catch{/* Report the missing release notes below. */}}
    const errors=releaseProblems(manifest,lock,notes,baseVersion);
    if(errors.length)throw new Error(errors.join('\n'));
    console.log(`Release ${manifest.version}: manifest, lockfile, notes${baseVersion?`, and bump from ${baseVersion}`:''} verified.`);
  }catch(error){console.error(error.message);process.exitCode=1;}
}

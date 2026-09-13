import { describe,expect,it } from 'vitest';
import { releaseProblems } from './check-release.mjs';
describe('per-PR release gate',()=>{
  const notes='This release adds focused topology practice and retains existing saved learner progress.';
  const check=(version:string,base:string,lockVersion=version)=>releaseProblems({version},{version:lockVersion,packages:{'':{version:lockVersion}}},notes,base);
  it('requires a new version for every PR',()=>{expect(check('1.2.0','1.2.0')).not.toEqual([]);expect(check('1.1.9','1.2.0')).not.toEqual([]);});
  it('compares version components numerically',()=>{expect(check('1.10.0','1.9.9')).toEqual([]);expect(check('2.0.0','1.99.99')).toEqual([]);expect(check('1.2.1','1.2.0')).toEqual([]);});
  it('requires matching manifests and release notes',()=>{expect(check('1.2.0','1.1.0','1.1.0')).not.toEqual([]);expect(releaseProblems({version:'1.2.0'},{version:'1.2.0',packages:{'':{version:'1.2.0'}}},'','1.1.0')).not.toEqual([]);});
});

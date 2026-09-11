import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { validateSnapshot, type StudySnapshot } from '../src/account/schema';

const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const hashPin=(pin:string,salt:string)=>new Promise<string>((resolve,reject)=>scrypt(pin,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(err,key)=>err?reject(err):resolve(key.toString('hex'))));
const same=(a:string,b:string)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export const normalizeUsername=(value:unknown)=>typeof value==='string'?value.trim().toLowerCase():'';
export class AccountError extends Error { constructor(public status:number,message:string){super(message);} }
export interface SavedProgress { revision:number; snapshot:StudySnapshot; updatedAt:number }
type UserRow={id:number;username:string;salt:string;pin_hash:string;recovery_hash:string};

export class AccountStore {
  readonly db: DatabaseSync;
  constructor(filename:string) {
    if(filename!==':memory:') mkdirSync(path.dirname(filename),{recursive:true});
    this.db=new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
        salt TEXT NOT NULL, pin_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), expires_at INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);
      CREATE TABLE IF NOT EXISTS progress (account_id INTEGER PRIMARY KEY REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS progress_backups (account_id INTEGER NOT NULL REFERENCES accounts(id), revision INTEGER NOT NULL,
        snapshot TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(account_id,revision));
      CREATE TABLE IF NOT EXISTS auth_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL, window_start INTEGER NOT NULL);
      PRAGMA user_version=1;`);
  }
  close(){this.db.close();}
  private credentials(username:unknown,pin:unknown) {
    const name=normalizeUsername(username);
    if(!/^[a-z0-9_]{3,24}$/.test(name)) throw new AccountError(400,'Use 3–24 letters, numbers, or underscores for your username.');
    if(typeof pin!=='string'||!/^\d{6}$/.test(pin)) throw new AccountError(400,'Use a six-digit PIN.');
    return {name,pin};
  }
  private throttle(name:string) {
    const now=Date.now();
    this.db.prepare('DELETE FROM auth_attempts WHERE window_start < ?').run(now-15*60_000);
    const row=this.db.prepare('SELECT failures FROM auth_attempts WHERE username=?').get(name) as {failures:number}|undefined;
    if(row&&row.failures>=5) throw new AccountError(429,'Too many attempts. Try again in 15 minutes.');
    // Count before asynchronous hashing so concurrent requests cannot bypass the limit.
    this.db.prepare(`INSERT INTO auth_attempts VALUES (?,1,?) ON CONFLICT(username) DO UPDATE SET failures=failures+1`).run(name,now);
  }
  private session(user:Pick<UserRow,'id'|'username'>) {
    const token=randomBytes(32).toString('base64url'),expires=Date.now()+30*24*60*60_000;
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token),user.id,expires);
    return {token,username:user.username,accountId:user.id,...this.progress(user.id)};
  }
  async register(username:unknown,pin:unknown) {
    const c=this.credentials(username,pin);
    const salt=randomBytes(24).toString('hex'), pinHash=await hashPin(c.pin,salt),recoveryCode=randomBytes(18).toString('base64url');
    let id:number;
    try {
      const row=this.db.prepare('INSERT INTO accounts(username,salt,pin_hash,recovery_hash,created_at) VALUES (?,?,?,?,?)').run(c.name,salt,pinHash,digest(recoveryCode),Date.now());
      id=Number(row.lastInsertRowid);
    } catch(err) {
      if(this.db.prepare('SELECT id FROM accounts WHERE username=?').get(c.name)) throw new AccountError(409,'That username is taken. Sign in or choose another.');
      throw err;
    }
    return {...this.session({id,username:c.name}),recoveryCode};
  }
  async login(username:unknown,pin:unknown) {
    const c=this.credentials(username,pin); this.throttle(c.name);
    const user=this.db.prepare('SELECT * FROM accounts WHERE username=?').get(c.name) as UserRow|undefined;
    const hash=await hashPin(c.pin,user?.salt??'unknown-account-dummy-salt');
    if(!user||!same(hash,user.pin_hash)) throw new AccountError(401,'Username or PIN did not match.');
    // A recovery during hashing must invalidate this pre-recovery credential read.
    const current=this.db.prepare('SELECT pin_hash FROM accounts WHERE id=?').get(user.id) as {pin_hash:string};
    if(current.pin_hash!==user.pin_hash) throw new AccountError(401,'Sign in again with your current PIN.');
    this.db.prepare('DELETE FROM auth_attempts WHERE username=?').run(c.name);
    return this.session(user);
  }
  async recover(username:unknown,code:unknown,pin:unknown) {
    const c=this.credentials(username,pin); this.throttle(c.name);
    const user=this.db.prepare('SELECT * FROM accounts WHERE username=?').get(c.name) as UserRow|undefined;
    if(typeof code!=='string'||code.length>100||!user||!same(digest(code.trim()),user.recovery_hash)) throw new AccountError(401,'Username or recovery code did not match.');
    const salt=randomBytes(24).toString('hex'),pinHash=await hashPin(c.pin,salt),recoveryCode=randomBytes(18).toString('base64url');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=this.db.prepare('UPDATE accounts SET salt=?,pin_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').run(salt,pinHash,digest(recoveryCode),user.id,user.recovery_hash);
      if(!result.changes) throw new AccountError(401,'That recovery code has already been used.');
      this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(user.id);
      this.db.prepare('DELETE FROM auth_attempts WHERE username=?').run(c.name);
      this.db.exec('COMMIT');
    } catch(err){this.db.exec('ROLLBACK');throw err;}
    return {...this.session(user),recoveryCode};
  }
  identify(token:string|undefined) {
    if(!token||token.length>100) return undefined;
    return this.db.prepare(`SELECT accounts.id,accounts.username FROM sessions JOIN accounts ON accounts.id=sessions.account_id
      WHERE token_hash=? AND expires_at>?`).get(digest(token),Date.now()) as Pick<UserRow,'id'|'username'>|undefined;
  }
  logout(token:string){this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(token));}
  progress(id:number):SavedProgress {
    const row=this.db.prepare('SELECT revision,snapshot,updated_at FROM progress WHERE account_id=?').get(id) as {revision:number;snapshot:string;updated_at:number}|undefined;
    return row?{revision:row.revision,snapshot:JSON.parse(row.snapshot),updatedAt:row.updated_at}:{revision:0,snapshot:{},updatedAt:0};
  }
  save(id:number,revision:unknown,data:unknown):SavedProgress {
    if(!Number.isSafeInteger(revision)||Number(revision)<0) throw new AccountError(400,'Invalid progress revision.');
    let snapshot:StudySnapshot;
    try{snapshot=validateSnapshot(data);}catch{throw new AccountError(400,'Invalid study progress.');}
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous=this.progress(id);
      if(previous.revision!==revision) throw new AccountError(409,'Newer progress was saved on another device.');
      if(previous.revision) this.db.prepare('INSERT OR REPLACE INTO progress_backups VALUES (?,?,?,?)').run(id,previous.revision,JSON.stringify(previous.snapshot),previous.updatedAt);
      const next={revision:previous.revision+1,snapshot,updatedAt:Date.now()};
      this.db.prepare(`INSERT INTO progress VALUES (?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision,snapshot=excluded.snapshot,updated_at=excluded.updated_at`).run(id,next.revision,JSON.stringify(snapshot),next.updatedAt);
      // Keep the most recent 20 revisions for recovery without unbounded database growth.
      this.db.prepare('DELETE FROM progress_backups WHERE account_id=? AND revision<?').run(id,next.revision-20);
      this.db.exec('COMMIT');return next;
    } catch(err){this.db.exec('ROLLBACK');throw err;}
  }
}

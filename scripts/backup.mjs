// Usage: node scripts/backup.mjs /absolute/path/to/study-backup.sqlite
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { existsSync } from 'node:fs';
const output=process.argv[2];
if(!output||existsSync(output))throw new Error('Provide a new backup filename; existing files are never overwritten.');
const source=path.resolve(process.env.DATA_DIR||'data','study.sqlite');
if(!existsSync(source))throw new Error('Study database not found in DATA_DIR.');
const db=new DatabaseSync(source);try{db.prepare('VACUUM INTO ?').run(path.resolve(output));console.log('Consistent SQLite backup saved.');}finally{db.close();}

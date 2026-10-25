import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
export class Store {
  constructor(dir) { this.dir=dir; this.file=path.join(dir,'archive.json'); this.queue=Promise.resolve(); }
  async read() {
    await mkdir(this.dir,{recursive:true});
    try { const d=JSON.parse(await readFile(this.file,'utf8')); if(d.version!==1||!Array.isArray(d.items)) throw new Error('Invalid archive format'); return d; }
    catch(e) { if(e.code==='ENOENT') return {version:1,items:[]}; throw new Error('Archive cannot be read. Restore a validated backup before continuing.'); }
  }
  transact(fn) { const op=this.queue.then(async()=> { const d=await this.read(); const result=await fn(d); await writeFile(this.file+'.tmp',JSON.stringify(d,null,2),{mode:0o600}); try {await copyFile(this.file,this.file+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;} await rename(this.file+'.tmp',this.file); return result; }); this.queue=op.catch(()=>{}); return op; }
}

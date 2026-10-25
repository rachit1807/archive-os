import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {Store} from './storage.js';
import {transition} from './lifecycle.js';
import {pool,PostgresStore,initialize} from './postgres.js';
import {session,accountAction,logout} from './auth.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const localStore=new Store(process.env.DATA_DIR||path.join(root,'data'));
const categories=['Books','Technology','Collectibles','Games','Other'];
function validate(b) {
 if(!b||typeof b!=='object'||Array.isArray(b))throw Error('Expected an item object');
 const text=(key,max,required=false)=>{const v=b[key]??'';if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw Error(`Invalid ${key}`);return v.trim();};
 const item={name:text('name',100,true),category:text('category',30,true),description:text('description',1500),location:text('location',100),tags:text('tags',200),condition:text('condition',30)||'Excellent',value:Number(b.value??0),borrower:text('borrower',100),due:text('due',10),favorite:Boolean(b.favorite)};
 if(!categories.includes(item.category)||!['Excellent','Good','Fair','Needs care'].includes(item.condition)||!Number.isFinite(item.value)||item.value<0||item.value>1e9)throw Error('Invalid category, condition, or value');
 if(item.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(item.due)||Number.isNaN(Date.parse(item.due))||new Date(item.due).toISOString().slice(0,10)!==item.due))throw Error('Invalid return date');
 if(item.due&&!item.borrower)throw Error('Enter a borrower for the return date');return item;
}
async function body(req){let s='';for await(const c of req){s+=c;if(Buffer.byteLength(s)>1e6)throw Error('Request is too large');}try{return JSON.parse(s);}catch{throw Error('Invalid JSON');}}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 try {
 const url=new URL(req.url,'http://localhost');const api=url.pathname.startsWith('/api/');
 if(api){
 if(process.env.ARCHIVE_PASSWORD){const expected=Buffer.from('Basic '+Buffer.from('archive:'+process.env.ARCHIVE_PASSWORD).toString('base64'));const actual=Buffer.from(req.headers.authorization||'');if(actual.length!==expected.length||!timingSafeEqual(actual,expected)){res.setHeader('WWW-Authenticate','Basic realm="ArchiveOS", charset="UTF-8"');return send(401,{error:'Authentication required'});}}
 if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return send(403,{error:'Origin rejected'});
 if(url.pathname==='/api/health'){if(pool)await initialize();return send(200,{status:'ok',storage:pool?'postgresql':'file'});}
 if(url.pathname==='/api/auth/me'&&req.method==='GET'){const user=pool?await session(req):null;return send(200,{required:Boolean(pool),user:user?{email:user.email}:null});}
 if(pool&&['/api/auth/register','/api/auth/login'].includes(url.pathname)&&req.method==='POST')return send(200,await accountAction(req,res,url.pathname.split('/').pop(),await body(req)));
 if(pool&&url.pathname==='/api/auth/logout'&&req.method==='POST'){await logout(req,res);return send(200,{ok:true});}
 const user=pool?await session(req):null;if(pool&&!user)return send(401,{error:'Sign in to access your private vault.'});
 const store=pool?new PostgresStore(user.id):localStore;
 if(url.pathname==='/api/items'&&req.method==='GET')return send(200,await store.read());
 if(url.pathname==='/api/items'&&req.method==='POST'){const b=validate(await body(req));const item={...b,id:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),history:[{action:'Cataloged',at:new Date().toISOString(),location:b.location,condition:b.condition}]};await store.transact(d=>d.items.unshift(item));return send(201,item);}
 if(url.pathname==='/api/import'&&req.method==='POST'){const b=await body(req);if(b.version!==1||!Array.isArray(b.items)||b.items.length>5000)throw Error('Choose an ArchiveOS export with at most 5,000 items');const items=b.items.map(x=>({...validate(x),id:randomUUID(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),history:[]}));await store.transact(d=>d.items.push(...items));return send(200,{imported:items.length});}
 const actionRoute=url.pathname.match(/^\/api\/items\/([\w-]+)\/actions$/);
 if(actionRoute&&req.method==='POST'){const input=await body(req);const result=await store.transact(d=>{const i=d.items.findIndex(x=>x.id===actionRoute[1]);if(i<0){const e=Error('Object not found');e.status=404;throw e;}return d.items[i]=transition(d.items[i],input);});return send(200,result);}
 const m=url.pathname.match(/^\/api\/items\/([\w-]+)$/);
 if(m&&['PUT','DELETE'].includes(req.method)){const b=req.method==='PUT'?validate(await body(req)):null;const result=await store.transact(d=>{const i=d.items.findIndex(x=>x.id===m[1]);if(i<0){const e=Error('Item not found');e.status=404;throw e;}if(!b)return d.items.splice(i,1)[0];const old=d.items[i];if(['borrower','due','location','condition'].some(k=>old[k]!==b[k])){const e=Error('Use the object action to change custody, location, or condition');e.status=409;throw e;}const history=[...(old.history||[])];if(old.borrower!==b.borrower)history.push({borrower:old.borrower||b.borrower,action:b.borrower?'Lent':'Returned',at:new Date().toISOString()});return d.items[i]={...old,...b,history,updatedAt:new Date().toISOString()};});return send(200,result);}
 return send(404,{error:'Endpoint not found'});
 }
 if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Method not allowed'});
 const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!['index.html','style.css','app.js','favicon.svg'].includes(file))return send(404,{error:'Not found'});
 const data=await readFile(path.join(root,'public',file));res.writeHead(200,{'Content-Type':({'html':'text/html','css':'text/css','js':'text/javascript','svg':'image/svg+xml'})[file.split('.').pop()]});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){const internal=Boolean(e.code)||e.message.includes('connect')||e.message.includes('timeout');if(internal)console.error('Request failed:',e.code||'connection error');send(e.status||(internal||e.message.includes('Archive cannot')?503:400),{error:internal?'Storage is temporarily unavailable. Please retry.':e.message});}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('ArchiveOS running at http://localhost:'+(process.env.PORT||3000)));

process.on('SIGTERM',()=>{server.close(async()=>{if(pool)await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),25000).unref();});

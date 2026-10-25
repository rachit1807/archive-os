import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
test('object journey persists catalog, location, loan, return and inspection with guarded transitions',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'archive-api-'));process.env.DATA_DIR=dir;const {server}=await import('../server.js');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const request=async(route,method='GET',data)=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json()};};
 try{
 assert.equal((await request('/api/items','POST',{name:''})).status,400);
 const created=await request('/api/items','POST',{name:'Test book',category:'Books',condition:'Good',value:500});assert.equal(created.status,201);const route='/api/items/'+created.data.id;
 assert.equal(created.data.history[0].action,'Cataloged');
 assert.equal((await request(route+'/actions','POST',{action:'Lent',borrower:'Reader',due:'2027-01-01'})).status,400);
 assert.equal((await request(route+'/actions','POST',{action:'Located',location:'Library / Shelf A'})).status,200);
 assert.equal((await request(route+'/actions','POST',{action:'Lent',borrower:'Reader',due:'2027-02-30'})).status,400);
 const lent=await request(route+'/actions','POST',{action:'Lent',borrower:'Reader',due:'2027-01-01'});assert.equal(lent.data.borrower,'Reader');
 assert.equal((await request(route,'PUT',{...lent.data,borrower:'',due:''})).status,409);
 assert.equal((await request(route+'/actions','POST',{action:'Lent',borrower:'Another reader',due:'2027-01-02'})).status,400);
 assert.equal((await request(route+'/actions','POST',{action:'Inspected',condition:'Fair'})).status,400);
 const returned=await request(route+'/actions','POST',{action:'Returned',condition:'Needs care',location:'Repair shelf',note:'Cover damaged'});assert.equal(returned.data.borrower,'');assert.equal(returned.data.location,'Repair shelf');
 assert.equal((await request(route+'/actions','POST',{action:'Returned',condition:'Good',location:'Shelf'})).status,400);
 assert.equal((await request(route+'/actions','POST',{action:'Lent',borrower:'Reader',due:'2027-01-01'})).status,400);
 const inspected=await request(route+'/actions','POST',{action:'Inspected',condition:'Good',note:'Cover repaired'});assert.deepEqual(inspected.data.history.map(h=>h.action),['Cataloged','Located','Lent','Returned','Inspected']);assert.equal(inspected.data.history[3].note,'Cover damaged');
 const persisted=(await request('/api/items')).data.items[0];assert.equal(persisted.condition,'Good');assert.equal(persisted.history.length,5);
 assert.equal((await request(route,'PUT',{...persisted,name:'Corrected title'})).status,200);
 assert.equal((await request(route,'DELETE')).status,200);assert.equal((await request('/api/items')).data.items.length,0);assert.equal((await request(route+'/actions','POST',{action:'Inspected',condition:'Good'})).status,404);
 }finally{await new Promise(r=>server.close(r));await rm(dir,{recursive:true});}
});

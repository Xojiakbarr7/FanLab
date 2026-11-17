import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('registration, isolation, logout, static assets and restart persistence',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'fanlab-'));let child;
 const port=33179,base=`http://127.0.0.1:${port}`;
 async function start(){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,NODE_ENV:'test',DATABASE_URL:'',PORT:String(port),SQLITE_PATH:join(dir,'db.sqlite')},stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{child.stdout.on('data',d=>{if(d.toString().includes('listening'))resolve()});child.once('exit',code=>reject(Error('Server exited '+code)));child.once('error',reject)})}
 async function stop(){const p=child;child=null;await new Promise(resolve=>{p.once('exit',resolve);p.kill()})}
 const get=(path,cookie)=>fetch(base+path,{headers:cookie?{cookie}:{},redirect:'manual'});
 const post=(path,data,cookie,origin)=>fetch(base+path,{method:'POST',body:new URLSearchParams(data),headers:{...(cookie?{cookie}:{}),...(origin?{origin}:{})},redirect:'manual'});
 try{
  await start();assert.equal((await get('/')).status,303);
  let r=await post('/api/register',{name:'Test <b>',grade:'Talaba',email:'user@example.com',password:'test-password'});assert.equal(r.status,303);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);
  let html=await(await get('/',cookie)).text();assert.match(html,/Test &lt;b&gt;/);assert.match(html,/FANLAB_STORAGE_PREFIX/);
  assert.equal((await post('/api/register',{name:'Test',grade:'Talaba',email:'user@example.com',password:'test-password'})).status,409);
  assert.equal((await post('/api/login',{email:'user@example.com',password:'wrong-password'})).status,401);
  assert.equal((await post('/logout',{},cookie,'https://attacker.example')).status,403);
  const experiments=await(await get('/experiments.html',cookie)).text();assert.match(experiments,/experiments.js/);
  for(const file of ['lab3d.js','experiment-world.js','software-renderer.js','circuit-model.js','experiments.js','vendor/three.module.min.js','vendor/OrbitControls.js','assets/spring.png','assets/refraction.png'])assert.equal((await get('/'+file)).status,200,file);
  assert.equal((await get('/profile')).status,303);
  assert.equal((await get('/profile',cookie)).status,200);
  assert.equal((await post('/api/profile',{name:'Changed',grade:'9-sinf',image:'data:image/jpeg;base64,bm90YW5pbWFnZQ=='},cookie)).status,400);
  assert.equal((await post('/api/profile',{name:'Changed',grade:'9-sinf'},cookie,'https://attacker.example')).status,403);
  assert.equal((await post('/api/profile',{name:'Changed',grade:'9-sinf'},cookie)).status,303);
  assert.match(await(await get('/profile',cookie)).text(),/Changed/);
  await stop();await start();assert.match(await(await get('/profile',cookie)).text(),/Changed/);assert.equal((await get('/',cookie)).status,200);
  await post('/logout',{},cookie);assert.equal((await get('/',cookie)).status,303);
  r=await post('/api/login',{email:'USER@example.com',password:'test-password'});assert.equal(r.status,303);
  const bytes=await readFile(join(dir,'db.sqlite'));assert.equal(bytes.includes(Buffer.from('test-password')),false);
 }finally{if(child)await stop();await rm(dir,{recursive:true,force:true})}
});

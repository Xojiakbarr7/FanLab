import {Miniflare} from 'miniflare';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('dist/server');
async function walk(dir){let files=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())files.push(...await walk(p));else if(p.endsWith('.js'))files.push({type:'ESModule',path:p,contents:await readFile(p,'utf8')})}return files}
const modules=await walk(root);modules.sort((a,b)=>a.path===join(root,'index.js')?-1:b.path===join(root,'index.js')?1:0);
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');await db.prepare(await readFile('drizzle/0000_spooky_silver_surfer.sql','utf8')).run();
 const auth={'oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.test'};
 const call=(path,options={})=>mf.dispatchFetch('http://test.local'+path,{redirect:'manual',...options});
 let r=await call('/');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login');
 r=await call('/',{headers:auth});assert.equal(r.headers.get('location'),'/register');
 r=await call('/register',{headers:auth});assert.equal(r.status,200);assert.match(await r.text(),/name="name"/);
 const opts={method:'POST',headers:{...auth,origin:'http://test.local','content-type':'application/x-www-form-urlencoded'},body:'name=Sinov&grade=7-sinf'};
 r=await call('/api/register',{...opts,headers:{...opts.headers,origin:'https://wrong.test'}});assert.equal(r.status,403);
 r=await call('/api/register',{...opts,body:'name=X&grade=invalid'});assert.equal(r.headers.get('location'),'/register?error=validation');
 r=await call('/api/register',opts);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/');
 r=await call('/',{headers:auth});assert.equal(r.status,200);assert.match(await r.text(),/Salom, Sinov!/);
 r=await call('/experiments.html');assert.equal(r.status,303);
 r=await call('/experiments.html',{headers:auth});assert.equal(r.status,200);assert.match(await r.text(),/FANLAB_STORAGE_PREFIX/);
 r=await call('/register',{headers:auth});assert.equal(r.headers.get('location'),'/');
 r=await call('/api/register',opts);assert.equal(r.status,303);
 const rows=await db.prepare('SELECT * FROM profiles').all();assert.equal(rows.results.length,1);
 console.log('PASS: auth gates, registration validation, CSRF, persisted profile, home redirect, returning user, protected labs, duplicate submission');
}finally{await mf.dispose()}

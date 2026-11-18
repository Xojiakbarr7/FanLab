import http from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import {randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback), root=import.meta.dirname;
const production=process.env.NODE_ENV==='production';
if(production&&!process.env.DATABASE_URL)throw Error('DATABASE_URL is required in production');
let query;
if(process.env.DATABASE_URL){
 const {Pool}=await import('pg'); const pool=new Pool({connectionString:process.env.DATABASE_URL});
 query=async(sql,args=[])=> (await pool.query(sql,args)).rows;
}else{
 const {DatabaseSync}=await import('node:sqlite');
 await mkdir(resolve(root,'data'),{recursive:true});
 const db=new DatabaseSync(process.env.SQLITE_PATH||resolve(root,'data/fanlab.sqlite'));
 query=async(sql,args=[])=>{const stmt=db.prepare(sql.replace(/\$\d+/g,'?'));return stmt.columns().length?stmt.all(...args):(stmt.run(...args),[])};
}
await query('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,grade TEXT NOT NULL,password_hash TEXT NOT NULL)');
await query('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at BIGINT NOT NULL)');
await query('CREATE TABLE IF NOT EXISTS avatars (user_id TEXT PRIMARY KEY REFERENCES users(id), image TEXT NOT NULL)');
await query('CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at)');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grades=['5-sinf','6-sinf','7-sinf','8-sinf','9-sinf','10-sinf','11-sinf','Talaba','Mustaqil o‘rganuvchi'];
const hashToken=t=>createHash('sha256').update(t).digest('hex');
function cookie(req){return /(?:^|;\s*)fanlab_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1]}
async function userFor(req){const t=cookie(req);if(!t)return null;return (await query('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE token_hash=$1 AND expires_at>$2',[hashToken(t),Date.now()]))[0]||null}
function send(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN',...headers});res.end(body)}
function redirect(res,to,headers={}){send(res,303,'',{Location:to,...headers})}
function authPage(register,error=''){
 const form=`<form method="post" action="/api/${register?'register':'login'}">${register?'<label for="name">Ismingiz</label><input id="name" name="name" required minlength="2" maxlength="60" autocomplete="given-name">':''}<label for="email">Email</label><input id="email" name="email" type="email" maxlength="254" required autocomplete="email"><label for="password">Parol</label><input id="password" name="password" type="password" minlength="8" maxlength="128" required autocomplete="${register?'new-password':'current-password'}">${register?`<label for="grade">Ta’lim bosqichi</label><select id="grade" name="grade" required><option value="">Tanlang</option>${grades.map(g=>`<option>${g}</option>`).join('')}</select>`:''}<button class="submit">${register?'Ro‘yxatdan o‘tish va boshlash →':'Kirish →'}</button></form>`;
 return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${register?'Ro‘yxatdan o‘tish':'Kirish'} · FanLab Uz</title><link rel="stylesheet" href="/auth.css"></head><body><main class="auth-shell"><section class="auth-story"><a href="/" class="brand">◈ FanLab <span>Uz</span></a><p class="eyebrow">QIZIQISHDAN KASHFIYOT SARI</p><h1>Birinchi kashfiyotingiz<br>shu yerdan boshlanadi.</h1><p>Fizika qonunlarini 3D laboratoriyada sinab ko‘ring.</p><img src="/assets/lab-hero.png" alt="Laboratoriya"><div class="features"><span>5 ta 3D laboratoriya</span><span>O‘zbek tilida</span></div></section><section class="auth-form"><h2>${register?'Ro‘yxatdan o‘tish':'Yana xush kelibsiz!'}</h2><p>Email va parolingiz bilan ${register?'hisob yarating':'kiring'}.</p>${error?`<p class="error" role="alert">${escape(error)}</p>`:''}${form}<p class="switch">${register?'Hisobingiz bormi? <a href="/login">Kirish</a>':'Yangi foydalanuvchimisiz? <a href="/register">Ro‘yxatdan o‘tish</a>'}</p></section></main></body></html>`;
}
async function newSession(res,user){
 const token=randomBytes(32).toString('hex');
 await query('DELETE FROM sessions WHERE expires_at<$1',[Date.now()]);
 await query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hashToken(token),user.id,Date.now()+30*86400000]);
 redirect(res,'/',{'Set-Cookie':`fanlab_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${production?'; Secure':''}`});
}
const attempts=new Map();
setInterval(()=>{for(const [key,value] of attempts)if(value.until<Date.now())attempts.delete(key)},60000).unref();
async function body(req, maximum=16384){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>maximum)throw Object.assign(Error('Too large'),{status:413})}return new URLSearchParams(raw)}
const mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.txt':'text/plain'};
export const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'), path=decodeURIComponent(url.pathname);
 if(path==='/healthz'){await query('SELECT 1');return send(res,200,'ok',{'Content-Type':'text/plain'})}
 if(req.method==='POST'){
  // Reject cross-origin form submissions, including logout.
  if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,'So‘rov manbasi noto‘g‘ri.');
  if(path==='/logout'){
   const t=cookie(req);if(t)await query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(t)]);
   return redirect(res,'/login',{'Set-Cookie':`fanlab_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${production?'; Secure':''}`});
  }
  if(path==='/api/profile'){
   const user=await userFor(req);if(!user)return redirect(res,'/login');
   const data=await body(req,800000),name=(data.get('name')||'').trim(),grade=data.get('grade'),image=data.get('image');
   if(name.length<2||name.length>60||!grades.includes(grade))return send(res,400,'Ism yoki ta’lim bosqichi noto‘g‘ri.');
   if(image && (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>700000||!Buffer.from(image.split(',')[1],'base64').subarray(0,3).equals(Buffer.from([255,216,255]))))return send(res,400,'Rasm formati noto‘g‘ri.');
   await query('UPDATE users SET name=$1,grade=$2 WHERE id=$3',[name,grade,user.id]);
   if(data.get('remove')==='1')await query('DELETE FROM avatars WHERE user_id=$1',[user.id]);
   else if(image)await query('INSERT INTO avatars(user_id,image) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET image=excluded.image',[user.id,image]);
   return redirect(res,'/profile?saved=1');
  }
  if(!['/api/register','/api/login'].includes(path))return send(res,404,'Topilmadi');
  const key=req.socket.remoteAddress;const limit=attempts.get(key)||{count:0,until:Date.now()+900000};
  if(limit.until<Date.now()){limit.count=0;limit.until=Date.now()+900000}limit.count++;attempts.set(key,limit);
  if(limit.count>30)return send(res,429,'Juda ko‘p urinish. 15 daqiqadan so‘ng takrorlang.');
  const data=await body(req), email=(data.get('email')||'').trim().toLowerCase(),password=data.get('password')||'',register=path==='/api/register';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<8||password.length>128)return send(res,400,authPage(register,'Emailni tekshiring. Parol 8–128 ta belgidan iborat bo‘lsin.'));
  if(register){
   const name=(data.get('name')||'').trim(),grade=data.get('grade');
   if(name.length<2||name.length>60||!grades.includes(grade))return send(res,400,authPage(true,'Ismingiz va ta’lim bosqichini to‘g‘ri kiriting.'));
   const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
   const user={id:randomBytes(16).toString('hex')};
   try{await query('INSERT INTO users(id,email,name,grade,password_hash) VALUES($1,$2,$3,$4,$5)',[user.id,email,name,grade,`${salt}:${hash}`])}catch(e){if(e.code==='23505'||e.code==='ERR_SQLITE_ERROR'&&e.message.includes('UNIQUE'))return send(res,409,authPage(true,'Bu email allaqachon ro‘yxatdan o‘tgan. Kirish sahifasidan foydalaning.'));throw e}
   return await newSession(res,user);
  }
  const user=(await query('SELECT * FROM users WHERE email=$1',[email]))[0];
  const [salt,expected]=(user?.password_hash||`${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const actual=await scrypt(password,salt,64);
  if(!timingSafeEqual(actual,Buffer.from(expected,'hex'))||!user)return send(res,401,authPage(false,'Email yoki parol noto‘g‘ri.'));
  return await newSession(res,user);
 }
 if(!['GET','HEAD'].includes(req.method))return send(res,405,'Ruxsat etilmagan');
 if(path==='/avatar'){
  const user=await userFor(req);if(!user)return send(res,401,'');
  const row=(await query('SELECT image FROM avatars WHERE user_id=$1',[user.id]))[0];
  if(!row)return send(res,404,'');
  return send(res,200,Buffer.from(row.image.split(',')[1],'base64'),{'Content-Type':'image/jpeg','Vary':'Cookie'});
 }
 if(path==='/profile'){
  const user=await userFor(req);if(!user)return redirect(res,'/login');
  return send(res,200,`<!doctype html><html lang="uz"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profil · FanLab</title><link rel="stylesheet" href="/profile.css"><link rel="stylesheet" href="/polish.css"><main><a href="/">← FanLab bosh sahifa</a><h1>Mening profilim</h1><p>O‘zingiz haqingizdagi ma’lumotlarni yangilang.</p>${url.searchParams.has('saved')?'<p role="status">O‘zgarishlar saqlandi ✓</p>':''}<form method="post" action="/api/profile"><div class="portrait"><img id="preview" src="/avatar" alt="Profil rasmi" onerror="this.style.visibility='hidden'"></div><label>Profil rasmini tanlash<input id="photo" type="file" accept="image/jpeg,image/png,image/webp"></label><p>JPG, PNG yoki WebP · 5 MB gacha</p><input type="hidden" name="image" id="image"><label><input type="checkbox" name="remove" value="1"> Rasmni olib tashlash</label><label>Ismingiz<input name="name" value="${escape(user.name)}" minlength="2" maxlength="60" required></label><label>Email<input value="${escape(user.email)}" disabled></label><label>Ta’lim bosqichi<select name="grade">${grades.map(g=>`<option ${g===user.grade?'selected':''}>${g}</option>`).join('')}</select></label><p id="error" role="alert"></p><button id="save">Saqlash</button></form><script src="/profile.js"></script></main></html>`);
 }
 if(['/login','/register'].includes(path)){if(await userFor(req))return redirect(res,'/');return send(res,200,authPage(path==='/register'))}
 if(['/','/index.html','/experiments.html'].includes(path)){
  const user=await userFor(req);if(!user)return redirect(res,'/login');
  let html=await readFile(resolve(root,'legacy',path==='/experiments.html'?'experiments.html':'index.html'),'utf8');
  const prefix=JSON.stringify(`fanlab:${user.id}:`).replace(/</g,'\\u003c');
  const script=`<script>window.FANLAB_STORAGE_PREFIX=${prefix}</script>`;
  html=html.includes('</head>')?html.replace('</head>',script+'</head>'):html.replace('<title>',script+'<title>');
  html=html.replace('Salom, izlanuvchi!',`Salom, ${escape(user.name)}!`).replace('Yosh izlanuvchi',escape(user.grade)).replace('Xush kelibsiz!',escape(user.name));
  const bar=`<div style="display:flex;gap:16px;align-items:center;justify-content:flex-end;padding:10px 20px;background:#fff;color:#244e61;font:13px system-ui"><a href="/profile" style="color:#10183d;font-weight:700">${escape(user.name)} · Profil</a><form method="post" action="/logout"><button style="cursor:pointer;padding:7px 12px">Hisobdan chiqish ↗</button></form></div>`;
  if(path==='/experiments.html') html=html.includes('<body>')?html.replace('<body>','<body>'+bar):html.replace('<main>',bar+'<main>');
  return send(res,200,html,{'Vary':'Cookie'});
 }
 const file=resolve(root,'public','.'+path);
 if(!file.startsWith(resolve(root,'public')+'/'))return send(res,404,'Topilmadi');
 try{const bytes=await readFile(file);return send(res,200,bytes,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'public, max-age=3600'})}catch(e){if(['ENOENT','EISDIR'].includes(e.code))return send(res,404,'Topilmadi');throw e}
}catch(e){console.error('Request failed:',e.code||e.name);send(res,e.status||500,'Server xatosi. Keyinroq qayta urinib ko‘ring.')}});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('FanLab listening on port '+(process.env.PORT||3000)));

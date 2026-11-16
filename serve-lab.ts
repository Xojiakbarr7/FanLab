import {currentProfile,chatGPTSignInPath} from './profile';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export async function serveLab(html:string){
 const {user,profile}=await currentProfile();
 if(!user)return new Response(null,{status:303,headers:{Location:'/login','Cache-Control':'no-store'}});
 if(!profile)return new Response(null,{status:303,headers:{Location:'/register','Cache-Control':'no-store'}});
 const prefix=JSON.stringify('fanlab:'+user.userId+':').replace(/</g,'\\u003c');
 html=html.replace('</head>',`<script>window.FANLAB_STORAGE_PREFIX=${prefix}</script></head>`);
 // The catalog does not contain an explicit head element.
 if(!html.includes('window.FANLAB_STORAGE_PREFIX'))html=html.replace('<title>',`<script>window.FANLAB_STORAGE_PREFIX=${prefix}</script><title>`);
 html=html.replace('Salom, izlanuvchi!',`Salom, ${escape(profile.name)}!`).replace('Yosh izlanuvchi',escape(profile.grade)).replace('Xush kelibsiz!',escape(profile.name));
 html=html.replaceAll('Google orqali kirish hali ulanmagan. Qaydlar hozir shu brauzerda saqlanadi.','Profilingiz hisobingizga saqlandi. Tajriba qaydlari shu brauzerda saqlanadi.');
 const account=`<div class="account-bar" style="display:flex;gap:16px;align-items:center;justify-content:flex-end;padding:10px 20px;font:13px system-ui;color:#244e61;background:#e7f3f3"><span>${escape(profile.name)}</span><a href="/signout-with-chatgpt?return_to=%2Flogin" target="_top" style="color:inherit">Hisobdan chiqish ↗</a></div>`;
 html=html.includes('<body>')?html.replace('<body>','<body>'+account):html.replace('<main>',account+'<main>');
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
}

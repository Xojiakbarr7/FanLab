import {redirect} from 'next/navigation';
import {currentProfile,chatGPTSignInPath} from '../profile';
export const dynamic='force-dynamic';
export default async function Login(){const {user,profile}=await currentProfile();if(profile)redirect('/');if(user)redirect('/register');return <main className="login-wrap"><section className="auth-form login-card"><a className="brand" href="/register">◈ FanLab <span>Uz</span></a><h1>Yana xush kelibsiz!</h1><p>Hisobingizga kiring va tajribalarni davom ettiring.</p><a className="submit" href={chatGPTSignInPath('/')} target="_top">ChatGPT orqali kirish ↗</a><p className="switch">Yangi foydalanuvchimisiz? <a href="/register">Ro‘yxatdan o‘tish</a></p><p className="hint">Google orqali kirish hali ulanmagan.</p></section></main>}

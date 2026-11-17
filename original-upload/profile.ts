import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
import {getDb} from '../db';
import {profiles} from '../db/schema';
import {eq} from 'drizzle-orm';
export async function currentProfile(){
 const user=await getChatGPTUser();
 if(!user)return {user:null,profile:null};
 const profile=await getDb().select().from(profiles).where(eq(profiles.userId,user.userId)).get();
 return {user,profile:profile??null};
}
export {chatGPTSignInPath};

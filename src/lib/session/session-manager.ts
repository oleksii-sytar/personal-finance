import { createClient } from '@/lib/supabase/client'
import type { User,Session } from '@supabase/supabase-js'
interface SessionState { user:User|null;session:Session|null;lastValidated:Date|null;isValid:boolean }
export class SessionManager {
  private state:SessionState={user:null,session:null,lastValidated:null,isValid:false}
  setSession(session:Session|null){this.state={user:session?.user || null,session,lastValidated:new Date(),isValid:!!session}}
  async validateSession(){try{const {data,error}=await createClient().auth.getSession();if(error)return false;this.setSession(data.session);return !!data.session}catch{return false}}
  getState(){return {...this.state}}
  isSessionValid(){return this.state.isValid}
  getCurrentUser(){return this.state.user}
  getCurrentSession(){return this.state.session}
  isValidationRecent(){return !!this.state.lastValidated && Date.now()-this.state.lastValidated.getTime()<300000}
  async refreshSessionIfNeeded(){return this.isValidationRecent()?this.state.isValid:this.validateSession()}
  clearSession(){this.setSession(null)}
}
export const sessionManager=new SessionManager()
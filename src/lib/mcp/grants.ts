type GrantAuth={oauth:{revokeGrant:(options:{clientId:string})=>Promise<{error:unknown}>}}
export async function revokeNativeGrant(auth:GrantAuth,clientId:string):Promise<boolean>{
 try{const result=await auth.oauth.revokeGrant({clientId});return !result.error}catch{return false}
}
const base=()=>process.env.SUPABASE_URL;
const serviceKey=()=>process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function adminFetch(path,options={}){
  if(!base()||!serviceKey())throw new Error('Supabase server credentials are missing');
  return fetch(`${base()}/rest/v1/${path}`,{...options,headers:{apikey:serviceKey(),Authorization:`Bearer ${serviceKey()}`,'Content-Type':'application/json',...(options.headers||{})}});
}

export async function authenticatedUser(request){
  const token=(request.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token||!base()||!process.env.SUPABASE_ANON_KEY)return null;
  const response=await fetch(`${base()}/auth/v1/user`,{headers:{apikey:process.env.SUPABASE_ANON_KEY,Authorization:`Bearer ${token}`}});
  return response.ok?response.json():null;
}

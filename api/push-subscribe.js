import {adminFetch,authenticatedUser} from './_supabase.js';

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Método não permitido'});
  try{
    const user=await authenticatedUser(request);if(!user)return response.status(401).json({error:'Faça login novamente.'});
    const profileResponse=await adminFetch(`perfis?id=eq.${encodeURIComponent(user.id)}&select=perfil,ativo`);
    const [profile]=await profileResponse.json();
    if(!profile?.ativo||!['pastor','admin','secretaria'].includes(profile.perfil))return response.status(403).json({error:'Acesso permitido somente à administração.'});
    const subscription=request.body;
    if(!subscription?.endpoint||!subscription?.keys?.p256dh||!subscription?.keys?.auth)return response.status(400).json({error:'Inscrição inválida.'});
    const save=await adminFetch('push_subscriptions?on_conflict=endpoint',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:user.id,endpoint:subscription.endpoint,p256dh:subscription.keys.p256dh,auth_key:subscription.keys.auth,ativo:true,atualizado_em:new Date().toISOString()})});
    if(!save.ok)throw new Error(await save.text());
    return response.status(200).json({success:true});
  }catch(error){return response.status(500).json({error:'Não foi possível ativar as notificações.',detail:String(error.message||error)})}
}

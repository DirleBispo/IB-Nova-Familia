import webpush from 'web-push';
import {adminFetch,authenticatedUser} from './_supabase.js';

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Método não permitido'});
  try{
    const user=await authenticatedUser(request);
    if(!user)return response.status(401).json({error:'Entre novamente na plataforma.'});
    const profileResponse=await adminFetch(`perfis?id=eq.${encodeURIComponent(user.id)}&select=perfil,ativo&limit=1`);
    if(!profileResponse.ok)throw new Error(await profileResponse.text());
    const [profile]=await profileResponse.json();
    if(!profile?.ativo||!['pastor','admin','secretaria'].includes(profile.perfil))return response.status(403).json({error:'Apenas a administração pode fazer este teste.'});
    if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw new Error('O servidor de notificações ainda não está configurado.');
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:contato@ibnovafamilia.com.br',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
    const subscriptionsResponse=await adminFetch(`push_subscriptions?user_id=eq.${encodeURIComponent(user.id)}&ativo=eq.true&select=id,endpoint,p256dh,auth_key`);
    if(!subscriptionsResponse.ok)throw new Error(await subscriptionsResponse.text());
    const subscriptions=await subscriptionsResponse.json();
    if(!subscriptions.length)return response.status(409).json({error:'Este celular ainda não está registrado. Toque primeiro em “Ativar notificações”.'});
    const payload=JSON.stringify({title:'Teste | IB Nova Família',body:'Teste de aniversário pronto. Toque para compartilhar a mensagem no grupo da igreja.',tag:`teste-aniversario-${Date.now()}`,url:'/?view=aniversariantes&testGroup=1'});
    let sent=0;
    await Promise.all(subscriptions.map(async item=>{
      try{await webpush.sendNotification({endpoint:item.endpoint,keys:{p256dh:item.p256dh,auth:item.auth_key}},payload);sent++}
      catch(error){if(error.statusCode===404||error.statusCode===410)await adminFetch(`push_subscriptions?id=eq.${item.id}`,{method:'PATCH',body:JSON.stringify({ativo:false,atualizado_em:new Date().toISOString()})})}
    }));
    if(!sent)return response.status(502).json({error:'A notificação não chegou ao serviço do celular. Atualize a ativação e tente novamente.'});
    return response.status(200).json({success:true,sent});
  }catch(error){return response.status(500).json({error:String(error.message||error)})}
}

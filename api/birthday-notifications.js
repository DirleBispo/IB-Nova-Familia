import webpush from 'web-push';
import {adminFetch} from './_supabase.js';

export default async function handler(request,response){
  if(request.headers.authorization!==`Bearer ${process.env.CRON_SECRET}`)return response.status(401).json({error:'Não autorizado'});
  try{
    webpush.setVapidDetails(process.env.VAPID_SUBJECT||'mailto:contato@ibnovafamilia.com.br',process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',month:'2-digit',day:'2-digit'}).format(new Date());
    const peopleResponse=await adminFetch('pessoas?ativo=eq.true&tipo=eq.membro&nascimento=not.is.null&select=nome,nascimento');
    if(!peopleResponse.ok)throw new Error(await peopleResponse.text());
    const people=await peopleResponse.json();
    const names=people.filter(person=>String(person.nascimento).slice(5)===today).map(person=>person.nome);
    if(!names.length)return response.status(200).json({sent:0,birthdays:0});
    const subscriptionsResponse=await adminFetch('push_subscriptions?ativo=eq.true&select=id,endpoint,p256dh,auth_key');
    const subscriptions=await subscriptionsResponse.json();
    const body=names.length===1?`Hoje é aniversário de ${names[0]}. Toque para enviar os parabéns.`:`Hoje temos ${names.length} aniversariantes: ${names.join(', ')}.`;
    const payload=JSON.stringify({title:'IB Nova Família',body,tag:`aniversarios-${today}`,url:'/?view=aniversariantes'});
    let sent=0;
    await Promise.all(subscriptions.map(async item=>{
      try{await webpush.sendNotification({endpoint:item.endpoint,keys:{p256dh:item.p256dh,auth:item.auth_key}},payload);sent++}
      catch(error){if(error.statusCode===404||error.statusCode===410)await adminFetch(`push_subscriptions?id=eq.${item.id}`,{method:'PATCH',body:JSON.stringify({ativo:false,atualizado_em:new Date().toISOString()})})}
    }));
    return response.status(200).json({sent,birthdays:names.length});
  }catch(error){return response.status(500).json({error:String(error.message||error)})}
}

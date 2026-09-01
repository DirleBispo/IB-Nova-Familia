export default function handler(_request,response){
  if(!process.env.VAPID_PUBLIC_KEY)return response.status(503).json({error:'Notificações ainda não configuradas'});
  response.setHeader('Cache-Control','public, max-age=3600');
  return response.status(200).json({publicKey:process.env.VAPID_PUBLIC_KEY});
}

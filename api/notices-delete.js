import {adminFetch,authenticatedUser} from './_supabase.js';

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Método não permitido.'});
  try{
    const user=await authenticatedUser(request);
    if(!user)return response.status(401).json({error:'Faça login novamente.'});
    const profileResponse=await adminFetch(`perfis?id=eq.${encodeURIComponent(user.id)}&select=perfil,ativo,permissoes`);
    if(!profileResponse.ok)throw new Error(await profileResponse.text());
    const [profile]=await profileResponse.json();
    const allowed=profile?.ativo&&(['pastor','admin','secretaria'].includes(profile.perfil)||profile.permissoes?.avisos===true);
    if(!allowed)return response.status(403).json({error:'Seu usuário não possui permissão para excluir avisos.'});
    const id=String(request.body?.id||'').trim();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return response.status(400).json({error:'Aviso inválido.'});
    const deletion=await adminFetch(`avisos?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
    if(!deletion.ok)throw new Error(await deletion.text());
    const deleted=await deletion.json();
    if(!deleted.length)return response.status(404).json({error:'O aviso não foi encontrado.'});
    return response.status(200).json({success:true});
  }catch(error){return response.status(500).json({error:'Não foi possível excluir o aviso.',detail:String(error.message||error)})}
}
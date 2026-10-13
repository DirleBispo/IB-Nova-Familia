import {randomBytes} from 'node:crypto';
import {adminFetch,authenticatedUser} from './_supabase.js';
const DEST='financeiro@contabilidadechapetta.com.br';
const BASE='https://n8n.ibnovafamilia.com.br/webhook/';
const SAFE_FIELDS='id,mes,destinatario,status,revisao,lancamentos,documentos,entradas,saidas,pasta_url,criado_em,atualizado_em,aprovado_em,enviado_em';
const UUID=/^[a-f0-9-]{36}$/i;
const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
export function closingCSV(c){
 const lines=[['Data','Tipo','Categoria','Descrição','Pessoa/Fornecedor','Forma de pagamento','Observação','Valor (R$)']];
 for(const r of c.lancamentos)lines.push([r.data,r.tipo==='entrada'?'Entrada':'Saída',r.categoria,r.descricao,r.pessoa_nome,r.forma_pagamento,r.observacao,Number(r.valor).toFixed(2).replace('.',',')]);
 lines.push([],['Entradas',Number(c.entradas).toFixed(2).replace('.',',')],['Saídas',Number(c.saidas).toFixed(2).replace('.',',')],['Resultado do mês',(Number(c.entradas)-Number(c.saidas)).toFixed(2).replace('.',',')]);
 return '\uFEFF'+lines.map(row=>row.map(cell).join(';')).join('\r\n');
}
async function db(path,options={}){
 const r=await adminFetch(path,options);if(!r.ok)throw new Error('Não foi possível acessar os fechamentos.');return r.status===204?null:r.json();
}
function credentials(body){
 if(typeof body.user!=='string'||!body.user||body.user.includes(':')||body.user.length>150||typeof body.password!=='string'||!body.password||body.password.length>300)throw new Error('Informe o acesso do formulário de documentos.');
 return 'Basic '+Buffer.from(`${body.user}:${body.password}`).toString('base64');
}
async function hook(path,body,auth){
 const r=await fetch(BASE+path,{method:'POST',redirect:'error',signal:AbortSignal.timeout(90000),headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify(body)});
 if(r.status===404)throw new Error('Importe e publique o fluxo de fechamento no n8n para continuar.');
 if(r.status===401||r.status===403)throw new Error('Confira o usuário e a senha do formulário de documentos.');
 const data=await r.json().catch(()=>null);if(!r.ok||!data)throw new Error('O n8n não confirmou a operação. Confira a execução antes de tentar novamente.');return data;
}
export function validateManifest(data){
 if(!Array.isArray(data.documentos)||data.documentos.length>150)throw new Error('A lista de documentos não foi confirmada ou supera 150 arquivos.');
 const seen=new Set();let total=0;
 const documents=data.documentos.map(f=>{
  if(!f||typeof f.id!=='string'||!/^[-_a-zA-Z0-9]+$/.test(f.id)||seen.has(f.id)||typeof f.revision!=='string'||!/^[-_a-zA-Z0-9]+$/.test(f.revision)||typeof f.name!=='string'||!['application/pdf','image/jpeg','image/png'].includes(f.mimeType)||!Number.isSafeInteger(Number(f.size))||Number(f.size)<=0)throw new Error('Um documento não tem uma versão válida para envio.');
  seen.add(f.id);total+=Number(f.size);return {id:f.id,revision:f.revision,name:f.name.slice(0,200),mimeType:f.mimeType,size:Number(f.size)};
 });
 if(total>15000000)throw new Error('Os anexos ultrapassam 15 MB. Separe o pacote antes de aprovar o envio.');
 return documents;
}
async function patch(id,filter,values){return db(`financeiro_fechamentos?id=eq.${encodeURIComponent(id)}&${filter}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...values,atualizado_em:new Date().toISOString()})})}
async function callback(body,response){
 if(!UUID.test(body.id||'')||!/^\w{64}$/.test(body.ticket||''))return response.status(401).json({error:'Não autorizado.'});
 const rows=await db(`financeiro_fechamentos?id=eq.${body.id}&send_ticket=eq.${body.ticket}&ticket_expira_em=gt.${encodeURIComponent(new Date().toISOString())}&select=*`),c=rows[0];
 if(!c)return response.status(401).json({error:'Autorização inválida ou expirada.'});
 if(body.action==='claim'){
  const changed=await patch(c.id,`status=eq.aprovado&send_ticket=eq.${body.ticket}`,{status:'enviando'});
  if(!changed.length)return response.status(409).json({error:'Este envio já foi iniciado.'});
  return response.status(200).json({id:c.id,mes:c.mes,to:DEST,documentos:c.documentos,csv:closingCSV(c),subject:`IB Nova Família — Fechamento ${c.mes}`,text:`Prezados,\n\nEncaminhamos o extrato financeiro e os ${c.documentos.length} comprovantes do mês ${c.mes}, revisados e aprovados pela igreja.\n\nEntradas: R$ ${Number(c.entradas).toFixed(2)}\nSaídas: R$ ${Number(c.saidas).toFixed(2)}\n\nIgreja Batista Nova Família`});
 }
 const updated=await patch(c.id,`status=eq.enviando&send_ticket=eq.${body.ticket}`,{status:'enviado',enviado_em:new Date().toISOString(),send_ticket:null,ticket_expira_em:null,retorno_envio:{smtpAceitou:true}});
 return updated.length?response.status(200).json({status:'enviado'}):response.status(409).json({error:'O envio não está em andamento.'});
}
export default async function handler(request,response){
 response.setHeader('Cache-Control','no-store');
 try{
  if(!['GET','POST'].includes(request.method))return response.status(405).json({error:'Método não permitido.'});
  const body=request.body||{};
  if(request.method==='POST'&&['claim','sent'].includes(body.action))return await callback(body,response);
  const user=await authenticatedUser(request);if(!user)return response.status(401).json({error:'Entre novamente no app.'});
  const profiles=await db(`perfis?id=eq.${encodeURIComponent(user.id)}&select=perfil,ativo&limit=1`),p=profiles[0];
  if(!p?.ativo||!['pastor','tesouraria'].includes(p.perfil))return response.status(403).json({error:'Fechamentos restritos ao Pastor e à Tesouraria.'});
  const mes=request.method==='GET'?request.query?.mes:body.mes;
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(mes||'')||mes<'2026-09')return response.status(400).json({error:'Selecione um mês a partir de setembro de 2026.'});
  const rows=await db(`financeiro_fechamentos?mes=eq.${mes}&select=${SAFE_FIELDS}`);let c=rows[0];
  if(request.method==='GET'){if(request.query?.download==='1'&&c){response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition',`attachment; filename=fechamento-${mes}.csv`);return response.status(200).send(closingCSV(c));}return response.status(200).json({closing:c||null});}
  if(body.action==='prepare'){
   const auth=credentials(body);
   await db('rpc/ibnf_prepare_closing',{method:'POST',body:JSON.stringify({p_mes:mes,p_replace:true})});
   c=(await db(`financeiro_fechamentos?mes=eq.${mes}&select=${SAFE_FIELDS}`))[0];
   const manifest=await hook('ibnf-fechamento-preparar',{mes},auth),documents=validateManifest(manifest);
   const changed=await patch(c.id,`status=eq.rascunho&revisao=eq.${c.revisao}`,{documentos:documents,pasta_url:manifest.pastaId?`https://drive.google.com/drive/folders/${encodeURIComponent(manifest.pastaId)}`:null,status:'pronto'});
   if(!changed.length)return response.status(409).json({error:'O fechamento mudou. Reabra a revisão.'});
   return response.status(200).json({status:'pronto'});
  }
  if(!c)return response.status(404).json({error:'Prepare o fechamento primeiro.'});
  if(body.action==='withdraw'){
   const changed=await patch(c.id,'status=eq.aprovado',{status:'pronto',send_ticket:null,ticket_expira_em:null,aprovado_por:null,aprovado_em:null});
   return changed.length?response.status(200).json({status:'pronto'}):response.status(409).json({error:'O envio já foi iniciado; confira o e-mail antes de qualquer reenvio.'});
  }
  if(body.action!=='approve'||body.confirmed!==true||body.revisao!==c.revisao||c.status!=='pronto')return response.status(409).json({error:'Revise o fechamento atualizado antes de aprovar.'});
  const auth=credentials(body),ticket=randomBytes(32).toString('hex');
  const changed=await patch(c.id,`status=eq.pronto&revisao=eq.${c.revisao}`,{status:'aprovado',aprovado_por:user.id,aprovado_em:new Date().toISOString(),send_ticket:ticket,ticket_expira_em:new Date(Date.now()+3600000).toISOString()});
  if(!changed.length)return response.status(409).json({error:'Esta revisão já foi aprovada ou alterada.'});
  try{
   const outcome=await hook('ibnf-fechamento-enviar',{id:c.id,ticket},auth);
   if(outcome.status!=='enviado')throw new Error('Envio não confirmado.');
   return response.status(200).json({status:'enviado'});
  }catch{return response.status(202).json({status:'verificar',message:'A aprovação foi registrada. Confira o status e o n8n: o envio ainda não foi confirmado. Não reenvie sem conferir a caixa de e-mail.'});}
 }catch(error){return response.status(400).json({error:error.message||'Não foi possível concluir.'});}
}

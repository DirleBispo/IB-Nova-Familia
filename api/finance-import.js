import {adminFetch,authenticatedUser} from './_supabase.js';
import {transactions} from './finance-import-data.js';

const clean=value=>String(value||'').trim();
const fold=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fingerprint=row=>[row.data,row.tipo,Number(row.valor).toFixed(2),fold(row.descricao),fold(row.pessoa_nome)].join('|');

function categoryFor(row){
  const raw=fold(row.categoria),description=fold(row.descricao);
  const text=`${raw} ${description}`;
  if(row.tipo==='entrada'){
    if(text.includes('dizimo'))return 'Dízimo';
    if(text.includes('oferta'))return 'Oferta';
    if(text.includes('doacao'))return 'Doação';
    if(text.includes('cantina'))return 'Cantina';
    if(text.includes('evento')||text.includes('encontro'))return 'Evento';
    return raw?clean(row.categoria):'Outras Entradas';
  }
  if(text.includes('aluguel'))return 'Aluguel';
  if(text.includes('cpfl')||text.includes('energia'))return 'Energia';
  if(text.includes('saae')||text.includes('agua'))return 'Água';
  if(text.includes('internet'))return 'Internet';
  if(text.includes('plataforma')||text.includes('aplicativo')||text.includes('enuves'))return 'Sistemas e aplicativos';
  if(text.includes('limpeza'))return 'Material de limpeza';
  if(text.includes('crianca')||text.includes('infantil'))return 'Ministério Infantil';
  if(text.includes('manutencao')||text.includes('reparo'))return 'Manutenção';
  if(raw&&raw!=='diversos')return clean(row.categoria);
  return 'Outras Despesas';
}

function paymentFor(row){
  const text=fold(`${row.categoria} ${row.conta}`);
  if(text.includes('pix'))return 'PIX';
  if(text.includes('sumup')||text.includes('maquina')||text.includes('cartao'))return 'Cartão';
  if(text.includes('boleto'))return 'Boleto';
  return null;
}

async function profileFor(userId){
  const response=await adminFetch(`perfis?id=eq.${encodeURIComponent(userId)}&select=perfil,ativo,permissoes&limit=1`);
  if(!response.ok)return null;
  return (await response.json())[0]||null;
}

async function fetchAllExisting(){
  const result=[];
  for(let start=0;;start+=1000){
    const response=await adminFetch('financeiro_lancamentos?select=data,tipo,valor,descricao,pessoa_nome&data=gte.2024-06-03&order=data.asc',{headers:{Range:`${start}-${start+999}`}});
    if(!response.ok)throw new Error(await response.text());
    const page=await response.json();result.push(...page);
    if(page.length<1000)break;
  }
  return result;
}

export default async function handler(request,response){
  if(request.method!=='POST')return response.status(405).json({error:'Método não permitido.'});
  try{
    const user=await authenticatedUser(request);
    if(!user)return response.status(401).json({error:'Entre novamente na plataforma.'});
    const profile=await profileFor(user.id);
    const allowed=profile?.ativo&&(['pastor','tesouraria','admin'].includes(profile.perfil)||profile.permissoes?.financeiro===true);
    if(!allowed)return response.status(403).json({error:'Seu usuário não possui permissão para importar o financeiro.'});

    const categoryResponse=await adminFetch('financeiro_categorias?select=id,nome,tipo');
    if(!categoryResponse.ok)throw new Error(await categoryResponse.text());
    const categories=await categoryResponse.json();
    const required=new Map();
    transactions.forEach(row=>{const name=categoryFor(row);required.set(`${row.tipo}|${fold(name)}`,{nome:name,tipo:row.tipo})});
    const categoryMap=new Map(categories.map(item=>[`${item.tipo}|${fold(item.nome)}`,item.id]));
    const missing=[...required.entries()].filter(([key])=>!categoryMap.has(key)).map(([,value])=>value);
    if(missing.length){
      const created=await adminFetch('financeiro_categorias',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(missing)});
      if(!created.ok)throw new Error(await created.text());
      (await created.json()).forEach(item=>categoryMap.set(`${item.tipo}|${fold(item.nome)}`,item.id));
    }

    const existing=await fetchAllExisting();
    const counts=new Map();
    existing.forEach(item=>{const key=fingerprint(item);counts.set(key,(counts.get(key)||0)+1)});
    const pending=[];let skipped=0;
    for(const source of transactions){
      const categoria=categoryFor(source),descricao=clean(source.descricao)||categoria||'Lançamento importado';
      const row={data:source.data,tipo:source.tipo,categoria,categoria_id:categoryMap.get(`${source.tipo}|${fold(categoria)}`)||null,descricao,valor:Number(source.valor),pessoa_nome:clean(source.contato)||null,pessoa_id:null,forma_pagamento:paymentFor(source),observacao:`Importado do sistema anterior (${source.arquivo}).${source.conta?` Conta original: ${clean(source.conta)}.`:''}`,criado_por:user.id};
      const key=fingerprint(row),available=counts.get(key)||0;
      if(available>0){counts.set(key,available-1);skipped++;continue}
      pending.push(row);
    }
    for(let index=0;index<pending.length;index+=250){
      const inserted=await adminFetch('financeiro_lancamentos',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(pending.slice(index,index+250))});
      if(!inserted.ok)throw new Error(await inserted.text());
    }
    return response.status(200).json({success:true,imported:pending.length,skipped,total:transactions.length,from:'03/06/2024',to:'25/08/2026'});
  }catch(error){return response.status(500).json({error:error.message||'Falha ao importar os lançamentos.'})}
}

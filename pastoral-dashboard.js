(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const escv=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  async function authorized(){const {data:{session}}=await client.auth.getSession();if(!session)return false;const {data}=await client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();return !!data?.ativo&&['pastor','secretaria'].includes(data.perfil)}
  async function setStatus(table,id,status){const {error}=await client.from(table).update({status}).eq('id',id);if(error)alert(error.message);else openDashboard()}
  window.ibnfSetPastoralStatus=setStatus;
  async function openDashboard(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Painel Pastoral','<div class="birthday-loading">Carregando painel...</div>');
    if(!(await authorized())){window.openPanel('Painel Pastoral','<div class="error-box">Área restrita à administração pastoral.</div>');return}
    const [o,v,p]=await Promise.all([
      client.from('pedidos_oracao').select('*').order('criado_em',{ascending:false}),
      client.from('visitas').select('*').order('criado_em',{ascending:false}),
      client.from('pessoas').select('id,nome,nascimento,status_revisao').eq('ativo',true).eq('tipo','membro')
    ]);
    const oracoes=o.data||[],visitas=v.data||[],pessoas=p.data||[];
    const novos=oracoes.filter(x=>x.status==='novo');
    const visitasPend=visitas.filter(x=>['solicitada','agendada'].includes(x.status));
    const revisar=pessoas.filter(x=>x.status_revisao==='REVISAR');
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const upcoming=pessoas.filter(x=>x.nascimento).map(x=>{const [y,m,d]=x.nascimento.split('-').map(Number);let n=new Date(now.getFullYear(),m-1,d,12);if(n<today)n=new Date(now.getFullYear()+1,m-1,d,12);return {...x,next:n}}).filter(x=>(x.next-today)/86400000<=7).sort((a,b)=>a.next-b.next);
    const prayerHtml=oracoes.slice(0,12).map(x=>`<div class="pastoral-item"><div><b>${escv(x.nome)}</b><small>${fmt(x.criado_em)} · ${escv(x.status)}</small><p>${escv(x.pedido)}</p></div><div class="pastoral-actions">${x.status!=='em_acompanhamento'?`<button onclick="ibnfSetPastoralStatus('pedidos_oracao','${x.id}','em_acompanhamento')">Acompanhar</button>`:''}${x.status!=='concluido'?`<button class="done" onclick="ibnfSetPastoralStatus('pedidos_oracao','${x.id}','concluido')">Concluir</button>`:''}</div></div>`).join('');
    const visitHtml=visitas.slice(0,12).map(x=>`<div class="pastoral-item"><div><b>${escv(x.nome)}</b><small>${fmt(x.criado_em)} · ${escv(x.status)}</small><p>${escv(x.telefone)}${x.observacao?' · '+escv(x.observacao):''}</p></div><div class="pastoral-actions">${x.status!=='agendada'?`<button onclick="ibnfSetPastoralStatus('visitas','${x.id}','agendada')">Agendar</button>`:''}${x.status!=='realizada'?`<button class="done" onclick="ibnfSetPastoralStatus('visitas','${x.id}','realizada')">Realizada</button>`:''}</div></div>`).join('');
    const html=`<div class="pastoral-summary"><div><b>${novos.length}</b><span>Orações novas</span></div><div><b>${visitasPend.length}</b><span>Visitas pendentes</span></div><div><b>${revisar.length}</b><span>Cadastros a revisar</span></div><div><b>${upcoming.length}</b><span>Aniversários 7 dias</span></div></div><div class="pastoral-section"><h3>Pedidos de oração</h3>${prayerHtml||'<div class="empty"><div>Nenhum pedido.</div></div>'}</div><div class="pastoral-section"><h3>Solicitações de visita</h3>${visitHtml||'<div class="empty"><div>Nenhuma solicitação.</div></div>'}</div><div class="pastoral-section"><h3>Cadastros pendentes</h3>${revisar.map(x=>`<div class="pastoral-simple"><b>${escv(x.nome)}</b><span>Revisar cadastro</span></div>`).join('')||'<div class="empty"><div>Nenhuma pendência.</div></div>'}</div><div class="pastoral-section"><h3>Aniversários nos próximos 7 dias</h3>${upcoming.map(x=>`<div class="pastoral-simple"><b>${escv(x.nome)}</b><span>${x.next.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span></div>`).join('')||'<div class="empty"><div>Nenhum aniversário próximo.</div></div>'}</div>`;
    window.openPanel('Painel Pastoral',html);
  }
  window.showView=function(view){if(view==='pastoral'){openDashboard();return}return previousShowView(view)};
})();
(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const escv=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>v?new Date(v).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  let currentTab='resumo';

  async function authorized(){const {data:{session}}=await client.auth.getSession();if(!session)return false;const {data}=await client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();return !!data?.ativo&&['pastor','secretaria'].includes(data.perfil)}
  async function setStatus(table,id,status){const {error}=await client.from(table).update({status}).eq('id',id);if(error){alert(error.message);return}if(window.ibnfRefreshPastoralHome)window.ibnfRefreshPastoralHome();openDashboard(currentTab,true)}
  async function removeItem(table,id){if(!confirm('Deseja realmente excluir esta solicitação? Esta ação não poderá ser desfeita.'))return;const {error}=await client.from(table).delete().eq('id',id);if(error){alert(error.message);return}if(window.ibnfRefreshPastoralHome)window.ibnfRefreshPastoralHome();openDashboard(currentTab,true)}
  window.ibnfSetPastoralStatus=setStatus;
  window.ibnfDeletePastoralItem=removeItem;
  window.ibnfOpenPastoralSection=(tab)=>openDashboard(tab||'resumo',true);

  const item=(x,table,doneStatus,body,followStatus,followLabel)=>`<div class="pastoral-item"><div><b>${escv(x.nome)}</b><small>${fmt(x.criado_em)} · ${escv(x.status)}</small><p>${body}</p></div><div class="pastoral-actions">${followStatus&&x.status!==followStatus?`<button onclick="ibnfSetPastoralStatus('${table}','${x.id}','${followStatus}')">${followLabel}</button>`:''}<button class="done" onclick="ibnfSetPastoralStatus('${table}','${x.id}','${doneStatus}')">Atendida</button><button class="danger" onclick="ibnfDeletePastoralItem('${table}','${x.id}')">Excluir</button></div></div>`;

  function focusPastoral(){
    setTimeout(()=>{
      const target=document.querySelector('#pastoral-focus');
      if(!target)return;
      const header=document.querySelector('.app-header');
      const offset=(header?.offsetHeight||0)+12;
      const top=target.getBoundingClientRect().top+window.scrollY-offset;
      window.scrollTo({top,behavior:'smooth'});
    },120);
  }

  async function openDashboard(tab='resumo',focus=false){
    currentTab=tab;
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Painel Pastoral','<div class="birthday-loading">Carregando painel...</div>');
    if(!(await authorized())){window.openPanel('Painel Pastoral','<div class="error-box">Área restrita à administração pastoral.</div>');return}
    const [o,v,vi,s,p]=await Promise.all([
      client.from('pedidos_oracao').select('*').order('criado_em',{ascending:false}),
      client.from('visitas').select('*').order('criado_em',{ascending:false}),
      client.from('visitantes').select('*').order('criado_em',{ascending:false}),
      client.from('quero_servir').select('*').order('criado_em',{ascending:false}),
      client.from('pessoas').select('id,nome,nascimento,status_revisao').eq('ativo',true).eq('tipo','membro')
    ]);
    const oracoes=(o.data||[]).filter(x=>x.status!=='concluido');
    const visitas=(v.data||[]).filter(x=>x.status!=='realizada');
    const visitantes=(vi.data||[]).filter(x=>x.status!=='concluido');
    const servir=(s.data||[]).filter(x=>x.status!=='concluido');
    const pessoas=p.data||[];
    const revisar=pessoas.filter(x=>x.status_revisao==='REVISAR');
    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const upcoming=pessoas.filter(x=>x.nascimento).map(x=>{const [y,m,d]=x.nascimento.split('-').map(Number);let n=new Date(now.getFullYear(),m-1,d,12);if(n<today)n=new Date(now.getFullYear()+1,m-1,d,12);return {...x,next:n}}).filter(x=>(x.next-today)/86400000<=7).sort((a,b)=>a.next-b.next);

    const prayerHtml=oracoes.map(x=>item(x,'pedidos_oracao','concluido',escv(x.pedido),'em_acompanhamento','Acompanhar')).join('');
    const visitHtml=visitas.map(x=>item(x,'visitas','realizada',`${escv(x.telefone)}${x.observacao?' · '+escv(x.observacao):''}`,'agendada','Agendar')).join('');
    const visitanteHtml=visitantes.map(x=>item(x,'visitantes','concluido',`${escv(x.telefone)}${x.observacao?' · '+escv(x.observacao):''}`,'em_contato','Em contato')).join('');
    const servirHtml=servir.map(x=>item(x,'quero_servir','concluido',`${escv(x.telefone)}${x.area?' · Área: '+escv(x.area):''}${x.observacao?' · '+escv(x.observacao):''}`,'em_contato','Em contato')).join('');

    const tabs=`<div class="pastoral-tabs"><button class="${tab==='resumo'?'active':''}" onclick="ibnfOpenPastoralSection('resumo')">Resumo</button><button class="${tab==='oracao'?'active':''}" onclick="ibnfOpenPastoralSection('oracao')">Oração (${oracoes.length})</button><button class="${tab==='visitas'?'active':''}" onclick="ibnfOpenPastoralSection('visitas')">Visitas (${visitas.length})</button><button class="${tab==='visitantes'?'active':''}" onclick="ibnfOpenPastoralSection('visitantes')">Visitantes (${visitantes.length})</button><button class="${tab==='servir'?'active':''}" onclick="ibnfOpenPastoralSection('servir')">Quero servir (${servir.length})</button></div>`;
    const resumo=`<div class="pastoral-summary"><div><b>${oracoes.length}</b><span>Orações pendentes</span></div><div><b>${visitas.length}</b><span>Visitas pendentes</span></div><div><b>${visitantes.length}</b><span>Visitantes</span></div><div><b>${servir.length}</b><span>Querem servir</span></div></div><div class="pastoral-section"><h3>Cadastros pendentes</h3>${revisar.map(x=>`<div class="pastoral-simple"><b>${escv(x.nome)}</b><span>Revisar cadastro</span></div>`).join('')||'<div class="empty"><div>Nenhuma pendência.</div></div>'}</div><div class="pastoral-section"><h3>Aniversários nos próximos 7 dias</h3>${upcoming.map(x=>`<div class="pastoral-simple"><b>${escv(x.nome)}</b><span>${x.next.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span></div>`).join('')||'<div class="empty"><div>Nenhum aniversário próximo.</div></div>'}</div>`;
    const sections={resumo,oracao:`<div class="pastoral-section"><h3>Pedidos de oração pendentes</h3>${prayerHtml||'<div class="empty"><div>Nenhum pedido pendente.</div></div>'}</div>`,visitas:`<div class="pastoral-section"><h3>Solicitações de visita pendentes</h3>${visitHtml||'<div class="empty"><div>Nenhuma visita pendente.</div></div>'}</div>`,visitantes:`<div class="pastoral-section"><h3>Visitantes para acompanhar</h3>${visitanteHtml||'<div class="empty"><div>Nenhum visitante pendente.</div></div>'}</div>`,servir:`<div class="pastoral-section"><h3>Pessoas que querem servir</h3>${servirHtml||'<div class="empty"><div>Nenhuma solicitação pendente.</div></div>'}</div>`};
    window.openPanel('Painel Pastoral',`<div id="pastoral-focus">${tabs}${sections[tab]||sections.resumo}</div>`);
    if(focus)focusPastoral();
  }
  window.showView=function(view){if(view==='pastoral'){openDashboard('resumo',false);return}return previousShowView(view)};
})();
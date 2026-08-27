(function(){
 if(!window.supabase||!window.IBNF_CONFIG)return;
 const c=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
 let box;
 function ensure(){if(box)return box;const intro=document.querySelector('.intro-card');if(!intro)return null;box=document.createElement('section');box.id='pastoralHome';box.className='pastoral-home';box.hidden=true;intro.insertAdjacentElement('afterend',box);return box}
 function list(title,items,render){if(!items.length)return '';return `<div class="pastoral-home-list"><h3>${title}</h3>${items.slice(0,3).map(render).join('')}</div>`}
 async function refresh(){const el=ensure();if(!el)return;const {data:{session}}=await c.auth.getSession();if(!session){el.hidden=true;el.innerHTML='';return}const {data:p}=await c.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();if(!p?.ativo||p.perfil!=='pastor'){el.hidden=true;el.innerHTML='';return}
 const [o,v,vi,s]=await Promise.all([
  c.from('pedidos_oracao').select('id,status,nome,pedido,criado_em').order('criado_em',{ascending:false}),
  c.from('visitas').select('id,status,nome,telefone,observacao,criado_em').order('criado_em',{ascending:false}),
  c.from('visitantes').select('id,status,nome,telefone,observacao,criado_em').order('criado_em',{ascending:false}),
  c.from('quero_servir').select('id,status,nome,telefone,area,observacao,criado_em').order('criado_em',{ascending:false})
 ]);
 const oracoes=(o.data||[]).filter(x=>x.status==='novo'),visitas=(v.data||[]).filter(x=>['solicitada','agendada'].includes(x.status)),visitantes=(vi.data||[]).filter(x=>x.status==='novo'),servir=(s.data||[]).filter(x=>x.status==='novo');
 const total=oracoes.length+visitas.length+visitantes.length+servir.length;
 const detalhes=
  list('Pedidos de oração',oracoes,x=>`<button class="pastoral-detail" data-view="pastoral"><b>${esc(x.nome)}</b><p>${esc(x.pedido)}</p></button>`)+
  list('Visitas',visitas,x=>`<button class="pastoral-detail" data-view="pastoral"><b>${esc(x.nome)}</b><p>${esc(x.telefone)}${x.observacao?' · '+esc(x.observacao):''}</p></button>`)+
  list('Visitantes',visitantes,x=>`<button class="pastoral-detail" data-view="pastoral"><b>${esc(x.nome)}</b><p>${esc(x.telefone)}${x.observacao?' · '+esc(x.observacao):''}</p></button>`)+
  list('Quero servir',servir,x=>`<button class="pastoral-detail" data-view="pastoral"><b>${esc(x.nome)}</b><p>${x.area?'Área: '+esc(x.area):''}${x.observacao?' · '+esc(x.observacao):''}</p></button>`);
 el.hidden=false;el.innerHTML=`<div class="pastoral-home-head"><div><span class="section-kicker">Área do Pastor</span><h2>Pendências Pastorais</h2><p>${total?`Você tem ${total} ${total===1?'solicitação pendente':'solicitações pendentes'} para acompanhar.`:'Nenhuma solicitação pendente no momento.'}</p></div><button class="outline-action" data-view="pastoral">Abrir Painel Pastoral</button></div><div class="pastoral-home-grid"><button data-view="pastoral"><b>${oracoes.length}</b><span>Pedidos de oração</span></button><button data-view="pastoral"><b>${visitas.length}</b><span>Visitas</span></button><button data-view="pastoral"><b>${visitantes.length}</b><span>Visitantes</span></button><button data-view="pastoral"><b>${servir.length}</b><span>Quero servir</span></button></div>${detalhes?`<div class="pastoral-home-details">${detalhes}</div>`:''}`;
 el.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>window.showView('pastoral'))}
 c.auth.onAuthStateChange(()=>setTimeout(refresh,100));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
 window.ibnfRefreshPastoralHome=refresh;
})();
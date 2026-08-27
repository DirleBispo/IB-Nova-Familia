(function(){
 if(!window.supabase||!window.IBNF_CONFIG)return;
 const c=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
 let box;
 function ensure(){if(box)return box;const intro=document.querySelector('.intro-card');if(!intro)return null;box=document.createElement('section');box.id='pastoralHome';box.className='pastoral-home';box.hidden=true;intro.insertAdjacentElement('afterend',box);return box}
 async function refresh(){const el=ensure();if(!el)return;const {data:{session}}=await c.auth.getSession();if(!session){el.hidden=true;el.innerHTML='';return}const {data:p}=await c.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();if(!p?.ativo||p.perfil!=='pastor'){el.hidden=true;el.innerHTML='';return}
 const [o,v,vi,s]=await Promise.all([c.from('pedidos_oracao').select('id,status'),c.from('visitas').select('id,status'),c.from('visitantes').select('id,status'),c.from('quero_servir').select('id,status')]);
 const nO=(o.data||[]).filter(x=>x.status==='novo').length,nV=(v.data||[]).filter(x=>['solicitada','agendada'].includes(x.status)).length,nVi=(vi.data||[]).filter(x=>x.status==='novo').length,nS=(s.data||[]).filter(x=>x.status==='novo').length,total=nO+nV+nVi+nS;
 el.hidden=false;el.innerHTML=`<div class="pastoral-home-head"><div><span class="section-kicker">Área do Pastor</span><h2>Pendências Pastorais</h2><p>${total?`Você tem ${total} ${total===1?'solicitação pendente':'solicitações pendentes'} para acompanhar.`:'Nenhuma solicitação pendente no momento.'}</p></div><button class="outline-action" data-view="pastoral">Abrir Painel Pastoral</button></div><div class="pastoral-home-grid"><button data-view="pastoral"><b>${nO}</b><span>Pedidos de oração</span></button><button data-view="pastoral"><b>${nV}</b><span>Visitas</span></button><button data-view="pastoral"><b>${nVi}</b><span>Visitantes</span></button><button data-view="pastoral"><b>${nS}</b><span>Quero servir</span></button></div>`;el.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>window.showView('pastoral'))}
 c.auth.onAuthStateChange(()=>setTimeout(refresh,100));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
 window.ibnfRefreshPastoralHome=refresh;
})();
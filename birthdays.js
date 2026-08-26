(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const fmtDate=(iso)=>{if(!iso)return'';const [,m,d]=iso.split('-');return `${d}/${m}`};
  const todayStart=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate(),0,0,0,0)};
  const getNextBirthday=(iso)=>{if(!iso)return null;const parts=String(iso).split('-').map(Number);if(parts.length!==3||!parts[1]||!parts[2])return null;const [,m,d]=parts;const base=todayStart();let next=new Date(base.getFullYear(),m-1,d,12,0,0,0);if(next<base)next=new Date(base.getFullYear()+1,m-1,d,12,0,0,0);return next};
  const ageOnBirthday=(iso)=>{if(!iso)return'';const [y]=String(iso).split('-').map(Number);const next=getNextBirthday(iso);return next&&y?next.getFullYear()-y:''};
  const diffDays=(date)=>Math.round((new Date(date.getFullYear(),date.getMonth(),date.getDate())-todayStart())/86400000);
  function labelFor(next){const d=diffDays(next);if(d===0)return'Hoje';if(d===1)return'Amanhã';if(d<=7)return`Em ${d} dias`;return next.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}
  function renderList(items){return items.map(p=>`<div class="birthday-card"><div class="birthday-date"><b>${fmtDate(p.nascimento)}</b><small>${labelFor(p.next)}</small></div><div class="birthday-info"><strong>${p.nome}</strong><span>${ageOnBirthday(p.nascimento)?`Completa ${ageOnBirthday(p.nascimento)} anos`:''}</span>${p.telefone?`<small>${p.telefone}</small>`:''}</div></div>`).join('')}
  async function openBirthdays(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Aniversariantes','<div class="birthday-loading">Carregando aniversariantes...</div>');
    const {data,error}=await client.from('pessoas').select('id,nome,nascimento,telefone,ativo,tipo').eq('ativo',true).eq('tipo','membro').not('nascimento','is',null);
    if(error){window.openPanel('Aniversariantes',`<div class="error-box">Não foi possível carregar os aniversariantes: ${error.message}</div>`);return}
    const items=(data||[]).map(p=>({...p,next:getNextBirthday(p.nascimento)})).filter(p=>p.next).sort((a,b)=>a.next-b.next||a.nome.localeCompare(b.nome,'pt-BR'));
    const today=items.filter(p=>diffDays(p.next)===0);
    const week=items.filter(p=>{const d=diffDays(p.next);return d>=0&&d<=7});
    const now=new Date();
    const month=items.filter(p=>{const [,m]=String(p.nascimento).split('-').map(Number);return m===now.getMonth()+1});
    const html=`<div class="birthday-summary"><div><b>${today.length}</b><span>Hoje</span></div><div><b>${week.length}</b><span>Próx. 7 dias</span></div><div><b>${month.length}</b><span>Este mês</span></div><div><b>${items.length}</b><span>Com nascimento</span></div></div><div class="social-intro"><span class="section-kicker">Automático</span><h3>Próximos aniversários</h3><p>Lista completa baseada diretamente nas datas de nascimento cadastradas no Supabase.</p></div><div class="birthday-tabs"><button class="calendar-btn active" data-bfilter="todos">Todos</button><button class="calendar-btn" data-bfilter="semana">7 dias</button><button class="calendar-btn" data-bfilter="mes">Este mês</button></div><div id="birthdayList" class="birthday-list">${renderList(items)||'<div class="empty"><div>Nenhum aniversariante encontrado.</div></div>'}</div>`;
    window.openPanel('Aniversariantes',html);
    document.querySelectorAll('[data-bfilter]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-bfilter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const mode=btn.dataset.bfilter;const filtered=mode==='semana'?week:mode==='mes'?month:items;document.querySelector('#birthdayList').innerHTML=renderList(filtered)||'<div class="empty"><div>Nenhum aniversariante neste período.</div></div>'});
  }
  window.showView=function(view){if(view==='aniversariantes'){openBirthdays();return;}return originalShowView(view)};
})();
(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY,{auth:{persistSession:false}});
  const originalShowView=window.showView;
  const fmtDate=(iso)=>{if(!iso)return'';const [y,m,d]=iso.split('-');return `${d}/${m}`};
  const getNextBirthday=(iso)=>{if(!iso)return null;const [y,m,d]=iso.split('-').map(Number);const now=new Date();let next=new Date(now.getFullYear(),m-1,d,12,0,0,0);if(next<new Date(now.getFullYear(),now.getMonth(),now.getDate()))next=new Date(now.getFullYear()+1,m-1,d,12,0,0,0);return next};
  const ageOnBirthday=(iso)=>{if(!iso)return'';const [y]=iso.split('-').map(Number);const next=getNextBirthday(iso);return next?next.getFullYear()-y:''};
  const diffDays=(date)=>Math.ceil((date-new Date(new Date().getFullYear(),new Date().getMonth(),new Date().getDate()))/86400000);
  function labelFor(next){const d=diffDays(next);if(d===0)return'Hoje';if(d===1)return'Amanhã';if(d<=7)return`Em ${d} dias`;return next.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}).replace('.','')}
  async function openBirthdays(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Aniversariantes','<div class="birthday-loading">Carregando aniversariantes...</div>');
    const {data,error}=await client.from('pessoas').select('id,nome,nascimento,telefone,ativo,tipo').eq('ativo',true).eq('tipo','membro').not('nascimento','is',null);
    if(error){document.querySelector('#contentPanel').innerHTML+=`<div class="error-box">Não foi possível carregar os aniversariantes: ${error.message}</div>`;return}
    const items=(data||[]).map(p=>({...p,next:getNextBirthday(p.nascimento)})).filter(p=>p.next).sort((a,b)=>a.next-b.next);
    const today=items.filter(p=>diffDays(p.next)===0);
    const week=items.filter(p=>{const d=diffDays(p.next);return d>=0&&d<=7});
    const month=items.filter(p=>p.next.getMonth()===new Date().getMonth()&&p.next.getFullYear()===new Date().getFullYear());
    const list=items.slice(0,30).map(p=>`<div class="birthday-card"><div class="birthday-date"><b>${fmtDate(p.nascimento)}</b><small>${labelFor(p.next)}</small></div><div class="birthday-info"><strong>${p.nome}</strong><span>Completa ${ageOnBirthday(p.nascimento)} anos</span>${p.telefone?`<small>${p.telefone}</small>`:''}</div></div>`).join('');
    const html=`<div class="birthday-summary"><div><b>${today.length}</b><span>Hoje</span></div><div><b>${week.length}</b><span>Próx. 7 dias</span></div><div><b>${month.length}</b><span>Este mês</span></div><div><b>${items.length}</b><span>Com nascimento</span></div></div><div class="social-intro"><span class="section-kicker">Automático</span><h3>Próximos aniversários</h3><p>Esta lista usa diretamente a data de nascimento dos membros cadastrados no Supabase.</p></div><div class="birthday-list">${list||'<div class="empty"><div>Nenhum aniversariante encontrado.</div></div>'}</div>`;
    window.openPanel('Aniversariantes',html);
  }
  window.showView=function(view){if(view==='aniversariantes'){openBirthdays();return;}return originalShowView(view)};
})();
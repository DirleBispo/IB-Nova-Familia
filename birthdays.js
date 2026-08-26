(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const todayStart=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
  const todayKey=()=>{const n=new Date();return `${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`};
  function nextBirthday(iso){if(!iso)return null;const [y,m,d]=String(iso).split('-').map(Number);if(!m||!d)return null;const base=todayStart();let next=new Date(base.getFullYear(),m-1,d);if(next<base)next=new Date(base.getFullYear()+1,m-1,d);return {date:next,birthYear:y}}
  function daysUntil(date){return Math.round((date-todayStart())/86400000)}
  function renderPublic(items){
    if(!items.length)return '<div class="empty"><div>Hoje não há aniversariantes cadastrados.</div></div>';
    return items.map(p=>`<div class="birthday-card"><div class="birthday-date"><b>Hoje</b><small>Parabéns!</small></div><div class="birthday-info"><strong>${esc(p.nome)}</strong><span>A IB Nova Família celebra sua vida neste dia.</span></div></div>`).join('');
  }
  function renderPrivate(items){
    if(!items.length)return '<div class="empty"><div>Nenhum aniversário nos próximos 7 dias.</div></div>';
    return items.map(p=>{const d=daysUntil(p.next);const label=d===0?'Hoje':d===1?'Amanhã':`Em ${d} dias`;return `<div class="birthday-card"><div class="birthday-date"><b>${String(p.next.getDate()).padStart(2,'0')}/${String(p.next.getMonth()+1).padStart(2,'0')}</b><small>${label}</small></div><div class="birthday-info"><strong>${esc(p.nome)}</strong></div></div>`}).join('');
  }
  async function openBirthdays(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Aniversariantes','<div class="birthday-loading">Carregando aniversariantes...</div>');
    const {data:{session}}=await client.auth.getSession();
    if(session){
      const {data,error}=await client.from('pessoas').select('nome,nascimento').eq('ativo',true).eq('tipo','membro').not('nascimento','is',null);
      if(error){window.openPanel('Aniversariantes',`<div class="error-box">Não foi possível carregar os próximos aniversários: ${esc(error.message)}</div>`);return}
      const upcoming=(data||[]).map(p=>{const n=nextBirthday(p.nascimento);return n?{...p,next:n.date}:null}).filter(Boolean).filter(p=>{const d=daysUntil(p.next);return d>=0&&d<=7}).sort((a,b)=>a.next-b.next||a.nome.localeCompare(b.nome,'pt-BR'));
      const html=`<div class="social-intro"><span class="section-kicker">Área interna</span><h3>Próximos 7 dias</h3><p>Usuários logados podem consultar antecipadamente os aniversários da semana.</p></div><div class="birthday-list">${renderPrivate(upcoming)}</div>`;
      window.openPanel('Aniversariantes',html);return;
    }
    let data=null,error=null;
    const rpc=await client.rpc('aniversariantes_hoje');
    if(rpc.error)error=rpc.error;else data=rpc.data||[];
    if(error){window.openPanel('Aniversariantes','<div class="error-box">A área pública de aniversariantes ainda precisa da função segura no Supabase.</div>');return}
    const html=`<div class="social-intro"><span class="section-kicker">Aniversariantes de hoje</span><h3>Hoje celebramos</h3><p>Por privacidade, esta área pública mostra somente o nome de quem está aniversariando hoje.</p></div><div class="birthday-list">${renderPublic(data||[])}</div>`;
    window.openPanel('Aniversariantes',html);
  }
  window.showView=function(view){if(view==='aniversariantes'){openBirthdays();return;}return originalShowView(view)};
})();
(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const todayKey=()=>{const n=new Date();return `${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`};
  function renderPublic(items){
    if(!items.length)return '<div class="empty"><div>Hoje não há aniversariantes cadastrados.</div></div>';
    return items.map(p=>`<div class="birthday-card"><div class="birthday-date"><b>Hoje</b><small>Parabéns!</small></div><div class="birthday-info"><strong>${String(p.nome||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</strong><span>A IB Nova Família celebra sua vida neste dia.</span></div></div>`).join('');
  }
  async function openBirthdays(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Aniversariantes','<div class="birthday-loading">Carregando aniversariantes de hoje...</div>');
    let data=null,error=null;
    const rpc=await client.rpc('aniversariantes_hoje');
    if(rpc.error){
      const session=(await client.auth.getSession()).data.session;
      if(session){
        const fallback=await client.from('pessoas').select('nome,nascimento').eq('ativo',true).eq('tipo','membro').not('nascimento','is',null);
        data=(fallback.data||[]).filter(p=>String(p.nascimento||'').slice(5)===todayKey());
        error=fallback.error;
      }else error=rpc.error;
    }else data=rpc.data||[];
    if(error){window.openPanel('Aniversariantes','<div class="error-box">A área pública de aniversariantes ainda precisa da função segura no Supabase.</div>');return}
    const html=`<div class="social-intro"><span class="section-kicker">Aniversariantes de hoje</span><h3>Hoje celebramos</h3><p>Por privacidade, esta área pública mostra somente o nome de quem está aniversariando hoje.</p></div><div class="birthday-list">${renderPublic(data||[])}</div>`;
    window.openPanel('Aniversariantes',html);
  }
  window.showView=function(view){if(view==='aniversariantes'){openBirthdays();return;}return originalShowView(view)};
})();
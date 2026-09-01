(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const todayStart=()=>{const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())};
  const todayKey=()=>{const n=new Date();return `${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`};
  function nextBirthday(iso){if(!iso)return null;const [y,m,d]=String(iso).split('-').map(Number);if(!m||!d)return null;const base=todayStart();let next=new Date(base.getFullYear(),m-1,d);if(next<base)next=new Date(base.getFullYear()+1,m-1,d);return {date:next,birthYear:y}}
  function daysUntil(date){return Math.round((date-todayStart())/86400000)}
  function normalizePhone(value){
    let phone=String(value||'').replace(/\D/g,'');
    if(!phone)return '';
    if(phone.startsWith('00'))phone=phone.slice(2);
    if(phone.length===10||phone.length===11)phone='55'+phone;
    return phone;
  }
  function birthdayMessage(name){
    const firstName=String(name||'').trim().split(/\s+/)[0]||'irmão(ã)';
    return `Graça e paz, ${firstName}!\n\nHoje queremos agradecer a Deus por sua vida e desejar um feliz aniversário. Que o Senhor continue abençoando você e sua família, concedendo saúde, graça e muitos anos em Sua presença.\n\nCom carinho,\nIgreja Batista Nova Família.`;
  }
  function renderPublic(items){
    if(!items.length)return '<div class="empty"><div>Hoje não há aniversariantes cadastrados.</div></div>';
    return items.map(p=>`<div class="birthday-card"><div class="birthday-date"><b>Hoje</b><small>Parabéns!</small></div><div class="birthday-info"><strong>${esc(p.nome)}</strong><span>A IB Nova Família celebra sua vida neste dia.</span></div></div>`).join('');
  }
  function renderPrivate(items){
    if(!items.length)return '<div class="empty"><div>Nenhum aniversário nos próximos 7 dias.</div></div>';
    return items.map(p=>{
      const d=daysUntil(p.next);
      const label=d===0?'Hoje':d===1?'Amanhã':`Em ${d} dias`;
      const phone=normalizePhone(p.telefone);
      const action=d===0
        ? phone
          ? `<button type="button" class="primary birthday-whatsapp" data-phone="${esc(phone)}" data-name="${esc(p.nome)}">🎂 Enviar parabéns</button>`
          : '<small class="birthday-no-phone">Telefone/WhatsApp não cadastrado.</small>'
        : '';
      return `<div class="birthday-card"><div class="birthday-date"><b>${String(p.next.getDate()).padStart(2,'0')}/${String(p.next.getMonth()+1).padStart(2,'0')}</b><small>${label}</small></div><div class="birthday-info"><strong>${esc(p.nome)}</strong>${action}</div></div>`;
    }).join('');
  }
  function bindWhatsappButtons(){
    document.querySelectorAll('.birthday-whatsapp').forEach(btn=>btn.addEventListener('click',()=>{
      const phone=normalizePhone(btn.dataset.phone);
      if(!phone){alert('Este membro não possui telefone/WhatsApp válido cadastrado.');return;}
      const message=birthdayMessage(btn.dataset.name);
      const url=`https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      const opened=window.open(url,'_blank','noopener');
      if(!opened)window.location.href=url;
    }));
  }
  async function openBirthdays(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Aniversariantes','<div class="birthday-loading">Carregando aniversariantes...</div>');
    const {data:{session}}=await client.auth.getSession();
    if(session){
      const {data,error}=await client.from('pessoas').select('nome,nascimento,telefone').eq('ativo',true).eq('tipo','membro').not('nascimento','is',null);
      if(error){window.openPanel('Aniversariantes',`<div class="error-box">Não foi possível carregar os próximos aniversários: ${esc(error.message)}</div>`);return}
      const upcoming=(data||[]).map(p=>{const n=nextBirthday(p.nascimento);return n?{...p,next:n.date}:null}).filter(Boolean).filter(p=>{const d=daysUntil(p.next);return d>=0&&d<=7}).sort((a,b)=>a.next-b.next||a.nome.localeCompare(b.nome,'pt-BR'));
      const html=`<div class="social-intro"><span class="section-kicker">Área interna</span><h3>Próximos 7 dias</h3><p>Usuários logados podem consultar antecipadamente os aniversários da semana. No dia do aniversário, o botão abre o WhatsApp com a mensagem pronta, sem uso da API paga.</p></div><div class="birthday-list">${renderPrivate(upcoming)}</div>`;
      window.openPanel('Aniversariantes',html);
      bindWhatsappButtons();
      return;
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
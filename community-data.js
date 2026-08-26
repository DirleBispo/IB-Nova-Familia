(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const feedback=(id,msg,type='success')=>{const el=document.querySelector(id);if(el)el.innerHTML=`<div class="${type}">${msg}</div>`};

  async function openAvisos(){
    window.openPanel('Avisos','<div class="data-loading">Carregando avisos oficiais...</div>');
    const {data,error}=await client.from('avisos').select('id,titulo,texto,publicado,criado_em').eq('publicado',true).order('criado_em',{ascending:false});
    if(error){window.openPanel('Avisos',`<div class="error-box">Não foi possível carregar os avisos: ${esc(error.message)}</div>`);return}
    const list=(data||[]).map(a=>`<article class="official-notice"><div class="official-notice-top"><span>COMUNICADO OFICIAL</span><time>${new Date(a.criado_em).toLocaleDateString('pt-BR')}</time></div><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></article>`).join('');
    window.openPanel('Avisos',`<div class="social-intro"><span class="section-kicker">Canal oficial</span><h3>Comunicados da igreja</h3><p>Os avisos publicados aqui vêm diretamente do sistema da IB Nova Família.</p></div>${list||'<div class="empty"><div>Nenhum aviso publicado no momento.</div></div>'}`);
  }

  function openOracao(){
    window.openPanel('Pedido de oração',`<div class="social-intro"><span class="section-kicker">Cuidado pastoral</span><h3>Envie seu pedido de oração</h3><p>Seu pedido será registrado no sistema da igreja para acompanhamento da equipe responsável.</p></div><form class="form" id="oracaoSupabaseForm"><input name="nome" placeholder="Seu nome" required><input name="telefone" placeholder="Telefone / WhatsApp (opcional)"><textarea name="pedido" placeholder="Digite seu pedido de oração" required></textarea><button class="primary">Enviar pedido</button></form><div id="oracaoFeedback"></div>`);
    document.querySelector('#oracaoSupabaseForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Enviando...';const {error}=await client.from('pedidos_oracao').insert({nome:f.get('nome').trim(),telefone:f.get('telefone').trim()||null,pedido:f.get('pedido').trim()});btn.disabled=false;btn.textContent='Enviar pedido';if(error){feedback('#oracaoFeedback',esc(error.message),'error-box');return}e.target.reset();feedback('#oracaoFeedback','Pedido enviado com sucesso. A equipe da igreja poderá acompanhar pelo sistema.');};
  }

  function openVisitas(){
    window.openPanel('Solicitar visita',`<div class="social-intro"><span class="section-kicker">Acompanhamento</span><h3>Solicite uma visita</h3><p>Preencha seus dados para que a equipe da igreja possa entrar em contato.</p></div><form class="form" id="visitaSupabaseForm"><input name="nome" placeholder="Nome completo" required><input name="telefone" placeholder="Telefone / WhatsApp" required><textarea name="observacao" placeholder="Motivo ou melhor horário para contato"></textarea><button class="primary">Solicitar visita</button></form><div id="visitaFeedback"></div>`);
    document.querySelector('#visitaSupabaseForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Enviando...';const {error}=await client.from('visitas').insert({nome:f.get('nome').trim(),telefone:f.get('telefone').trim(),observacao:f.get('observacao').trim()||null});btn.disabled=false;btn.textContent='Solicitar visita';if(error){feedback('#visitaFeedback',esc(error.message),'error-box');return}e.target.reset();feedback('#visitaFeedback','Solicitação enviada com sucesso. A equipe da igreja poderá acompanhar pelo sistema.');};
  }

  window.showView=function(view){
    if(view==='notificacoes'){openAvisos();return;}
    if(view==='oracao'){openOracao();return;}
    if(view==='visitas'){openVisitas();return;}
    return originalShowView(view);
  };
})();
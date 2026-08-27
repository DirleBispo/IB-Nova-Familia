(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const originalShowView=window.showView;
  const WORKER='https://ibnf-pwa-backend.dirleibispo.workers.dev';
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const feedback=(id,msg,type='success')=>{const el=document.querySelector(id);if(el)el.innerHTML=`<div class="${type}">${msg}</div>`};

  async function postWorker(route,payload){
    const r=await fetch(WORKER+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let data={}; try{data=await r.json()}catch(_){data={}}
    if(!r.ok||data.sucesso===false)throw new Error(data.mensagem||data.erro||'Falha ao enviar para o backend da igreja.');
    return data;
  }

  async function openAvisos(){
    window.openPanel('Avisos','<div class="data-loading">Carregando avisos oficiais...</div>');
    const {data,error}=await client.from('avisos').select('id,titulo,texto,publicado,criado_em').eq('publicado',true).order('criado_em',{ascending:false});
    if(error){window.openPanel('Avisos',`<div class="error-box">Não foi possível carregar os avisos: ${esc(error.message)}</div>`);return}
    const list=(data||[]).map(a=>`<article class="official-notice"><div class="official-notice-top"><span>COMUNICADO OFICIAL</span><time>${new Date(a.criado_em).toLocaleDateString('pt-BR')}</time></div><h3>${esc(a.titulo)}</h3><p>${esc(a.texto)}</p></article>`).join('');
    window.openPanel('Avisos',`<div class="social-intro"><span class="section-kicker">Canal oficial</span><h3>Comunicados da igreja</h3><p>Os avisos publicados aqui vêm diretamente do sistema da IB Nova Família.</p></div>${list||'<div class="empty"><div>Nenhum aviso publicado no momento.</div></div>'}`);
  }

  function openOracao(){
    window.openPanel('Pedido de oração',`<div class="social-intro"><span class="section-kicker">Cuidado pastoral</span><h3>Envie seu pedido de oração</h3><p>O pedido fica registrado no sistema e também é encaminhado aos canais internos da igreja.</p></div><form class="form" id="oracaoSupabaseForm"><input name="nome" placeholder="Seu nome" required><input name="telefone" placeholder="Telefone / WhatsApp (opcional)"><textarea name="pedido" placeholder="Digite seu pedido de oração" required></textarea><button class="primary">Enviar pedido</button></form><div id="oracaoFeedback"></div>`);
    document.querySelector('#oracaoSupabaseForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Enviando...';try{
      const payload={nome:f.get('nome').trim(),telefone:f.get('telefone').trim()||null,pedido:f.get('pedido').trim()};
      const [sb,cf]=await Promise.allSettled([client.from('pedidos_oracao').insert(payload),postWorker('/telegram/oracao',{nome:payload.nome,pedido:payload.pedido})]);
      if(sb.status==='fulfilled'&&sb.value.error)throw sb.value.error;
      if(cf.status==='rejected')throw cf.reason;
      e.target.reset();feedback('#oracaoFeedback','Pedido enviado com sucesso.');
    }catch(err){feedback('#oracaoFeedback',esc(err.message),'error-box')}finally{btn.disabled=false;btn.textContent='Enviar pedido'}};
  }

  function openVisitas(){
    const today=new Date().toISOString().slice(0,10);
    window.openPanel('Solicitar visita',`<div class="social-intro"><span class="section-kicker">Acompanhamento</span><h3>Solicite uma visita pastoral</h3><p>Informe o melhor dia, horário e endereço para a equipe entrar em contato.</p></div><form class="form" id="visitaSupabaseForm"><input name="nome" placeholder="Nome completo" required><input name="telefone" placeholder="Telefone / WhatsApp" required><input name="data" type="date" min="${today}" required><input name="hora" type="time" required><input name="endereco" placeholder="Endereço completo" required><textarea name="motivo" placeholder="Motivo da visita (opcional)"></textarea><button class="primary">Solicitar visita</button></form><div id="visitaFeedback"></div>`);
    document.querySelector('#visitaSupabaseForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Enviando...';try{
      const payload={nome:f.get('nome').trim(),telefone:f.get('telefone').trim(),data:f.get('data'),hora:f.get('hora'),endereco:f.get('endereco').trim(),motivo:f.get('motivo').trim()||''};
      const sbPayload={nome:payload.nome,telefone:payload.telefone,observacao:`Data: ${payload.data} | Hora: ${payload.hora} | Endereço: ${payload.endereco}${payload.motivo?' | Motivo: '+payload.motivo:''}`};
      const [sb,cf]=await Promise.allSettled([client.from('visitas').insert(sbPayload),postWorker('/telegram/visita',payload)]);
      if(sb.status==='fulfilled'&&sb.value.error)throw sb.value.error;
      if(cf.status==='rejected')throw cf.reason;
      e.target.reset();feedback('#visitaFeedback','Solicitação enviada com sucesso.');
    }catch(err){feedback('#visitaFeedback',esc(err.message),'error-box')}finally{btn.disabled=false;btn.textContent='Solicitar visita'}};
  }

  window.showView=function(view){if(view==='notificacoes'){openAvisos();return}if(view==='oracao'){openOracao();return}if(view==='visitas'){openVisitas();return}return originalShowView(view)};
})();
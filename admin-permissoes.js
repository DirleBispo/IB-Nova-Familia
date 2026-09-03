(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const pretty=p=>({membro:'Membro',lider:'Líder',secretaria:'Secretaria',tesouraria:'Tesouraria',pastor:'Pastor',admin:'Administrador'}[p]||p||'Membro');

  async function adminAtual(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return null;
    const {data}=await sb.from('perfis').select('id,perfil,ativo').eq('id',session.user.id).maybeSingle();
    return data?.ativo&&['pastor','admin'].includes(data.perfil)?data:null;
  }

  function permsOf(p,profile){return Object.assign({},defaults(profile),p||{})}
  function defaults(profile){
    if(profile==='admin'||profile==='pastor')return {financeiro:true,pessoas:true,pastoral:true,acessos:true,avisos:true};
    if(profile==='tesouraria')return {financeiro:true,pessoas:false,pastoral:false,acessos:false,avisos:false};
    if(profile==='secretaria')return {financeiro:false,pessoas:true,pastoral:false,acessos:false,avisos:true};
    return {financeiro:false,pessoas:false,pastoral:false,acessos:false,avisos:false};
  }

  async function salvar(id){
    const perfil=document.querySelector(`#perfil-${id}`)?.value||'membro';
    const p={}; ['financeiro','pessoas','pastoral','acessos','avisos'].forEach(k=>p[k]=!!document.querySelector(`#perm-${k}-${id}`)?.checked);
    if(perfil==='tesouraria')p.financeiro=true;
    const button=document.querySelector(`#perfil-${id}`)?.closest('.access-user')?.querySelector('.primary');
    const originalText=button?.textContent;
    if(button){button.disabled=true;button.textContent='Salvando...'}
    const {error}=await sb.rpc('ibnf_aprovar_usuario',{alvo:id,novo_perfil:perfil,novas_permissoes:p});
    if(error){
      if(button){button.disabled=false;button.textContent=originalText}
      alert(error.message);
      return;
    }
    abrir('Privilégios salvos com sucesso.');
  }
  async function suspender(id){
    if(!confirm('Suspender o acesso deste usuário?'))return;
    const {error}=await sb.rpc('ibnf_suspender_usuario',{alvo:id});
    if(error){alert(error.message);return}
    abrir();
  }
  window.ibnfSalvarPermissoes=salvar; window.ibnfSuspenderUsuario=suspender;
  window.ibnfAplicarPadrao=function(id){
    const perfil=document.querySelector(`#perfil-${id}`)?.value||'membro',p=defaults(perfil);
    Object.keys(p).forEach(k=>{const el=document.querySelector(`#perm-${k}-${id}`);if(el)el.checked=p[k]});
  };
  window.ibnfCompartilharCadastro=async function(){
    const url=`${location.origin}/cadastro`;
    const data={title:'Cadastro | IB Nova Família',text:'Olá! Faça seu cadastro no aplicativo da IB Nova Família:',url};
    try{
      if(navigator.share){await navigator.share(data);return}
      await navigator.clipboard.writeText(url);alert('Link de cadastro copiado. Agora é só colar e enviar.');
    }catch(error){if(error?.name!=='AbortError')alert('Não foi possível compartilhar. Toque no link para selecioná-lo e copiar.')}
  };

  function card(u){
    const p=permsOf(u.permissoes,u.perfil),status=u.ativo?'Ativo':'Aguardando aprovação';
    return `<article class="access-user ${u.ativo?'approved':'pending'}"><div class="access-user-head"><div><b>${esc(u.nome||'Sem nome')}</b><small>${esc(u.telefone||'Sem telefone')} · ${status}</small></div><span class="access-badge">${pretty(u.perfil)}</span></div><label>Perfil<select id="perfil-${u.id}" onchange="ibnfAplicarPadrao('${u.id}')"><option value="membro" ${u.perfil==='membro'?'selected':''}>Membro</option><option value="lider" ${u.perfil==='lider'?'selected':''}>Líder</option><option value="secretaria" ${u.perfil==='secretaria'?'selected':''}>Secretaria</option><option value="tesouraria" ${u.perfil==='tesouraria'?'selected':''}>Tesouraria</option><option value="pastor" ${u.perfil==='pastor'?'selected':''}>Pastor</option><option value="admin" ${u.perfil==='admin'?'selected':''}>Administrador</option></select></label><div class="perm-grid"><label><input type="checkbox" id="perm-financeiro-${u.id}" ${p.financeiro?'checked':''}> Financeiro</label><label><input type="checkbox" id="perm-pessoas-${u.id}" ${p.pessoas?'checked':''}> Pessoas</label><label><input type="checkbox" id="perm-pastoral-${u.id}" ${p.pastoral?'checked':''}> Painel Pastoral</label><label><input type="checkbox" id="perm-acessos-${u.id}" ${p.acessos?'checked':''}> Gerenciar acessos</label><label><input type="checkbox" id="perm-avisos-${u.id}" ${p.avisos?'checked':''}> Gerenciar avisos</label></div><div class="access-user-actions"><button class="primary" onclick="ibnfSalvarPermissoes('${u.id}')">${u.ativo?'Salvar permissões':'Aprovar acesso'}</button>${u.ativo?`<button class="secondary-action" onclick="ibnfSuspenderUsuario('${u.id}')">Suspender</button>`:''}</div></article>`;
  }

  async function abrir(feedback=''){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Usuários e Permissões','<div class="data-loading">Carregando usuários...</div>');
    if(!(await adminAtual())){window.openPanel('Usuários e Permissões','<div class="error-box">Área permitida somente ao Pastor/Administrador.</div>');return}
    const {data,error}=await sb.from('perfis').select('id,nome,telefone,perfil,ativo,permissoes,criado_em').order('ativo',{ascending:true}).order('criado_em',{ascending:false});
    if(error){window.openPanel('Usuários e Permissões',`<div class="error-box">${esc(error.message)}</div>`);return}
    const pend=(data||[]).filter(x=>!x.ativo),ativos=(data||[]).filter(x=>x.ativo);
    window.openPanel('Usuários e Permissões',`<div class="social-intro"><span class="section-kicker">Administração</span><h3>Aprovação e níveis de acesso</h3><p>Novas contas entram sem acesso administrativo. Aprove a pessoa e libere somente as áreas necessárias.</p><div class="invite-box"><b>Link para novo cadastro</b><input value="${location.origin}/cadastro" readonly onclick="this.select()"><button class="primary" type="button" onclick="ibnfCompartilharCadastro()">Compartilhar cadastro</button><small>Envie este link para a pessoa criar a própria conta.</small></div></div>${feedback?`<div class="success access-feedback">${esc(feedback)}</div>`:''}<section class="access-group"><h3>Aguardando aprovação (${pend.length})</h3>${pend.map(card).join('')||'<div class="empty"><div>Nenhuma solicitação pendente.</div></div>'}</section><details class="access-group access-active"><summary>Usuários ativos (${ativos.length})</summary><div class="access-active-list">${ativos.map(card).join('')||'<div class="empty"><div>Nenhum usuário ativo.</div></div>'}</div></details>`);
  }

  window.ibnfAbrirPermissoes=abrir;
  const prev=window.showView;
  window.showView=function(view){if(view==='acessos'){abrir();return}return prev(view)};
})();

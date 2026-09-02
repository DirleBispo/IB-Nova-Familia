(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  let notices=[];

  async function editorAccess(){
    const {data:{session},error:sessionError}=await sb.auth.getSession();
    if(sessionError||!session)return {allowed:false,session:null,profile:null};
    const {data:profile,error}=await sb.from('perfis').select('id,perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();
    if(error||!profile?.ativo)return {allowed:false,session,profile:null};
    const allowed=['pastor','admin','secretaria'].includes(profile.perfil)||profile.permissoes?.avisos===true;
    return {allowed,session,profile};
  }

  function formatDate(value){
    const date=new Date(value);
    return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});
  }

  function noticeCard(notice){
    const status=notice.publicado?'Publicado':'Rascunho';
    return `<article class="notice-admin-card ${notice.publicado?'is-published':'is-draft'}">
      <div class="notice-admin-card-head">
        <div><span class="notice-status">${status}</span><small>${formatDate(notice.criado_em)}</small></div>
        <div class="notice-admin-actions">
          <button class="secondary-action" type="button" data-edit-notice="${esc(notice.id)}">Editar</button>
          <button class="danger-action" type="button" data-delete-notice="${esc(notice.id)}" data-delete-title="${esc(notice.titulo)}">Excluir</button>
        </div>
      </div>
      <h4>${esc(notice.titulo)}</h4>
      <p>${esc(notice.texto)}</p>
    </article>`;
  }

  function editorMarkup(editing,feedback=''){
    const title=editing?.titulo||'';
    const text=editing?.texto||'';
    const published=editing?editing.publicado:true;
    return `<div class="social-intro notice-admin-intro">
      <span class="section-kicker">Comunicação da igreja</span>
      <h3>${editing?'Editar aviso':'Criar novo aviso'}</h3>
      <p>Os avisos publicados ficam disponíveis também para visitantes sem cadastro.</p>
    </div>
    <form class="form notice-admin-form" id="noticeAdminForm">
      <input type="hidden" name="id" value="${esc(editing?.id||'')}">
      <label>Título do aviso<input name="titulo" maxlength="120" value="${esc(title)}" placeholder="Ex.: Culto especial neste domingo" required></label>
      <label>Mensagem<textarea name="texto" maxlength="2000" placeholder="Digite todas as informações do comunicado" required>${esc(text)}</textarea></label>
      <label class="notice-publish-toggle"><input name="publicado" type="checkbox" ${published?'checked':''}><span><b>Publicar para todos</b><small>Desmarque para salvar como rascunho.</small></span></label>
      <div class="notice-form-actions">
        <button class="primary" type="submit">${editing?'Salvar alterações':'Criar aviso'}</button>
        ${editing?'<button class="secondary-action" id="cancelNoticeEdit" type="button">Cancelar edição</button>':''}
      </div>
    </form>
    <div id="noticeAdminFeedback">${feedback}</div>
    <section class="notice-admin-list">
      <div class="notice-admin-list-head"><div><span class="section-kicker">Avisos cadastrados</span><h3>Publicados e rascunhos</h3></div>${editing?'<button class="secondary-action" id="newNoticeBtn" type="button">Novo aviso</button>':''}</div>
      ${notices.map(noticeCard).join('')||'<div class="empty"><div>Nenhum aviso cadastrado ainda.</div></div>'}
    </section>`;
  }

  function bindEditor(access,editing){
    const form=document.querySelector('#noticeAdminForm');
    if(!form)return;
    form.onsubmit=async event=>{
      event.preventDefault();
      const data=new FormData(form);
      const id=String(data.get('id')||'');
      const titulo=String(data.get('titulo')||'').trim();
      const texto=String(data.get('texto')||'').trim();
      const publicado=data.get('publicado')==='on';
      const feedback=document.querySelector('#noticeAdminFeedback');
      const button=form.querySelector('button[type="submit"]');
      if(!titulo||!texto){feedback.innerHTML='<div class="error-box">Preencha o título e a mensagem do aviso.</div>';return}
      button.disabled=true;
      button.textContent=id?'Salvando...':'Criando...';
      const payload={titulo,texto,publicado};
      const result=id
        ?await sb.from('avisos').update(payload).eq('id',id)
        :await sb.from('avisos').insert({...payload,criado_por:access.session.user.id});
      if(result.error){
        feedback.innerHTML=`<div class="error-box">Não foi possível salvar: ${esc(result.error.message)}</div>`;
        button.disabled=false;
        button.textContent=id?'Salvar alterações':'Criar aviso';
        return;
      }
      await openNoticeAdmin(null,`<div class="success">${id?'Aviso atualizado':'Aviso criado'} com sucesso.</div>`);
    };
    document.querySelector('#cancelNoticeEdit')?.addEventListener('click',()=>openNoticeAdmin());
    document.querySelector('#newNoticeBtn')?.addEventListener('click',()=>openNoticeAdmin());
    document.querySelectorAll('[data-edit-notice]').forEach(button=>button.addEventListener('click',()=>openNoticeAdmin(button.dataset.editNotice)));
    document.querySelectorAll('[data-delete-notice]').forEach(button=>button.addEventListener('click',async()=>{
      const id=button.dataset.deleteNotice;
      const title=button.dataset.deleteTitle||'este aviso';
      if(!confirm(`Excluir definitivamente o aviso “${title}”?`))return;
      button.disabled=true;button.textContent='Excluindo...';
      const response=await fetch('/api/notices-delete',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${access.session.access_token}`},body:JSON.stringify({id})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){alert(result.error||'Não foi possível excluir o aviso.');button.disabled=false;button.textContent='Excluir';return}
      await openNoticeAdmin(null,'<div class="success">Aviso excluído com sucesso.</div>');
    }));
  }

  async function openNoticeAdmin(editId=null,feedback=''){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Gerenciar avisos','<div class="data-loading">Carregando avisos...</div>');
    const access=await editorAccess();
    if(!access.allowed){
      window.openPanel('Gerenciar avisos','<div class="error-box">Esta área está disponível somente para usuários autorizados a publicar avisos.</div>');
      return;
    }
    const {data,error}=await sb.from('avisos').select('id,titulo,texto,publicado,criado_em').order('criado_em',{ascending:false});
    if(error){window.openPanel('Gerenciar avisos',`<div class="error-box">Não foi possível carregar os avisos: ${esc(error.message)}</div>`);return}
    notices=data||[];
    const editing=editId?notices.find(item=>item.id===editId):null;
    window.openPanel('Gerenciar avisos',editorMarkup(editing,feedback));
    bindEditor(access,editing);
    setTimeout(()=>document.querySelector('#noticeAdminForm input[name="titulo"]')?.focus({preventScroll:true}),150);
  }

  async function addProfileAction(){
    const logout=document.querySelector('#logoutBtn');
    if(!logout||document.querySelector('#manageNoticesBtn'))return;
    const access=await editorAccess();
    if(!access.allowed)return;
    const button=document.createElement('button');
    button.type='button';
    button.id='manageNoticesBtn';
    button.className='primary notice-profile-action';
    button.textContent='Gerenciar avisos';
    button.addEventListener('click',()=>openNoticeAdmin());
    logout.before(button);
  }

  window.ibnfAbrirGerenciarAvisos=openNoticeAdmin;
  const previousShowView=window.showView;
  window.showView=function(view){
    if(view==='avisos-admin'){openNoticeAdmin();return}
    const result=previousShowView(view);
    if(view==='perfil')setTimeout(addProfileAction,80);
    return result;
  };
  sb.auth.onAuthStateChange(()=>setTimeout(addProfileAction,100));
})();
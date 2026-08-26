(() => {
  const baseShowView = window.showView;

  function fmtDate(v){
    if(!v) return '—';
    const [y,m,d]=String(v).slice(0,10).split('-');
    return y&&m&&d?`${d}/${m}/${y}`:v;
  }
  function ageFrom(v){
    if(!v) return '';
    const b=new Date(`${v}T12:00:00`),n=new Date();
    let a=n.getFullYear()-b.getFullYear();
    if(n.getMonth()<b.getMonth()||(n.getMonth()===b.getMonth()&&n.getDate()<b.getDate()))a--;
    return a>=0?`${a} anos`:'';
  }
  function canManageMembers(){
    return !!state.user && ['pastor','secretaria'].includes(state.perfil?.perfil);
  }
  function isTeam(){
    return !!state.user && ['pastor','secretaria','tesouraria','lider'].includes(state.perfil?.perfil);
  }

  async function fetchMembers(){
    if(!supa) return {data:null,error:{message:'Supabase não conectado.'}};
    return await supa.from('pessoas')
      .select('id,nome,nascimento,telefone,email,sexo,estado_civil,conjuge,endereco,bairro,cidade,cep,data_conversao,data_batismo,cargo_funcao,status_revisao,observacao,tipo,ativo')
      .eq('tipo','membro')
      .order('nome',{ascending:true});
  }

  function memberForm(m={}){
    return `<form id="memberForm" class="member-form">
      <input type="hidden" name="id" value="${esc(m.id||'')}">
      <div class="member-form-grid">
        <label class="wide">Nome completo<input name="nome" required value="${esc(m.nome||'')}"></label>
        <label>Data de nascimento<input name="nascimento" type="date" value="${esc((m.nascimento||'').slice?.(0,10)||'')}"></label>
        <label>Telefone / WhatsApp<input name="telefone" value="${esc(m.telefone||'')}"></label>
        <label>E-mail<input name="email" type="email" value="${esc(m.email||'')}"></label>
        <label>Sexo<select name="sexo"><option value="">Não informado</option><option ${m.sexo==='Masculino'?'selected':''}>Masculino</option><option ${m.sexo==='Feminino'?'selected':''}>Feminino</option></select></label>
        <label>Estado civil<input name="estado_civil" value="${esc(m.estado_civil||'')}"></label>
        <label>Cônjuge<input name="conjuge" value="${esc(m.conjuge||'')}"></label>
        <label class="wide">Endereço<input name="endereco" value="${esc(m.endereco||'')}"></label>
        <label>Bairro<input name="bairro" value="${esc(m.bairro||'')}"></label>
        <label>Cidade<input name="cidade" value="${esc(m.cidade||'')}"></label>
        <label>CEP<input name="cep" value="${esc(m.cep||'')}"></label>
        <label>Conversão<input name="data_conversao" type="date" value="${esc((m.data_conversao||'').slice?.(0,10)||'')}"></label>
        <label>Batismo<input name="data_batismo" type="date" value="${esc((m.data_batismo||'').slice?.(0,10)||'')}"></label>
        <label>Cargo / função<input name="cargo_funcao" value="${esc(m.cargo_funcao||'')}"></label>
        <label>Status<select name="status_revisao"><option ${m.status_revisao!=='REVISAR'?'selected':''}>OK</option><option ${m.status_revisao==='REVISAR'?'selected':''}>REVISAR</option></select></label>
        <label class="wide">Observação<textarea name="observacao" rows="3">${esc(m.observacao||'')}</textarea></label>
      </div>
      <div class="member-form-actions"><button type="button" class="secondary-action" id="cancelMember">Cancelar</button><button class="primary">${m.id?'Salvar alterações':'Cadastrar membro'}</button></div>
      <div id="memberFormFeedback"></div>
    </form>`;
  }

  function memberCard(m){
    const initials=(m.nome||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    const review=m.status_revisao==='REVISAR';
    return `<article class="member-row" data-id="${esc(m.id)}" data-search="${esc([m.nome,m.telefone,m.email,m.cargo_funcao,m.bairro].filter(Boolean).join(' ').toLowerCase())}" data-review="${review?'1':'0'}">
      <div class="member-avatar">${esc(initials)}</div>
      <div class="member-main"><strong>${esc(m.nome)}</strong><span>${esc(m.cargo_funcao||'Membro')} ${m.nascimento?`• ${fmtDate(m.nascimento)} ${ageFrom(m.nascimento)?`(${ageFrom(m.nascimento)})`:''}`:''}</span><small>${esc(m.telefone||m.email||'Sem contato informado')}</small></div>
      ${review?'<span class="review-badge">Revisar</span>':''}
      <button class="member-detail-btn" data-member-id="${esc(m.id)}" aria-label="Abrir cadastro">›</button>
    </article>`;
  }

  async function showMembers(){
    if(!state.user){
      openPanel('Membros','<div class="members-empty"><h3>Área restrita</h3><p>Entre em <b>Meu acesso</b> para consultar o cadastro de membros.</p><button class="primary" id="goLogin">Fazer login</button></div>');
      document.querySelector('#goLogin')?.addEventListener('click',()=>baseShowView('perfil'));
      return;
    }
    if(!isTeam()){
      openPanel('Membros','<div class="error-box">Seu perfil não possui permissão para consultar os dados dos membros.</div>');
      return;
    }
    openPanel('Membros','<div class="members-loading">Carregando membros do banco de dados…</div>');
    const {data,error}=await fetchMembers();
    if(error){
      openPanel('Membros',`<div class="error-box">${esc(error.message)}</div>`);
      return;
    }
    state.pessoas=data||[];
    const total=state.pessoas.length;
    const revisar=state.pessoas.filter(x=>x.status_revisao==='REVISAR').length;
    const comNascimento=state.pessoas.filter(x=>x.nascimento).length;
    openPanel('Membros',`
      <section class="members-dashboard">
        <div class="members-head"><div><span class="section-kicker">Cadastro oficial</span><h3>Comunidade da IB Nova Família</h3><p>Dados sincronizados com o Supabase.</p></div>${canManageMembers()?'<button class="primary" id="newMemberBtn">+ Novo membro</button>':''}</div>
        <div class="member-stats"><div><b>${total}</b><span>Membros</span></div><div><b>${comNascimento}</b><span>Com nascimento</span></div><div class="${revisar?'attention':''}"><b>${revisar}</b><span>Para revisar</span></div></div>
        <div class="member-toolbar"><input id="memberSearch" type="search" placeholder="Pesquisar por nome, telefone, função…"><label class="review-filter"><input id="reviewOnly" type="checkbox"> Mostrar somente pendentes</label></div>
        <div id="membersList" class="members-list">${state.pessoas.map(memberCard).join('')}</div>
        <div id="membersNoResult" class="members-no-result hidden">Nenhum membro encontrado.</div>
      </section>
    `);
    bindMembers();
  }

  function bindMembers(){
    const search=document.querySelector('#memberSearch');
    const reviewOnly=document.querySelector('#reviewOnly');
    const filter=()=>{
      const q=(search?.value||'').trim().toLowerCase();
      const only=!!reviewOnly?.checked;
      let visible=0;
      document.querySelectorAll('.member-row').forEach(row=>{
        const show=(!q||row.dataset.search.includes(q))&&(!only||row.dataset.review==='1');
        row.classList.toggle('hidden',!show); if(show)visible++;
      });
      document.querySelector('#membersNoResult')?.classList.toggle('hidden',visible!==0);
    };
    search?.addEventListener('input',filter); reviewOnly?.addEventListener('change',filter);
    document.querySelector('#newMemberBtn')?.addEventListener('click',()=>openMemberEditor());
    document.querySelectorAll('.member-detail-btn').forEach(btn=>btn.addEventListener('click',()=>{
      const m=state.pessoas.find(x=>x.id===btn.dataset.memberId); if(m)openMemberDetail(m);
    }));
  }

  function openMemberDetail(m){
    openPanel('Cadastro do membro',`
      <div class="member-profile">
        <div class="member-profile-head"><div class="member-avatar big">${esc((m.nome||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</div><div><span class="section-kicker">Membro</span><h3>${esc(m.nome)}</h3><p>${esc(m.cargo_funcao||'Sem função cadastrada')}</p></div></div>
        <div class="member-detail-grid">
          <div><span>Nascimento</span><b>${fmtDate(m.nascimento)}</b><small>${ageFrom(m.nascimento)}</small></div>
          <div><span>Telefone</span><b>${esc(m.telefone||'—')}</b></div>
          <div><span>E-mail</span><b>${esc(m.email||'—')}</b></div>
          <div><span>Estado civil</span><b>${esc(m.estado_civil||'—')}</b></div>
          <div><span>Cônjuge</span><b>${esc(m.conjuge||'—')}</b></div>
          <div><span>Endereço</span><b>${esc([m.endereco,m.bairro,m.cidade,m.cep].filter(Boolean).join(' • ')||'—')}</b></div>
          <div><span>Conversão</span><b>${fmtDate(m.data_conversao)}</b></div>
          <div><span>Batismo</span><b>${fmtDate(m.data_batismo)}</b></div>
          <div><span>Status</span><b class="${m.status_revisao==='REVISAR'?'text-attention':''}">${esc(m.status_revisao||'OK')}</b></div>
          <div><span>Observação</span><b>${esc(m.observacao||'—')}</b></div>
        </div>
        <div class="member-actions"><button class="secondary-action" id="backMembers">← Voltar à lista</button>${canManageMembers()?'<button class="primary" id="editMember">Editar cadastro</button><button class="danger-action" id="deleteMember">Excluir</button>':''}</div>
        <div id="memberDetailFeedback"></div>
      </div>`);
    document.querySelector('#backMembers')?.addEventListener('click',showMembers);
    document.querySelector('#editMember')?.addEventListener('click',()=>openMemberEditor(m));
    document.querySelector('#deleteMember')?.addEventListener('click',async()=>{
      if(!confirm(`Excluir o cadastro de ${m.nome}?`))return;
      const fb=document.querySelector('#memberDetailFeedback'); fb.innerHTML='<div class="setup-notice">Excluindo…</div>';
      const {error}=await supa.from('pessoas').delete().eq('id',m.id);
      if(error){fb.innerHTML=`<div class="error-box">${esc(error.message)}</div>`;return}
      await showMembers();
    });
  }

  function openMemberEditor(m={}){
    openPanel(m.id?'Editar membro':'Novo membro',memberForm(m));
    document.querySelector('#cancelMember')?.addEventListener('click',()=>m.id?openMemberDetail(m):showMembers());
    document.querySelector('#memberForm')?.addEventListener('submit',async e=>{
      e.preventDefault(); const f=new FormData(e.currentTarget),fb=document.querySelector('#memberFormFeedback');
      const payload={
        nome:f.get('nome')?.trim(), nascimento:f.get('nascimento')||null, telefone:f.get('telefone')?.trim()||null,
        email:f.get('email')?.trim()||null, sexo:f.get('sexo')||null, estado_civil:f.get('estado_civil')?.trim()||null,
        conjuge:f.get('conjuge')?.trim()||null, endereco:f.get('endereco')?.trim()||null, bairro:f.get('bairro')?.trim()||null,
        cidade:f.get('cidade')?.trim()||null, cep:f.get('cep')?.trim()||null, data_conversao:f.get('data_conversao')||null,
        data_batismo:f.get('data_batismo')||null, cargo_funcao:f.get('cargo_funcao')?.trim()||null,
        status_revisao:f.get('status_revisao')||'OK', observacao:f.get('observacao')?.trim()||null, tipo:'membro', ativo:true,
        criado_por:state.user?.id||null
      };
      fb.innerHTML='<div class="setup-notice">Salvando no banco…</div>';
      let result;
      if(m.id){ delete payload.criado_por; result=await supa.from('pessoas').update(payload).eq('id',m.id).select().single(); }
      else result=await supa.from('pessoas').insert(payload).select().single();
      if(result.error){fb.innerHTML=`<div class="error-box">${esc(result.error.message)}</div>`;return}
      await showMembers();
    });
  }

  window.showMembersDatabase=showMembers;
  window.showView=function(view){
    if(view==='pessoas') return showMembers();
    return baseShowView(view);
  };
})();
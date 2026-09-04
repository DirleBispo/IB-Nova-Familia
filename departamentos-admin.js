(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const departments=[
    {id:'louvor',nome:'Louvor',descricao:'Equipe de música e adoração'},
    {id:'jovens',nome:'Jovens',descricao:'Ministério de juventude'},
    {id:'recepcao',nome:'Recepção',descricao:'Boas-vindas e acolhimento'},
    {id:'visitas',nome:'Visitas',descricao:'Acompanhamento pastoral'}
  ];
  let assignments=[];
  let members=[];
  let managedDepartments=new Set();
  const safe=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  const profile=()=>window.IBNF_ACCESS?.getProfile?.();
  const isAdministration=()=>!!profile()?.ativo&&['pastor','admin','secretaria'].includes(profile()?.perfil);
  const canManage=departmentId=>isAdministration()||managedDepartments.has(departmentId);
  const department=id=>departments.find(item=>item.id===id);

  function memberName(item){return item.pessoas?.nome||members.find(person=>person.id===item.pessoa_id)?.nome||'Membro'}
  function teamRows(departmentId){
    const rows=assignments.filter(item=>item.departamento===departmentId);
    if(!rows.length)return '<div class="department-empty">Nenhuma pessoa adicionada nesta equipe.</div>';
    return rows.map(item=>`<div class="department-person"><div class="department-avatar">${safe(memberName(item).split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase())}</div><div><strong>${safe(memberName(item))}</strong><small>${safe(item.funcao||'Integrante da equipe')}</small></div>${canManage(departmentId)?`<div class="department-person-actions"><button type="button" data-edit-team="${safe(item.id)}">Editar</button><button type="button" class="danger" data-delete-team="${safe(item.id)}">Excluir</button></div>`:''}</div>`).join('');
  }
  function cards(){
    return departments.map(item=>`<article class="department-card"><div class="department-card-head"><div><span class="section-kicker">Departamento</span><h3>${safe(item.nome)}</h3><p>${safe(item.descricao)}</p></div>${canManage(item.id)?`<button type="button" class="primary department-add" data-add-team="${item.id}">+ Adicionar pessoa</button>`:''}</div><div class="department-team"><h4>Equipe</h4>${teamRows(item.id)}</div></article>`).join('');
  }
  function bindCards(){
    document.querySelectorAll('[data-add-team]').forEach(button=>button.addEventListener('click',()=>openEditor({departamento:button.dataset.addTeam})));
    document.querySelectorAll('[data-edit-team]').forEach(button=>button.addEventListener('click',()=>{const item=assignments.find(row=>row.id===button.dataset.editTeam);if(item)openEditor(item)}));
    document.querySelectorAll('[data-delete-team]').forEach(button=>button.addEventListener('click',()=>removeAssignment(button.dataset.deleteTeam)));
  }
  async function openDepartments(){
    window.openPanel('Departamentos','<div class="members-loading">Carregando equipes...</div>');
    const {data:{session}}=await client.auth.getSession();
    if(!session){window.openPanel('Departamentos',`<div class="social-intro"><span class="section-kicker">Ministérios</span><h3>Departamentos da igreja</h3><p>Conheça as áreas que servem à IB Nova Família.</p></div>${departments.map(item=>`<div class="list-item"><b>${safe(item.nome)}</b><small>${safe(item.descricao)}</small></div>`).join('')}`);return}
    const [teamsResult,membersResult,leadersResult]=await Promise.all([
      client.from('departamento_equipes').select('id,departamento,pessoa_id,funcao,pessoas(nome)').order('criado_em',{ascending:true}),
      client.from('pessoas').select('id,nome').eq('ativo',true).eq('tipo','membro').order('nome',{ascending:true}),
      client.from('departamento_lideres').select('departamento')
    ]);
    if(teamsResult.error){
      const setup=teamsResult.error.code==='42P01'||/departamento_equipes/i.test(teamsResult.error.message||'');
      window.openPanel('Departamentos',`<div class="error-box">${setup?'A área de equipes precisa ser ativada uma única vez no banco de dados.':'Não foi possível carregar as equipes: '+safe(teamsResult.error.message)}</div>`);
      return;
    }
    assignments=teamsResult.data||[];
    members=membersResult.data||[];
    managedDepartments=new Set((leadersResult.data||[]).map(item=>item.departamento));
    window.openPanel('Departamentos',`<div class="social-intro"><span class="section-kicker">Ministérios</span><h3>Equipes da IB Nova Família</h3><p>${isAdministration()||managedDepartments.size?'Adicione membros, defina suas funções e mantenha sua equipe organizada.':'Consulte os integrantes e suas funções em cada departamento.'}</p></div><div class="departments-grid">${cards()}</div>`);
    bindCards();
  }
  function openEditor(item){
    if(!canManage(item.departamento))return;
    const editing=!!item.id;
    const departmentOptions=isAdministration()?departments:departments.filter(dep=>managedDepartments.has(dep.id));
    const choices=members.map(member=>`<option value="${safe(member.id)}" ${member.id===item.pessoa_id?'selected':''}>${safe(member.nome)}</option>`).join('');
    window.openPanel(editing?'Editar integrante':'Adicionar à equipe',`<form class="department-form" id="departmentTeamForm"><label>Departamento<select name="departamento" required>${departmentOptions.map(dep=>`<option value="${dep.id}" ${dep.id===item.departamento?'selected':''}>${safe(dep.nome)}</option>`).join('')}</select></label><label>Pessoa<select name="pessoa_id" required ${editing?'disabled':''}><option value="">Selecione um membro</option>${choices}</select></label><label>Função na equipe<input name="funcao" maxlength="80" placeholder="Ex.: Líder, vocal ou auxiliar" value="${safe(item.funcao||'')}"></label><div class="department-form-actions"><button type="button" class="secondary-action" id="cancelTeamEdit">Cancelar</button><button class="primary">${editing?'Salvar alterações':'Adicionar pessoa'}</button></div><div id="departmentTeamFeedback"></div></form>`);
    document.querySelector('#cancelTeamEdit')?.addEventListener('click',openDepartments);
    document.querySelector('#departmentTeamForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const form=new FormData(event.currentTarget),feedback=document.querySelector('#departmentTeamFeedback');
      const payload={departamento:form.get('departamento'),funcao:form.get('funcao')?.trim()||null};
      if(!canManage(payload.departamento)){feedback.innerHTML='<div class="error-box">Você não possui permissão para este departamento.</div>';return}
      if(!editing)payload.pessoa_id=form.get('pessoa_id');
      feedback.innerHTML='<div class="setup-notice">Salvando...</div>';
      const result=editing?await client.from('departamento_equipes').update(payload).eq('id',item.id):await client.from('departamento_equipes').insert(payload);
      if(result.error){feedback.innerHTML=`<div class="error-box">${result.error.code==='23505'?'Esta pessoa já faz parte desse departamento.':safe(result.error.message)}</div>`;return}
      await openDepartments();
    });
  }
  async function removeAssignment(id){
    const item=assignments.find(row=>row.id===id);
    if(!item||!canManage(item.departamento))return;
    if(!confirm(`Retirar ${memberName(item)} da equipe de ${department(item.departamento)?.nome||'departamento'}?`))return;
    const {error}=await client.from('departamento_equipes').delete().eq('id',id);
    if(error){alert(`Não foi possível excluir: ${error.message}`);return}
    await openDepartments();
  }
  window.showView=function(view){if(view==='departamentos'){openDepartments();return}return previousShowView(view)};
})();

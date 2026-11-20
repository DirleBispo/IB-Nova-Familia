(function(){
  'use strict';
  const SUPABASE_URL='https://dfeaqeoeotlfweyaxqum.supabase.co';
  const SUPABASE_KEY='sb_publishable_1CdrcQyQUfhBSUFdaah8IQ_L2PVOvaj';
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  let people=[],profile=null,session=null,selected=null;

  const fields={nome:'nome',tipo:'tipo',sexo:'sexo',nascimento:'nascimento',estado_civil:'estadoCivil',conjuge:'conjuge',telefone:'telefone',email:'email',cep:'cep',cidade:'cidade',bairro:'bairro',endereco:'endereco',data_conversao:'dataConversao',data_batismo:'dataBatismo',cargo_funcao:'cargoFuncao',observacao:'observacao'};
  function setMessage(target,text='',success=false){target.textContent=text;target.classList.toggle('success',success)}
  function digits(value){return String(value||'').replace(/\D/g,'')}
  function nullable(value){const clean=String(value||'').trim();return clean||null}
  function validEmail(value){return !value||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
  function validate(payload){
    if(!payload.nome||payload.nome.length<3)return 'Informe o nome completo.';
    if(payload.nascimento&&payload.nascimento>new Date().toISOString().slice(0,10))return 'A data de nascimento não pode estar no futuro.';
    const phone=digits(payload.telefone);if(phone&&![10,11].includes(phone.length))return 'Confira o telefone. Ele deve ter DDD e 10 ou 11 números.';
    if(!validEmail(payload.email))return 'Confira o endereço de e-mail.';
    const cep=digits(payload.cep);if(cep&&cep.length!==8)return 'Confira o CEP. Ele deve ter 8 números.';
    if(payload.data_batismo&&payload.nascimento&&payload.data_batismo<payload.nascimento)return 'A data de batismo não pode ser anterior ao nascimento.';
    return '';
  }
  function reviewStatus(payload){return validate(payload)?'REVISAR':'OK'}
  function formatDate(value){if(!value)return 'Nascimento não informado';const [y,m,d]=value.split('-');return `${d}/${m}/${y}`}
  function formatPhone(value){return value||'Telefone não informado'}
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}

  async function authorize(currentSession){
    session=currentSession;
    const {data,error}=await sb.from('perfis').select('nome,perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();
    if(error)throw error;
    const allowed=data?.ativo===true&&['pastor','secretaria'].includes(data.perfil)&&data.permissoes?.pessoas===true;
    if(!allowed){await sb.auth.signOut();throw new Error('Este usuário não possui acesso aos cadastros da Secretaria.')}
    profile=data;
    $('accountName').textContent=data.nome;
  }
  async function enterApp(currentSession){
    try{await authorize(currentSession);$('loginView').hidden=true;$('appView').hidden=false;await loadPeople()}
    catch(error){$('loginView').hidden=false;$('appView').hidden=true;setMessage($('loginMessage'),error.message)}
  }
  async function loadPeople(){
    setMessage($('pageMessage'),'Carregando cadastros...');
    const {data,error}=await sb.from('pessoas').select('*').order('nome',{ascending:true});
    if(error){setMessage($('pageMessage'),`Não foi possível carregar: ${error.message}`);return}
    people=data||[];setMessage($('pageMessage'),'');render();
  }
  function render(){
    const search=normalize($('searchInput').value),type=$('typeFilter').value,status=$('statusFilter').value;
    const visible=people.filter(person=>{
      const text=normalize(`${person.nome} ${person.telefone||''} ${person.email||''}`);
      if(search&&!text.includes(search))return false;
      if(type&&person.tipo!==type)return false;
      if(status==='active'&&!person.ativo)return false;
      if(status==='archived'&&person.ativo)return false;
      if(status==='review'&&(!person.ativo||person.status_revisao!=='REVISAR'))return false;
      return true;
    });
    $('statTotal').textContent=people.length;
    $('statMembers').textContent=people.filter(p=>p.ativo&&p.tipo==='membro').length;
    $('statVisitors').textContent=people.filter(p=>p.ativo&&p.tipo==='visitante').length;
    $('statReview').textContent=people.filter(p=>p.ativo&&p.status_revisao==='REVISAR').length;
    $('peopleList').innerHTML=visible.map(person=>`<article class="person-row ${person.ativo?'':'archived-row'}"><div><div class="person-name">${esc(person.nome)}</div><div class="badges"><span class="badge">${person.tipo==='visitante'?'Visitante':'Membro'}</span>${person.status_revisao==='REVISAR'?'<span class="badge review">Revisar dados</span>':''}${person.ativo?'':'<span class="badge archived">Arquivado</span>'}</div></div><div class="person-meta"><span>${esc(formatDate(person.nascimento))}</span><span>${esc(person.cargo_funcao||'Sem função informada')}</span></div><div class="person-contact"><span>${esc(formatPhone(person.telefone))}</span><span>${esc(person.email||'E-mail não informado')}</span></div><button class="edit-button" type="button" data-edit="${person.id}">Editar</button></article>`).join('');
    $('emptyState').hidden=visible.length>0;
    document.querySelectorAll('[data-edit]').forEach(button=>button.addEventListener('click',()=>openForm(people.find(p=>p.id===button.dataset.edit))));
  }
  function openForm(person=null){
    selected=person;
    $('dialogTitle').textContent=person?'Editar cadastro':'Novo cadastro';
    $('personId').value=person?.id||'';
    for(const [column,id] of Object.entries(fields))$(id).value=person?.[column]||'';
    if(!person)$('cidade').value='Sorocaba';
    $('archiveButton').hidden=!person;
    $('archiveButton').textContent=person?.ativo?'Arquivar cadastro':'Reativar cadastro';
    setMessage($('formMessage'),'');
    $('personDialog').showModal();
  }
  function closeForm(){$('personDialog').close();selected=null}
  function payloadFromForm(){const payload={};for(const [column,id] of Object.entries(fields))payload[column]=nullable($(id).value);payload.tipo=payload.tipo||'membro';payload.status_revisao=reviewStatus(payload);return payload}
  async function savePerson(event){
    event.preventDefault();const payload=payloadFromForm(),problem=validate(payload);if(problem){setMessage($('formMessage'),problem);return}
    const editing=Boolean(selected);
    $('saveButton').disabled=true;$('saveButton').textContent='Salvando...';
    const result=selected?await sb.from('pessoas').update(payload).eq('id',selected.id):await sb.from('pessoas').insert({...payload,ativo:true,criado_por:session.user.id});
    $('saveButton').disabled=false;$('saveButton').textContent='Salvar cadastro';
    if(result.error){setMessage($('formMessage'),`Não foi possível salvar: ${result.error.message}`);return}
    closeForm();await loadPeople();setMessage($('pageMessage'),editing?'Cadastro atualizado com sucesso.':'Cadastro criado com sucesso.',true);
  }
  async function toggleArchive(){
    if(!selected)return;const next=!selected.ativo,action=next?'reativar':'arquivar';
    if(!confirm(`Deseja ${action} o cadastro de ${selected.nome}?`))return;
    const {error}=await sb.from('pessoas').update({ativo:next}).eq('id',selected.id);
    if(error){setMessage($('formMessage'),`Não foi possível ${action}: ${error.message}`);return}
    closeForm();await loadPeople();setMessage($('pageMessage'),`Cadastro ${next?'reativado':'arquivado'} com sucesso.`,true);
  }
  function exportCsv(){
    const header=['Nome','Tipo','Ativo','Telefone','E-mail','Nascimento','Sexo','Estado civil','Cônjuge','CEP','Cidade','Bairro','Endereço','Conversão','Batismo','Cargo/Função','Revisão'];
    const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
    const rows=people.map(p=>[p.nome,p.tipo,p.ativo?'Sim':'Não',p.telefone,p.email,p.nascimento,p.sexo,p.estado_civil,p.conjuge,p.cep,p.cidade,p.bairro,p.endereco,p.data_conversao,p.data_batismo,p.cargo_funcao,p.status_revisao]);
    const csv='\ufeff'+[header,...rows].map(row=>row.map(quote).join(';')).join('\r\n');
    const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download=`cadastros-ibnf-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
  }

  $('loginForm').addEventListener('submit',async event=>{event.preventDefault();setMessage($('loginMessage'),'Entrando...');const {data,error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error){setMessage($('loginMessage'),'E-mail ou senha inválidos.');return}await enterApp(data.session)});
  $('logoutButton').addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});
  $('newPersonButton').addEventListener('click',()=>openForm());
  $('closeDialogButton').addEventListener('click',closeForm);$('cancelButton').addEventListener('click',closeForm);
  $('personForm').addEventListener('submit',savePerson);$('archiveButton').addEventListener('click',toggleArchive);
  $('searchInput').addEventListener('input',render);$('typeFilter').addEventListener('change',render);$('statusFilter').addEventListener('change',render);$('exportButton').addEventListener('click',exportCsv);
  sb.auth.getSession().then(({data})=>{if(data.session)enterApp(data.session)});
})();

(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const esc=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  let studies=[];

  async function managerAccess(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return {allowed:false,session:null};
    const {data:profile}=await sb.from('perfis').select('perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();
    return {allowed:!!profile?.ativo&&(['pastor','admin','secretaria'].includes(profile.perfil)||profile.permissoes?.estudos===true),session};
  }
  function dateBR(value){if(!value)return '';const [y,m,d]=String(value).slice(0,10).split('-');return `${d}/${m}/${y}`}
  function excerpt(study){const value=study.resumo||study.conteudo||'';return value.length>190?`${value.slice(0,190).trim()}…`:value}
  function card(study,access){
    return `<article class="study-card ${study.publicado?'':'is-draft'}"><div class="study-card-meta"><span class="study-status">${study.publicado?'ESTUDO PUBLICADO':'RASCUNHO'}</span><time>${dateBR(study.data_estudo)}</time></div><h3>${esc(study.titulo)}</h3>${study.referencia?`<span class="study-reference">📖 ${esc(study.referencia)}</span>`:''}<p class="study-summary">${esc(excerpt(study))}</p><div class="study-card-actions"><button class="primary" type="button" data-study-open="${esc(study.id)}">Ler estudo</button>${access.allowed?`<button class="secondary-action" type="button" data-study-edit="${esc(study.id)}">Editar</button><button class="danger-action" type="button" data-study-delete="${esc(study.id)}" data-study-title="${esc(study.titulo)}">Excluir</button>`:''}</div></article>`;
  }
  function listMarkup(access,feedback=''){
    const visible=access.allowed?studies:studies.filter(item=>item.publicado);
    return `<div class="studies-toolbar"><div><span class="section-kicker">Palavra e ensino</span><h3>Estudos bíblicos</h3></div>${access.allowed?'<button class="primary" type="button" id="newStudy">+ Criar estudo</button>':''}</div><div id="studiesFeedback">${feedback}</div><div class="studies-grid">${visible.length?visible.map(item=>card(item,access)).join(''):'<div class="empty"><div>Nenhum estudo publicado no momento.</div></div>'}</div>`;
  }
  function readerMarkup(study,access){return `<article><header class="study-reader-head"><span class="section-kicker">Estudo bíblico</span><h3>${esc(study.titulo)}</h3>${study.referencia?`<p>📖 ${esc(study.referencia)}</p>`:''}</header>${study.resumo?`<p class="study-summary"><b>${esc(study.resumo)}</b></p>`:''}<div class="study-reader-content">${esc(study.conteudo)}</div><footer class="study-reader-author">${study.autor?`Preparado por <b>${esc(study.autor)}</b> · `:''}${dateBR(study.data_estudo)}</footer>${access.allowed?`<div class="study-card-actions" style="margin-top:20px"><button class="secondary-action" id="editOpenedStudy" type="button">Editar estudo</button></div>`:''}</article>`}
  function formMarkup(study){const current=study||{publicado:true,data_estudo:new Date().toISOString().slice(0,10)};return `<div class="social-intro"><span class="section-kicker">Conteúdo da igreja</span><h3>${study?'Editar estudo':'Criar novo estudo'}</h3><p>O conteúdo publicado ficará disponível para todos os visitantes da plataforma.</p></div><form class="form study-form" id="studyForm"><input type="hidden" name="id" value="${esc(study?.id||'')}"><label>Título do estudo<input name="titulo" maxlength="160" value="${esc(current.titulo||'')}" placeholder="Ex.: As quatro âncoras da fé" required></label><div class="study-form-row"><label>Referência bíblica<input name="referencia" maxlength="120" value="${esc(current.referencia||'')}" placeholder="Ex.: Atos 27:20–29"></label><label>Autor<input name="autor" maxlength="120" value="${esc(current.autor||'')}" placeholder="Ex.: Pr. Dirlei Bispo"></label><label>Data do estudo<input name="data_estudo" type="date" value="${esc(current.data_estudo||'')}" required></label></div><label>Resumo<textarea name="resumo" maxlength="600" placeholder="Uma apresentação breve do estudo">${esc(current.resumo||'')}</textarea></label><label>Conteúdo completo<textarea name="conteudo" maxlength="30000" placeholder="Digite aqui todo o estudo bíblico" required>${esc(current.conteudo||'')}</textarea></label><label class="study-publish"><input name="publicado" type="checkbox" ${current.publicado?'checked':''}><span><b>Publicar para todos</b><small>Desmarque para guardar como rascunho.</small></span></label><div class="study-form-actions"><button class="primary" type="submit">${study?'Salvar alterações':'Criar estudo'}</button><button class="secondary-action" id="cancelStudy" type="button">Cancelar</button></div></form><div id="studyFormFeedback"></div>`}

  async function loadStudies(){const {data,error}=await sb.from('estudos').select('*').order('data_estudo',{ascending:false}).order('criado_em',{ascending:false});if(error)throw error;studies=data||[]}
  function bindList(access){
    document.querySelector('#newStudy')?.addEventListener('click',()=>openForm(null,access));
    document.querySelectorAll('[data-study-open]').forEach(button=>button.addEventListener('click',()=>openReader(studies.find(item=>item.id===button.dataset.studyOpen),access)));
    document.querySelectorAll('[data-study-edit]').forEach(button=>button.addEventListener('click',()=>openForm(studies.find(item=>item.id===button.dataset.studyEdit),access)));
    document.querySelectorAll('[data-study-delete]').forEach(button=>button.addEventListener('click',async()=>{if(!confirm(`Excluir definitivamente o estudo “${button.dataset.studyTitle}”?`))return;button.disabled=true;button.textContent='Excluindo...';const {error}=await sb.from('estudos').delete().eq('id',button.dataset.studyDelete);if(error){alert(`Não foi possível excluir: ${error.message}`);button.disabled=false;button.textContent='Excluir';return}await openStudies('<div class="success">Estudo excluído com sucesso.</div>')}));
  }
  async function openStudies(feedback=''){
    window.openPanel('Estudos','<div class="data-loading">Carregando estudos...</div>');const access=await managerAccess();
    try{await loadStudies()}catch(error){window.openPanel('Estudos',`<div class="error-box">A área de estudos precisa ser ativada no banco de dados. ${esc(error.message)}</div>`);return}
    window.openPanel('Estudos',listMarkup(access,feedback));bindList(access);
  }
  function openReader(study,access){if(!study)return;window.openPanel('Estudo',readerMarkup(study,access));document.querySelector('#editOpenedStudy')?.addEventListener('click',()=>openForm(study,access))}
  function openForm(study,access){
    if(!access.allowed)return;window.openPanel(study?'Editar estudo':'Criar estudo',formMarkup(study));document.querySelector('#cancelStudy').addEventListener('click',()=>openStudies());
    const form=document.querySelector('#studyForm');form.onsubmit=async event=>{event.preventDefault();const data=new FormData(form),id=String(data.get('id')||''),payload={titulo:String(data.get('titulo')).trim(),referencia:String(data.get('referencia')||'').trim()||null,autor:String(data.get('autor')||'').trim()||null,data_estudo:String(data.get('data_estudo')),resumo:String(data.get('resumo')||'').trim()||null,conteudo:String(data.get('conteudo')).trim(),publicado:data.get('publicado')==='on'};const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Salvando...';const result=id?await sb.from('estudos').update(payload).eq('id',id):await sb.from('estudos').insert({...payload,criado_por:access.session.user.id});if(result.error){document.querySelector('#studyFormFeedback').innerHTML=`<div class="error-box">Não foi possível salvar: ${esc(result.error.message)}</div>`;button.disabled=false;button.textContent=id?'Salvar alterações':'Criar estudo';return}await openStudies(`<div class="success">Estudo ${id?'atualizado':'criado'} com sucesso.</div>`)};
  }
  const previousShowView=window.showView;window.showView=function(view){if(view==='estudos'){openStudies();return}return previousShowView(view)};
})();

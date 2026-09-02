(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const weekdays=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const months=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const shortDays=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  let rules=[];

  async function managerAccess(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return {allowed:false,session:null};
    const {data:profile}=await sb.from('perfis').select('perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();
    return {allowed:!!profile?.ativo&&(['pastor','admin','secretaria'].includes(profile.perfil)||profile.permissoes?.agenda===true),session};
  }

  function occurrence(date,rule){
    const [hour,minute]=String(rule.hora||'00:00').split(':').map(Number);
    const when=new Date(date.getFullYear(),date.getMonth(),date.getDate(),hour,minute||0);
    return {id:rule.id,when,titulo:rule.titulo,descricao:rule.descricao||'',local:rule.local||'',hora:String(rule.hora).slice(0,5)};
  }

  function expandRules(items,days=60){
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start);end.setDate(end.getDate()+days);
    const result=[];
    items.filter(item=>item.ativo).forEach(item=>{
      if(item.tipo==='unico'){
        const parts=String(item.data_evento||'').split('-').map(Number);
        if(parts.length===3){const event=occurrence(new Date(parts[0],parts[1]-1,parts[2]),item);if(event.when>=now&&event.when<end)result.push(event)}
        return;
      }
      for(let offset=0;offset<days;offset++){
        const date=new Date(start);date.setDate(start.getDate()+offset);
        if(date.getDay()===Number(item.dia_semana)){const event=occurrence(date,item);if(event.when>=now)result.push(event)}
      }
    });
    return result.sort((a,b)=>a.when-b.when);
  }

  function publicCard(event,index){
    const date=event.when;
    return `<article class="agenda-event ${index===0?'event-featured':''}"><div class="agenda-event-date"><span>${shortDays[date.getDay()]}</span><b>${String(date.getDate()).padStart(2,'0')}</b><small>${months[date.getMonth()]}</small></div><div class="agenda-event-copy"><small>${index===0?'PRÓXIMO EVENTO':'PROGRAMAÇÃO'}</small><b>${escapeHtml(event.titulo)}</b><span>🕒 ${escapeHtml(event.hora)}${event.local?` · 📍 ${escapeHtml(event.local)}`:''}</span>${event.descricao?`<small>${escapeHtml(event.descricao)}</small>`:''}</div><span class="agenda-event-arrow">›</span></article>`;
  }

  function ruleLabel(rule){return rule.tipo==='recorrente'?`${weekdays[Number(rule.dia_semana)]}, toda semana`:`${String(rule.data_evento||'').split('-').reverse().join('/')}`}
  function ruleCard(rule){return `<article class="agenda-rule-card ${rule.ativo?'':'is-inactive'}"><div class="agenda-rule-head"><div><span class="section-kicker">${rule.ativo?'Ativo':'Inativo'}</span><h4>${escapeHtml(rule.titulo)}</h4><small>${escapeHtml(ruleLabel(rule))} às ${escapeHtml(String(rule.hora).slice(0,5))}${rule.local?` · ${escapeHtml(rule.local)}`:''}</small></div><div class="agenda-rule-actions"><button type="button" class="secondary-action" data-agenda-edit="${escapeHtml(rule.id)}">Editar</button><button type="button" class="danger-action" data-agenda-delete="${escapeHtml(rule.id)}" data-agenda-title="${escapeHtml(rule.titulo)}">Excluir</button></div></div></article>`}

  function agendaMarkup(access,feedback=''){
    const events=expandRules(rules);
    return `<div class="agenda-toolbar"><div><span class="section-kicker">Programação</span><h3>Próximos eventos</h3></div>${access.allowed?'<button class="primary" type="button" id="newAgendaEvent">+ Criar evento</button>':''}</div><div id="agendaFeedback">${feedback}</div><div class="agenda-public-list">${events.length?events.map(publicCard).join(''):'<div class="empty"><div>Nenhum evento programado.</div></div>'}</div>${access.allowed?`<section class="agenda-manage"><span class="section-kicker">Administração</span><h3>Gerenciar agenda</h3><p>Edite ou exclua eventos únicos e programações semanais.</p>${rules.map(ruleCard).join('')||'<div class="empty"><div>Nenhuma programação cadastrada.</div></div>'}</section>`:''}`;
  }

  function formMarkup(rule){
    const current=rule||{tipo:'unico',ativo:true,hora:'19:00'};
    return `<div class="social-intro"><span class="section-kicker">Agenda da igreja</span><h3>${rule?'Editar evento':'Criar evento'}</h3><p>Escolha se acontecerá uma única vez ou se repetirá toda semana.</p></div><form class="form agenda-form" id="agendaForm"><input type="hidden" name="id" value="${escapeHtml(rule?.id||'')}"><label>Título<input name="titulo" maxlength="120" value="${escapeHtml(current.titulo||'')}" placeholder="Ex.: Culto de celebração" required></label><label>Tipo<select name="tipo" id="agendaType"><option value="unico" ${current.tipo==='unico'?'selected':''}>Evento em uma data</option><option value="recorrente" ${current.tipo==='recorrente'?'selected':''}>Repete toda semana</option></select></label><div class="agenda-form-row"><label id="agendaDateField">Data<input name="data_evento" type="date" value="${escapeHtml(current.data_evento||'')}"></label><label id="agendaWeekdayField">Dia da semana<select name="dia_semana">${weekdays.map((day,index)=>`<option value="${index}" ${Number(current.dia_semana)===index?'selected':''}>${day}</option>`).join('')}</select></label><label>Horário<input name="hora" type="time" value="${escapeHtml(String(current.hora||'19:00').slice(0,5))}" required></label><label>Local<input name="local" maxlength="140" value="${escapeHtml(current.local||'')}" placeholder="Ex.: Templo principal"></label></div><label>Descrição (opcional)<textarea name="descricao" maxlength="1000" placeholder="Informações sobre o evento">${escapeHtml(current.descricao||'')}</textarea></label><label class="agenda-active"><input name="ativo" type="checkbox" ${current.ativo?'checked':''}><span><b>Evento ativo</b><small>Eventos inativos ficam ocultos do público.</small></span></label><div class="agenda-form-actions"><button class="primary" type="submit">${rule?'Salvar alterações':'Criar evento'}</button><button class="secondary-action" id="cancelAgendaForm" type="button">Cancelar</button></div></form><div id="agendaFormFeedback"></div>`;
  }

  async function loadRules(){
    const {data,error}=await sb.from('agenda_eventos').select('*').order('criado_em',{ascending:true});
    if(error)throw error;rules=data||[];
  }

  async function openAgenda(feedback=''){
    window.openPanel('Agenda','<div class="data-loading">Carregando agenda...</div>');
    const access=await managerAccess();
    try{await loadRules()}catch(error){window.openPanel('Agenda',`<div class="error-box">A agenda precisa ser ativada no banco de dados. ${escapeHtml(error.message)}</div>`);return}
    window.openPanel('Agenda',agendaMarkup(access,feedback));
    document.querySelector('#newAgendaEvent')?.addEventListener('click',()=>openAgendaForm(null,access));
    document.querySelectorAll('[data-agenda-edit]').forEach(button=>button.addEventListener('click',()=>openAgendaForm(rules.find(item=>item.id===button.dataset.agendaEdit),access)));
    document.querySelectorAll('[data-agenda-delete]').forEach(button=>button.addEventListener('click',async()=>{
      if(!confirm(`Excluir definitivamente “${button.dataset.agendaTitle}”?`))return;
      button.disabled=true;button.textContent='Excluindo...';
      const {error}=await sb.from('agenda_eventos').delete().eq('id',button.dataset.agendaDelete);
      if(error){alert(`Não foi possível excluir: ${error.message}`);button.disabled=false;button.textContent='Excluir';return}
      await openAgenda('<div class="success">Evento excluído com sucesso.</div>');
    }));
  }

  function openAgendaForm(rule,access){
    if(!access.allowed)return;
    window.openPanel(rule?'Editar evento':'Criar evento',formMarkup(rule));
    const form=document.querySelector('#agendaForm'),type=form.querySelector('[name="tipo"]'),dateField=document.querySelector('#agendaDateField'),weekdayField=document.querySelector('#agendaWeekdayField');
    const updateType=()=>{const recurring=type.value==='recorrente';dateField.hidden=recurring;weekdayField.hidden=!recurring;form.elements.data_evento.required=!recurring};updateType();type.addEventListener('change',updateType);
    document.querySelector('#cancelAgendaForm').addEventListener('click',()=>openAgenda());
    form.onsubmit=async event=>{
      event.preventDefault();const data=new FormData(form),id=String(data.get('id')||''),tipo=String(data.get('tipo'));
      const payload={titulo:String(data.get('titulo')).trim(),tipo,hora:String(data.get('hora')),local:String(data.get('local')||'').trim()||null,descricao:String(data.get('descricao')||'').trim()||null,ativo:data.get('ativo')==='on',data_evento:tipo==='unico'?String(data.get('data_evento')):null,dia_semana:tipo==='recorrente'?Number(data.get('dia_semana')):null};
      const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Salvando...';
      const result=id?await sb.from('agenda_eventos').update(payload).eq('id',id):await sb.from('agenda_eventos').insert({...payload,criado_por:access.session.user.id});
      if(result.error){document.querySelector('#agendaFormFeedback').innerHTML=`<div class="error-box">Não foi possível salvar: ${escapeHtml(result.error.message)}</div>`;button.disabled=false;button.textContent=id?'Salvar alterações':'Criar evento';return}
      await openAgenda(`<div class="success">Evento ${id?'atualizado':'criado'} com sucesso.</div>`);
    };
  }

  async function refreshHome(){
    try{await loadRules()}catch(_){return}
    const box=document.querySelector('#nextEvents');if(!box)return;
    const limit=new Date();limit.setDate(limit.getDate()+7);const events=expandRules(rules,8).filter(event=>event.when<=limit);
    box.innerHTML=events.length?events.map(publicCard).join(''):'<div class="empty"><div>Não há eventos programados nos próximos 7 dias.</div></div>';
  }

  const previousShowView=window.showView;
  window.showView=function(view){if(view==='agenda'){openAgenda();return}const result=previousShowView(view);if(view==='inicio')setTimeout(refreshHome,50);return result};
  refreshHome();
})();

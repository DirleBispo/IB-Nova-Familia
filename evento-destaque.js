(() => {
  const list=document.querySelector('#homeCampaignList'),addHome=document.querySelector('#addFeaturedEventHome');
  if(!list||!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  let items=[],session=null,profile=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const validUrl=value=>{if(!value)return'';try{const url=new URL(value);return['http:','https:'].includes(url.protocol)?url.href:''}catch(_){return''}};
  const previewUrl=value=>{const url=validUrl(value),drive=url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/i)||url.match(/[?&]id=([-\w]+)/i);return drive?`https://drive.google.com/thumbnail?id=${encodeURIComponent(drive[1])}&sz=w1600`:url};
  const allowed=()=>Boolean(session&&profile?.ativo&&(['pastor','admin','secretaria'].includes(profile.perfil)||profile.permissoes?.agenda===true));
  const formatDate=value=>{if(!value)return'';const date=new Date(value);if(Number.isNaN(date.getTime()))return'';return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date).replace(',',' às')};
  const platformUrl=()=>`${window.location.origin}${window.location.pathname}#eventos`;

  async function shareItem(item){
    const title=item.titulo||'Evento da IB Nova Família',invitation=validUrl(item.link_url);
    const text=['Você e sua família são nossos convidados!',title,formatDate(item.data_evento),item.descricao,invitation?'Convite: '+invitation:'','Igreja Batista Nova Família — veja nossos próximos eventos:'].filter(Boolean).join('\n');
    const payload={title,text,url:platformUrl()};
    if(navigator.share){try{await navigator.share(payload);return}catch(error){if(error?.name==='AbortError')return}}
    try{await navigator.clipboard.writeText(`${text}\n${platformUrl()}`);alert('Convite e link da plataforma copiados!')}catch(_){window.prompt('Copie a mensagem:',`${text}\n${platformUrl()}`)}
  }

  function eventCard(item){
    const image=previewUrl(item.imagem_url),original=validUrl(item.imagem_url);
    return `<article class="campaign-callout ${image?'campaign-with-image':''} featured-event-card" data-event-id="${item.id}">${image?`<a class="campaign-image" href="${esc(original)}" target="_blank" rel="noopener" aria-label="Abrir arte de ${esc(item.titulo)}"><span>Toque para ampliar</span></a>`:''}<div class="campaign-copy"><span class="campaign-label">${esc(item.etiqueta||'Próximo evento')}</span><h2>${esc(item.titulo)}</h2><p>${esc([formatDate(item.data_evento),item.descricao].filter(Boolean).join(' • '))}</p></div><button class="campaign-action featured-share" type="button" data-featured-share="${item.id}">Compartilhar evento</button>${allowed()?`<button class="campaign-edit" type="button" data-featured-edit="${item.id}">Editar</button>`:''}</article>`;
  }

  function render(){
    addHome.hidden=!allowed();
    const active=items.filter(item=>item.ativo);
    list.innerHTML=active.length?active.map(eventCard).join(''):'<div class="empty"><div>Nenhum evento especial publicado no momento.</div></div>';
    active.forEach(item=>{const card=list.querySelector(`[data-event-id="${item.id}"]`),image=card?.querySelector('.campaign-image');if(image)image.style.backgroundImage=`url("${previewUrl(item.imagem_url).replace(/"/g,'%22')}")`});
    list.querySelectorAll('[data-featured-share]').forEach(button=>button.addEventListener('click',()=>shareItem(items.find(item=>String(item.id)===button.dataset.featuredShare))));
    list.querySelectorAll('[data-featured-edit]').forEach(button=>button.addEventListener('click',()=>openEditor(items.find(item=>String(item.id)===button.dataset.featuredEdit))));
  }

  async function load(){const result=await sb.from('evento_destaque').select('*').order('data_evento',{ascending:true,nullsFirst:false}).order('id',{ascending:true});if(result.error){list.innerHTML='<div class="error-box">Não foi possível carregar os eventos.</div>';return}items=result.data||[];render()}
  async function refreshAuth(){const auth=await sb.auth.getSession();session=auth.data.session||null;profile=null;if(session)profile=(await sb.from('perfis').select('perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle()).data||null;render()}

  function formMarkup(item){
    const localDate=item?.data_evento?new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(item.data_evento)).replace(' ','T'):'';
    return `<div class="event-editor-intro"><span class="section-kicker">Página inicial</span><h3>${item?'Editar evento':'Adicionar outro evento'}</h3><p>Use uma foto pública do Google Drive. A plataforma não armazenará a imagem.</p></div><form id="featuredEventForm" class="featured-event-form"><input type="hidden" name="id" value="${esc(item?.id||'')}"><label>Identificação curta<input name="etiqueta" maxlength="40" value="${esc(item?.etiqueta||'Próximo evento')}" placeholder="Ex.: Evento especial" required></label><label>Título<input name="titulo" maxlength="120" value="${esc(item?.titulo||'')}" placeholder="Ex.: Encontro de Mulheres" required></label><label>Data e horário<input name="data_evento" type="datetime-local" value="${esc(localDate)}"></label><label>Descrição<textarea name="descricao" maxlength="500" placeholder="Informações que aparecerão na página inicial">${esc(item?.descricao||'')}</textarea></label><label>Link do convite (opcional)<input name="link_url" type="url" value="${esc(item?.link_url||'')}" placeholder="https://..."></label><label>Link público da foto no Google Drive<input name="imagem_url" type="url" value="${esc(item?.imagem_url||'')}" placeholder="https://drive.google.com/file/d/..." required><small>No Drive, deixe a foto como “Qualquer pessoa com o link — Leitor”.</small></label>${item?.imagem_url?`<img class="featured-event-preview" src="${esc(previewUrl(item.imagem_url))}" alt="Foto atual do evento">`:''}<label class="featured-event-active"><input name="ativo" type="checkbox" ${item?.ativo!==false?'checked':''}><span><b>Mostrar na página inicial</b><small>Desmarque para ocultar temporariamente.</small></span></label><div class="featured-event-actions"><button class="primary" type="submit">Salvar evento</button>${item?'<button class="danger-action" type="button" id="deleteFeaturedEvent">Excluir evento</button>':''}<button class="secondary-action" type="button" id="cancelFeaturedEvent">Cancelar</button></div></form><div id="featuredEventFeedback" aria-live="polite"></div>`;
  }

  function openEditor(item=null){
    if(!allowed()||typeof window.openPanel!=='function')return;
    window.openPanel(item?'Editar evento':'Adicionar evento',formMarkup(item));
    const form=document.querySelector('#featuredEventForm'),feedback=document.querySelector('#featuredEventFeedback');
    document.querySelector('#cancelFeaturedEvent')?.addEventListener('click',openManager);
    document.querySelector('#deleteFeaturedEvent')?.addEventListener('click',async()=>{if(!confirm(`Excluir definitivamente “${item.titulo}”?`))return;const result=await sb.from('evento_destaque').delete().eq('id',item.id);if(result.error){feedback.innerHTML=`<div class="error-box">Não foi possível excluir: ${esc(result.error.message)}</div>`;return}await load();openManager()});
    form?.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]'),values=new FormData(form),dateValue=String(values.get('data_evento')||''),id=String(values.get('id')||'');button.disabled=true;button.textContent='Salvando...';const payload={etiqueta:String(values.get('etiqueta')).trim(),titulo:String(values.get('titulo')).trim(),data_evento:dateValue?new Date(`${dateValue}:00-03:00`).toISOString():null,descricao:String(values.get('descricao')||'').trim()||null,texto_botao:'Compartilhar evento',link_url:validUrl(String(values.get('link_url')||'').trim())||null,imagem_url:validUrl(String(values.get('imagem_url')||'').trim()),ativo:values.get('ativo')==='on',atualizado_por:session.user.id,atualizado_em:new Date().toISOString()};const result=id?await sb.from('evento_destaque').update(payload).eq('id',id):await sb.from('evento_destaque').insert(payload);button.disabled=false;button.textContent='Salvar evento';if(result.error){feedback.innerHTML=`<div class="error-box">Não foi possível salvar: ${esc(result.error.message)}</div>`;return}await load();openManager()});
  }

  function openManager(){
    if(!allowed())return;
    const rows=items.map(item=>`<article class="featured-manage-item"><div><b>${esc(item.titulo)}</b><small>${esc(formatDate(item.data_evento)||'Sem data definida')} · ${item.ativo?'Publicado':'Oculto'}</small></div><button class="secondary-action" data-manage-featured="${item.id}">Editar</button></article>`).join('');
    window.openPanel('Eventos em destaque',`<div class="agenda-toolbar"><div><span class="section-kicker">Página inicial</span><h3>Eventos em destaque</h3></div><button class="primary" id="newFeaturedEvent">+ Adicionar outro evento</button></div><div class="featured-manage-list">${rows||'<div class="empty"><div>Nenhum evento cadastrado.</div></div>'}</div>`);
    document.querySelector('#newFeaturedEvent')?.addEventListener('click',()=>openEditor());
    document.querySelectorAll('[data-manage-featured]').forEach(button=>button.addEventListener('click',()=>openEditor(items.find(item=>String(item.id)===button.dataset.manageFeatured))));
  }

  window.ibnfOpenFeaturedEvent=openManager;addHome.addEventListener('click',()=>openEditor());sb.auth.onAuthStateChange(()=>setTimeout(refreshAuth,50));load();refreshAuth();sb.channel('eventos-destaque-home').on('postgres_changes',{event:'*',schema:'public',table:'evento_destaque'},load).subscribe();
  if(window.location.hash==='#eventos')setTimeout(()=>document.querySelector('.featured-events-area')?.scrollIntoView({behavior:'smooth'}),500);
})();

(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const safe=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  let session=null,profile=null,manager=false,items=[];

  function icon(type){return type==='foto'?'▧':type==='documento'?'▤':'▶'}
  function title(type){return type==='foto'?'Foto':type==='documento'?'Documento':'Vídeo'}
  function previewUrl(url){
    const value=String(url||'');
    const drive=value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/i)||value.match(/[?&]id=([-\w]+)/i);
    if(drive)return `https://drive.google.com/thumbnail?id=${encodeURIComponent(drive[1])}&sz=w1200`;
    return value;
  }
  function memberRows(rows){
    if(!rows.length)return '<div class="media-empty">A equipe de mídia ainda não possui integrantes cadastrados.</div>';
    return rows.map(row=>{const name=row.nome||row.pessoas?.nome||'Integrante';return `<div class="media-person"><span class="media-person-avatar">${safe(name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase())}</span><span><strong>${safe(name)}</strong><small>${safe(row.funcao||'Equipe de mídia')}</small></span></div>`}).join('');
  }
  async function card(item){
    let url=item.url_externa||'';
    if(item.arquivo_path){const {data}=await client.storage.from('midia').createSignedUrl(item.arquivo_path,3600);url=data?.signedUrl||''}
    const preview=item.tipo==='foto'&&url?`<img src="${safe(previewUrl(url))}" alt="${safe(item.nome)}" loading="lazy">`:icon(item.tipo);
    return `<article class="media-card"><div class="media-preview">${preview}</div><div class="media-card-body"><span class="section-kicker">${title(item.tipo)}</span><h4>${safe(item.nome)}</h4><p>${safe(item.descricao||'Arquivo da equipe de mídia')}</p><div class="media-actions">${url?`<a href="${safe(url)}" target="_blank" rel="noopener">${item.tipo==='video_link'?'Assistir':'Abrir'}</a>`:''}${manager?`<button type="button" class="danger" data-media-delete="${safe(item.id)}" data-media-path="${safe(item.arquivo_path||'')}">Excluir</button>`:''}</div></div></article>`;
  }
  async function openMedia(message=''){
    window.openPanel('Mídia','<div class="members-loading">Carregando espaço da mídia...</div>');
    const auth=await client.auth.getSession();session=auth.data.session;
    const [profileResult,leaderResult,teamResult,filesResult]=await Promise.all([
      session?client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle():Promise.resolve({data:null}),
      session?client.from('departamento_lideres').select('departamento').eq('usuario_id',session.user.id).eq('departamento','midia'):Promise.resolve({data:[]}),
      client.from('midia_equipe_publica').select('id,nome,funcao').order('nome',{ascending:true}),
      client.from('midia_arquivos').select('*').order('criado_em',{ascending:false})
    ]);
    profile=profileResult.data;manager=!!profile?.ativo&&(['pastor','admin','secretaria'].includes(profile.perfil)||(leaderResult.data||[]).length>0);
    if(filesResult.error){const setup=filesResult.error.code==='42P01'||/midia_arquivos/i.test(filesResult.error.message||'');window.openPanel('Mídia',`<div class="error-box">${setup?'A área de mídia precisa ser ativada no banco de dados.':safe(filesResult.error.message)}</div>`);return}
    items=filesResult.data||[];
    const cards=await Promise.all(items.map(card));
    window.openPanel('Mídia',`${message}<div class="social-intro"><span class="section-kicker">Comunicação</span><h3>Equipe de Mídia</h3><p>Fotos, documentos e vídeos da comunicação da IB Nova Família. Esta área é pública; para administrar, entre em Meu acesso.</p></div><div class="media-section-head"><h3>Integrantes</h3>${manager?'<button class="secondary-action" id="mediaManageTeam">Gerenciar equipe</button>':''}</div><div class="media-team">${memberRows(teamResult.data||[])}</div><div class="media-section-head"><h3>Arquivos</h3></div>${manager?'<div class="media-toolbar"><button class="primary" id="mediaAddLink">+ Adicionar link do Drive</button></div>':''}<div class="media-grid">${cards.join('')||'<div class="media-empty">Nenhum arquivo publicado ainda.</div>'}</div>`);
    document.querySelector('#mediaManageTeam')?.addEventListener('click',()=>window.showView('departamentos'));
    document.querySelector('#mediaAddLink')?.addEventListener('click',openLink);
    document.querySelectorAll('[data-media-delete]').forEach(button=>button.addEventListener('click',()=>removeItem(button.dataset.mediaDelete,button.dataset.mediaPath)));
  }
  function openLink(){
    if(!manager)return;
    window.openPanel('Adicionar arquivo por link',`<form class="media-form" id="mediaLinkForm"><label>Tipo<select name="tipo" required><option value="foto">Foto</option><option value="documento">Documento ou PDF</option><option value="video_link">Vídeo</option></select></label><label>Título<input name="nome" maxlength="100" required placeholder="Ex.: Culto da Família"></label><label>Descrição<textarea name="descricao" maxlength="300" placeholder="Data ou informações sobre o arquivo"></textarea></label><label>Link público do Google Drive<input name="url" type="url" required placeholder="https://drive.google.com/..."></label><div class="media-limit">No Google Drive, deixe o arquivo como “Qualquer pessoa com o link — Leitor”. Nada será armazenado na plataforma.</div><button class="primary">Publicar link</button><button type="button" class="secondary-action" id="mediaCancel">Cancelar</button><div id="mediaFeedback"></div></form>`);
    document.querySelector('#mediaCancel').onclick=()=>openMedia();
    document.querySelector('#mediaLinkForm').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.currentTarget),feedback=document.querySelector('#mediaFeedback'),url=String(data.get('url')).trim(),tipo=String(data.get('tipo'));if(!/^https:\/\//i.test(url)){feedback.innerHTML='<div class="error-box">Informe um link válido iniciado por https://</div>';return}const {error}=await client.from('midia_arquivos').insert({nome:String(data.get('nome')).trim(),descricao:String(data.get('descricao')||'').trim()||null,tipo,url_externa:url,criado_por:session.user.id});if(error){feedback.innerHTML=`<div class="error-box">${safe(error.message)}</div>`;return}await openMedia('<div class="success">Link publicado com sucesso.</div>')};
  }
  function openUpload(){
    if(!manager)return;
    window.openPanel('Adicionar arquivo',`<form class="media-form" id="mediaFileForm"><label>Nome do arquivo<input name="nome" maxlength="100" required placeholder="Ex.: Culto da Família"></label><label>Descrição<textarea name="descricao" maxlength="300" placeholder="Data ou informações sobre o arquivo"></textarea></label><label>Foto ou PDF<input name="arquivo" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required></label><div class="media-limit">Tamanho máximo: 3 MB. Formatos permitidos: JPG, PNG, WEBP e PDF.</div><button class="primary">Enviar arquivo</button><button type="button" class="secondary-action" id="mediaCancel">Cancelar</button><div id="mediaFeedback"></div></form>`);
    document.querySelector('#mediaCancel').onclick=()=>openMedia();
    document.querySelector('#mediaFileForm').onsubmit=async event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form),file=data.get('arquivo'),feedback=document.querySelector('#mediaFeedback'),button=form.querySelector('.primary');
      if(!file||file.size>3*1024*1024){feedback.innerHTML='<div class="error-box">Escolha um arquivo de até 3 MB.</div>';return}
      const allowed=['image/jpeg','image/png','image/webp','application/pdf'];if(!allowed.includes(file.type)){feedback.innerHTML='<div class="error-box">Formato não permitido.</div>';return}
      button.disabled=true;button.textContent='Enviando...';
      const ext=(file.name.split('.').pop()||'bin').toLowerCase(),path=`${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const upload=await client.storage.from('midia').upload(path,file,{contentType:file.type,cacheControl:'3600'});
      if(upload.error){feedback.innerHTML=`<div class="error-box">${safe(upload.error.message)}</div>`;button.disabled=false;button.textContent='Enviar arquivo';return}
      const result=await client.from('midia_arquivos').insert({nome:String(data.get('nome')).trim(),descricao:String(data.get('descricao')||'').trim()||null,tipo:file.type==='application/pdf'?'documento':'foto',arquivo_path:path,mime_type:file.type,tamanho:file.size,criado_por:session.user.id});
      if(result.error){await client.storage.from('midia').remove([path]);feedback.innerHTML=`<div class="error-box">${safe(result.error.message)}</div>`;button.disabled=false;button.textContent='Enviar arquivo';return}
      await openMedia('<div class="success">Arquivo publicado com sucesso.</div>');
    };
  }
  function openVideo(){
    if(!manager)return;
    window.openPanel('Adicionar vídeo',`<form class="media-form" id="mediaVideoForm"><label>Título<input name="nome" maxlength="100" required placeholder="Ex.: Tutorial da plataforma"></label><label>Descrição<textarea name="descricao" maxlength="300"></textarea></label><label>Link do Google Drive ou YouTube<input name="url" type="url" required placeholder="https://..."></label><div class="media-limit">O vídeo permanece no Drive ou YouTube e não ocupa espaço no plano gratuito.</div><button class="primary">Publicar vídeo</button><button type="button" class="secondary-action" id="mediaCancel">Cancelar</button><div id="mediaFeedback"></div></form>`);
    document.querySelector('#mediaCancel').onclick=()=>openMedia();
    document.querySelector('#mediaVideoForm').onsubmit=async event=>{event.preventDefault();const data=new FormData(event.currentTarget),feedback=document.querySelector('#mediaFeedback'),url=String(data.get('url')).trim();if(!/^https:\/\//i.test(url)){feedback.innerHTML='<div class="error-box">Informe um link válido iniciado por https://</div>';return}const {error}=await client.from('midia_arquivos').insert({nome:String(data.get('nome')).trim(),descricao:String(data.get('descricao')||'').trim()||null,tipo:'video_link',url_externa:url,criado_por:session.user.id});if(error){feedback.innerHTML=`<div class="error-box">${safe(error.message)}</div>`;return}await openMedia('<div class="success">Vídeo publicado com sucesso.</div>')};
  }
  async function removeItem(id,path){if(!manager||!confirm('Excluir este item da área de mídia?'))return;const {error}=await client.from('midia_arquivos').delete().eq('id',id);if(error){alert(error.message);return}if(path)await client.storage.from('midia').remove([path]);await openMedia('<div class="success">Item excluído.</div>')}
  window.showView=function(view){if(view==='midia'){openMedia();return}return previousShowView(view)};
})();

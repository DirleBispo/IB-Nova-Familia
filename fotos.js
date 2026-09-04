(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const safe=value=>String(value||'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  let session=null,manager=false;

  function previewUrl(url){
    const value=String(url||'');
    const drive=value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([-\w]+)/i)||value.match(/[?&]id=([-\w]+)/i);
    return drive?`https://drive.google.com/thumbnail?id=${encodeURIComponent(drive[1])}&sz=w1200`:value;
  }
  function preview(item){
    const cover=item.capa_url||item.url_externa||'';
    if(!cover)return '<div class="media-preview-fallback"><span>▧</span><strong>Foto do álbum</strong><small>Abra no Google Drive</small></div>';
    return `<img data-gallery-preview src="${safe(previewUrl(cover))}" alt="" loading="lazy"><div class="media-preview-fallback" hidden><span>▧</span><strong>Foto do álbum</strong><small>Abra no Google Drive</small></div>`;
  }
  function bindFallbacks(){
    document.querySelectorAll('[data-gallery-preview]').forEach(image=>{
      const fallback=()=>{image.hidden=true;const cover=image.nextElementSibling;if(cover)cover.hidden=false};
      image.addEventListener('error',fallback,{once:true});
      if(image.complete&&!image.naturalWidth)fallback();
    });
  }
  function card(item){
    return `<article class="media-card"><div class="media-preview">${preview(item)}</div><div class="media-card-body"><span class="section-kicker">Álbum de fotos</span><h4>${safe(item.nome)}</h4><p>${safe(item.descricao||'Fotos da Igreja Batista Nova Família')}</p><div class="media-actions"><a href="${safe(item.url_externa||'#')}" target="_blank" rel="noopener">Ver álbum</a>${manager?`<button type="button" class="danger" data-gallery-delete="${safe(item.id)}">Excluir</button>`:''}</div></div></article>`;
  }
  async function openGallery(message=''){
    window.openPanel('Galeria de Fotos','<div class="members-loading">Carregando álbuns...</div>');
    const auth=await client.auth.getSession();session=auth.data.session;
    const [profileResult,leaderResult,filesResult]=await Promise.all([
      session?client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle():Promise.resolve({data:null}),
      session?client.from('departamento_lideres').select('departamento').eq('usuario_id',session.user.id).eq('departamento','midia'):Promise.resolve({data:[]}),
      client.from('midia_arquivos').select('*').eq('tipo','foto').order('criado_em',{ascending:false})
    ]);
    const profile=profileResult.data;
    manager=!!profile?.ativo&&(['pastor','admin'].includes(profile.perfil)||(leaderResult.data||[]).length>0);
    if(filesResult.error){window.openPanel('Galeria de Fotos',`<div class="error-box">${safe(filesResult.error.message)}</div>`);return}
    const items=filesResult.data||[];
    window.openPanel('Galeria de Fotos',`${message}<div class="social-intro"><span class="section-kicker">Nossa história</span><h3>Fotos da Igreja</h3><p>Álbuns de cultos, batismos, celebrações e momentos especiais da IB Nova Família.</p></div>${manager?'<div class="media-toolbar"><button class="primary" id="galleryAdd">+ Adicionar álbum</button></div>':''}<div class="media-grid">${items.map(card).join('')||'<div class="media-empty">Nenhum álbum publicado ainda.</div>'}</div>`);
    bindFallbacks();
    document.querySelector('#galleryAdd')?.addEventListener('click',openForm);
    document.querySelectorAll('[data-gallery-delete]').forEach(button=>button.addEventListener('click',()=>removeAlbum(button.dataset.galleryDelete)));
  }
  function openForm(){
    if(!manager)return;
    window.openPanel('Adicionar álbum',`<form class="media-form" id="galleryForm"><label>Título<input name="nome" maxlength="100" required placeholder="Ex.: Batismo 2026"></label><label>Descrição<textarea name="descricao" maxlength="300" placeholder="Data ou informações sobre o álbum"></textarea></label><label>Link público do álbum no Google Drive<input name="url" type="url" required placeholder="https://drive.google.com/..."></label><label>Link de uma foto para usar como capa (opcional)<input name="capa_url" type="url" placeholder="Abra uma foto do álbum e cole o link dela"></label><div class="media-limit">Compartilhe o álbum e a foto de capa como “Qualquer pessoa com o link — Leitor”.</div><button class="primary">Publicar álbum</button><button type="button" class="secondary-action" id="galleryCancel">Cancelar</button><div id="galleryFeedback"></div></form>`);
    document.querySelector('#galleryCancel').onclick=()=>openGallery();
    document.querySelector('#galleryForm').onsubmit=async event=>{
      event.preventDefault();
      const data=new FormData(event.currentTarget),feedback=document.querySelector('#galleryFeedback'),url=String(data.get('url')).trim(),cover=String(data.get('capa_url')||'').trim();
      if(!/^https:\/\//i.test(url)||cover&&!/^https:\/\//i.test(cover)){feedback.innerHTML='<div class="error-box">Informe links válidos iniciados por https://</div>';return}
      const {error}=await client.from('midia_arquivos').insert({nome:String(data.get('nome')).trim(),descricao:String(data.get('descricao')||'').trim()||null,tipo:'foto',url_externa:url,capa_url:cover||null,criado_por:session.user.id});
      if(error){feedback.innerHTML=`<div class="error-box">${safe(error.message)}</div>`;return}
      await openGallery('<div class="success">Álbum publicado com sucesso.</div>');
    };
  }
  async function removeAlbum(id){
    if(!manager||!confirm('Excluir este álbum da Galeria de Fotos?'))return;
    const {error}=await client.from('midia_arquivos').delete().eq('id',id);
    if(error){alert(error.message);return}
    await openGallery('<div class="success">Álbum excluído.</div>');
  }
  window.showView=function(view){if(view==='fotos'){openGallery();return}return previousShowView(view)};
})();

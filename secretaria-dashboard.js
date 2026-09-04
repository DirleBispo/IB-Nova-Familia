(function(){
  const previousShowView=window.showView;
  const allowed=()=>{
    const profile=window.IBNF_ACCESS?.getProfile?.();
    return !!profile?.ativo&&['pastor','admin','secretaria'].includes(profile.perfil);
  };
  function openSecretaria(){
    if(!allowed()){
      window.openPanel('Secretaria','<div class="error-box">Esta área está disponível somente para a secretaria e administração.</div>');
      return;
    }
    window.openPanel('Secretaria',`<div class="secretaria-intro"><span class="section-kicker">Área administrativa</span><h3>Secretaria da igreja</h3><p>Cadastros, comunicados e organização da IB Nova Família em um só lugar.</p></div><div class="secretaria-grid"><button type="button" data-secretaria-view="pessoas"><span class="secretaria-icon">👥</span><span><strong>Membros</strong><small>Cadastrar, consultar, editar e excluir</small></span><b>›</b></button><button type="button" data-secretaria-view="departamentos"><span class="secretaria-icon">⌘</span><span><strong>Departamentos</strong><small>Organizar integrantes e funções</small></span><b>›</b></button><button type="button" data-secretaria-view="avisos-admin"><span class="secretaria-icon">◇</span><span><strong>Avisos</strong><small>Criar, editar, excluir e publicar</small></span><b>›</b></button><button type="button" data-secretaria-view="agenda"><span class="secretaria-icon">▦</span><span><strong>Agenda</strong><small>Criar e organizar eventos</small></span><b>›</b></button><button type="button" data-secretaria-view="estudos"><span class="secretaria-icon">▤</span><span><strong>Estudos</strong><small>Inserir e atualizar materiais</small></span><b>›</b></button></div>`);
    document.querySelectorAll('[data-secretaria-view]').forEach(button=>button.addEventListener('click',()=>window.showView(button.dataset.secretariaView)));
  }
  window.showView=function(view){if(view==='secretaria'){openSecretaria();return}return previousShowView(view)};
})();

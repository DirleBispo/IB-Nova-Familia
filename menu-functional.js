(function(){
  const prev=window.showView;
  function scrollPanel(){setTimeout(()=>document.querySelector('#contentPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  function openMenu(){
    if(typeof window.openPanel!=='function')return;
    const noticesAdmin=window.IBNF_ACCESS?.can?.('avisos-admin')?`<button class="menu-action" onclick="showView('avisos-admin')"><b>Gerenciar avisos</b><small>Crie, edite e publique comunicados para toda a igreja.</small><span>›</span></button>`:'';
    window.openPanel('Menu',`<div class="menu-action-list">
      ${noticesAdmin}
      <button class="menu-action" onclick="showView('acessos')"><b>Administração</b><small>Usuários, aprovações, permissões e acessos da equipe.</small><span>›</span></button>
      <button class="menu-action" onclick="showView('perfil')"><b>Minha conta</b><small>Login, perfil e acesso ao sistema.</small><span>›</span></button>
      <button class="menu-action" onclick="showView('redes')"><b>Redes Sociais</b><small>Instagram, Facebook e WhatsApp oficiais da igreja.</small><span>›</span></button>
      <button class="menu-action" onclick="showView('agenda')"><b>Agenda</b><small>Veja a programação e os próximos cultos.</small><span>›</span></button>
      <button class="menu-action" onclick="showView('midia')"><b>Mídia</b><small>Equipe, fotos, documentos e links de vídeos.</small><span>›</span></button>
      <button class="menu-action" onclick="showView('notificacoes')"><b>Avisos</b><small>Comunicados oficiais da igreja.</small><span>›</span></button>
    </div>`);
    scrollPanel();
  }
  window.showView=function(view){
    if(view==='menu'){openMenu();return}
    const r=prev(view);
    if(view!=='inicio'&&view!=='falar')scrollPanel();
    return r;
  };

  // Carrega o módulo de cadastro/aprovação sem duplicar lógica no index.html.
  const css=document.createElement('link');css.rel='stylesheet';css.href='cadastro-permissoes.css';document.head.appendChild(css);
  function load(src,next){const s=document.createElement('script');s.src=src;s.onload=()=>next&&next();document.body.appendChild(s)}
  load('cadastro-acesso.js',()=>load('admin-permissoes.js'));
})();

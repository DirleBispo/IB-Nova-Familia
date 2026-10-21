(function(){
  const prev=window.showView;
  function scrollPanel(){setTimeout(()=>document.querySelector('#contentPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}
  function openMenu(){
    if(typeof window.openPanel!=='function')return;
    window.setNav?.('menu');
    const item=(view,title,description)=>`<button class="menu-action" onclick="showView('${view}')"><b>${title}</b><small>${description}</small><span>›</span></button>`;
    const publicItems=[['quem-somos','Quem somos','Nossa história e liderança.'],['agenda','Agenda','Cultos e próximos eventos.'],['estudos','Estudos','Materiais para aprender a Palavra.'],['fotos','Fotos da igreja','Álbuns dos nossos encontros.'],['notificacoes','Avisos','Comunicados da igreja.'],['aniversariantes','Aniversariantes','Datas especiais da nossa família.'],['redes','Contato','WhatsApp e redes sociais.']];
    const teamItems=[['secretaria','Secretaria','Cadastros e organização da igreja.'],['pessoas','Pessoas','Membros e visitantes.'],['pastoral','Painel pastoral','Atendimentos e pendências.'],['avisos-admin','Gerenciar avisos','Publicar comunicados.'],['estatisticas','Estatísticas','Acessos ao site.'],['acessos','Gerenciar acessos','Aprovações e permissões.']].filter(([view])=>window.IBNF_ACCESS?.can?.(view));
    const approved=window.IBNF_ACCESS?.isApproved?.();
    const teamExtra=approved?[['departamentos','Departamentos','Equipes e ministérios.'],['midia','Equipe de mídia','Materiais e arquivos da equipe.']]:[];
    window.openPanel('Menu',`<div class="menu-action-list">${publicItems.map(args=>item(...args)).join('')}</div><h3>Área da equipe</h3><div class="menu-action-list">${item('perfil','Minha conta','Entrar ou consultar seu acesso.')}${[...teamItems,...teamExtra].map(args=>item(...args)).join('')}</div>`);
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

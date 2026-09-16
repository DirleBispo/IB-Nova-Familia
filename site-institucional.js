(function(){
  const toggle=document.querySelector('#siteMenuToggle');
  const menu=document.querySelector('#siteMobileMenu');
  if(!toggle||!menu)return;
  function closeMenu(){menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menu')}
  toggle.addEventListener('click',()=>{const willOpen=menu.hidden;menu.hidden=!willOpen;toggle.setAttribute('aria-expanded',String(willOpen));toggle.textContent=willOpen?'×':'☰';toggle.setAttribute('aria-label',willOpen?'Fechar menu':'Abrir menu')});
  menu.addEventListener('click',event=>{if(event.target.closest('[data-view]'))closeMenu()});
  document.addEventListener('click',event=>{if(menu.hidden||event.target.closest('#siteMobileMenu')||event.target.closest('#siteMenuToggle'))return;closeMenu()});
  window.addEventListener('resize',()=>{if(innerWidth>900)closeMenu()});
})();

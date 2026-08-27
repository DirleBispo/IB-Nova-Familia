(function(){
  const PANEL='#contentPanel';
  const HEADER_OFFSET=96;

  function scrollToTarget(el){
    if(!el)return;
    const y=el.getBoundingClientRect().top+window.scrollY-HEADER_OFFSET;
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
  }

  function focusFirstField(panel){
    const form=panel?.querySelector('form');
    if(!form)return;
    const field=form.querySelector('input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled])');
    if(!field)return;
    setTimeout(()=>{try{field.focus({preventScroll:true})}catch(_){field.focus()}},420);
  }

  function goToOpenedFunction(view){
    if(view==='inicio')return;
    let tries=0;
    const wait=()=>{
      const panel=document.querySelector(PANEL);
      if(panel&&!panel.classList.contains('hidden')&&panel.offsetParent!==null){
        scrollToTarget(panel);
        if(['oracao','visitas','visitante','servir','pessoas','aniversariantes','acessos','perfil'].includes(view))focusFirstField(panel);
        return;
      }
      if(++tries<12)setTimeout(wait,60);
    };
    setTimeout(wait,20);
  }

  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-view]');
    if(!trigger)return;
    const view=trigger.dataset.view;
    if(!view)return;
    goToOpenedFunction(view);
  });

  window.ibnfGoToFunction=goToOpenedFunction;
})();
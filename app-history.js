(function(){
  if(typeof window.showView!=='function')return;
  const baseShowView=window.showView;
  let restoring=false;
  let sequence=Number(window.history.state?.ibnfSequence||0);

  function updateHistory(method,state){
    try{
      window.history[method](state,'',window.location.href);
      return true;
    }catch(error){
      console.warn('[IBNF] O histórico não pôde ser atualizado; a navegação continuará normalmente.');
      return false;
    }
  }

  if(!window.history.state?.ibnfView){
    updateHistory('replaceState',{ibnfView:'inicio',ibnfSequence:0});
    sequence=0;
  }

  window.showView=function(view){
    const target=view||'inicio';
    if(!restoring&&window.history.state?.ibnfView!==target){
      sequence+=1;
      updateHistory('pushState',{ibnfView:target,ibnfSequence:sequence});
    }
    return baseShowView(target);
  };

  window.addEventListener('popstate',event=>{
    restoring=true;
    sequence=Number(event.state?.ibnfSequence||0);
    baseShowView(event.state?.ibnfView||'inicio');
    setTimeout(()=>{restoring=false},0);
  });

  document.addEventListener('click',event=>{
    const back=event.target.closest('.back-btn');
    if(!back)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(Number(window.history.state?.ibnfSequence||0)>0)window.history.back();
    else baseShowView('inicio');
  },true);
})();

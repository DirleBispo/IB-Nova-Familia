(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const restrictedViews=new Set(['pastoral','pessoas','financeiro','acessos']);
  const hideWhenLoggedOut=['pastoral','pessoas','financeiro'];
  let loggedIn=false;

  function applyVisibility(){
    hideWhenLoggedOut.forEach(view=>{
      document.querySelectorAll(`[data-view="${view}"]`).forEach(el=>{
        el.hidden=!loggedIn;
        el.setAttribute('aria-hidden',loggedIn?'false':'true');
      });
    });
  }

  async function refreshAuth(){
    const {data}=await client.auth.getSession();
    loggedIn=!!data.session;
    applyVisibility();
  }

  const previousShowView=window.showView;
  window.showView=function(view){
    if(restrictedViews.has(view)&&!loggedIn){
      if(typeof window.openPanel==='function'){
        window.openPanel('Meu acesso','<div class="setup-notice"><b>Área restrita</b><span>Faça login para acessar esta área.</span></div>');
      }
      return previousShowView('perfil');
    }
    return previousShowView(view);
  };

  client.auth.onAuthStateChange((_event,session)=>{
    loggedIn=!!session;
    applyVisibility();
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshAuth);else refreshAuth();
})();
(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const restrictedViews=new Set(['pastoral','pessoas','financeiro','acessos','avisos-admin']);
  let session=null,profile=null;

  function defaults(perfil){
    if(perfil==='admin'||perfil==='pastor')return {pastoral:true,pessoas:true,financeiro:true,acessos:true,avisos:true};
    if(perfil==='tesouraria')return {pastoral:false,pessoas:false,financeiro:true,acessos:false,avisos:false};
    if(perfil==='secretaria')return {pastoral:false,pessoas:true,financeiro:false,acessos:false,avisos:true};
    return {pastoral:false,pessoas:false,financeiro:false,acessos:false,avisos:false};
  }
  function can(view){
    if(!session||!profile?.ativo)return false;
    const permission=view==='avisos-admin'?'avisos':view;
    const d=defaults(profile.perfil),p=profile.permissoes||{};
    return p[permission]===true || (p[permission]!==false && d[permission]===true);
  }
  window.IBNF_ACCESS={can,getProfile:()=>profile,isApproved:()=>!!profile?.ativo};

  function applyVisibility(){
    ['pastoral','pessoas','financeiro','avisos-admin'].forEach(view=>{
      document.querySelectorAll(`[data-view="${view}"]`).forEach(el=>{
        const show=can(view); el.hidden=!show; el.setAttribute('aria-hidden',show?'false':'true');
      });
    });
  }

  async function refreshAuth(){
    const {data}=await client.auth.getSession();
    session=data.session||null; profile=null;
    if(session){
      const {data:p}=await client.from('perfis').select('id,nome,perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();
      profile=p||null;
    }
    applyVisibility();
  }

  const previousShowView=window.showView;
  window.showView=function(view){
    if(restrictedViews.has(view)&&!can(view)){
      if(typeof window.openPanel==='function'){
        const msg=!session?'Faça login para acessar esta área.':(!profile?.ativo?'Seu cadastro ainda está aguardando aprovação da liderança.':'Seu usuário não possui permissão para esta área.');
        window.openPanel('Meu acesso',`<div class="setup-notice"><b>Área restrita</b><span>${msg}</span></div>`);
      }
      if(!session)return previousShowView('perfil');
      return;
    }
    return previousShowView(view);
  };

  client.auth.onAuthStateChange(()=>setTimeout(refreshAuth,50));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refreshAuth);else refreshAuth();
})();

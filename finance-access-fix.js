(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  let updating=false;
  function hasFinanceAccess(profile){return !!profile?.ativo&&(['pastor','admin','tesouraria'].includes(profile.perfil)||profile.permissoes?.financeiro===true)}
  function revealFinance(){
    document.querySelectorAll('[data-view="financeiro"]').forEach(button=>{button.hidden=false;button.setAttribute('aria-hidden','false')});
    const logout=document.querySelector('#logoutBtn');
    if(logout&&!document.querySelector('#openFinanceDirectBtn')){
      const button=document.createElement('button');button.type='button';button.id='openFinanceDirectBtn';button.className='primary';button.style.margin='0 10px 12px 0';button.textContent='Abrir Financeiro';button.onclick=()=>window.showView?.('financeiro');logout.before(button);
    }
  }
  async function refresh(){
    if(updating)return;updating=true;
    try{const {data:{session}}=await client.auth.getSession();if(!session)return;const {data:profile}=await client.from('perfis').select('perfil,ativo,permissoes').eq('id',session.user.id).maybeSingle();if(hasFinanceAccess(profile))revealFinance()}finally{updating=false}
  }
  client.auth.onAuthStateChange(()=>[100,500,1200].forEach(delay=>setTimeout(refresh,delay)));
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
})();

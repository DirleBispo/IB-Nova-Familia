(function(){
  const form=document.querySelector('#signupForm'),fb=document.querySelector('#feedback');
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY){fb.innerHTML='<div class="error-box">Cadastro temporariamente indisponível.</div>';return}
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const appUrl='https://www.ibnovafamilia.com.br/';
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  form.onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(form),nome=f.get('nome').trim(),telefone=f.get('telefone').trim(),email=f.get('email').trim().toLowerCase(),senha=f.get('senha'),confirmar=f.get('confirmar');
    if(senha!==confirmar){fb.innerHTML='<div class="error-box">As senhas não conferem.</div>';return}
    fb.innerHTML='<div class="setup-notice">Enviando seu cadastro...</div>';
    const {error}=await client.auth.signUp({email,password:senha,options:{data:{nome,telefone},emailRedirectTo:appUrl}});
    if(error){fb.innerHTML='<div class="error-box">'+esc(error.message)+'</div>';return}
    fb.innerHTML='<div class="success"><b>Cadastro enviado!</b><br>Seu cadastro está aguardando aprovação da liderança. Após a aprovação, você poderá entrar no aplicativo com seu e-mail e senha.</div>';
    form.reset();
  };
})();

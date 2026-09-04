(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const sb=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const appUrl='https://www.ibnovafamilia.com.br/';
  const esc=v=>String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function abrirCadastro(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Criar meu acesso',`<div class="signup-shell"><div class="social-intro"><span class="section-kicker">Acesso IB Nova Família</span><h3>Crie sua conta</h3><p>Faça seu cadastro básico. O acesso administrativo só será liberado depois da aprovação da liderança.</p></div><form class="form" id="ibnfSignupForm"><input name="nome" placeholder="Nome completo" required><input name="telefone" placeholder="Telefone / WhatsApp" required><input name="email" type="email" placeholder="E-mail" required><input name="senha" type="password" minlength="6" placeholder="Crie uma senha (mín. 6 caracteres)" required><input name="confirmar" type="password" minlength="6" placeholder="Confirme a senha" required><button class="primary">Criar minha conta</button></form><div id="ibnfSignupFeedback"></div><p class="signup-note">Após o cadastro, sua conta ficará aguardando aprovação. Você não terá acesso às áreas administrativas até a liberação.</p></div>`);
    setTimeout(()=>document.querySelector('#ibnfSignupForm input[name="nome"]')?.focus({preventScroll:true}),350);
    const form=document.querySelector('#ibnfSignupForm');
    if(!form)return;
    form.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(form),fb=document.querySelector('#ibnfSignupFeedback'),btn=form.querySelector('button');
      const nome=String(f.get('nome')||'').trim(),telefone=String(f.get('telefone')||'').trim(),email=String(f.get('email')||'').trim(),senha=String(f.get('senha')||''),confirmar=String(f.get('confirmar')||'');
      if(senha!==confirmar){fb.innerHTML='<div class="error-box">As senhas não conferem.</div>';return}
      btn.disabled=true;btn.textContent='Criando conta...';
      const {data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome,telefone},emailRedirectTo:appUrl} });
      btn.disabled=false;btn.textContent='Criar minha conta';
      if(error){fb.innerHTML=`<div class="error-box">${esc(error.message)}</div>`;return}
      form.reset();
      fb.innerHTML=`<div class="success"><b>Cadastro recebido.</b><br>${data.session?'Sua conta foi criada e está aguardando aprovação da liderança.':`Confira seu e-mail para confirmar a conta. Depois disso, ela ficará aguardando aprovação da liderança.<br><button type="button" class="secondary-action" id="ibnfResendConfirmation">Reenviar e-mail de confirmação</button>`}</div>`;
      document.querySelector('#ibnfResendConfirmation')?.addEventListener('click',async event=>{
        const resend=event.currentTarget;
        resend.disabled=true;resend.textContent='Reenviando...';
        const {error:resendError}=await sb.auth.resend({type:'signup',email,options:{emailRedirectTo:appUrl}});
        if(resendError){resend.disabled=false;resend.textContent='Tentar reenviar novamente';fb.insertAdjacentHTML('beforeend',`<div class="error-box">${esc(resendError.message)}</div>`);return}
        resend.textContent='E-mail reenviado';
      });
    };
  }

  window.ibnfAbrirCadastro=abrirCadastro;

  function adicionarBotaoNoLogin(){
    const panel=document.querySelector('#contentPanel');
    if(!panel||panel.querySelector('#ibnfSignupLink'))return;
    const login=panel.querySelector('.login-shell');
    if(!login)return;
    const b=document.createElement('button');
    b.type='button';b.id='ibnfSignupLink';b.className='secondary-action';b.textContent='Criar meu acesso';
    b.onclick=abrirCadastro;
    login.appendChild(b);
  }

  const prev=window.showView;
  window.showView=function(view){
    if(view==='cadastro'){abrirCadastro();return}
    const r=prev(view);
    if(view==='perfil')setTimeout(adicionarBotaoNoLogin,50);
    return r;
  };

  const path=location.pathname.replace(/\/+$/,'');
  if(path==='/cadastro'||new URLSearchParams(location.search).get('cadastro')==='1'){
    window.addEventListener('load',()=>setTimeout(abrirCadastro,150));
  }
})();

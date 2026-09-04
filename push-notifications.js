(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const decodeKey=value=>{const pad='='.repeat((4-value.length%4)%4);const raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};

  async function render(){
    const {data:{session}}=await client.auth.getSession();
    const profile=window.IBNF_ACCESS?.getProfile?.();
    if(!session||!profile?.ativo||!['pastor','admin'].includes(profile.perfil)){
      window.openPanel('Alertas de aniversário','<div class="error-box">Esta função está disponível somente para a administração.</div>');return;
    }
    const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
    const permission=supported?Notification.permission:'unsupported';
    const active=permission==='granted'&&!!(await (await navigator.serviceWorker.ready).pushManager.getSubscription());
    window.openPanel('Alertas de aniversário',`<div class="social-intro"><span class="section-kicker">Aniversariantes</span><h3>Alertas no celular</h3><p>Receba um aviso da IB Nova Família pela manhã quando houver aniversariante.</p></div>${!supported?'<div class="error-box">Este navegador não suporta notificações. Instale o aplicativo pelo Chrome no Android.</div>':`<div class="setup-notice"><b>${active?'Alertas ativados':'Ative neste celular'}</b><span>${active?'Este aparelho receberá os avisos de aniversário.':'Toque abaixo e permita as notificações quando o celular perguntar.'}</span></div><button id="pushEnableBtn" class="primary" type="button">${active?'Atualizar alertas':'Ativar alertas'}</button>${active?'<button id="pushTestBtn" class="secondary" type="button">Enviar notificação de teste</button>':''}<div id="pushFeedback"></div>`}`);
    const btn=document.querySelector('#pushEnableBtn');if(btn)btn.onclick=subscribe;
    const testBtn=document.querySelector('#pushTestBtn');if(testBtn)testBtn.onclick=testNotification;
  }

  async function testNotification(){
    const feedback=document.querySelector('#pushFeedback');
    const button=document.querySelector('#pushTestBtn');
    if(button)button.disabled=true;
    feedback.innerHTML='<div class="setup-notice">Enviando o teste...</div>';
    try{
      const {data:{session}}=await client.auth.getSession();
      if(!session)throw new Error('Entre novamente na plataforma.');
      const response=await fetch('/api/birthday-test',{method:'POST',headers:{'Authorization':`Bearer ${session.access_token}`}});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Não foi possível enviar a notificação de teste.');
      feedback.innerHTML='<div class="success">Teste enviado. Aguarde a notificação e toque nela para continuar.</div>';
    }catch(error){feedback.innerHTML=`<div class="error-box">${String(error.message||error)}</div>`}
    finally{if(button)button.disabled=false}
  }

  async function subscribe(){
    const feedback=document.querySelector('#pushFeedback');feedback.innerHTML='<div class="setup-notice">Ativando...</div>';
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('A permissão de notificações não foi autorizada no celular.');
      const {publicKey}=await fetch('/api/push-config').then(r=>{if(!r.ok)throw new Error('O servidor de notificações ainda não está configurado.');return r.json()});
      const registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
      const {data:{session}}=await client.auth.getSession();
      const response=await fetch('/api/push-subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(subscription)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Não foi possível registrar este celular.');
      feedback.innerHTML='<div class="success">Notificações ativadas neste celular.</div>';
      setTimeout(render,700);
    }catch(error){feedback.innerHTML=`<div class="error-box">${String(error.message||error)}</div>`}
  }

  window.showView=function(view){if(view==='push-notifications'){render();return}return previousShowView(view)};
  const requestedParams=new URLSearchParams(window.location.search);
  const requestedView=requestedParams.get('view');
  if(requestedView==='aniversariantes'){
    window.IBNF_BIRTHDAY_TEST=requestedParams.get('testGroup')==='1';
    window.history.replaceState({},'',window.location.pathname);
    setTimeout(()=>window.showView('aniversariantes'),350);
  }
})();

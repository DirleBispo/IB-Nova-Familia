(function(){
  const PREFIX='ibnf_device_lock_v1:';
  let unlocked=false;
  let hiddenAt=0;
  let inProgress=null;

  function toBase64Url(buffer){
    const bytes=new Uint8Array(buffer);
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function fromBase64Url(value){
    const base64=value.replace(/-/g,'+').replace(/_/g,'/');
    const padded=base64+'='.repeat((4-base64.length%4)%4);
    const binary=atob(padded);
    return Uint8Array.from(binary,char=>char.charCodeAt(0));
  }

  function randomBytes(length){
    const bytes=new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function storageKey(user){
    return PREFIX+user.id;
  }

  async function platformAvailable(){
    if(!window.isSecureContext||!window.PublicKeyCredential||!navigator.credentials)return false;
    if(typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable!=='function')return true;
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  }

  async function register(user){
    const credential=await navigator.credentials.create({publicKey:{
      challenge:randomBytes(32),
      rp:{name:'IB Nova Família',id:location.hostname},
      user:{
        id:new TextEncoder().encode(user.id),
        name:user.email||user.id,
        displayName:user.user_metadata?.nome||user.email||'Usuário'
      },
      pubKeyCredParams:[
        {type:'public-key',alg:-7},
        {type:'public-key',alg:-257}
      ],
      authenticatorSelection:{
        authenticatorAttachment:'platform',
        residentKey:'discouraged',
        userVerification:'required'
      },
      timeout:60000,
      attestation:'none'
    }});
    if(!credential)throw new Error('Não foi possível ativar a proteção.');
    localStorage.setItem(storageKey(user),JSON.stringify({id:credential.id,rawId:toBase64Url(credential.rawId)}));
    return true;
  }

  async function verify(user,record){
    const assertion=await navigator.credentials.get({publicKey:{
      challenge:randomBytes(32),
      allowCredentials:[{type:'public-key',id:fromBase64Url(record.rawId)}],
      userVerification:'required',
      timeout:60000
    }});
    return !!assertion;
  }

  async function perform(user){
    if(!await platformAvailable()){
      alert('Este aparelho não oferece biometria ou bloqueio de tela compatível. Atualize o navegador e confirme que o celular possui bloqueio de tela.');
      return false;
    }
    let record=null;
    try{record=JSON.parse(localStorage.getItem(storageKey(user))||'null')}catch(_){}
    try{
      if(!record){
        const activate=confirm('Ative a biometria ou o bloqueio de tela para proteger as áreas administrativas neste aparelho.');
        if(!activate)return false;
        await register(user);
      }else{
        await verify(user,record);
      }
      unlocked=true;
      return true;
    }catch(error){
      if(error?.name==='InvalidStateError'){
        localStorage.removeItem(storageKey(user));
        alert('A proteção deste aparelho precisa ser ativada novamente.');
      }else if(error?.name!=='NotAllowedError'){
        alert('Não foi possível confirmar a biometria. Verifique o bloqueio de tela do aparelho e tente novamente.');
      }
      return false;
    }
  }

  async function requireUnlock(user){
    if(unlocked)return true;
    if(!user?.id)return false;
    if(inProgress)return inProgress;
    inProgress=perform(user).finally(()=>{inProgress=null});
    return inProgress;
  }

  function lock(){unlocked=false}
  window.IBNF_DEVICE_LOCK={require:requireUnlock,lock};

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)hiddenAt=Date.now();
    else if(hiddenAt&&Date.now()-hiddenAt>15000)lock();
  });
  window.addEventListener('pagehide',lock);
})();
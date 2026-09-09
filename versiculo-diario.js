(function(){
  const verses=[
    {text:'Este é o dia que fez o Senhor; regozijemo-nos, e alegremo-nos nele.',ref:'Salmos 118:24'},
    {text:'O Senhor é o meu pastor; nada me faltará.',ref:'Salmos 23:1'},
    {text:'Posso todas as coisas naquele que me fortalece.',ref:'Filipenses 4:13'},
    {text:'Entrega o teu caminho ao Senhor; confia nele, e ele o fará.',ref:'Salmos 37:5'},
    {text:'Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus.',ref:'Isaías 41:10'},
    {text:'Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.',ref:'Romanos 12:12'},
    {text:'O choro pode durar uma noite, mas a alegria vem pela manhã.',ref:'Salmos 30:5'},
    {text:'Porque para Deus nada é impossível.',ref:'Lucas 1:37'},
    {text:'Lâmpada para os meus pés é tua palavra e luz, para o meu caminho.',ref:'Salmos 119:105'},
    {text:'Buscai primeiro o Reino de Deus, e a sua justiça, e todas essas coisas vos serão acrescentadas.',ref:'Mateus 6:33'},
    {text:'Perto está o Senhor de todos os que o invocam.',ref:'Salmos 145:18'},
    {text:'A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza.',ref:'2 Coríntios 12:9'},
    {text:'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.',ref:'Provérbios 3:5'},
    {text:'O Senhor é a minha luz e a minha salvação; a quem temerei?',ref:'Salmos 27:1'},
    {text:'Sede fortes e corajosos; não temais, nem vos atemorizeis.',ref:'Deuteronômio 31:6'},
    {text:'Tudo tem o seu tempo determinado, e há tempo para todo o propósito debaixo do céu.',ref:'Eclesiastes 3:1'},
    {text:'Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.',ref:'Mateus 5:9'},
    {text:'Clama a mim, e responder-te-ei e anunciar-te-ei coisas grandes e firmes que não sabes.',ref:'Jeremias 33:3'},
    {text:'O meu socorro vem do Senhor, que fez o céu e a terra.',ref:'Salmos 121:2'},
    {text:'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.',ref:'1 Tessalonicenses 5:18'},
    {text:'Deus é o nosso refúgio e fortaleza, socorro bem-presente na angústia.',ref:'Salmos 46:1'},
    {text:'Mas os que esperam no Senhor renovarão as suas forças.',ref:'Isaías 40:31'},
    {text:'O coração alegre aformoseia o rosto.',ref:'Provérbios 15:13'},
    {text:'Aquietai-vos e sabei que eu sou Deus.',ref:'Salmos 46:10'},
    {text:'E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus.',ref:'Romanos 8:28'},
    {text:'Eu e a minha casa serviremos ao Senhor.',ref:'Josué 24:15'},
    {text:'O Senhor te abençoe e te guarde.',ref:'Números 6:24'},
    {text:'Regozijai-vos sempre no Senhor; outra vez digo: regozijai-vos.',ref:'Filipenses 4:4'},
    {text:'Crê no Senhor Jesus Cristo e serás salvo, tu e a tua casa.',ref:'Atos 16:31'},
    {text:'As misericórdias do Senhor são a causa de não sermos consumidos.',ref:'Lamentações 3:22'},
    {text:'Até aqui nos ajudou o Senhor.',ref:'1 Samuel 7:12'}
  ];
  const text=document.querySelector('#dailyWordText'),reference=document.querySelector('#dailyWordReference'),share=document.querySelector('#shareDailyWord');if(!text||!reference||!share)return;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((o,p)=>(o[p.type]=p.value,o),{}),start=Date.UTC(Number(parts.year),0,1),current=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day)),day=Math.floor((current-start)/86400000),verse=verses[day%verses.length];
  text.textContent=verse.text;reference.textContent=verse.ref;
  share.addEventListener('click',async()=>{const message=`Palavra para hoje\n\n“${verse.text}”\n${verse.ref}\n\nIgreja Batista Nova Família\n${location.origin}`;if(navigator.share){try{await navigator.share({title:'Palavra para hoje',text:message});return}catch(error){if(error?.name==='AbortError')return}}try{await navigator.clipboard.writeText(message);alert('Versículo copiado. Agora é só compartilhar!')}catch(_){window.prompt('Copie o versículo:',message)}});
})();

(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
  const fmtDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'';

  async function allowed(){
    const {data:{session}}=await client.auth.getSession();
    if(!session)return false;
    const {data}=await client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();
    return !!data?.ativo&&['pastor','tesouraria'].includes(data.perfil);
  }

  async function loadFinanceiro(){
    if(typeof window.openPanel!=='function')return;
    window.openPanel('Financeiro','<div class="birthday-loading">Carregando financeiro...</div>');
    if(!(await allowed())){window.openPanel('Financeiro','<div class="error-box">Área restrita ao Pastor e à Tesouraria.</div>');return;}
    const now=new Date();
    const y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
    const start=`${y}-${m}-01`;
    const end=new Date(y,now.getMonth()+1,0); const endIso=`${y}-${m}-${String(end.getDate()).padStart(2,'0')}`;
    const {data,error}=await client.from('financeiro_lancamentos').select('*').gte('data',start).lte('data',endIso).order('data',{ascending:false}).order('criado_em',{ascending:false});
    if(error){window.openPanel('Financeiro',`<div class="error-box">${esc(error.message)}</div>`);return;}
    const rows=data||[];
    const entradas=rows.filter(x=>x.tipo==='entrada').reduce((s,x)=>s+Number(x.valor||0),0);
    const saidas=rows.filter(x=>x.tipo==='saida').reduce((s,x)=>s+Number(x.valor||0),0);
    const saldo=entradas-saidas;
    const list=rows.map(x=>`<div class="finance-row ${x.tipo}"><div><b>${esc(x.descricao)}</b><small>${fmtDate(x.data)} · ${esc(x.categoria)}${x.forma_pagamento?' · '+esc(x.forma_pagamento):''}</small></div><strong>${x.tipo==='saida'?'-':'+'}${money(x.valor)}</strong></div>`).join('');
    const html=`<div class="finance-summary"><div><span>Entradas do mês</span><b>${money(entradas)}</b></div><div><span>Saídas do mês</span><b>${money(saidas)}</b></div><div><span>Saldo do mês</span><b>${money(saldo)}</b></div></div><div class="finance-actions"><button class="primary" id="novoLancamentoBtn">Novo lançamento</button></div><div class="finance-section"><h3>Movimentações do mês</h3>${list||'<div class="empty"><div>Nenhum lançamento neste mês.</div></div>'}</div>`;
    window.openPanel('Financeiro',html);
    document.querySelector('#novoLancamentoBtn')?.addEventListener('click',openForm);
  }

  async function openForm(){
    if(!(await allowed()))return;
    const today=new Date().toISOString().slice(0,10);
    const html=`<form class="form finance-form" id="financeForm"><label>Data<input type="date" name="data" value="${today}" required></label><label>Tipo<select name="tipo" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label><label>Categoria<select name="categoria" required><option>Dízimos</option><option>Ofertas</option><option>Missões</option><option>Doações</option><option>Eventos</option><option>Manutenção</option><option>Contas</option><option>Compras</option><option>Ajuda social</option><option>Outros</option></select></label><label>Descrição<input name="descricao" placeholder="Descrição do lançamento" required></label><label>Valor (R$)<input name="valor" type="number" step="0.01" min="0.01" required></label><label>Forma de pagamento<select name="forma_pagamento"><option value="">Não informado</option><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Cartão</option><option>Boleto</option><option>Outro</option></select></label><label>Observação<textarea name="observacao" placeholder="Observação opcional"></textarea></label><button class="primary">Salvar lançamento</button></form><div id="financeFeedback"></div>`;
    window.openPanel('Novo lançamento',html);
    document.querySelector('#financeForm').onsubmit=async e=>{
      e.preventDefault(); const f=new FormData(e.target),fb=document.querySelector('#financeFeedback');
      const {data:{session}}=await client.auth.getSession(); if(!session)return;
      const payload={data:f.get('data'),tipo:f.get('tipo'),categoria:f.get('categoria'),descricao:f.get('descricao'),valor:Number(f.get('valor')),forma_pagamento:f.get('forma_pagamento')||null,observacao:f.get('observacao')||null,criado_por:session.user.id};
      const {error}=await client.from('financeiro_lancamentos').insert(payload);
      if(error){fb.innerHTML=`<div class="error-box">${esc(error.message)}</div>`;return;}
      fb.innerHTML='<div class="success">Lançamento salvo com sucesso.</div>';
      setTimeout(loadFinanceiro,500);
    };
  }

  window.showView=function(view){if(view==='financeiro'){loadFinanceiro();return;}return previousShowView(view)};
})();
(function(){
  if(!window.supabase||!window.IBNF_CONFIG?.SUPABASE_URL||!window.IBNF_CONFIG?.SUPABASE_ANON_KEY)return;
  const client=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
  const previousShowView=window.showView;
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtDate=v=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'';

  async function allowed(){
    const {data:{session}}=await client.auth.getSession();
    if(!session)return false;
    const {data}=await client.from('perfis').select('perfil,ativo').eq('id',session.user.id).maybeSingle();
    return !!data?.ativo&&['pastor','tesouraria'].includes(data.perfil);
  }

  async function deleteLancamento(id,descricao){
    if(!(await allowed()))return;
    const ok=confirm(`Deseja realmente excluir este lançamento?\n\n${descricao||''}\n\nEsta ação não poderá ser desfeita.`);
    if(!ok)return;
    const {error}=await client.from('financeiro_lancamentos').delete().eq('id',id);
    if(error){alert('Não foi possível excluir: '+error.message);return;}
    await loadFinanceiro();
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
    const list=rows.map(x=>{
      const pessoa=x.pessoa_nome?`<small>Ofertante/Pessoa: ${esc(x.pessoa_nome)}</small>`:'';
      return `<div class="finance-row ${x.tipo}"><div class="finance-row-main"><div><b>${esc(x.descricao)}</b><small>${fmtDate(x.data)} · ${esc(x.categoria)}${x.forma_pagamento?' · '+esc(x.forma_pagamento):''}</small>${pessoa}</div><strong>${x.tipo==='saida'?'-':'+'}${money(x.valor)}</strong></div><div class="finance-row-actions"><button type="button" class="finance-delete" data-fin-delete="${esc(x.id)}" data-fin-desc="${esc(x.descricao)}">Excluir</button></div></div>`;
    }).join('');
    const html=`<div class="finance-summary"><div><span>Entradas do mês</span><b>${money(entradas)}</b></div><div><span>Saídas do mês</span><b>${money(saidas)}</b></div><div><span>Saldo do mês</span><b>${money(saldo)}</b></div></div><div class="finance-actions"><button class="primary" id="novoLancamentoBtn">Novo lançamento</button></div><div class="finance-section"><h3>Movimentações do mês</h3>${list||'<div class="empty"><div>Nenhum lançamento neste mês.</div></div>'}</div>`;
    window.openPanel('Financeiro',html);
    document.querySelector('#novoLancamentoBtn')?.addEventListener('click',openForm);
    document.querySelectorAll('[data-fin-delete]').forEach(btn=>btn.addEventListener('click',()=>deleteLancamento(btn.dataset.finDelete,btn.dataset.finDesc)));
  }

  async function fetchFormData(){
    const [pessoasRes,categoriasRes]=await Promise.all([
      client.from('pessoas').select('id,nome').eq('ativo',true).order('nome'),
      client.from('financeiro_categorias').select('id,nome,tipo').eq('ativo',true).order('nome')
    ]);
    return {pessoas:pessoasRes.data||[],categorias:categoriasRes.data||[],error:pessoasRes.error||categoriasRes.error};
  }

  function categoryOptions(categorias,tipo){
    return categorias.filter(c=>c.tipo===tipo).map(c=>`<option value="${esc(c.id)}" data-nome="${esc(c.nome)}">${esc(c.nome)}</option>`).join('');
  }

  async function openForm(){
    if(!(await allowed()))return;
    window.openPanel('Novo lançamento','<div class="birthday-loading">Carregando formulário...</div>');
    const {pessoas,categorias,error}=await fetchFormData();
    if(error){window.openPanel('Novo lançamento',`<div class="error-box">${esc(error.message)}</div>`);return;}
    const today=new Date().toISOString().slice(0,10);
    const pessoaOptions=pessoas.map(p=>`<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('');
    const html=`<form class="form finance-form" id="financeForm">
      <label>Data<input type="date" name="data" value="${today}" required></label>
      <label>Tipo<select name="tipo" id="financeTipo" required><option value="entrada">Entrada</option><option value="saida">Saída</option></select></label>
      <label id="pessoaWrap">Pessoa / ofertante<select name="pessoa_id" id="financePessoa"><option value="">Não identificado / Visitante / Outro</option>${pessoaOptions}</select></label>
      <label id="nomeLivreWrap">Nome não cadastrado<input name="pessoa_nome_livre" placeholder="Ex.: visitante ou empresa"></label>
      <label>Categoria<select name="categoria_id" id="financeCategoria" required><option value="">Selecione...</option>${categoryOptions(categorias,'entrada')}</select></label>
      <div class="finance-new-category"><button type="button" id="novaCategoriaBtn">+ Nova categoria</button></div>
      <label>Descrição<input name="descricao" placeholder="Ex.: Dízimo do culto de domingo" required></label>
      <label>Valor (R$)<input name="valor" type="number" step="0.01" min="0.01" required></label>
      <label>Forma de pagamento<select name="forma_pagamento"><option value="">Não informado</option><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Cartão</option><option>Boleto</option><option>Outro</option></select></label>
      <label>Observação<textarea name="observacao" placeholder="Observação opcional"></textarea></label>
      <button class="primary">Salvar lançamento</button>
    </form><div id="financeFeedback"></div>`;
    window.openPanel('Novo lançamento',html);

    const form=document.querySelector('#financeForm');
    const tipoEl=document.querySelector('#financeTipo');
    const catEl=document.querySelector('#financeCategoria');
    const pessoaWrap=document.querySelector('#pessoaWrap');
    const nomeLivreWrap=document.querySelector('#nomeLivreWrap');

    function refreshByType(){
      const tipo=tipoEl.value;
      catEl.innerHTML=`<option value="">Selecione...</option>${categoryOptions(categorias,tipo)}`;
      const showPessoa=tipo==='entrada';
      pessoaWrap.style.display=showPessoa?'':'none';
      nomeLivreWrap.style.display=showPessoa?'':'none';
      if(!showPessoa){form.elements.pessoa_id.value='';form.elements.pessoa_nome_livre.value='';}
    }
    tipoEl.addEventListener('change',refreshByType);
    refreshByType();

    document.querySelector('#novaCategoriaBtn').onclick=async()=>{
      const nome=prompt('Nome da nova categoria:');
      if(!nome||!nome.trim())return;
      const tipo=tipoEl.value;
      const {data:newCat,error:catError}=await client.from('financeiro_categorias').insert({nome:nome.trim(),tipo}).select('id,nome,tipo').single();
      if(catError){document.querySelector('#financeFeedback').innerHTML=`<div class="error-box">${esc(catError.message)}</div>`;return;}
      categorias.push(newCat);
      refreshByType();
      catEl.value=newCat.id;
    };

    form.onsubmit=async e=>{
      e.preventDefault(); const f=new FormData(e.target),fb=document.querySelector('#financeFeedback');
      const {data:{session}}=await client.auth.getSession(); if(!session)return;
      const selectedCat=catEl.options[catEl.selectedIndex];
      const categoria=selectedCat?.dataset?.nome||selectedCat?.textContent||'';
      if(!categoria||!f.get('categoria_id')){fb.innerHTML='<div class="error-box">Selecione uma categoria.</div>';return;}
      let pessoaId=null,pessoaNome=null;
      if(f.get('tipo')==='entrada'){
        pessoaId=f.get('pessoa_id')||null;
        if(pessoaId){const p=pessoas.find(x=>x.id===pessoaId);pessoaNome=p?.nome||null;}
        else pessoaNome=(f.get('pessoa_nome_livre')||'').trim()||null;
      }
      const payload={
        data:f.get('data'),tipo:f.get('tipo'),categoria_id:f.get('categoria_id'),categoria,
        pessoa_id:pessoaId,pessoa_nome:pessoaNome,descricao:f.get('descricao'),valor:Number(f.get('valor')),
        forma_pagamento:f.get('forma_pagamento')||null,observacao:f.get('observacao')||null,criado_por:session.user.id
      };
      const {error}=await client.from('financeiro_lancamentos').insert(payload);
      if(error){fb.innerHTML=`<div class="error-box">${esc(error.message)}</div>`;return;}
      fb.innerHTML='<div class="success">Lançamento salvo com sucesso.</div>';
      setTimeout(loadFinanceiro,500);
    };
  }

  window.showView=function(view){if(view==='financeiro'){loadFinanceiro();return;}return previousShowView(view)};
})();
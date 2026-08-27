export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const PLANILHA_URL =
      "https://script.google.com/macros/s/AKfycbwECHHyliUlRPc3JY63nNeza1XTH4t4cx0FMdJb1yOs6H2Fgy4GfQud9P50ulyxx73Xaw/exec";

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    function respostaJson(dados, status = 200) {
      return new Response(JSON.stringify(dados), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    async function enviarTelegram(texto) {
      if (!env.TELEGRAM_BOT_TOKEN) return { ok: false, status: 500, erro: "TELEGRAM_BOT_TOKEN não configurado." };
      if (!env.TELEGRAM_CHAT_ID) return { ok: false, status: 500, erro: "TELEGRAM_CHAT_ID não configurado." };
      try {
        const resposta = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: texto })
        });
        const dados = await resposta.json();
        if (!resposta.ok || !dados.ok) {
          return { ok: false, status: 502, erro: "Erro ao enviar para o Telegram.", telegram: { ok: dados.ok ?? false, error_code: dados.error_code ?? null, description: dados.description ?? "Sem descrição" } };
        }
        return { ok: true, status: 200 };
      } catch (erro) {
        return { ok: false, status: 502, erro: String(erro?.message || erro) };
      }
    }

    async function enviarPlanilha(dados) {
      try {
        const resposta = await fetch(PLANILHA_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
          redirect: "follow"
        });
        const texto = await resposta.text();
        let retorno = null;
        try { retorno = JSON.parse(texto); } catch (_) {}
        if (resposta.ok && retorno && retorno.sucesso === true) return { ok: true, resposta: retorno };
        return { ok: false, status: resposta.status, resposta: texto };
      } catch (erro) {
        return { ok: false, status: 500, erro: String(erro?.message || erro) };
      }
    }

    if (request.method === "GET" && url.pathname === "/") {
      return respostaJson({
        sistema: "Igreja Batista Nova Família",
        status: "online",
        backend: "unificado",
        telegram: "ativo",
        planilha: "ativa",
        rotas: [
          "/telegram/oracao",
          "/telegram/visita",
          "/telegram/contato",
          "/telegram/visitante",
          "/telegram/servir"
        ]
      });
    }

    if (request.method === "POST" && url.pathname === "/telegram/oracao") {
      try {
        const dados = await request.json();
        const nome = String(dados.nome || "").trim();
        const pedido = String(dados.pedido || "").trim();
        if (!nome || !pedido) return respostaJson({ sucesso: false, mensagem: "Nome e pedido são obrigatórios." }, 400);
        const telegram = await enviarTelegram(`🙏 NOVO PEDIDO DE ORAÇÃO\n\n👤 Nome: ${nome}\n\n🙏 Pedido:\n${pedido}\n\n⛪ Igreja Batista Nova Família`);
        if (!telegram.ok) return respostaJson({ sucesso: false, mensagem: telegram.erro, telegram: telegram.telegram || null }, telegram.status);
        const planilha = await enviarPlanilha({ tipo: "oracao", nome, pedido });
        return respostaJson({ sucesso: true, mensagem: "Pedido enviado com sucesso.", telegram: true, planilha: planilha.ok });
      } catch (erro) {
        return respostaJson({ sucesso: false, mensagem: "Erro interno do servidor.", erro: String(erro?.message || erro) }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/telegram/visita") {
      try {
        const dados = await request.json();
        const nome = String(dados.nome || "").trim();
        const telefone = String(dados.telefone || "").trim();
        const data = String(dados.data || "").trim();
        const hora = String(dados.hora || "").trim();
        const endereco = String(dados.endereco || "").trim();
        const motivo = String(dados.motivo || "").trim();
        if (!nome || !telefone || !data || !hora || !endereco) return respostaJson({ sucesso: false, erro: "Preencha todos os campos obrigatórios." }, 400);
        const telegram = await enviarTelegram(`🏠 NOVA SOLICITAÇÃO DE VISITA PASTORAL\n\n👤 Nome: ${nome}\n📞 Telefone / WhatsApp: ${telefone}\n📅 Melhor dia: ${data}\n🕒 Melhor horário: ${hora}\n📍 Endereço: ${endereco}\n📝 Motivo: ${motivo || "Não informado"}\n\n⛪ Igreja Batista Nova Família`);
        if (!telegram.ok) return respostaJson({ sucesso: false, erro: telegram.erro, telegram: telegram.telegram || null }, telegram.status);
        const planilha = await enviarPlanilha({ tipo: "visita", nome, telefone, data, hora, endereco, motivo });
        return respostaJson({ sucesso: true, mensagem: "Solicitação de visita pastoral enviada com sucesso.", telegram: true, planilha: planilha.ok });
      } catch (erro) {
        return respostaJson({ sucesso: false, erro: "Erro ao processar a solicitação.", detalhe: String(erro?.message || erro) }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/telegram/contato") {
      try {
        const dados = await request.json();
        const nome = String(dados.nome || "").trim();
        const telefone = String(dados.telefone || "").trim();
        const assunto = String(dados.assunto || "").trim();
        const mensagem = String(dados.mensagem || "").trim();
        if (!nome || !telefone || !assunto || !mensagem) return respostaJson({ sucesso: false, erro: "Preencha todos os campos obrigatórios." }, 400);
        const telegram = await enviarTelegram(`💬 NOVO CONTATO - IBNF\n\n👤 Nome: ${nome}\n📞 Telefone / WhatsApp: ${telefone}\n📝 Assunto: ${assunto}\n\n💬 Mensagem:\n${mensagem}\n\n⛪ Igreja Batista Nova Família`);
        if (!telegram.ok) return respostaJson({ sucesso: false, erro: telegram.erro, telegram: telegram.telegram || null }, telegram.status);
        return respostaJson({ sucesso: true, mensagem: "Contato enviado com sucesso." });
      } catch (_) {
        return respostaJson({ sucesso: false, erro: "Erro ao processar o contato." }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/telegram/visitante") {
      try {
        const dados = await request.json();
        const nome = String(dados.nome || "").trim();
        const telefone = String(dados.telefone || "").trim();
        const primeiraVez = String(dados.primeiraVez || "").trim();
        const informacoes = String(dados.informacoes || "").trim();
        if (!nome || !telefone || !primeiraVez || !informacoes) return respostaJson({ sucesso: false, mensagem: "Preencha todos os campos obrigatórios." }, 400);
        const telegram = await enviarTelegram(`👋 NOVO VISITANTE - IBNF\n\n👤 Nome: ${nome}\n📞 Telefone / WhatsApp: ${telefone}\n⛪ Primeira vez conosco: ${primeiraVez}\n📢 Deseja receber informações da igreja: ${informacoes}\n\n💙 Seja muito bem-vindo à Igreja Batista Nova Família!`);
        if (!telegram.ok) return respostaJson({ sucesso: false, mensagem: telegram.erro, telegram: telegram.telegram || null }, telegram.status);
        const planilha = await enviarPlanilha({ tipo: "visitante", nome, telefone, primeiraVez, informacoes });
        return respostaJson({ sucesso: true, mensagem: "Cadastro do visitante enviado com sucesso.", telegram: true, planilha: planilha.ok });
      } catch (erro) {
        return respostaJson({ sucesso: false, mensagem: "Erro ao processar cadastro do visitante.", erro: String(erro?.message || erro) }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/telegram/servir") {
      try {
        const dados = await request.json();
        const nome = String(dados.nome || "").trim();
        const telefone = String(dados.telefone || "").trim();
        const area = String(dados.area || "").trim();
        const observacao = String(dados.observacao || "").trim();
        if (!nome || !telefone) return respostaJson({ sucesso: false, mensagem: "Nome e telefone são obrigatórios." }, 400);
        const telegram = await enviarTelegram(`🙌 NOVO INTERESSE - QUERO SERVIR\n\n👤 Nome: ${nome}\n📞 Telefone / WhatsApp: ${telefone}\n🧩 Área de interesse: ${area || "Não informada"}\n📝 Observação: ${observacao || "Não informada"}\n\n⛪ Igreja Batista Nova Família`);
        if (!telegram.ok) return respostaJson({ sucesso: false, mensagem: telegram.erro, telegram: telegram.telegram || null }, telegram.status);
        const planilha = await enviarPlanilha({ tipo: "servir", nome, telefone, area, observacao });
        return respostaJson({ sucesso: true, mensagem: "Interesse em servir enviado com sucesso.", telegram: true, planilha: planilha.ok });
      } catch (erro) {
        return respostaJson({ sucesso: false, mensagem: "Erro ao processar interesse em servir.", erro: String(erro?.message || erro) }, 500);
      }
    }

    return respostaJson({ sucesso: false, mensagem: "Rota não encontrada." }, 404);
  }
};

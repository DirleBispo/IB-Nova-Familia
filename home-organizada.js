(() => {
  const dashboard = document.querySelector('#homeDashboard');
  const panel = document.querySelector('#contentPanel');

  if (dashboard && panel) {
    const syncDashboard = () => {
      dashboard.classList.toggle('home-dashboard-hidden', !panel.classList.contains('hidden'));
    };

    new MutationObserver(syncDashboard).observe(panel, {
      attributes: true,
      attributeFilter: ['class'],
    });
    syncDashboard();
  }

  const PIX = '59879785000161';
  const supportButton = document.querySelector('[data-support-open]');

  if (supportButton) {
    supportButton.addEventListener('click', () => {
      let dialog = document.querySelector('#supportDialog');

      if (!dialog) {
        dialog = document.createElement('div');
        dialog.id = 'supportDialog';
        dialog.className = 'support-dialog';
        dialog.innerHTML = `
          <div class="support-dialog-card" role="dialog" aria-modal="true" aria-labelledby="supportTitle">
            <span class="section-kicker">Contribuição</span>
            <h3 id="supportTitle">Contribua com esta obra</h3>
            <p>Sua contribuição nos ajuda a continuar levando a Palavra, cuidando de pessoas e alcançando novas vidas.</p>
            <div class="support-qr-wrap">
              <div class="support-qr-card">
                <img class="support-qr-image" src="4943174373636508796.jpg" alt="QR Code PIX da Igreja Batista Nova Família">
                <strong>Escaneie para contribuir</strong>
                <small>Abra o aplicativo do seu banco e leia o QR Code.</small>
              </div>
            </div>
            <div class="support-note">
              <strong>Favorecido:</strong> Igreja Batista Nova Família<br>
              <strong>PIX — CNPJ:</strong> 59.879.785/0001-61
            </div>
            <button class="support-btn support-copy-pix" type="button">Copiar chave PIX</button>
            <p class="support-copy-status" aria-live="polite"></p>
            <small class="support-security">Antes de concluir o pagamento, confira no aplicativo do seu banco se o favorecido é Igreja Batista Nova Família.</small>
            <button class="support-close" type="button">Fechar</button>
          </div>
        `;
        document.body.appendChild(dialog);

        const copyButton = dialog.querySelector('.support-copy-pix');
        const copyStatus = dialog.querySelector('.support-copy-status');

        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(PIX);
            copyStatus.textContent = 'Chave PIX copiada com sucesso.';
            copyButton.textContent = 'PIX copiado ✓';
          } catch (error) {
            copyStatus.textContent = `Chave PIX: ${PIX}`;
          }
        });

        dialog.querySelector('.support-close').addEventListener('click', () => {
          dialog.hidden = true;
        });
        dialog.addEventListener('click', (event) => {
          if (event.target === dialog) dialog.hidden = true;
        });
      }

      dialog.hidden = false;
    });
  }

  const campaignSection = document.querySelector('#homeCampaign');
  const campaignTitle = document.querySelector('#homeCampaignTitle');
  const campaignPeriod = document.querySelector('#homeCampaignPeriod');

  if (
    !campaignSection ||
    !campaignTitle ||
    !campaignPeriod ||
    !window.supabase ||
    !window.IBNF_CONFIG?.SUPABASE_URL ||
    !window.IBNF_CONFIG?.SUPABASE_ANON_KEY
  ) {
    return;
  }

  const supa = window.supabase.createClient(
    window.IBNF_CONFIG.SUPABASE_URL,
    window.IBNF_CONFIG.SUPABASE_ANON_KEY,
  );
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  async function loadCampaignCard() {
    const { data, error } = await supa
      .from('oracao24_config')
      .select('titulo,inicio,duracao_horas,ativa')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    const start = new Date(data.inicio);
    const duration = Number(data.duracao_horas) || 24;
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    const hasEnded = Date.now() >= end.getTime();

    campaignSection.hidden = !data.ativa || hasEnded;
    campaignSection.dataset.duration = `${duration}h`;
    campaignTitle.textContent = data.titulo;
    campaignPeriod.textContent = `De ${dateFormatter.format(start)} às ${timeFormatter.format(start)} até ${dateFormatter.format(end)} às ${timeFormatter.format(end)}. Escolha uma hora e participe conosco.`;
  }

  loadCampaignCard();
  supa
    .channel('home-campanha-oracao')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'oracao24_config' },
      loadCampaignCard,
    )
    .subscribe();
})();

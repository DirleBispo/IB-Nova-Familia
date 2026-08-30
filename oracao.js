const CHURCH_TIME_ZONE = 'America/Sao_Paulo';
const DEFAULT_CAMPAIGN = Object.freeze({
  id: 1,
  titulo: '24 Horas de Oração',
  versiculo_texto: 'Orai sem cessar.',
  versiculo_referencia: '1 Tessalonicenses 5:17',
  descricao:
    'Cada horário corresponde a uma hora de oração. Depois da confirmação, ele ficará reservado em seu nome.',
  inicio: '2026-09-04T23:00:00-03:00',
  duracao_horas: 24,
  ativa: true,
});

const CAMPAIGN_FIELDS =
  'id,titulo,versiculo_texto,versiculo_referencia,descricao,inicio,duracao_horas,ativa,atualizado_em';

const slotsEl = document.querySelector('#prayerSlots');
const feedbackEl = document.querySelector('#prayerFeedback');
const summaryEl = document.querySelector('#prayerSummary');
const campaignTitleEl = document.querySelector('#campaignTitle');
const campaignVerseTextEl = document.querySelector('#campaignVerseText');
const campaignVerseReferenceEl = document.querySelector('#campaignVerseReference');
const campaignPeriodEl = document.querySelector('#campaignPeriod');
const campaignDescriptionEl = document.querySelector('#campaignDescription');
const campaignAdminBar = document.querySelector('#campaignAdminBar');
const campaignEditButton = document.querySelector('#campaignEditButton');

const modal = document.querySelector('#prayerModal');
const selectedEl = document.querySelector('#prayerSelectedSlot');
const nameEl = document.querySelector('#prayerName');
const form = document.querySelector('#prayerReserveForm');
const editModal = document.querySelector('#prayerEditModal');
const editForm = document.querySelector('#prayerEditForm');
const editNameEl = document.querySelector('#prayerEditName');
const editSlotEl = document.querySelector('#prayerEditSlot');

const campaignSettingsModal = document.querySelector('#campaignSettingsModal');
const campaignSettingsForm = document.querySelector('#campaignSettingsForm');
const campaignSettingsFeedback = document.querySelector('#campaignSettingsFeedback');
const campaignTitleInput = document.querySelector('#campaignTitleInput');
const campaignVerseTextInput = document.querySelector('#campaignVerseTextInput');
const campaignVerseReferenceInput = document.querySelector('#campaignVerseReferenceInput');
const campaignDescriptionInput = document.querySelector('#campaignDescriptionInput');
const campaignStartInput = document.querySelector('#campaignStartInput');
const campaignDurationInput = document.querySelector('#campaignDurationInput');
const campaignActiveInput = document.querySelector('#campaignActiveInput');

let selectedSlot = null;
let editingReservation = null;
let reservations = [];
let isAdmin = false;
let campaignConfigAvailable = false;
let campaignConfig = { ...DEFAULT_CAMPAIGN };
let feedbackTimer = null;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CHURCH_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CHURCH_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
});
const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CHURCH_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character],
  );
}

function campaignStart() {
  return new Date(campaignConfig.inicio);
}

function campaignEnd() {
  return new Date(campaignStart().getTime() + totalSlots() * 60 * 60 * 1000);
}

function totalSlots() {
  const duration = Number(campaignConfig.duracao_horas);
  return Number.isInteger(duration) && duration > 0 ? Math.min(duration, 168) : 24;
}

function campaignAcceptsReservations() {
  return Boolean(campaignConfig.ativa) && Date.now() < campaignEnd().getTime();
}

function formatPeriod() {
  const start = campaignStart();
  const end = campaignEnd();
  return `De ${dateFormatter.format(start)} às ${timeFormatter.format(start)} até ${dateFormatter.format(end)} às ${timeFormatter.format(end)}`;
}

function slotLabel(date) {
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  return `${timeFormatter.format(date)} – ${timeFormatter.format(end)}`;
}

function dayLabel(date) {
  return shortDateFormatter.format(date);
}

function makeSlots() {
  const start = campaignStart();
  return Array.from(
    { length: totalSlots() },
    (_, index) => new Date(start.getTime() + index * 60 * 60 * 1000),
  );
}

function showFeedback(message, type = 'success') {
  window.clearTimeout(feedbackTimer);
  feedbackEl.innerHTML = `<div class="prayer-alert ${type}">${message}</div>`;
  feedbackTimer = window.setTimeout(() => {
    feedbackEl.innerHTML = '';
  }, 5000);
}

function showSettingsError(message) {
  campaignSettingsFeedback.innerHTML = `<div class="campaign-settings-error">${escapeHtml(message)}</div>`;
}

function setLoading() {
  slotsEl.setAttribute('aria-busy', 'true');
  slotsEl.innerHTML = '<div class="prayer-loading">Carregando os horários disponíveis...</div>';
}

function createSupabaseClient() {
  if (
    !window.supabase ||
    !window.IBNF_CONFIG?.SUPABASE_URL ||
    !window.IBNF_CONFIG?.SUPABASE_ANON_KEY
  ) {
    return null;
  }

  return window.supabase.createClient(
    window.IBNF_CONFIG.SUPABASE_URL,
    window.IBNF_CONFIG.SUPABASE_ANON_KEY,
  );
}

const supa = createSupabaseClient();

async function detectAdmin() {
  if (!supa) return false;

  const {
    data: { session },
  } = await supa.auth.getSession();

  if (!session) return false;

  const { data } = await supa
    .from('perfis')
    .select('perfil')
    .eq('id', session.user.id)
    .maybeSingle();

  return ['pastor', 'secretaria'].includes(data?.perfil);
}

function applyCampaignConfig() {
  campaignTitleEl.textContent = campaignConfig.titulo;
  campaignVerseTextEl.textContent = campaignConfig.versiculo_texto;
  campaignVerseReferenceEl.textContent = campaignConfig.versiculo_referencia;
  campaignDescriptionEl.textContent = campaignConfig.descricao;
  campaignPeriodEl.textContent = formatPeriod();
  document.title = `${campaignConfig.titulo} | IB Nova Família`;

  campaignAdminBar.classList.toggle('hidden', !(isAdmin && campaignConfigAvailable));
}

async function loadCampaignConfig() {
  if (!supa) {
    campaignConfig = { ...DEFAULT_CAMPAIGN };
    campaignConfigAvailable = false;
    applyCampaignConfig();
    return;
  }

  const { data, error } = await supa
    .from('oracao24_config')
    .select(CAMPAIGN_FIELDS)
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    campaignConfig = { ...DEFAULT_CAMPAIGN };
    campaignConfigAvailable = false;
  } else {
    campaignConfig = data;
    campaignConfigAvailable = true;
  }

  applyCampaignConfig();
}

async function loadReservations() {
  if (!supa) {
    summaryEl.textContent = 'A escala está temporariamente indisponível.';
    slotsEl.innerHTML = '';
    showFeedback('Não foi possível conectar à escala. Tente novamente em alguns instantes.', 'error');
    return;
  }

  setLoading();
  const { data, error } = await supa
    .from('oracao24_reservas')
    .select('id,slot_inicio,nome')
    .gte('slot_inicio', campaignStart().toISOString())
    .lt('slot_inicio', campaignEnd().toISOString())
    .order('slot_inicio');

  if (error) {
    summaryEl.textContent = 'Não foi possível carregar a escala.';
    slotsEl.innerHTML = '';
    slotsEl.setAttribute('aria-busy', 'false');
    showFeedback('Não foi possível carregar os horários. Atualize a página e tente novamente.', 'error');
    return;
  }

  reservations = data || [];
  render();
}

function render() {
  const reservationMap = new Map(
    reservations.map((reservation) => [new Date(reservation.slot_inicio).getTime(), reservation]),
  );
  const occupied = reservations.length;
  const available = Math.max(totalSlots() - occupied, 0);
  const acceptsReservations = campaignAcceptsReservations();

  if (!campaignConfig.ativa) {
    summaryEl.textContent = `Campanha pausada • ${occupied} horários reservados`;
  } else if (!acceptsReservations) {
    summaryEl.textContent = `Campanha encerrada • ${occupied} horários reservados`;
  } else {
    summaryEl.textContent = `${occupied} de ${totalSlots()} horários reservados • ${available} disponíveis`;
  }

  slotsEl.innerHTML = makeSlots()
    .map((slot) => {
      const reservation = reservationMap.get(slot.getTime());

      if (reservation) {
        return `
          <article class="prayer-slot reserved">
            <div>
              <span class="prayer-slot-time">${slotLabel(slot)}</span>
              <span class="prayer-slot-meta">${dayLabel(slot)} • Reservado por ${escapeHtml(reservation.nome)}</span>
            </div>
            <div class="prayer-slot-actions">
              <button type="button" disabled>Reservado</button>
              ${
                isAdmin
                  ? `<button class="prayer-slot-edit" data-edit="${reservation.id}" type="button">Editar</button>
                     <button class="prayer-slot-admin" data-release="${reservation.id}" type="button">Liberar</button>`
                  : ''
              }
            </div>
          </article>
        `;
      }

      if (!acceptsReservations) {
        return `
          <article class="prayer-slot closed">
            <div>
              <span class="prayer-slot-time">${slotLabel(slot)}</span>
              <span class="prayer-slot-meta">${dayLabel(slot)} • Indisponível</span>
            </div>
            <button type="button" disabled>Indisponível</button>
          </article>
        `;
      }

      return `
        <article class="prayer-slot available">
          <div>
            <span class="prayer-slot-time">${slotLabel(slot)}</span>
            <span class="prayer-slot-meta">${dayLabel(slot)} • Disponível</span>
          </div>
          <button type="button" data-slot="${slot.toISOString()}">Quero este horário</button>
        </article>
      `;
    })
    .join('');

  slotsEl.setAttribute('aria-busy', 'false');
  document.querySelectorAll('[data-slot]').forEach((button) => {
    button.addEventListener('click', () => openModal(new Date(button.dataset.slot)));
  });
  document.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => openEditModal(button.dataset.edit));
  });
  document.querySelectorAll('[data-release]').forEach((button) => {
    button.addEventListener('click', () => releaseReservation(button.dataset.release));
  });
}

function openModal(slot) {
  if (!campaignAcceptsReservations()) {
    showFeedback('Esta campanha não está recebendo novas reservas.', 'error');
    return;
  }

  selectedSlot = slot;
  selectedEl.textContent = `${dayLabel(slot)} • ${slotLabel(slot)}`;
  nameEl.value = '';
  modal.classList.remove('hidden');
  window.setTimeout(() => nameEl.focus(), 50);
}

function closeModal() {
  modal.classList.add('hidden');
  selectedSlot = null;
}

async function reserve(event) {
  event.preventDefault();
  if (!selectedSlot || !supa || !campaignAcceptsReservations()) return;

  const name = nameEl.value.trim();
  if (name.length < 2) {
    showFeedback('Digite seu nome para reservar.', 'error');
    return;
  }

  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Confirmando...';

  const { error } = await supa.from('oracao24_reservas').insert({
    slot_inicio: selectedSlot.toISOString(),
    nome: name,
  });

  submit.disabled = false;
  submit.textContent = 'Confirmar meu horário';

  if (error) {
    closeModal();
    await loadReservations();
    showFeedback(
      error.code === '23505'
        ? 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.'
        : 'Não foi possível concluir a reserva. Tente novamente.',
      'error',
    );
    return;
  }

  closeModal();
  showFeedback(`Horário reservado com sucesso para ${escapeHtml(name)}.`);
  await loadReservations();
}

function openEditModal(id) {
  if (!isAdmin) return;

  const reservation = reservations.find((item) => String(item.id) === String(id));
  if (!reservation) return;

  editingReservation = reservation;
  editNameEl.value = reservation.nome;
  const currentTime = new Date(reservation.slot_inicio).getTime();
  const occupied = new Set(
    reservations
      .filter((item) => String(item.id) !== String(reservation.id))
      .map((item) => new Date(item.slot_inicio).getTime()),
  );

  editSlotEl.innerHTML = makeSlots()
    .filter((slot) => slot.getTime() === currentTime || !occupied.has(slot.getTime()))
    .map(
      (slot) =>
        `<option value="${slot.toISOString()}" ${
          slot.getTime() === currentTime ? 'selected' : ''
        }>${dayLabel(slot)} • ${slotLabel(slot)}</option>`,
    )
    .join('');

  editModal.classList.remove('hidden');
  window.setTimeout(() => editNameEl.focus(), 50);
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editingReservation = null;
}

async function saveEdit(event) {
  event.preventDefault();
  if (!isAdmin || !editingReservation || !supa) return;

  const name = editNameEl.value.trim();
  const slotStart = editSlotEl.value;
  if (name.length < 2) {
    showFeedback('Digite um nome válido.', 'error');
    return;
  }

  const submit = editForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Salvando...';

  const { error } = await supa
    .from('oracao24_reservas')
    .update({ nome: name, slot_inicio: slotStart })
    .eq('id', editingReservation.id);

  submit.disabled = false;
  submit.textContent = 'Salvar alterações';

  if (error) {
    showFeedback(
      error.code === '23505'
        ? 'Esse horário foi reservado por outra pessoa. Escolha outro.'
        : 'Não foi possível editar a reserva.',
      'error',
    );
    return;
  }

  closeEditModal();
  showFeedback('Reserva atualizada com sucesso.');
  await loadReservations();
}

async function releaseReservation(id) {
  if (!isAdmin || !supa) return;

  const confirmed = window.confirm('Liberar este horário para uma nova reserva?');
  if (!confirmed) return;

  const { error } = await supa.from('oracao24_reservas').delete().eq('id', id);
  if (error) {
    showFeedback('Não foi possível liberar o horário.', 'error');
    return;
  }

  showFeedback('Horário liberado.');
  await loadReservations();
}

function toCampaignInputValue(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CHURCH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce((map, part) => ({ ...map, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function campaignInputToIso(value) {
  return new Date(`${value}:00-03:00`).toISOString();
}

function openCampaignSettings() {
  if (!isAdmin || !campaignConfigAvailable) return;

  campaignSettingsFeedback.innerHTML = '';
  campaignTitleInput.value = campaignConfig.titulo;
  campaignVerseTextInput.value = campaignConfig.versiculo_texto;
  campaignVerseReferenceInput.value = campaignConfig.versiculo_referencia;
  campaignDescriptionInput.value = campaignConfig.descricao;
  campaignStartInput.value = toCampaignInputValue(campaignStart());
  campaignDurationInput.value = totalSlots();
  campaignActiveInput.checked = Boolean(campaignConfig.ativa);
  campaignSettingsModal.classList.remove('hidden');
  window.setTimeout(() => campaignTitleInput.focus(), 50);
}

function closeCampaignSettings() {
  campaignSettingsModal.classList.add('hidden');
  campaignSettingsFeedback.innerHTML = '';
}

async function saveCampaignSettings(event) {
  event.preventDefault();
  if (!isAdmin || !campaignConfigAvailable || !supa) return;

  const title = campaignTitleInput.value.trim();
  const verseText = campaignVerseTextInput.value.trim();
  const verseReference = campaignVerseReferenceInput.value.trim();
  const description = campaignDescriptionInput.value.trim();
  const duration = Number(campaignDurationInput.value);
  const startValue = campaignStartInput.value;

  if (title.length < 3 || verseText.length < 2 || verseReference.length < 2) {
    showSettingsError('Preencha o título e o versículo corretamente.');
    return;
  }
  if (description.length < 10) {
    showSettingsError('O texto de orientação precisa ter pelo menos 10 caracteres.');
    return;
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 168 || !startValue) {
    showSettingsError('Confira a data de início e a duração da campanha.');
    return;
  }

  let startIso;
  try {
    startIso = campaignInputToIso(startValue);
  } catch (error) {
    showSettingsError('A data de início informada não é válida.');
    return;
  }

  const scheduleChanged =
    new Date(startIso).getTime() !== campaignStart().getTime() || duration !== totalSlots();
  if (
    scheduleChanged &&
    reservations.length > 0 &&
    !window.confirm(
      `Esta campanha possui ${reservations.length} reserva(s). Ao mudar a data ou a duração, elas ficarão guardadas no histórico e a nova escala começará vazia. Deseja continuar?`,
    )
  ) {
    return;
  }

  const submit = campaignSettingsForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = 'Salvando...';
  campaignSettingsFeedback.innerHTML = '';

  const { data, error } = await supa
    .from('oracao24_config')
    .update({
      titulo: title,
      versiculo_texto: verseText,
      versiculo_referencia: verseReference,
      descricao: description,
      inicio: startIso,
      duracao_horas: duration,
      ativa: campaignActiveInput.checked,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', 1)
    .select(CAMPAIGN_FIELDS)
    .single();

  submit.disabled = false;
  submit.textContent = 'Salvar campanha';

  if (error || !data) {
    showSettingsError('Não foi possível salvar. Confirme se sua conta possui acesso de pastor ou secretaria.');
    return;
  }

  campaignConfig = data;
  applyCampaignConfig();
  closeCampaignSettings();
  showFeedback('Campanha atualizada com sucesso.');
  await loadReservations();
}

form.addEventListener('submit', reserve);
editForm.addEventListener('submit', saveEdit);
campaignSettingsForm.addEventListener('submit', saveCampaignSettings);
campaignEditButton.addEventListener('click', openCampaignSettings);
document.querySelector('#prayerModalClose').addEventListener('click', closeModal);
document.querySelector('#prayerEditClose').addEventListener('click', closeEditModal);
document.querySelector('#campaignSettingsClose').addEventListener('click', closeCampaignSettings);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});
editModal.addEventListener('click', (event) => {
  if (event.target === editModal) closeEditModal();
});
campaignSettingsModal.addEventListener('click', (event) => {
  if (event.target === campaignSettingsModal) closeCampaignSettings();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!modal.classList.contains('hidden')) closeModal();
  if (!editModal.classList.contains('hidden')) closeEditModal();
  if (!campaignSettingsModal.classList.contains('hidden')) closeCampaignSettings();
});

(async () => {
  setLoading();
  isAdmin = await detectAdmin();
  await loadCampaignConfig();
  await loadReservations();

  if (supa) {
    supa
      .channel('oracao24-tempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oracao24_reservas' },
        () => loadReservations(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oracao24_config' },
        async () => {
          await loadCampaignConfig();
          await loadReservations();
        },
      )
      .subscribe();
  }
})();

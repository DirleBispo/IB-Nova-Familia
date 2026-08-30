const CAMPAIGN_START = new Date('2026-09-04T23:00:00-03:00');
const CAMPAIGN_END = new Date('2026-09-05T23:00:00-03:00');
const TOTAL_SLOTS = 24;

const slotsEl = document.querySelector('#prayerSlots');
const feedbackEl = document.querySelector('#prayerFeedback');
const summaryEl = document.querySelector('#prayerSummary');
const modal = document.querySelector('#prayerModal');
const selectedEl = document.querySelector('#prayerSelectedSlot');
const nameEl = document.querySelector('#prayerName');
const form = document.querySelector('#prayerReserveForm');
const editModal = document.querySelector('#prayerEditModal');
const editForm = document.querySelector('#prayerEditForm');
const editNameEl = document.querySelector('#prayerEditName');
const editSlotEl = document.querySelector('#prayerEditSlot');

let selectedSlot = null;
let editingReservation = null;
let reservations = [];
let isAdmin = false;
let feedbackTimer = null;

function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character],
  );
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function slotLabel(date) {
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  return `${pad(date.getHours())}:00 – ${pad(end.getHours())}:00`;
}

function dayLabel(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function makeSlots() {
  return Array.from(
    { length: TOTAL_SLOTS },
    (_, index) => new Date(CAMPAIGN_START.getTime() + index * 60 * 60 * 1000),
  );
}

function showFeedback(message, type = 'success') {
  window.clearTimeout(feedbackTimer);
  feedbackEl.innerHTML = `<div class="prayer-alert ${type}">${message}</div>`;
  feedbackTimer = window.setTimeout(() => {
    feedbackEl.innerHTML = '';
  }, 5000);
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
    .gte('slot_inicio', CAMPAIGN_START.toISOString())
    .lt('slot_inicio', CAMPAIGN_END.toISOString())
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

  summaryEl.textContent = `${occupied} de ${TOTAL_SLOTS} horários reservados • ${TOTAL_SLOTS - occupied} disponíveis`;
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
  if (!selectedSlot || !supa) return;

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

form.addEventListener('submit', reserve);
editForm.addEventListener('submit', saveEdit);
document.querySelector('#prayerModalClose').addEventListener('click', closeModal);
document.querySelector('#prayerEditClose').addEventListener('click', closeEditModal);
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});
editModal.addEventListener('click', (event) => {
  if (event.target === editModal) closeEditModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!modal.classList.contains('hidden')) closeModal();
  if (!editModal.classList.contains('hidden')) closeEditModal();
});

(async () => {
  setLoading();
  isAdmin = await detectAdmin();
  await loadReservations();

  if (supa) {
    supa
      .channel('oracao24-tempo-real')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'oracao24_reservas' },
        () => loadReservations(),
      )
      .subscribe();
  }
})();

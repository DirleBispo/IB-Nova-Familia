const ORACAO24_INICIO=new Date('2026-09-04T23:00:00-03:00');
const ORACAO24_FIM=new Date('2026-09-05T23:00:00-03:00');
const slotsEl=document.querySelector('#prayerSlots');
const feedbackEl=document.querySelector('#prayerFeedback');
const summaryEl=document.querySelector('#prayerSummary');
const modal=document.querySelector('#prayerModal');
const selectedEl=document.querySelector('#prayerSelectedSlot');
const nameEl=document.querySelector('#prayerName');
const form=document.querySelector('#prayerReserveForm');
const editModal=document.querySelector('#prayerEditModal');
const editForm=document.querySelector('#prayerEditForm');
const editNameEl=document.querySelector('#prayerEditName');
const editSlotEl=document.querySelector('#prayerEditSlot');
let selectedSlot=null;
let editingReservation=null;
let reservations=[];
let isAdmin=false;
const supa=window.supabase.createClient(window.IBNF_CONFIG.SUPABASE_URL,window.IBNF_CONFIG.SUPABASE_ANON_KEY);
function pad(n){return String(n).padStart(2,'0')}
function slotLabel(d){const end=new Date(d.getTime()+3600000);return `${pad(d.getHours())}:00 – ${pad(end.getHours())}:00`}
function dayLabel(d){return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`}
function makeSlots(){return Array.from({length:24},(_,i)=>new Date(ORACAO24_INICIO.getTime()+i*3600000))}
function showFeedback(text,type='success'){feedbackEl.innerHTML=`<div class="prayer-alert ${type}">${text}</div>`;setTimeout(()=>{feedbackEl.innerHTML=''},4500)}
async function detectAdmin(){const {data:{session}}=await supa.auth.getSession();if(!session)return false;const {data}=await supa.from('perfis').select('perfil').eq('id',session.user.id).maybeSingle();return ['pastor','secretaria'].includes(data?.perfil)}
async function loadReservations(){const {data,error}=await supa.from('oracao24_reservas').select('id,slot_inicio,nome').gte('slot_inicio',ORACAO24_INICIO.toISOString()).lt('slot_inicio',ORACAO24_FIM.toISOString()).order('slot_inicio');if(error){summaryEl.textContent='A escala ainda precisa ser ativada no banco de dados.';slotsEl.innerHTML='';showFeedback('A tabela da escala ainda não foi criada no Supabase.','error');return}reservations=data||[];render()}
function render(){const map=new Map(reservations.map(r=>[new Date(r.slot_inicio).getTime(),r]));const slots=makeSlots();const occupied=reservations.length;summaryEl.textContent=`${occupied} de 24 horários reservados • ${24-occupied} disponíveis`;
slotsEl.innerHTML=slots.map(slot=>{const r=map.get(slot.getTime());if(r)return `<div class="prayer-slot reserved"><div><span class="prayer-slot-time">${slotLabel(slot)}</span><span class="prayer-slot-meta">${dayLabel(slot)} • Reservado por ${escapeHtml(r.nome)}</span></div><div class="prayer-slot-actions"><button type="button" disabled>Reservado</button>${isAdmin?`<button class="prayer-slot-edit" data-edit="${r.id}" type="button">Editar</button><button class="prayer-slot-admin" data-release="${r.id}" type="button">Liberar</button>`:''}</div></div>`;return `<div class="prayer-slot available"><div><span class="prayer-slot-time">${slotLabel(slot)}</span><span class="prayer-slot-meta">${dayLabel(slot)} • Disponível</span></div><button type="button" data-slot="${slot.toISOString()}">Quero este horário</button></div>`}).join('');
document.querySelectorAll('[data-slot]').forEach(btn=>btn.onclick=()=>openModal(new Date(btn.dataset.slot)));
document.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>openEditModal(btn.dataset.edit));
document.querySelectorAll('[data-release]').forEach(btn=>btn.onclick=()=>releaseReservation(btn.dataset.release));}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function openModal(slot){selectedSlot=slot;selectedEl.textContent=`${dayLabel(slot)} • ${slotLabel(slot)}`;nameEl.value='';modal.classList.remove('hidden');setTimeout(()=>nameEl.focus(),50)}
function closeModal(){modal.classList.add('hidden');selectedSlot=null}
async function reserve(e){e.preventDefault();if(!selectedSlot)return;const nome=nameEl.value.trim();if(nome.length<2){showFeedback('Digite seu nome para reservar.','error');return}const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Confirmando...';const {error}=await supa.from('oracao24_reservas').insert({slot_inicio:selectedSlot.toISOString(),nome});submit.disabled=false;submit.textContent='Confirmar meu horário';if(error){closeModal();await loadReservations();if(error.code==='23505')showFeedback('Esse horário acabou de ser reservado por outra pessoa. Escolha outro.','error');else showFeedback('Não foi possível concluir a reserva. Tente novamente.','error');return}closeModal();showFeedback(`Horário reservado com sucesso para ${escapeHtml(nome)}.`);await loadReservations()}
function openEditModal(id){if(!isAdmin)return;const r=reservations.find(x=>String(x.id)===String(id));if(!r)return;editingReservation=r;editNameEl.value=r.nome;const currentTime=new Date(r.slot_inicio).getTime();const occupied=new Set(reservations.filter(x=>String(x.id)!==String(r.id)).map(x=>new Date(x.slot_inicio).getTime()));editSlotEl.innerHTML=makeSlots().filter(slot=>slot.getTime()===currentTime||!occupied.has(slot.getTime())).map(slot=>`<option value="${slot.toISOString()}" ${slot.getTime()===currentTime?'selected':''}>${dayLabel(slot)} • ${slotLabel(slot)}</option>`).join('');editModal.classList.remove('hidden');setTimeout(()=>editNameEl.focus(),50)}
function closeEditModal(){editModal.classList.add('hidden');editingReservation=null}
async function saveEdit(e){e.preventDefault();if(!isAdmin||!editingReservation)return;const nome=editNameEl.value.trim();const slot_inicio=editSlotEl.value;if(nome.length<2){showFeedback('Digite um nome válido.','error');return}const submit=editForm.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='Salvando...';const {error}=await supa.from('oracao24_reservas').update({nome,slot_inicio}).eq('id',editingReservation.id);submit.disabled=false;submit.textContent='Salvar alterações';if(error){if(error.code==='23505')showFeedback('Esse horário foi reservado por outra pessoa. Escolha outro.','error');else showFeedback('Não foi possível editar a reserva.','error');return}closeEditModal();showFeedback('Reserva atualizada com sucesso.');await loadReservations()}
async function releaseReservation(id){if(!isAdmin)return;const ok=confirm('Liberar este horário para uma nova reserva?');if(!ok)return;const {error}=await supa.from('oracao24_reservas').delete().eq('id',id);if(error){showFeedback('Não foi possível liberar o horário.','error');return}showFeedback('Horário liberado.');await loadReservations()}
form.addEventListener('submit',reserve);
editForm.addEventListener('submit',saveEdit);
document.querySelector('#prayerModalClose').onclick=closeModal;
document.querySelector('#prayerEditClose').onclick=closeEditModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
editModal.addEventListener('click',e=>{if(e.target===editModal)closeEditModal()});
(async()=>{isAdmin=await detectAdmin();await loadReservations();supa.channel('oracao24-tempo-real').on('postgres_changes',{event:'*',schema:'public',table:'oracao24_reservas'},()=>loadReservations()).subscribe()})();
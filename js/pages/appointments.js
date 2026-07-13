import { getAppointments, saveAppointment, deleteAppointment, getClients } from '../db.js';
import { router } from '../router.js';

export async function render() {
  const appointments = await getAppointments();
  const clients = await getClients();

  const now = Date.now();
  const upcoming = appointments.filter(a => a.date >= now);
  const past = appointments.filter(a => a.date < now);

  upcoming.sort((a, b) => a.date - b.date);
  past.sort((a, b) => b.date - a.date);

  return `
    ${appointments.length === 0 ? `
      <div class="empty-state">
        ${icon.calendar}
        <p>Sin citas registradas</p>
      </div>
    ` : `
      ${upcoming.length > 0 ? `
        <div class="section-title" style="margin-top:12px">Próximas citas (${upcoming.length})</div>
        ${upcoming.map(a => {
          const c = clients.find(cl => cl.id === a.clientId);
          return `
            <div class="card card-static flex justify-between items-center">
              <div>
                <div class="font-bold">${a.title}</div>
                <div class="text-muted" style="font-size:0.85rem">${c ? c.name : ''}</div>
                <div class="text-muted" style="font-size:0.8rem">${fmt.datetime(a.date)}</div>
                ${a.notes ? '<div class="text-muted" style="font-size:0.8rem">' + a.notes + '</div>' : ''}
              </div>
              <button class="icon-btn" style="color:var(--error)" onclick="deleteAppt(${a.id})">${icon.delete}</button>
            </div>
          `;
        }).join('')}
      ` : ''}
      ${past.length > 0 ? `
        <div class="section-title" style="margin-top:16px">Historial (${past.length})</div>
        ${past.slice(0, 20).map(a => {
          const c = clients.find(cl => cl.id === a.clientId);
          return `
            <div class="card card-static flex justify-between items-center" style="opacity:0.7">
              <div>
                <div class="font-bold">${a.title}</div>
                <div class="text-muted" style="font-size:0.85rem">${c ? c.name : ''}</div>
                <div class="text-muted" style="font-size:0.8rem">${fmt.datetime(a.date)}</div>
              </div>
              <button class="icon-btn" style="color:var(--error)" onclick="deleteAppt(${a.id})">${icon.delete}</button>
            </div>
          `;
        }).join('')}
      ` : ''}
    `}
  `;
}

router.register('appointments', render, {
  title: 'Agenda',
  action: () => showAppointmentForm()
});

async function showAppointmentForm() {
  const clients = await getClients();
  dialog.open('Nueva Cita', `
    <div class="field-group">
      <label class="field-label">Cliente *</label>
      <select class="field-select" id="apt_client">
        <option value="">Seleccionar cliente</option>
        ${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Título *</label>
      <input class="field-input" id="apt_title" placeholder="Ej: Prueba de vestido">
    </div>
    <div class="field-group">
      <label class="field-label">Fecha y hora</label>
      <input class="field-input" id="apt_date" type="datetime-local">
    </div>
    <div class="field-group">
      <label class="field-label">Notas</label>
      <textarea class="field-input" id="apt_notes"></textarea>
    </div>
  `, [
    { label: 'Cancelar' },
    { label: 'Guardar', primary: true, action: async () => {
      const data = formData(['apt_client','apt_title','apt_date','apt_notes']);
      if (!data.apt_client || !data.apt_title.trim()) return toast('Cliente y título obligatorios');
      const date = data.apt_date ? new Date(data.apt_date).getTime() : Date.now();
      await saveAppointment({ clientId: parseInt(data.apt_client), title: data.apt_title, date, notes: data.apt_notes });
      toast('Cita guardada');
      router.go('appointments');
    }}
  ]);
}

window.deleteAppt = async (id) => {
  await deleteAppointment(id);
  toast('Cita eliminada');
  router.go('appointments');
};

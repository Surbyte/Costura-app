import { getClients, getClient, saveClient, deleteClient, getMeasurements, saveMeasurement, deleteMeasurement, getOrdersByClient } from '../db.js';
import { router } from '../router.js';

export async function render(parts) {
  if (parts && parts.length > 0 && parts[0]) return renderDetail(parseInt(parts[0]));

  const clients = await getClients();
  return `
    ${clients.length === 0 ? `
      <div class="empty-state">
        ${icon.person}
        <p>No hay clientes registrados</p>
      </div>
    ` : `
      <div class="search-box">
        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>
        <input type="text" id="clientSearch" placeholder="Buscar clientes..." oninput="filterClients(this.value)">
      </div>
      <div class="list" id="clientList">
        ${clients.map(c => `
          <div class="list-item client-item" data-name="${c.name.toLowerCase()}" data-phone="${(c.phone||'').toLowerCase()}" onclick="router.go('clients/${c.id}')">
            <div class="list-item-icon">${icon.person}</div>
            <div class="list-item-content">
              <div class="list-item-title">${c.name}</div>
              <div class="list-item-sub">${c.phone ? icon.phone + ' ' + c.phone : ''} ${c.address ? '📍 ' + c.address : ''}</div>
            </div>
            <div class="list-item-end">${icon.chevronRight}</div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

router.register('clients', render, {
  title: 'Clientes',
  action: () => showClientForm()
});

async function renderDetail(id) {
  const client = await getClient(id);
  if (!client) return '<div class="empty-state"><p>Cliente no encontrado</p></div>';
  const measurements = await getMeasurements(id);
  const orders = await getOrdersByClient(id);
  document.getElementById('pageTitle').textContent = client.name;

  return `
    <div class="card card-static">
      <div class="flex items-center gap-8">
        <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          ${icon.person.replace('currentColor', 'var(--primary)')}
        </div>
        <div class="flex-1">
          <div style="font-size:1.2rem;font-weight:600">${client.name}</div>
          ${client.phone ? '<div class="text-muted" style="font-size:0.85rem">📞 ' + client.phone + '</div>' : ''}
          ${client.address ? '<div class="text-muted" style="font-size:0.85rem">📍 ' + client.address + '</div>' : ''}
        </div>
      </div>
      ${client.notes ? '<div class="text-muted mt-8">' + client.notes + '</div>' : ''}
      <div class="flex gap-8 mt-8">
        <button class="btn btn-outline btn-sm" onclick="(async()=>{const c=await getClient(${id}); showClientForm(c)})()">${icon.edit.replace('<svg','<svg style="width:16px;height:16px"')} Editar</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeleteClient(${id},'${client.name.replace(/'/g, "\\'")}')">${icon.delete.replace('<svg','<svg style="width:16px;height:16px"')} Eliminar</button>
      </div>
    </div>

    <div class="section">
      <div class="flex justify-between items-center" style="padding:0 16px">
        <div class="section-title" style="margin:12px 0">Medidas</div>
        <button class="btn btn-sm btn-primary" onclick="addMeasurement(${id})">${icon.add.replace('<svg','<svg style="width:16px;height:16px"')} Agregar</button>
      </div>
      ${measurements.length === 0 ? '<p class="text-muted" style="padding:0 16px">Sin medidas registradas</p>' :
        measurements.map(m => `
          <div class="card card-static flex justify-between items-center">
            <div><div class="font-bold">${m.label}</div><div class="text-muted">${m.value}</div></div>
            <button class="icon-btn" style="color:var(--error)" onclick="deleteMeasurement(${m.id},${id})">${icon.delete}</button>
          </div>
        `).join('')
      }
    </div>

    <div class="section">
      <div class="section-title">Pedidos</div>
      ${orders.length === 0 ? '<p class="text-muted" style="padding:0 16px">Sin pedidos</p>' :
        orders.map(o => `
          <div class="card" onclick="router.go('orders/${o.id}')">
            <div class="flex justify-between">
              <div class="font-bold">${o.description}</div>
              <span class="chip ${o.status === 'completed' ? 'chip-done' : o.status === 'in_progress' ? 'chip-progress' : 'chip-pending'}">${o.status === 'completed' ? 'Completado' : o.status === 'in_progress' ? 'En curso' : 'Pendiente'}</span>
            </div>
            <div class="flex gap-8 mt-8 text-muted" style="font-size:0.85rem">
              <span>Total: ${fmt.money(o.total)}</span>
              <span>Anticipo: ${fmt.money(o.deposit)}</span>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
}

async function showClientForm(client) {
  const isEdit = !!client;
  dialog.open(
    isEdit ? 'Editar Cliente' : 'Nuevo Cliente',
    `
      <div class="field-group">
        <label class="field-label">Nombre *</label>
        <input class="field-input" id="cf_name" value="${isEdit ? client.name : ''}" placeholder="Nombre completo">
      </div>
      <div class="field-group">
        <label class="field-label">Teléfono (Argentina)</label>
        <input class="field-input" id="cf_phone" value="${isEdit ? (client.phone||'') : ''}" placeholder="+54 9 11 XXXX-XXXX" oninput="formatPhoneArg(this)">
      </div>
      <div class="field-group">
        <label class="field-label">Dirección</label>
        <input class="field-input" id="cf_address" value="${isEdit ? (client.address||'') : ''}" placeholder="Dirección">
      </div>
      <div class="field-group">
        <label class="field-label">Notas</label>
        <textarea class="field-input" id="cf_notes">${isEdit ? (client.notes||'') : ''}</textarea>
      </div>
    `,
    [
      { label: 'Cancelar' },
      { label: 'Guardar', primary: true, action: async () => {
        const data = formData(['cf_name','cf_phone','cf_address','cf_notes']);
        if (!data.cf_name.trim()) return toast('El nombre es obligatorio');
        await saveClient(isEdit ? { ...client, name: data.cf_name, phone: data.cf_phone, address: data.cf_address, notes: data.cf_notes } : { name: data.cf_name, phone: data.cf_phone, address: data.cf_address, notes: data.cf_notes });
        toast(isEdit ? 'Cliente actualizado' : 'Cliente guardado');
        router.go('clients');
      }}
    ]
  );
}

window.showClientForm = showClientForm;
window.getClient = getClient;
window.addMeasurement = async (clientId) => {
  dialog.open('Nueva Medida', `
    <div class="field-group">
      <label class="field-label">Medida</label>
      <input class="field-input" id="m_label" placeholder="Ej: Pecho, Cintura">
    </div>
    <div class="field-group">
      <label class="field-label">Valor</label>
      <input class="field-input" id="m_value" placeholder="Ej: 95 cm">
    </div>
  `, [
    { label: 'Cancelar' },
    { label: 'Guardar', primary: true, action: async () => {
      const data = formData(['m_label','m_value']);
      if (!data.m_label || !data.m_value) return toast('Completa todos los campos');
      await saveMeasurement({ clientId, label: data.m_label, value: data.m_value });
      toast('Medida guardada');
      router.go('clients/' + clientId);
    }}
  ]);
};
window.deleteMeasurement = async (id, clientId) => {
  await deleteMeasurement(id);
  router.go('clients/' + clientId);
};
window.confirmDeleteClient = (id, name) => {
  dialog.open('Eliminar cliente', `<p>¿Eliminar a <strong>${name}</strong>? Todos sus datos se perderán.</p>`, [
    { label: 'Cancelar' },
    { label: 'Eliminar', primary: true, action: async () => { await deleteClient(id); toast('Cliente eliminado'); router.go('clients'); }}
  ]);
};
window.filterClients = (q) => {
  document.querySelectorAll('.client-item').forEach(el => {
    const name = el.dataset.name;
    const phone = el.dataset.phone;
    const match = !q || name.includes(q.toLowerCase()) || phone.includes(q.toLowerCase());
    el.style.display = match ? '' : 'none';
  });
};

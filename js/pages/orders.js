import { getOrders, getOrder, saveOrder, deleteOrder, getClient, getClients, getTransactionsByOrder, saveTransaction, getOrderItems, saveOrderItem, deleteOrderItem, deleteOrderItemsByOrder } from '../db.js';
import { router } from '../router.js';

let currentFilter = 'all';

export async function render(parts) {
  if (parts && parts.length > 0 && parts[0]) return renderOrderDetail(parseInt(parts[0]));
  const orders = await getOrders();
  const clients = await getClients();
  const filtered = currentFilter === 'all' ? orders : orders.filter(o => o.status === currentFilter);
  return `
    <div class="tabs">
      <button class="tab ${currentFilter === 'all' ? 'active' : ''}" onclick="setOrderFilter('all')">Todos</button>
      <button class="tab ${currentFilter === 'pending' ? 'active' : ''}" onclick="setOrderFilter('pending')">Pendiente</button>
      <button class="tab ${currentFilter === 'in_progress' ? 'active' : ''}" onclick="setOrderFilter('in_progress')">En curso</button>
      <button class="tab ${currentFilter === 'completed' ? 'active' : ''}" onclick="setOrderFilter('completed')">Completado</button>
    </div>
    ${filtered.length === 0 ? `
      <div class="empty-state">${icon.shopping}<p>No hay pedidos</p></div>
    ` : `
      <div class="list">${filtered.map(o => {
        const c = clients.find(cl => cl.id === o.clientId);
        return `<div class="list-item" onclick="router.go('orders/${o.id}')">
          <div class="list-item-icon">${icon.shopping}</div>
          <div class="list-item-content">
            <div class="list-item-title">${o.description}</div>
            <div class="list-item-sub">${c ? c.name : ''} — ${fmt.money(o.total)}</div>
          </div>
          <div style="text-align:right">
            <span class="chip ${o.status === 'completed' ? 'chip-done' : o.status === 'in_progress' ? 'chip-progress' : 'chip-pending'}">${o.status === 'completed' ? 'Completado' : o.status === 'in_progress' ? 'En curso' : 'Pendiente'}</span>
            ${o.deadline ? '<div class="text-muted" style="font-size:0.7rem;margin-top:4px">' + fmt.date(o.deadline) + '</div>' : ''}
          </div>
        </div>`;
      }).join('')}</div>
    `}
  `;
}

router.register('orders', render, {
  title: 'Pedidos',
  action: () => showOrderForm()
});

window.setOrderFilter = (f) => { currentFilter = f; router.go('orders'); };

// Items temporales mientras se crea/edita el pedido
let tempItems = [];

async function showOrderForm(order) {
  tempItems = [];
  if (order) {
    const items = await getOrderItems(order.id);
    tempItems = items.map(i => ({ ...i }));
  }

  const clients = await getClients();
  const isEdit = !!order;
  renderOrderDialog(isEdit, order, clients);
}

function renderOrderDialog(isEdit, order, clients) {
  const total = tempItems.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);
  dialog.open(
    isEdit ? 'Editar Pedido' : 'Nuevo Pedido',
    `
      <div class="field-group">
        <label class="field-label">Cliente *</label>
        <select class="field-select" id="of_client">
          <option value="">Seleccionar cliente</option>
          ${clients.map(c => `<option value="${c.id}" ${isEdit && order.clientId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Descripción *</label>
        <input class="field-input" id="of_desc" value="${isEdit ? order.description : ''}" placeholder="Ej: Vestido de novia">
      </div>

      <div style="border:1px solid var(--outline);border-radius:8px;padding:12px;margin-bottom:12px">
        <div class="flex justify-between items-center mb-8">
          <label class="field-label" style="margin:0">Prendas / Items</label>
          <button class="btn btn-sm btn-primary" onclick="addTempItem()">${icon.add.replace('<svg','<svg style="width:16px;height:16px"')} Agregar</button>
        </div>
        <div id="itemsContainer">
          ${tempItems.length === 0 ? '<div class="text-muted" style="font-size:0.85rem;padding:8px 0">Sin items agregados</div>' :
            tempItems.map((item, idx) => renderTempItem(item, idx)).join('')
          }
        </div>
        <div class="flex justify-between font-bold mt-8" style="font-size:1rem">
          <span>TOTAL</span>
          <span>${fmt.money(total)}</span>
        </div>
        <input type="hidden" id="of_total" value="${total}">
      </div>

      <div class="field-group">
        <label class="field-label">Anticipo</label>
        <input class="field-input" id="of_deposit" type="number" step="0.01" value="${isEdit ? (order.deposit||0) : ''}" placeholder="0">
      </div>
      <div class="field-group">
        <label class="field-label">Fecha entrega</label>
        <input class="field-input" id="of_deadline" type="date" value="${isEdit && order.deadline ? new Date(order.deadline).toISOString().split('T')[0] : ''}">
      </div>
      <div class="field-group">
        <label class="field-label">Notas</label>
        <textarea class="field-input" id="of_notes">${isEdit ? (order.notes||'') : ''}</textarea>
      </div>
    `,
    [
      { label: 'Cancelar', action: () => { tempItems = []; } },
      { label: 'Guardar', primary: true, action: async () => {
        const data = formData(['of_client','of_desc','of_deposit','of_deadline','of_notes','of_total']);
        if (!data.of_client || !data.of_desc.trim()) return toast('Cliente y descripción obligatorios');
        if (tempItems.length === 0) return toast('Agrega al menos una prenda');
        const deadline = data.of_deadline ? new Date(data.of_deadline).getTime() : 0;
        const totalCalc = tempItems.reduce((s, i) => s + (i.quantity||0) * (i.unitPrice||0), 0);

        if (isEdit) {
          order.description = data.of_desc;
          order.total = totalCalc;
          order.deposit = parseFloat(data.of_deposit) || 0;
          order.deadline = deadline;
          order.notes = data.of_notes;
          await saveOrder(order);
          await deleteOrderItemsByOrder(order.id);
          for (const item of tempItems) {
            await saveOrderItem({ orderId: order.id, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, notes: item.notes || '' });
          }
          toast('Pedido actualizado');
        } else {
          const id = await saveOrder({ clientId: parseInt(data.of_client), description: data.of_desc, total: totalCalc, deposit: parseFloat(data.of_deposit) || 0, deadline, notes: data.of_notes, status: 'pending' });
          for (const item of tempItems) {
            await saveOrderItem({ orderId: id, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, notes: item.notes || '' });
          }
          if (parseFloat(data.of_deposit) > 0) {
            await saveTransaction({ orderId: id, amount: parseFloat(data.of_deposit), type: 'income', description: 'Anticipo', date: Date.now() });
          }
          toast('Pedido creado');
        }
        tempItems = [];
        router.go('orders');
      }}
    ]
  );
}

function renderTempItem(item, idx) {
  const subtotal = (item.quantity || 0) * (item.unitPrice || 0);
  return `<div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--surface-variant)">
    <div style="flex:1;min-width:0">
      <div class="font-bold" style="font-size:0.85rem">${item.name}</div>
      <div class="text-muted" style="font-size:0.75rem">${item.quantity} × ${fmt.money(item.unitPrice)} = ${fmt.money(subtotal)}</div>
    </div>
    <button class="icon-btn" style="color:var(--error);width:32px;height:32px;flex-shrink:0" onclick="removeTempItem(${idx})">${icon.delete}</button>
  </div>`;
}

window.addTempItem = () => {
  const overlay = document.getElementById('dialogOverlay');
  // Add inline form instead of sub-dialog
  const container = document.getElementById('itemsContainer');
  const formId = 'inlineItemForm_' + Date.now();
  const formHtml = `
    <div id="${formId}" style="border:1px solid var(--primary);border-radius:8px;padding:10px;margin:8px 0;background:var(--surface-variant)">
      <input class="field-input" id="ti_name" placeholder="Prenda * (ej: Vestido)" style="margin-bottom:6px;font-size:0.85rem;padding:8px">
      <div class="flex gap-8" style="margin-bottom:6px">
        <input class="field-input" id="ti_qty" type="number" step="1" value="1" placeholder="Cant" style="font-size:0.85rem;padding:8px;width:80px">
        <input class="field-input" id="ti_price" type="number" step="0.01" placeholder="Precio" style="font-size:0.85rem;padding:8px;flex:1">
      </div>
      <input class="field-input" id="ti_notes" placeholder="Notas (opcional)" style="font-size:0.85rem;padding:8px;margin-bottom:6px">
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-sm btn-outline" onclick="document.getElementById('${formId}').remove()">Cancelar</button>
        <button class="btn btn-sm btn-primary" onclick="confirmAddItem('${formId}')">Agregar</button>
      </div>
    </div>`;
  if (container) {
    // Insert form after the items list or "no items" message
    container.insertAdjacentHTML('beforeend', formHtml);
    document.getElementById('ti_name')?.focus();
  }
};

window.confirmAddItem = (formId) => {
  const data = formData(['ti_name','ti_qty','ti_price','ti_notes']);
  if (!data.ti_name.trim()) return toast('El nombre es obligatorio');
  tempItems.push({ name: data.ti_name, quantity: parseInt(data.ti_qty) || 1, unitPrice: parseFloat(data.ti_price) || 0, notes: data.ti_notes });
  // Remove the form
  document.getElementById(formId)?.remove();
  // Update items list
  const container = document.getElementById('itemsContainer');
  if (container) {
    const total = tempItems.reduce((s, i) => s + (i.quantity||0) * (i.unitPrice||0), 0);
    container.innerHTML = tempItems.length === 0
      ? '<div class="text-muted" style="font-size:0.85rem;padding:8px 0">Sin items agregados</div>'
      : tempItems.map((item, idx) => renderTempItem(item, idx)).join('');
    const totalEl = container.parentElement.querySelector('.font-bold:last-child');
    if (totalEl) totalEl.innerHTML = `<span>TOTAL</span><span>${fmt.money(total)}</span>`;
    const hidden = document.getElementById('of_total');
    if (hidden) hidden.value = total;
  }
};

window.removeTempItem = (idx) => {
  tempItems.splice(idx, 1);
  const container = document.getElementById('itemsContainer');
  if (container) {
    const total = tempItems.reduce((s, i) => s + (i.quantity||0) * (i.unitPrice||0), 0);
    container.innerHTML = tempItems.length === 0
      ? '<div class="text-muted" style="font-size:0.85rem;padding:8px 0">Sin items agregados</div>'
      : tempItems.map((item, i) => renderTempItem(item, i)).join('');
    const totalEl = container.parentElement.querySelector('.font-bold:last-child');
    if (totalEl) totalEl.innerHTML = `<span>TOTAL</span><span>${fmt.money(total)}</span>`;
    const hidden = document.getElementById('of_total');
    if (hidden) hidden.value = total;
  }
};

// --- Order Detail ---
async function renderOrderDetail(id) {
  const order = await getOrder(id);
  if (!order) return '<div class="empty-state"><p>Pedido no encontrado</p></div>';
  const client = await getClient(order.clientId);
  const txns = await getTransactionsByOrder(id);
  const items = await getOrderItems(id);
  const remaining = order.total - (order.deposit || 0);
  document.getElementById('pageTitle').textContent = 'Pedido #' + order.id;

  return `
    <div class="card card-static">
      <div class="font-bold" style="font-size:1.2rem">${order.description}</div>
      ${client ? '<div class="text-muted">Cliente: ' + client.name + '</div>' : ''}

      <div style="margin:12px 0">
        <div class="font-bold" style="font-size:0.9rem">Prendas / Items</div>
        ${items.length === 0 ? '<div class="text-muted" style="font-size:0.85rem">Sin items</div>' :
          items.map(item => {
            const sub = (item.quantity||0) * (item.unitPrice||0);
            return `<div class="flex justify-between items-center" style="padding:4px 0;font-size:0.85rem;border-bottom:1px solid var(--surface-variant)">
              <div><span class="font-bold">${item.name}</span>${item.notes ? '<br><span class="text-muted" style="font-size:0.75rem">' + item.notes + '</span>' : ''}</div>
              <div style="text-align:right"><div>${item.quantity} × ${fmt.money(item.unitPrice)}</div><div class="font-bold">${fmt.money(sub)}</div></div>
            </div>`;
          }).join('')
        }
      </div>

      <div class="summary-row" style="padding:0;margin:8px 0">
        <div class="summary-card bg-primary-container" style="padding:10px">
          <div class="label">Total</div>
          <div class="value" style="font-size:1rem">${fmt.money(order.total)}</div>
        </div>
        <div class="summary-card bg-tertiary-container" style="padding:10px">
          <div class="label">Anticipo</div>
          <div class="value" style="font-size:1rem">${fmt.money(order.deposit)}</div>
        </div>
        <div class="summary-card bg-error-container" style="padding:10px">
          <div class="label">Saldo</div>
          <div class="value" style="font-size:1rem">${fmt.money(remaining)}</div>
        </div>
      </div>
      ${order.deadline ? '<div class="text-muted">📅 Entrega: ' + fmt.date(order.deadline) + '</div>' : ''}
      ${order.notes ? '<div class="text-muted mt-8">' + order.notes + '</div>' : ''}

      <div class="flex gap-8 mt-8" style="flex-wrap:wrap">
        <div class="dropdown" style="position:relative">
          <button class="btn btn-sm btn-outline" onclick="toggleStatusMenu()">Estado: ${order.status === 'completed' ? 'Completado' : order.status === 'in_progress' ? 'En curso' : 'Pendiente'} ▾</button>
          <div id="statusMenu" class="dropdown-menu" style="display:none">
            <div class="dropdown-item" onclick="updateOrderStatus(${id},'pending')">Pendiente</div>
            <div class="dropdown-item" onclick="updateOrderStatus(${id},'in_progress')">En curso</div>
            <div class="dropdown-item" onclick="updateOrderStatus(${id},'completed')">Completado</div>
          </div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="addPayment(${id}, ${remaining})">💰 Pago</button>
        <button class="btn btn-sm btn-outline" onclick="editOrder(${id})">${icon.edit.replace('<svg','<svg style="width:16px;height:16px"')} Editar</button>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Transacciones</div>
      ${txns.length === 0 ? '<p class="text-muted" style="padding:0 16px">Sin transacciones</p>' :
        txns.map(t => `
          <div class="card card-static flex justify-between items-center">
            <div><div class="font-bold">${t.description || (t.type === 'income' ? 'Pago' : 'Gasto')}</div><div class="text-muted" style="font-size:0.8rem">${fmt.datetime(t.date)}</div></div>
            <div class="${t.type === 'income' ? 'text-success' : 'text-danger'} font-bold">${t.type === 'income' ? '+' : '-'}${fmt.money(t.amount)}</div>
          </div>
        `).join('')
      }
    </div>
    <div style="padding:0 16px 16px">
      <button class="btn btn-danger btn-block" onclick="confirmDeleteOrder(${id})">${icon.delete} Eliminar pedido</button>
    </div>
  `;
}

window.editOrder = async (id) => {
  const order = await getOrder(id);
  if (order) showOrderForm(order);
};
window.getOrder = getOrder;
window.showOrderForm = showOrderForm;

window.toggleStatusMenu = () => {
  const m = document.getElementById('statusMenu');
  if (m) m.style.display = m.style.display === 'none' ? 'block' : 'none';
};
window.addEventListener('click', (e) => {
  const m = document.getElementById('statusMenu');
  if (m && !e.target.closest('.dropdown')) m.style.display = 'none';
});

window.updateOrderStatus = async (id, status) => {
  const order = await getOrder(id);
  if (!order) return;
  order.status = status;
  if (status === 'completed') {
    const remaining = order.total - (order.deposit || 0);
    if (remaining > 0) {
      await saveTransaction({ orderId: id, amount: remaining, type: 'income', description: 'Pago final', date: Date.now() });
      order.deposit = order.total;
    }
  }
  await saveOrder(order);
  toast('Estado actualizado');
  router.go('orders/' + id);
};

window.addPayment = (orderId, remaining) => {
  dialog.open('Registrar Pago', `
    <p>Saldo pendiente: <strong>${fmt.money(remaining)}</strong></p>
    <div class="field-group mt-8"><label class="field-label">Monto</label><input class="field-input" id="pay_amount" type="number" step="0.01" value="${remaining}"></div>
  `, [
    { label: 'Cancelar' },
    { label: 'Guardar', primary: true, action: async () => {
      const amount = parseFloat(document.getElementById('pay_amount').value) || 0;
      if (amount <= 0) return toast('Ingresa un monto válido');
      await saveTransaction({ orderId, amount, type: 'income', description: 'Pago', date: Date.now() });
      const order = await getOrder(orderId);
      if (order) { order.deposit = (order.deposit || 0) + amount; await saveOrder(order); }
      toast('Pago registrado');
      router.go('orders/' + orderId);
    }}
  ]);
};

window.confirmDeleteOrder = async (id) => {
  dialog.open('Eliminar pedido', '¿Estás seguro? Esta acción no se puede deshacer.', [
    { label: 'Cancelar' },
    { label: 'Eliminar', primary: true, action: async () => { await deleteOrder(id); toast('Pedido eliminado'); router.go('orders'); }}
  ]);
};

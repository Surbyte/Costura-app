import { getTransactions, saveTransaction, deleteTransaction, computeFinance, getOrders, getClients, getInventory } from '../db.js';
import { router } from '../router.js';

let filterType = 'all';

export async function render() {
  const txns = await getTransactions();
  const finance = await computeFinance();

  const filtered = filterType === 'all' ? txns : txns.filter(t => t.type === filterType);
  filtered.sort((a, b) => (b.date || 0) - (a.date || 0));

  return `
    <div class="section">
      <div class="summary-row">
        <div class="summary-card bg-tertiary-container">
          <div class="label">Ingresos</div>
          <div class="value">${fmt.money(finance.income)}</div>
        </div>
        <div class="summary-card bg-error-container">
          <div class="label">Gastos</div>
          <div class="value">${fmt.money(finance.expenses)}</div>
        </div>
        <div class="summary-card bg-primary-container">
          <div class="label">Balance</div>
          <div class="value">${fmt.money(finance.balance)}</div>
        </div>
      </div>
    </div>

    <div style="padding:0 16px 8px">
      <button class="btn btn-primary btn-block" style="border-radius:8px;padding:8px" onclick="exportFinanceExcel()">📊 Exportar todo a Excel</button>
    </div>

    <div class="tabs">
      <button class="tab ${filterType === 'all' ? 'active' : ''}" onclick="setFinanceFilter('all')">Todos</button>
      <button class="tab ${filterType === 'income' ? 'active' : ''}" onclick="setFinanceFilter('income')">Ingresos</button>
      <button class="tab ${filterType === 'expense' ? 'active' : ''}" onclick="setFinanceFilter('expense')">Gastos</button>
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        ${icon.account}
        <p>Sin transacciones</p>
      </div>
    ` : `
      <div class="list">
        ${filtered.map(t => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-content">
              <div class="list-item-title">${t.description || (t.type === 'income' ? 'Ingreso' : 'Gasto')}</div>
              <div class="list-item-sub">${fmt.datetime(t.date)}</div>
            </div>
            <div style="text-align:right">
              <div class="${t.type === 'income' ? 'text-success' : 'text-danger'} font-bold">${t.type === 'income' ? '+' : '-'}${fmt.money(t.amount)}</div>
              <button class="icon-btn" style="color:var(--error);width:32px;height:32px" onclick="deleteFinanceTxn(${t.id})">${icon.delete}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

router.register('finance', render, {
  title: 'Finanzas',
  action: () => showFinanceForm()
});

window.setFinanceFilter = (f) => { filterType = f; router.go('finance'); };

function showFinanceForm() {
  dialog.open('Nueva Transacción', `
    <div class="flex gap-8 mb-8">
      <button id="fi_income" class="btn btn-sm btn-primary" onclick="setFinanceType('income')">Ingreso</button>
      <button id="fi_expense" class="btn btn-sm btn-outline" onclick="setFinanceType('expense')">Gasto</button>
    </div>
    <div class="field-group">
      <label class="field-label">Monto</label>
      <input class="field-input" id="fi_amount" type="number" step="0.01" placeholder="0">
    </div>
    <div class="field-group">
      <label class="field-label">Descripción</label>
      <input class="field-input" id="fi_desc" placeholder="Ej: Venta de vestido">
    </div>
  `, [
    { label: 'Cancelar' },
    { label: 'Guardar', primary: true, action: async () => {
      const amount = parseFloat(document.getElementById('fi_amount').value) || 0;
      if (amount <= 0) return toast('Ingresa un monto válido');
      const type = window._financeType || 'income';
      await saveTransaction({ amount, type, description: document.getElementById('fi_desc').value, date: Date.now() });
      toast('Transacción guardada');
      router.go('finance');
    }}
  ]);
  window._financeType = 'income';
}

window.setFinanceType = (type) => {
  window._financeType = type;
  document.getElementById('fi_income').className = `btn btn-sm ${type === 'income' ? 'btn-primary' : 'btn-outline'}`;
  document.getElementById('fi_expense').className = `btn btn-sm ${type === 'expense' ? 'btn-primary' : 'btn-outline'}`;
};

window.deleteFinanceTxn = async (id) => {
  await deleteTransaction(id);
  toast('Transacción eliminada');
  router.go('finance');
};

window.exportFinanceExcel = async () => {
  const txns = await getTransactions();
  const orders = await getOrders();
  const clients = await getClients();
  const inventory = await getInventory();
  const finance = await computeFinance();

  const clientMap = {};
  clients.forEach(c => { clientMap[c.id] = c.name; });
  const clientName = (id) => clientMap[id] || '#'.concat(id);

  const dateStr = new Date().toISOString().slice(0, 10);
  const sheets = [];

  // Sheet 1: Resumen
  sheets.push({
    name: 'Resumen',
    headers: ['Indicador', 'Valor'],
    rows: [
      ['Ingresos totales', finance.income],
      ['Gastos totales', finance.expenses],
      ['Balance', finance.balance],
      ['Exportado', dateStr]
    ]
  });

  // Sheet 2: Ingresos
  const income = txns.filter(t => t.type === 'income');
  sheets.push({
    name: 'Ingresos',
    headers: ['Fecha', 'Descripción', 'Monto', 'Pedido ID'],
    rows: income.map(t => [t.date ? fmt.datetime(t.date) : '', t.description || '', t.amount, t.orderId || ''])
  });

  // Sheet 3: Gastos
  const expense = txns.filter(t => t.type === 'expense');
  sheets.push({
    name: 'Gastos',
    headers: ['Fecha', 'Descripción', 'Monto'],
    rows: expense.map(t => [t.date ? fmt.datetime(t.date) : '', t.description || '', t.amount])
  });

  // Sheet 4: Pedidos
  sheets.push({
    name: 'Pedidos',
    headers: ['ID', 'Cliente', 'Descripción', 'Total', 'Anticipo', 'Saldo', 'Estado', 'Fecha entrega'],
    rows: orders.map(o => [
      o.id, clientName(o.clientId), o.description, o.total, o.deposit || 0,
      o.total - (o.deposit || 0),
      o.status === 'completed' ? 'Completado' : o.status === 'in_progress' ? 'En curso' : 'Pendiente',
      o.deadline ? fmt.date(o.deadline) : ''
    ])
  });

  // Sheet 5: Clientes
  sheets.push({
    name: 'Clientes',
    headers: ['ID', 'Nombre', 'Teléfono', 'Dirección', 'Notas'],
    rows: clients.map(c => [c.id, c.name, c.phone || '', c.address || '', c.notes || ''])
  });

  // Sheet 6: Inventario
  sheets.push({
    name: 'Inventario',
    headers: ['Nombre', 'Cantidad', 'Unidad', 'Precio/Unidad', 'Categoría', 'Valor total'],
    rows: inventory.map(i => [i.name, i.quantity || 0, i.unit || '', i.price || 0, i.category || '', (i.quantity || 0) * (i.price || 0)])
  });

  if (typeof exportExcel !== 'undefined') {
    exportExcel.download(sheets, 'informe_costura_' + dateStr + '.xls');
    toast('Excel exportado');
  } else {
    toast('Error: módulo de exportación no cargado');
  }
};

import { getTransactions, saveTransaction, deleteTransaction, computeFinance } from '../db.js';
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

import { computeFinance, computeOrdersSummary, getAppointments, todayRange } from '../db.js';
import { router } from '../router.js';

export async function render() {
  const finance = await computeFinance();
  const orders = await computeOrdersSummary();
  const range = todayRange();
  const apps = (await getAppointments()).filter(a => a.date >= range.start && a.date < range.end);

  return `
    <div class="section">
      <div class="section-title">Resumen financiero</div>
      <div class="summary-row">
        <div class="summary-card bg-primary-container">
          <div class="label">Ingresos</div>
          <div class="value">${fmt.money(finance.income)}</div>
        </div>
        <div class="summary-card bg-tertiary-container">
          <div class="label">Balance</div>
          <div class="value">${fmt.money(finance.balance)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Pedidos</div>
      <div class="summary-row">
        <div class="summary-card bg-primary-container">
          <div class="label">Total</div>
          <div class="value">${fmt.money(orders.totalRevenue)}</div>
        </div>
        <div class="summary-card bg-error-container">
          <div class="label">Pendiente cobrar</div>
          <div class="value">${fmt.money(orders.totalPending)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Acciones rápidas</div>
      <div class="card-grid">
        <div class="card" onclick="router.go('clients')">
          ${icon.person}<span>Clientes</span>
        </div>
        <div class="card" onclick="router.go('orders')">
          ${icon.shopping}<span>Pedidos</span>
        </div>
        <div class="card" onclick="router.go('inventory')">
          ${icon.inventory}<span>Inventario</span>
        </div>
        <div class="card" onclick="router.go('appointments')">
          ${icon.calendar}<span>Agenda</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Citas de hoy${apps.length ? ' <span class="badge">' + apps.length + '</span>' : ''}</div>
      ${apps.length === 0 ? '<p class="text-muted" style="padding:0 16px">Sin citas para hoy</p>' :
        apps.map(a => `
          <div class="card card-static">
            <div class="font-bold">${a.title}</div>
            <div class="text-muted" style="font-size:0.85rem">${a.notes || 'Sin notas'}</div>
          </div>
        `).join('')
      }
    </div>
  `;
}

router.register('home', render, { title: 'Gestión de Costura' });

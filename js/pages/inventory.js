import { getInventory, saveInventoryItem, deleteInventoryItem } from '../db.js';
import { router } from '../router.js';

let currentCat = 'all';

export async function render() {
  const items = await getInventory();
  const cats = [...new Set(items.map(i => i.category || 'General'))];
  const filtered = currentCat === 'all' ? items : items.filter(i => (i.category || 'General') === currentCat);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.price || 0), 0);

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  return `
    <div class="section">
      <div class="summary-row">
        <div class="summary-card bg-primary-container">
          <div class="label">Valor total</div>
          <div class="value">${fmt.money(totalValue)}</div>
        </div>
        <div class="summary-card bg-tertiary-container">
          <div class="label">Items</div>
          <div class="value">${items.length}</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab ${currentCat === 'all' ? 'active' : ''}" onclick="setInvFilter('all')">Todos</button>
      ${cats.map(c => `
        <button class="tab ${currentCat === c ? 'active' : ''}" onclick="setInvFilter('${c}')">${c}</button>
      `).join('')}
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        ${icon.inventory}
        <p>Inventario vacío</p>
      </div>
    ` : `
      <div class="list">
        ${filtered.map(item => `
          <div class="list-item" style="cursor:default">
            <div class="list-item-icon">${icon.inventory}</div>
            <div class="list-item-content">
              <div class="list-item-title">${item.name}</div>
              <div class="list-item-sub">${item.quantity} ${item.unit} — $${item.price}/${item.unit}</div>
            </div>
            <div style="text-align:right">
              <div class="font-bold">${fmt.money((item.quantity||0) * (item.price||0))}</div>
              <button class="icon-btn" style="color:var(--error);width:32px;height:32px" onclick="deleteInvItem(${item.id})">${icon.delete}</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

router.register('inventory', render, {
  title: 'Inventario',
  action: () => showInventoryForm()
});

window.setInvFilter = (c) => { currentCat = c; router.go('inventory'); };

function showInventoryForm() {
  dialog.open('Agregar al Inventario', `
    <div class="field-group">
      <label class="field-label">Nombre *</label>
      <input class="field-input" id="inv_name" placeholder="Ej: Tela de algodón">
    </div>
    <div class="field-group">
      <label class="field-label">Cantidad</label>
      <input class="field-input" id="inv_qty" type="number" step="0.01" placeholder="0">
    </div>
    <div class="field-group">
      <label class="field-label">Unidad</label>
      <select class="field-select" id="inv_unit">
        <option value="unidad">Unidad</option>
        <option value="metro">Metro</option>
        <option value="yarda">Yarda</option>
        <option value="kg">Kg</option>
        <option value="litro">Litro</option>
        <option value="par">Par</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Precio por unidad</label>
      <input class="field-input" id="inv_price" type="number" step="0.01" placeholder="0">
    </div>
    <div class="field-group">
      <label class="field-label">Categoría</label>
      <select class="field-select" id="inv_cat">
        <option value="Tela">Tela</option>
        <option value="Hilo">Hilo</option>
        <option value="Botones">Botones</option>
        <option value="Cremalleras">Cremalleras</option>
        <option value="General">General</option>
      </select>
    </div>
    <div class="field-group">
      <label class="field-label">Notas</label>
      <input class="field-input" id="inv_notes">
    </div>
  `, [
    { label: 'Cancelar' },
    { label: 'Guardar', primary: true, action: async () => {
      const data = formData(['inv_name','inv_qty','inv_unit','inv_price','inv_cat','inv_notes']);
      if (!data.inv_name.trim()) return toast('El nombre es obligatorio');
      await saveInventoryItem({
        name: data.inv_name,
        quantity: parseFloat(data.inv_qty) || 0,
        unit: data.inv_unit,
        price: parseFloat(data.inv_price) || 0,
        category: data.inv_cat,
        notes: data.inv_notes
      });
      toast('Item agregado');
      router.go('inventory');
    }}
  ]);
}

window.deleteInvItem = async (id) => {
  await deleteInventoryItem(id);
  toast('Item eliminado');
  router.go('inventory');
};

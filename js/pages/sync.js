import { router } from '../router.js';

export async function render() {
  var status = await window.getSyncStatus();
  var configHtml;
  if (status.configured) {
    configHtml = `
      <div class="card card-static">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold">Conectado a Supabase</div>
            <div class="text-muted" style="font-size:0.85rem">${status.url}</div>
            ${status.lastSyncFormatted ? '<div class="text-muted" style="font-size:0.8rem">Última sinc.: ' + status.lastSyncFormatted + '</div>' : '<div class="text-muted" style="font-size:0.8rem">Sin sincronizar</div>'}
          </div>
          <span style="color:var(--primary);font-size:1.5rem">&#10003;</span>
        </div>
        <button class="btn btn-sm btn-outline mt-8" onclick="showSyncConfigForm()" style="width:100%">Cambiar configuración</button>
      </div>
    `;
  } else {
    configHtml = `
      <div class="card card-static">
        <div class="flex items-center gap-8">
          <span style="color:var(--error);font-size:1.5rem">&#10007;</span>
          <div>
            <div class="font-bold">Supabase no configurado</div>
            <div class="text-muted" style="font-size:0.85rem">Presiona + para configurar</div>
          </div>
        </div>
      </div>
    `;
  }

  var storeLabels = {
    clients: 'Clientes',
    measurements: 'Medidas',
    orders: 'Pedidos',
    order_items: 'Items de pedidos',
    transactions: 'Transacciones',
    inventory: 'Inventario',
    appointments: 'Citas'
  };

  var countsHtml = Object.keys(status.counts).map(function(key) {
    return `
      <div class="flex justify-between items-center" style="padding:6px 0;border-bottom:1px solid var(--surface-variant)">
        <span>${storeLabels[key] || key}</span>
        <span class="font-bold">${status.counts[key]}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="section">
      <div class="section-title">Configuración</div>
      ${configHtml}
    </div>

    <div class="section">
      <div class="section-title">Estado de datos</div>
      <div class="card card-static">
        <div class="summary-row" style="padding:0;margin-bottom:12px">
          <div class="summary-card bg-primary-container" style="padding:10px">
            <div class="label">Total registros</div>
            <div class="value" style="font-size:1.2rem">${status.totalRecords}</div>
          </div>
          <div class="summary-card bg-tertiary-container" style="padding:10px">
            <div class="label">Última sinc.</div>
            <div class="value" style="font-size:0.8rem">${status.lastSyncFormatted || '—'}</div>
          </div>
        </div>
        ${countsHtml}
      </div>
    </div>

    ${status.configured ? `
    <div class="section">
      <div class="section-title">Acciones</div>
      <div style="padding:0 16px 16px;display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary" onclick="syncPush()" style="width:100%">&#11014; Subir datos locales</button>
        <button class="btn btn-outline" onclick="syncPull()" style="width:100%">&#11015; Bajar datos remotos</button>
        <button class="btn btn-outline" onclick="syncFull()" style="width:100%">&#8635; Sincronización completa</button>
        <button class="btn btn-danger btn-sm" onclick="syncClearConfig()" style="width:100%">Desconectar Supabase</button>
      </div>
    </div>
    ` : ''}
  `;
}

router.register('sync', render, {
  title: 'Sincronización',
  action: showSyncConfigForm
});

function showSyncConfigForm() {
  var cfg = window.SyncManager.getConfig();
  dialog.open('Configurar Supabase', `
    <div class="field-group">
      <label class="field-label">URL de Supabase</label>
      <input class="field-input" id="supabase_url" value="${cfg ? cfg.url : ''}" placeholder="https://xxxxx.supabase.co">
    </div>
    <div class="field-group">
      <label class="field-label">Anon Key</label>
      <input class="field-input" id="supabase_key" value="${cfg ? cfg.key : ''}" placeholder="eyJhbGciOiJSUzI1NiIs...">
    </div>
    <div class="text-muted" style="font-size:0.8rem;margin-top:8px">
      Las credenciales se guardan solo en este dispositivo.
    </div>
  `, [
    { label: 'Cancelar' },
    {
      label: 'Guardar',
      primary: true,
      action: async function() {
        var url = document.getElementById('supabase_url').value.trim();
        var key = document.getElementById('supabase_key').value.trim();
        if (!url || !key) return toast('Completa ambos campos');
        try {
          window.SyncManager.configure(url, key);
          toast('Configuración guardada');
          router.go('sync');
        } catch (e) {
          toast('Error: ' + e.message);
        }
      }
    }
  ]);
}

window.showSyncConfigForm = showSyncConfigForm;

async function performSync(action) {
  var labels = { push: 'Subiendo', pull: 'Bajando', full: 'Sincronizando' };
  try {
    toast(labels[action] + ' datos...');
    var result;
    if (action === 'push') {
      result = await window.SyncManager.push();
      toast(result + ' registros subidos correctamente');
    } else if (action === 'pull') {
      result = await window.SyncManager.pull();
      toast(result + ' registros bajados correctamente');
    } else {
      result = await window.SyncManager.full();
      toast(result.pushed + ' subidos, ' + result.pulled + ' bajados');
    }
    router.go('sync');
  } catch (e) {
    toast('Error de sincronización: ' + e.message);
  }
}

window.syncPush = function() { performSync('push'); };
window.syncPull = function() { performSync('pull'); };
window.syncFull = function() { performSync('full'); };

window.syncClearConfig = function() {
  dialog.open('Desconectar Supabase', '¿Eliminar la configuración de Supabase? Los datos locales no se verán afectados.', [
    { label: 'Cancelar' },
    { label: 'Desconectar', primary: true, action: function() {
      window.SyncManager.clearConfig();
      toast('Configuración eliminada');
      router.go('sync');
    }}
  ]);
};

(function() {
  var DB_NAME = 'couturart';
  var DB_VERSION = 2;
  var ALL_STORES = ['clients', 'measurements', 'orders', 'order_items', 'transactions', 'inventory', 'appointments'];
  var CONFIG_KEY = 'supabase_config';
  var LAST_SYNC_KEY = 'last_sync_time';

  var db = null;

  function openDB() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onsuccess = function(e) { db = e.target.result; resolve(db); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function doTx(storeName, mode, callback) {
    return openDB().then(function(d) {
      var tx = d.transaction(storeName, mode);
      var store = tx.objectStore(storeName);
      var result = callback(store);
      return new Promise(function(resolve, reject) {
        tx.oncomplete = function() { resolve(result); };
        tx.onerror = function(e) { reject(e.target.error); };
      });
    });
  }

  function getAllFromStore(store) {
    return new Promise(function(resolve, reject) {
      var req = store.getAll();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function countFromStore(store) {
    return new Promise(function(resolve, reject) {
      var req = store.count();
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function getConfig() {
    try {
      var raw = localStorage.getItem(CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConfig(url, key) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      url: url.replace(/\/+$/, ''),
      key: key
    }));
  }

  function clearConfig() {
    localStorage.removeItem(CONFIG_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  }

  function getHeaders() {
    var cfg = getConfig();
    if (!cfg) throw new Error('Supabase no configurado');
    return {
      'apikey': cfg.key,
      'Authorization': 'Bearer ' + cfg.key,
      'Content-Type': 'application/json'
    };
  }

  function getBaseUrl() {
    var cfg = getConfig();
    if (!cfg) throw new Error('Supabase no configurado');
    return cfg.url + '/rest/v1';
  }

  function setLastSync() {
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }

  function getLastSync() {
    var val = localStorage.getItem(LAST_SYNC_KEY);
    return val ? parseInt(val, 10) : null;
  }

  async function pushStore(storeName) {
    var items = await doTx(storeName, 'readonly', getAllFromStore);
    if (items.length === 0) return 0;
    var url = getBaseUrl() + '/' + storeName;
    var headers = getHeaders();
    headers['Prefer'] = 'resolution=merge-duplicates';
    var res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(items)
    });
    if (!res.ok) {
      var text = await res.text().catch(function() { return ''; });
      throw new Error('Error al subir ' + storeName + ': ' + res.status + ' ' + res.statusText + (text ? ' - ' + text : ''));
    }
    return items.length;
  }

  async function pushAll(onProgress) {
    var total = 0;
    for (var i = 0; i < ALL_STORES.length; i++) {
      var store = ALL_STORES[i];
      var count = await pushStore(store);
      total += count;
      if (onProgress) onProgress(store, count);
    }
    return total;
  }

  async function pullStore(storeName) {
    var url = getBaseUrl() + '/' + storeName + '?select=*';
    var res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) {
      var text = await res.text().catch(function() { return ''; });
      throw new Error('Error al bajar ' + storeName + ': ' + res.status + ' ' + res.statusText + (text ? ' - ' + text : ''));
    }
    var items = await res.json();
    if (!Array.isArray(items)) return 0;
    var d = await openDB();
    var tx = d.transaction(storeName, 'readwrite');
    var store = tx.objectStore(storeName);
    await new Promise(function(resolve, reject) {
      var clearReq = store.clear();
      clearReq.onsuccess = function() {
        if (items.length === 0) return resolve();
        var done = 0;
        for (var j = 0; j < items.length; j++) {
          (function(item) {
            var putReq = store.put(item);
            putReq.onsuccess = function() { done++; if (done >= items.length) resolve(); };
            putReq.onerror = function(e) { reject(e.target.error); };
          })(items[j]);
        }
      };
      clearReq.onerror = function(e) { reject(e.target.error); };
    });
    return items.length;
  }

  async function pullAll(onProgress) {
    var total = 0;
    for (var i = 0; i < ALL_STORES.length; i++) {
      var store = ALL_STORES[i];
      var count = await pullStore(store);
      total += count;
      if (onProgress) onProgress(store, count);
    }
    return total;
  }

  async function getStoreCounts() {
    var counts = {};
    for (var i = 0; i < ALL_STORES.length; i++) {
      var store = ALL_STORES[i];
      counts[store] = await doTx(store, 'readonly', countFromStore);
    }
    return counts;
  }

  window.SyncManager = {
    configure: function(url, key) {
      if (!url || !key) throw new Error('URL y Clave de Supabase son requeridas');
      saveConfig(url.trim(), key.trim());
    },

    clearConfig: function() {
      clearConfig();
    },

    isConfigured: function() {
      return getConfig() !== null;
    },

    getConfig: function() {
      return getConfig();
    },

    push: async function(onProgress) {
      if (!this.isConfigured()) throw new Error('Supabase no configurado. Presiona + para configurar.');
      var total = await pushAll(onProgress);
      setLastSync();
      return total;
    },

    pull: async function(onProgress) {
      if (!this.isConfigured()) throw new Error('Supabase no configurado. Presiona + para configurar.');
      var total = await pullAll(onProgress);
      setLastSync();
      return total;
    },

    full: async function(onProgress) {
      if (!this.isConfigured()) throw new Error('Supabase no configurado. Presiona + para configurar.');
      var pushed = await pushAll(onProgress);
      var pulled = await pullAll(onProgress);
      setLastSync();
      return { pushed: pushed, pulled: pulled };
    }
  };

  window.getSyncStatus = async function() {
    var cfg = getConfig();
    var lastSync = getLastSync();
    var counts = await getStoreCounts();
    var total = 0;
    for (var k in counts) {
      if (counts.hasOwnProperty(k)) total += counts[k];
    }
    return {
      configured: cfg !== null,
      url: cfg ? cfg.url : null,
      lastSync: lastSync,
      lastSyncFormatted: lastSync ? new Date(lastSync).toLocaleString('es-AR') : null,
      counts: counts,
      totalRecords: total
    };
  };
})();

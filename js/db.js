const DB_NAME = 'couturart';
const DB_VERSION = 2;

let db = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('clients')) {
        d.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('measurements')) {
        const s = d.createObjectStore('measurements', { keyPath: 'id', autoIncrement: true });
        s.createIndex('clientId', 'clientId', { unique: false });
      }
      if (!d.objectStoreNames.contains('orders')) {
        const s = d.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
        s.createIndex('clientId', 'clientId', { unique: false });
      }
      if (!d.objectStoreNames.contains('transactions')) {
        const s = d.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('orderId', 'orderId', { unique: false });
      }
      if (!d.objectStoreNames.contains('inventory')) {
        d.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('appointments')) {
        d.createObjectStore('appointments', { keyPath: 'id', autoIncrement: true });
      }
      if (!d.objectStoreNames.contains('order_items')) {
        const s = d.createObjectStore('order_items', { keyPath: 'id', autoIncrement: true });
        s.createIndex('orderId', 'orderId', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

function doTx(storeName, mode, callback) {
  return openDB().then(db => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result);
      tx.onerror = e => reject(e.target.error);
    });
  });
}

function getAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

function getByIndex(store, index, value) {
  return new Promise((resolve, reject) => {
    const req = store.index(index).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

function getItem(store, id) {
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

function countItems(store) {
  return new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

// --- Clients ---
export async function getClients() {
  return doTx('clients', 'readonly', getAll);
}
export async function getClient(id) {
  return doTx('clients', 'readonly', s => getItem(s, id));
}
export async function saveClient(client) {
  return doTx('clients', 'readwrite', s => s.put(client));
}
export async function deleteClient(id) {
  return doTx('clients', 'readwrite', s => { s.delete(id); });
}

// --- Orders ---
export async function getOrders() {
  return doTx('orders', 'readonly', getAll);
}
export async function getOrder(id) {
  return doTx('orders', 'readonly', s => getItem(s, id));
}
export async function getOrdersByClient(clientId) {
  return doTx('orders', 'readonly', s => getByIndex(s, 'clientId', clientId));
}
export async function saveOrder(order) {
  return doTx('orders', 'readwrite', s => s.put(order));
}
export async function deleteOrder(id) {
  return doTx('orders', 'readwrite', s => { s.delete(id); });
}

// --- Measurements ---
export async function getMeasurements(clientId) {
  return doTx('measurements', 'readonly', s => getByIndex(s, 'clientId', clientId));
}
export async function saveMeasurement(m) {
  return doTx('measurements', 'readwrite', s => s.put(m));
}
export async function deleteMeasurement(id) {
  return doTx('measurements', 'readwrite', s => { s.delete(id); });
}

// --- Transactions ---
export async function getTransactions() {
  return doTx('transactions', 'readonly', getAll);
}
export async function getTransactionsByOrder(orderId) {
  return doTx('transactions', 'readonly', s => getByIndex(s, 'orderId', orderId));
}
export async function saveTransaction(t) {
  return doTx('transactions', 'readwrite', s => s.put(t));
}
export async function deleteTransaction(id) {
  return doTx('transactions', 'readwrite', s => { s.delete(id); });
}

// --- Inventory ---
export async function getInventory() {
  return doTx('inventory', 'readonly', getAll);
}
export async function saveInventoryItem(item) {
  return doTx('inventory', 'readwrite', s => s.put(item));
}
export async function deleteInventoryItem(id) {
  return doTx('inventory', 'readwrite', s => { s.delete(id); });
}

// --- Appointments ---
export async function getAppointments() {
  return doTx('appointments', 'readonly', getAll);
}
export async function saveAppointment(a) {
  return doTx('appointments', 'readwrite', s => s.put(a));
}
export async function deleteAppointment(id) {
  return doTx('appointments', 'readwrite', s => { s.delete(id); });
}

// --- Order Items ---
export async function getOrderItems(orderId) {
  return doTx('order_items', 'readonly', s => getByIndex(s, 'orderId', orderId));
}
export async function saveOrderItem(item) {
  return doTx('order_items', 'readwrite', s => s.put(item));
}
export async function deleteOrderItem(id) {
  return doTx('order_items', 'readwrite', s => { s.delete(id); });
}
export async function deleteOrderItemsByOrder(orderId) {
  const items = await getOrderItems(orderId);
  const tx = (await openDB()).transaction('order_items', 'readwrite');
  const store = tx.objectStore('order_items');
  return Promise.all(items.map(i => new Promise((resolve, reject) => {
    const req = store.delete(i.id);
    req.onsuccess = resolve; req.onerror = e => reject(e.target.error);
  })));
}

// --- Utils ---
export function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  return { start, end };
}

export async function computeFinance() {
  const txns = await getTransactions();
  let income = 0, expenses = 0;
  txns.forEach(t => {
    if (t.type === 'income') income += t.amount;
    else expenses += t.amount;
  });
  return { income, expenses, balance: income - expenses };
}

export async function computeOrdersSummary() {
  const orders = await getOrders();
  let totalRevenue = 0, totalPending = 0;
  orders.forEach(o => {
    totalRevenue += o.total;
    totalPending += o.total - (o.deposit || 0);
  });
  return { totalRevenue, totalPending };
}

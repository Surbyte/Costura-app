// Dialog helper
window.dialog = {
  open(title, bodyHtml, buttons) {
    document.getElementById('dialogOverlay').style.display = 'flex';
    document.getElementById('dialogHeader').innerHTML = `<h2>${title}</h2>`;
    document.getElementById('dialogBody').innerHTML = bodyHtml;
    const footer = document.getElementById('dialogFooter');
    footer.innerHTML = '';
    (buttons || []).forEach(b => {
      const btn = document.createElement('button');
      btn.className = `btn ${b.primary ? 'btn-primary' : 'btn-outline'}`;
      btn.textContent = b.label;
      btn.onclick = () => { if (b.action) b.action(); if (b.close !== false) dialog.close(); };
      footer.appendChild(btn);
    });
  },
  close() {
    document.getElementById('dialogOverlay').style.display = 'none';
  }
};

// Toast
window.toast = (msg) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:8px;font-size:0.9rem;z-index:200;max-width:90%;text-align:center;animation:fadeIn 0.3s';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
};

// Format helpers
window.fmt = {
  date(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  datetime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  },
  money(n) { return `$${(n || 0).toFixed(0)}`; },
  now() { return Date.now(); },
  today() {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d.getTime();
  }
};

// SVG icons
window.icon = {
  arrowBack: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/></svg>',
  person: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/></svg>',
  delete: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/></svg>',
  add: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/></svg>',
  shopping: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7,18C5.9,18 5,18.9 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.9 8.1,18 7,18M1,2V4H3L6.6,11.59L5.25,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42C7.28,15 7.17,14.89 7.17,14.75L7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.48C20.96,5.34 21,5.17 21,5C21,4.45 20.55,4 20,4H5.21L4.27,2H1M17,18C15.9,18 15,18.9 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.9 18.1,18 17,18Z"/>',
  inventory: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H19C20.11,21 21,20.11 21,19V5C21,3.89 20.11,3 19,3M10,17L5,12L6.41,10.59L10,14.17L17.59,6.58L19,8L10,17Z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19,19H5V8H19M16,1V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3H18V1M17,12H12V17H17V12Z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/></svg>',
  account: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M11.5,1L2,6V8H21V6M16,10V17H19V10M2,22H21V19H2M10,10V17H13V10M4,10V17H7V10"/></svg>'
};

// Helper to compile a form object
window.formData = (ids) => {
  const data = {};
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  return data;
};

// Register SW
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// CSS animation
const style = document.createElement('style');
style.textContent = `@keyframes fadeIn { from { opacity:0;transform:translateX(-50%) translateY(10px) } to { opacity:1;transform:translateX(-50%) translateY(0) } }`;
document.head.appendChild(style);

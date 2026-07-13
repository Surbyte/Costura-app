// Simple SPA hash-router
class Router {
  constructor() {
    this.routes = {};
    this.current = null;
    this.actionCallback = null;
    this.onHashChange = this.onHashChange.bind(this);
    window.addEventListener('hashchange', this.onHashChange);
  }

  register(name, renderFn, opts = {}) {
    this.routes[name] = { renderFn, opts };
  }

  go(route, data) {
    window.location.hash = route;
    if (data) sessionStorage.setItem('_navData', JSON.stringify(data));
  }

  back() {
    history.back();
  }

  onHashChange() {
    const hash = window.location.hash.replace('#', '') || 'home';
    this.navigate(hash);
  }

  async navigate(route) {
    const parts = route.split('/');
    const base = parts[0];
    const page = this.routes[base];
    if (!page) { this.go('home'); return; }

    this.current = route;
    const el = document.getElementById('mainContent');
    const title = document.getElementById('pageTitle');
    const backBtn = document.getElementById('navBack');
    const actionBtn = document.getElementById('navAction');

    el.innerHTML = '<div class="empty-state"><p>Cargando...</p></div>';
    title.textContent = page.opts.title || 'Couturart';
    backBtn.style.display = (page.opts.showBack || parts.length > 1) ? '' : 'none';
    actionBtn.style.display = page.opts.action ? '' : 'none';
    this.actionCallback = page.opts.action || null;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === base));

    try {
      const html = await page.renderFn(parts.slice(1));
      el.innerHTML = html;
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><p>Error al cargar: ${err.message}</p></div>`;
    }
  }

  showAction() {
    if (this.actionCallback) this.actionCallback();
  }

  init() {
    this.onHashChange();
  }
}

export const router = new Router();

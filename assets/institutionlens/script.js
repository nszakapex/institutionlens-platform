(() => {
  const header = document.querySelector('[data-header]');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  const dialog = document.querySelector('[data-dialog]');
  const pilotForm = document.querySelector('[data-pilot-form]');
  const formView = document.querySelector('[data-form-view]');
  const successView = document.querySelector('[data-success-view]');

  const setHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  setHeader();
  window.addEventListener('scroll', setHeader, { passive: true });

  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('is-open', !open);
  });

  nav?.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    menuToggle?.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  });

  const activateTab = (name, focus = false) => {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });

    panels.forEach((panel) => {
      const active = panel.dataset.panel === name;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const step = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + step + tabs.length) % tabs.length;
      activateTab(tabs[nextIndex].dataset.tab, true);
    });
  });

  document.querySelectorAll('[data-jump-tab]').forEach((control) => {
    control.addEventListener('click', () => activateTab(control.dataset.jumpTab));
  });

  const openDialog = () => {
    if (!dialog) return;
    formView.hidden = false;
    successView.hidden = true;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  };

  const closeDialog = () => {
    dialog?.close();
    document.body.classList.remove('dialog-open');
  };

  document.querySelectorAll('[data-open-dialog]').forEach((button) => button.addEventListener('click', openDialog));
  document.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', closeDialog));
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog?.addEventListener('close', () => document.body.classList.remove('dialog-open'));

  pilotForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pilotForm.reportValidity()) return;
    formView.hidden = true;
    successView.hidden = false;
  });

  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    heroVisual.addEventListener('pointermove', (event) => {
      const bounds = heroVisual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      heroVisual.style.setProperty('--pointer-x', `${x * 8}px`);
      heroVisual.style.setProperty('--pointer-y', `${y * 8}px`);
      const readout = heroVisual.querySelector('.focus-readout');
      if (readout) readout.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
    });
  }

  document.querySelectorAll('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
})();

/* Shared responsive presentation enhancements. No data or API changes. */
(() => {
  const phone = matchMedia('(max-width: 1000px)');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById(toggle?.getAttribute('aria-controls'));
  function closeMenu() {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });
  nav?.addEventListener('click', e => {
    if (e.target.closest('a, button')) closeMenu();
  });
  document.addEventListener('click', e => {
    if (nav && !nav.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeMenu(); toggle.focus();
    }
  });
  phone.addEventListener('change', closeMenu);

  // Preserve native tables and existing actions; supply visible card labels on phones.
  function labelTables() {
    document.querySelectorAll('.data-table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
      table.querySelectorAll('tbody tr').forEach(row => {
        [...row.cells].forEach((cell, i) => {
          if (cell.colSpan === 1) cell.dataset.label = headers[i] || 'Actions';
        });
      });
    });
  }
  const content = document.getElementById('appContent');
  if (content) new MutationObserver(labelTables).observe(content, {childList:true, subtree:true});
  labelTables();
})();

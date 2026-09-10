/* Service choices enhance the existing booking form without changing its payload. */
(() => {
  const issue = document.querySelector('#bookingForm [name=issue]');
  document.querySelectorAll('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      if (issue && !issue.value.trim()) {
        issue.value = link.dataset.service;
        issue.dispatchEvent(new Event('input', {bubbles:true}));
      }
    });
  });
})();

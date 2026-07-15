export const runtimeSource = `(() => {
  console.log('fixture runtime ready; user@example.com');
  localStorage.setItem('consentpro_runtime_state', 'enabled-secret-value');
  const ready = document.createElement('div');
  ready.dataset.runtimeReady = 'true';
  ready.textContent = 'Consent runtime active';
  document.body.appendChild(ready);
  const uninstall = document.createElement('button');
  uninstall.dataset.runtimeUninstall = 'true';
  uninstall.textContent = 'Uninstall runtime';
  uninstall.addEventListener('click', () => {
    ready.remove();
    uninstall.remove();
    // Intentional defect: script and localStorage remain after cleanup.
  });
  document.body.appendChild(uninstall);
  fetch('/allowed-data?session=private-value').catch(() => {});
  fetch('https://blocked.invalid/should-not-run?authorization=Bearer%20fixture-secret').catch(() => {});
})();
//# sourceMappingURL=/runtime-v1.js.map`;

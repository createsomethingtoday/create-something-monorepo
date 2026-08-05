export const runtimeSource = `(() => {
  console.log('fixture runtime ready; user@example.com');
  localStorage.setItem('consentpro_runtime_state', 'enabled-secret-value');
  const ready = document.createElement('div');
  ready.dataset.runtimeReady = 'true';
  ready.textContent = 'Consent runtime active';
  document.body.appendChild(ready);
  fetch('/allowed-data?session=private-value').catch(() => {});
  fetch('https://blocked.invalid/should-not-run?authorization=Bearer%20fixture-secret').catch(() => {});
})();
//# sourceMappingURL=/runtime-v1.js.map`;

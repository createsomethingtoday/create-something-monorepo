const stage = document.querySelector('[data-composition-id]');
if (stage) {
  const width = Number(stage.dataset.width);
  const height = Number(stage.dataset.height);
  function fitStage() {
    const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
    stage.style.setProperty('--frame-width', width + 'px');
    stage.style.setProperty('--frame-height', height + 'px');
    stage.style.zoom = String(scale);
  }
  fitStage();
  window.addEventListener('resize', fitStage);
}

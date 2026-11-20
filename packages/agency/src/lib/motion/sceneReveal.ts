export interface HomeScene {
  src: string;
  alt: string;
  caption: string;
}

interface SceneSelectionHooks<Scene, Asset> {
  load: (scene: Scene) => Promise<Asset>;
  settle: () => void;
  loading: (scene: Scene, current: Scene) => void;
  show: (scene: Scene, asset: Asset, direction: 1 | -1) => void;
  ready: (scene: Scene) => void;
  failed: (scene: Scene, current: Scene) => void;
}

/** Request generations keep both late successes and failures from changing a newer selection. */
export function createSceneSelection<Scene, Asset>(scenes: readonly Scene[], hooks: SceneSelectionHooks<Scene, Asset>) {
  let displayed = 0;
  let selected = 0;
  let generation = 0;
  let disposed = false;
  return {
    async select(index: number): Promise<void> {
      if (disposed || !Number.isInteger(index) || index < 0 || index >= scenes.length || index === selected) return;
      const direction = index > displayed ? 1 : -1;
      selected = index;
      const request = ++generation;
      hooks.settle();
      if (index === displayed) {
        hooks.ready(scenes[displayed]);
        return;
      }
      hooks.loading(scenes[index], scenes[displayed]);
      try {
        const asset = await hooks.load(scenes[index]);
        if (disposed || request !== generation) return;
        hooks.show(scenes[index], asset, direction);
        displayed = index;
        hooks.ready(scenes[index]);
      } catch {
        if (disposed || request !== generation) return;
        selected = displayed;
        hooks.failed(scenes[index], scenes[displayed]);
      }
    },
    destroy() {
      disposed = true;
      generation++;
      hooks.settle();
    }
  };
}

/** Progressive enhancement: the original image, buttons and caption remain the no-JS reading. */
export function enhanceSceneReveal(root: HTMLElement, sceneMap: Record<string, HomeScene>): { destroy: () => void } {
  const view = root.ownerDocument.defaultView;
  const image = root.querySelector<HTMLImageElement>('#journey-image');
  const caption = root.querySelector<HTMLElement>('#journey-caption');
  const status = root.querySelector<HTMLElement>('#journey-status');
  const figure = image?.closest('figure');
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-home-step]'));
  if (!view || !image || !caption || !status || !figure || !buttons.length) return { destroy() {} };
  const scenes = buttons.map(button => sceneMap[button.dataset.homeStep ?? '']);
  if (scenes.some(scene => !scene)) return { destroy() {} };
  const stories = Array.from(root.querySelectorAll<HTMLElement>('[data-home-story]'));
  const showStory = (scene: HomeScene) => {
    const step = buttons[scenes.indexOf(scene)]?.dataset.homeStep;
    for (const story of stories) story.hidden = story.dataset.homeStory !== step;
  };
  const reduced = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let animation: Animation | undefined;
  let previous: HTMLImageElement | undefined;
  const markSelected = (scene: HomeScene) => {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(scenes[index] === scene)));
  };
  const settle = () => {
    const active = animation;
    animation = undefined;
    if (active) {
      active.onfinish = null;
      active.oncancel = null;
      active.cancel();
    }
    previous?.remove();
    previous = undefined;
    figure.removeAttribute('data-scene-revealing');
  };
  const selection = createSceneSelection(scenes, {
    load(scene) {
      const candidate = new view.Image();
      candidate.decoding = 'async';
      if (typeof candidate.decode === 'function') {
        candidate.src = scene.src;
        return candidate.decode().then(() => candidate);
      }
      return new Promise<HTMLImageElement>((resolve, reject) => {
        candidate.onload = () => resolve(candidate);
        candidate.onerror = () => reject(new Error('Scene image could not load'));
        candidate.src = scene.src;
      });
    },
    settle,
    loading(scene, current) {
      markSelected(scene);
      figure.setAttribute('aria-busy', 'true');
      status.textContent = `Loading ${scene.caption.split(' / ')[0]}. Showing ${current.caption}`;
    },
    show(scene, asset, direction) {
      const styles = view.getComputedStyle(root);
      const token = styles.getPropertyValue('--duration-performance-standard').trim();
      const duration = parseFloat(token) * (token.endsWith('ms') ? 1 : 1000);
      const easing = styles.getPropertyValue('--ease-performance-standard').trim();
      const canAnimate = reduced && !reduced.matches && typeof image.animate === 'function'
        && view.CSS?.supports('clip-path', 'inset(0)') && duration > 0 && easing;
      if (canAnimate) {
        previous = image.cloneNode(true) as HTMLImageElement;
        previous.removeAttribute('id');
        previous.alt = '';
        previous.setAttribute('aria-hidden', 'true');
        previous.setAttribute('data-scene-previous', '');
        previous.loading = 'eager';
        image.parentNode?.insertBefore(previous, image);
      }
      image.src = asset.src;
      image.alt = scene.alt;
      if (!canAnimate) return;
      try {
        animation = image.animate([
          { clipPath: direction === 1 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)' },
          { clipPath: 'inset(0 0 0 0)' }
        ], { duration, easing });
        figure.setAttribute('data-scene-revealing', direction === 1 ? 'forward' : 'backward');
        animation.onfinish = settle;
        animation.oncancel = settle;
      } catch {
        // Unsupported animation options must leave the decoded new scene usable.
        settle();
      }
    },
    ready(scene) {
      markSelected(scene);
      showStory(scene);
      figure.removeAttribute('aria-busy');
      caption.textContent = scene.caption;
      status.textContent = `Conceptual illustration / ${scene.caption}`;
    },
    failed(scene, current) {
      markSelected(current);
      figure.removeAttribute('aria-busy');
      status.textContent = `${scene.caption.split(' / ')[0]} could not load. Showing ${current.caption} Select the step to try again.`;
    }
  });
  showStory(scenes[0]);
  buttons.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener('click', () => { void selection.select(index); }, { signal: abort.signal });
  });
  reduced?.addEventListener('change', () => { if (reduced.matches) settle(); }, { signal: abort.signal });
  return {
    destroy() {
      abort.abort();
      selection.destroy();
      figure.removeAttribute('aria-busy');
      for (const story of stories) story.hidden = false;
    }
  };
}

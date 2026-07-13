<script lang="ts">
  import { onMount } from 'svelte';

  type HeroSignalVariant = 'agency' | 'io' | 'space';
  type HeroSignalFocus = 'balanced' | 'left' | 'right';

  interface AnchorConfig {
    label: string;
    top: number;
    left: number;
    emphasis?: boolean;
  }

  interface VariantConfig {
    accent: string;
    accentSoft: string;
    edgeGlow: string;
    palette: string[];
    defaultFocus: HeroSignalFocus;
    laneCounts: Record<HeroSignalFocus, { left: number; right: number }>;
    barsPerLane: number;
    centerGap: number;
    laneSpacing: number;
    laneJitter: number;
    ySpread: number;
    heightRange: [number, number];
    widthRange: [number, number];
    speed: number;
    angle: number;
    cameraDrift: number;
    cameraLift: number;
    xDrift: number;
    yDrift: number;
    resetZ: number;
    farZ: number;
    depthStep: number;
    particleCount: number;
    particleSpread: number;
    pointerPull: number;
    pointerRadius: number;
    anchors: AnchorConfig[];
  }

  interface SceneHandle {
    animate: (now: number) => void;
    renderStatic: () => void;
    dispose: () => void;
  }

  const VARIANTS: Record<HeroSignalVariant, VariantConfig> = {
    agency: {
      accent: 'rgba(37, 86, 255, 0.24)',
      accentSoft: 'rgba(70, 154, 255, 0.16)',
      edgeGlow: 'rgba(103, 214, 255, 0.18)',
      palette: ['#2345ff', '#2f72ff', '#53a3ff', '#79d7ff'],
      defaultFocus: 'right',
      laneCounts: {
        balanced: { left: 4, right: 4 },
        left: { left: 5, right: 3 },
        right: { left: 1, right: 5 }
      },
      barsPerLane: 8,
      centerGap: 5.4,
      laneSpacing: 1.22,
      laneJitter: 0.44,
      ySpread: 6.9,
      heightRange: [3.6, 8.2],
      widthRange: [0.04, 0.09],
      speed: 2.22,
      angle: 0.28,
      cameraDrift: 0.2,
      cameraLift: 0.08,
      xDrift: 0.08,
      yDrift: 0.12,
      resetZ: 5.5,
      farZ: -38,
      depthStep: 1.7,
      particleCount: 148,
      particleSpread: 16,
      pointerPull: 0.22,
      pointerRadius: 4.8,
      anchors: [
        { label: 'observe', top: 25, left: 70 },
        { label: 'approve', top: 41, left: 79, emphasis: true },
        { label: 'release', top: 61, left: 72 }
      ]
    },
    io: {
      accent: 'rgba(61, 120, 255, 0.18)',
      accentSoft: 'rgba(139, 176, 255, 0.12)',
      edgeGlow: 'rgba(207, 225, 255, 0.14)',
      palette: ['#3758ff', '#7f9fff', '#c4d1ff', '#edf2ff'],
      defaultFocus: 'balanced',
      laneCounts: {
        balanced: { left: 4, right: 4 },
        left: { left: 5, right: 3 },
        right: { left: 3, right: 5 }
      },
      barsPerLane: 8,
      centerGap: 6.1,
      laneSpacing: 1.3,
      laneJitter: 0.66,
      ySpread: 7.5,
      heightRange: [4.2, 9.2],
      widthRange: [0.08, 0.14],
      speed: 1.95,
      angle: 0.22,
      cameraDrift: 0.26,
      cameraLift: 0.12,
      xDrift: 0.14,
      yDrift: 0.18,
      resetZ: 5,
      farZ: -34,
      depthStep: 1.9,
      particleCount: 126,
      particleSpread: 18,
      pointerPull: 0.18,
      pointerRadius: 5.1,
      anchors: [
        { label: 'inspect', top: 23, left: 24 },
        { label: 'route', top: 45, left: 50, emphasis: true },
        { label: 'publish', top: 67, left: 76 }
      ]
    },
    space: {
      accent: 'rgba(37, 86, 255, 0.2)',
      accentSoft: 'rgba(67, 217, 255, 0.16)',
      edgeGlow: 'rgba(145, 247, 255, 0.18)',
      palette: ['#2241ff', '#2f7aff', '#38b9ff', '#7bf0ff'],
      defaultFocus: 'balanced',
      laneCounts: {
        balanced: { left: 5, right: 5 },
        left: { left: 6, right: 4 },
        right: { left: 4, right: 6 }
      },
      barsPerLane: 10,
      centerGap: 5,
      laneSpacing: 1.15,
      laneJitter: 0.74,
      ySpread: 8.8,
      heightRange: [4.8, 10.6],
      widthRange: [0.09, 0.18],
      speed: 3,
      angle: 0.3,
      cameraDrift: 0.42,
      cameraLift: 0.24,
      xDrift: 0.24,
      yDrift: 0.3,
      resetZ: 6,
      farZ: -40,
      depthStep: 1.65,
      particleCount: 176,
      particleSpread: 20,
      pointerPull: 0.2,
      pointerRadius: 5.4,
      anchors: [
        { label: 'detect', top: 24, left: 22 },
        { label: 'simulate', top: 48, left: 50, emphasis: true },
        { label: 'ship', top: 68, left: 78 }
      ]
    }
  };

  export let variant: HeroSignalVariant = 'agency';
  export let focus: HeroSignalFocus | undefined = undefined;
  export let className = '';

  let rootEl: HTMLDivElement | null = null;
  let canvasEl: HTMLCanvasElement | null = null;
  let ready = false;
  let engineLabel = '';

  $: config = VARIANTS[variant];
  $: resolvedFocus = focus ?? config.defaultFocus;
  $: anchors = config.anchors;
  $: classes =
    `hero-signal-field hero-signal-field--${variant} hero-signal-field--focus-${resolvedFocus} ${className}`.trim();

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function getDefaultPointerX(currentFocus: HeroSignalFocus) {
    if (currentFocus === 'right') return 0.78;
    if (currentFocus === 'left') return 0.22;
    return 0.5;
  }

  function bindMediaListener(
    query: MediaQueryList,
    listener: (event: MediaQueryListEvent) => void
  ) {
    const legacyQuery = query as MediaQueryList & {
      addListener?: (callback: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (callback: (event: MediaQueryListEvent) => void) => void;
    };

    if ('addEventListener' in query) {
      query.addEventListener('change', listener);
      return () => query.removeEventListener('change', listener);
    }

    legacyQuery.addListener?.(listener);
    return () => legacyQuery.removeListener?.(listener);
  }

  function createBarTexture() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 64;
    textureCanvas.height = 512;

    const ctx = textureCanvas.getContext('2d');
    if (!ctx) return textureCanvas;

    ctx.clearRect(0, 0, textureCanvas.width, textureCanvas.height);

    const horizontalGlow = ctx.createLinearGradient(0, 0, textureCanvas.width, 0);
    horizontalGlow.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizontalGlow.addColorStop(0.25, 'rgba(255, 255, 255, 0.08)');
    horizontalGlow.addColorStop(0.5, 'rgba(255, 255, 255, 0.98)');
    horizontalGlow.addColorStop(0.75, 'rgba(255, 255, 255, 0.08)');
    horizontalGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = horizontalGlow;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    const verticalFade = ctx.createLinearGradient(0, 0, 0, textureCanvas.height);
    verticalFade.addColorStop(0, 'rgba(255, 255, 255, 0)');
    verticalFade.addColorStop(0.08, 'rgba(255, 255, 255, 0.7)');
    verticalFade.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    verticalFade.addColorStop(0.92, 'rgba(255, 255, 255, 0.7)');
    verticalFade.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = verticalFade;
    ctx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

    return textureCanvas;
  }

  onMount(() => {
    if (!rootEl || !canvasEl) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compactQuery = window.matchMedia('(max-width: 768px)');

    const pointer = {
      currentX: getDefaultPointerX(resolvedFocus),
      currentY: 0.5,
      targetX: getDefaultPointerX(resolvedFocus),
      targetY: 0.5
    };

    let destroyed = false;
    let animationFrame = 0;
    let bootToken = 0;
    let visible = document.visibilityState === 'visible';
    let inViewport = true;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let sceneHandle: SceneHandle | null = null;

    let cleanupVisibility = () => {};
    let cleanupReducedMotion = () => {};
    let cleanupCompact = () => {};
    let cleanupPointer = () => {};
    let cleanupContext = () => {};

    const setPointerVars = (x: number, y: number) => {
      rootEl?.style.setProperty('--hero-field-pointer-x', `${(x * 100).toFixed(2)}%`);
      rootEl?.style.setProperty('--hero-field-pointer-y', `${(y * 100).toFixed(2)}%`);
    };

    const resetPointer = () => {
      pointer.targetX = getDefaultPointerX(resolvedFocus);
      pointer.targetY = 0.5;
    };

    const stopAnimation = () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const animate = (now: number) => {
      animationFrame = 0;

      if (destroyed || !sceneHandle || reducedMotionQuery.matches || !visible || !inViewport) {
        return;
      }

      sceneHandle.animate(now);
      animationFrame = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (animationFrame || destroyed || !sceneHandle) return;
      if (reducedMotionQuery.matches || !visible || !inViewport) return;
      animationFrame = window.requestAnimationFrame(animate);
    };

    const disposeScene = () => {
      stopAnimation();
      sceneHandle?.dispose();
      sceneHandle = null;
      ready = false;
      engineLabel = '';
    };

    const createScene = async (): Promise<SceneHandle | null> => {
      if (!rootEl || !canvasEl) return null;

      const THREE = await import('three');
      if (destroyed || !rootEl || !canvasEl) return null;

      engineLabel = `three.js r${THREE.REVISION}`;

      const currentConfig = VARIANTS[variant];
      const currentFocus = focus ?? currentConfig.defaultFocus;
      const focusBias = currentFocus === 'right' ? 0.48 : currentFocus === 'left' ? -0.48 : 0;
      const lookAtBias = focusBias * 0.16;
      const laneCounts = currentConfig.laneCounts[currentFocus];
      const compact = compactQuery.matches;
      const reducedMotion = reducedMotionQuery.matches;
      const barsPerLane = reducedMotion
        ? Math.max(3, Math.floor(currentConfig.barsPerLane * 0.45))
        : compact
          ? Math.max(4, Math.floor(currentConfig.barsPerLane * 0.65))
          : currentConfig.barsPerLane;
      const particleCount = reducedMotion
        ? Math.max(24, Math.floor(currentConfig.particleCount * 0.32))
        : compact
          ? Math.max(48, Math.floor(currentConfig.particleCount * 0.66))
          : currentConfig.particleCount;

      const renderer = new THREE.WebGLRenderer({
        canvas: canvasEl,
        alpha: true,
        antialias: !compact,
        powerPreference: 'high-performance',
        premultipliedAlpha: true
      });

      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(compact ? 40 : 34, 1, 0.1, 100);
      camera.position.set(0, 0, 18);

      const field = new THREE.Group();
      scene.add(field);

      const texture = new THREE.CanvasTexture(createBarTexture());
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;

      const planeGeometry = new THREE.PlaneGeometry(1, 1);
      const sharedMaterials = currentConfig.palette.map(
        (color, index) =>
          new THREE.MeshBasicMaterial({
            map: texture,
            color,
            transparent: true,
            opacity: 0.28 - index * 0.03,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
            side: THREE.DoubleSide
          })
      );

      type BarState = {
        mesh: InstanceType<typeof THREE.Mesh>;
        side: number;
        baseX: number;
        baseY: number;
        baseScaleX: number;
        baseScaleY: number;
        speed: number;
        phase: number;
        driftRate: number;
        pulseRate: number;
      };

      const bars: BarState[] = [];

      const createSide = (side: -1 | 1, laneCount: number) => {
        for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
          for (let barIndex = 0; barIndex < barsPerLane; barIndex += 1) {
            const material =
              sharedMaterials[(laneIndex + barIndex + (side > 0 ? 1 : 0)) % sharedMaterials.length];
            const mesh = new THREE.Mesh(planeGeometry, material);
            const width =
              currentConfig.widthRange[0] +
              Math.random() * (currentConfig.widthRange[1] - currentConfig.widthRange[0]);
            const height =
              currentConfig.heightRange[0] +
              Math.random() * (currentConfig.heightRange[1] - currentConfig.heightRange[0]);
            const x =
              side *
              (currentConfig.centerGap +
                laneIndex * currentConfig.laneSpacing +
                Math.random() * currentConfig.laneJitter);
            const y =
              (Math.random() - 0.5) * currentConfig.ySpread + Math.sin(laneIndex * 0.65) * 0.4;
            const z =
              currentConfig.farZ +
              barIndex * currentConfig.depthStep +
              (Math.random() - 0.5) * 0.75;

            mesh.position.set(x, y, z);
            mesh.scale.set(width, height, 1);
            mesh.rotation.y = -side * (currentConfig.angle + Math.random() * 0.08);

            field.add(mesh);
            bars.push({
              mesh,
              side,
              baseX: x,
              baseY: y,
              baseScaleX: width,
              baseScaleY: height,
              speed: currentConfig.speed * (0.82 + Math.random() * 0.34),
              phase: Math.random() * Math.PI * 2,
              driftRate: 0.4 + Math.random() * 0.65,
              pulseRate: 0.8 + Math.random() * 0.9
            });
          }
        }
      };

      createSide(-1, laneCounts.left);
      createSide(1, laneCounts.right);

      const particleGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);
      const twinkles = new Float32Array(particleCount);

      for (let index = 0; index < particleCount; index += 1) {
        const axisBias = currentFocus === 'right' ? 2.4 : currentFocus === 'left' ? -2.4 : 0;
        positions[index * 3] =
          (Math.random() - 0.5) * currentConfig.particleSpread + axisBias + focusBias * 2.5;
        positions[index * 3 + 1] = (Math.random() - 0.5) * currentConfig.ySpread * 1.6;
        positions[index * 3 + 2] =
          currentConfig.farZ + Math.random() * (currentConfig.resetZ - currentConfig.farZ + 8);

        const color = new THREE.Color(
          currentConfig.palette[Math.floor(Math.random() * currentConfig.palette.length)]
        );
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;

        sizes[index] = 4 + Math.random() * 7;
        phases[index] = Math.random() * Math.PI * 2;
        twinkles[index] = 0.45 + Math.random() * 0.85;
      }

      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      particleGeometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
      particleGeometry.setAttribute('twinkle', new THREE.BufferAttribute(twinkles, 1));

      const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          pointer: { value: new THREE.Vector3(0, 0, 0) }
        },
        vertexShader: `
          attribute float size;
          attribute float phase;
          attribute float twinkle;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float time;
          uniform vec3 pointer;

          void main() {
            vColor = color;

            vec3 pos = position;
            pos.x += sin(time * 0.24 + phase) * 0.08;
            pos.y += cos(time * 0.16 + phase * 1.3) * 0.06;

            float pointerDist = distance(pos.xy, pointer.xy);
            float pointerLift = exp(-pointerDist * 0.9);
            pos.z += pointerLift * 0.35;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (190.0 / max(1.0, -mvPosition.z));
            gl_Position = projectionMatrix * mvPosition;

            vAlpha = 0.22 + sin(time * twinkle + phase) * 0.08 + pointerLift * 0.12;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float distanceToCenter = distance(gl_PointCoord, vec2(0.5, 0.5));
            if (distanceToCenter > 0.5) discard;

            float glow = 1.0 - distanceToCenter * 2.0;
            glow = pow(glow, 2.4);

            gl_FragColor = vec4(vColor, glow * vAlpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });

      const particles = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particles);

      const resize = () => {
        if (!rootEl) return;

        const rect = rootEl.getBoundingClientRect();
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio || 1, compactQuery.matches ? 1.2 : 1.6)
        );
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / Math.max(rect.height, 1);
        camera.fov = rect.width < 820 ? 40 : 34;
        camera.updateProjectionMatrix();
      };

      resize();
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(rootEl);

      const renderStatic = () => {
        camera.position.set(focusBias + 0.08, 0.04, 18);
        camera.lookAt(lookAtBias, 0, 0);
        renderer.render(scene, camera);
      };

      const animateScene = (now: number) => {
        const compactNow = compactQuery.matches;
        const time = now * 0.00042;

        pointer.currentX += (pointer.targetX - pointer.currentX) * 0.075;
        pointer.currentY += (pointer.targetY - pointer.currentY) * 0.075;
        setPointerVars(pointer.currentX, pointer.currentY);

        const pointerWorldX = (pointer.currentX - 0.5) * camera.aspect * 9;
        const pointerWorldY = (0.5 - pointer.currentY) * 6.8;
        const pointerCameraX = (pointer.currentX - getDefaultPointerX(currentFocus)) * 0.52;
        const pointerCameraY = (0.5 - pointer.currentY) * 0.24;

        camera.position.x =
          focusBias + pointerCameraX + Math.sin(time * 1.1) * currentConfig.cameraDrift;
        camera.position.y = pointerCameraY + Math.cos(time * 0.7) * currentConfig.cameraLift;
        camera.lookAt(lookAtBias + pointerCameraX * 0.3, pointerCameraY * 0.2, 0);

        particleMaterial.uniforms.time.value = time;
        particleMaterial.uniforms.pointer.value.set(pointerWorldX, pointerWorldY, 0);

        for (const bar of bars) {
          bar.mesh.position.z += bar.speed * (compactNow ? 0.012 : 0.016);

          if (bar.mesh.position.z > currentConfig.resetZ) {
            bar.mesh.position.z = currentConfig.farZ - Math.random() * 6;
            bar.mesh.position.y = (Math.random() - 0.5) * currentConfig.ySpread;
          }

          const driftPhase = time * bar.driftRate + bar.phase;
          const pulse = 0.92 + Math.sin(time * bar.pulseRate + bar.phase) * 0.08;
          const driftedX =
            bar.baseX + Math.sin(driftPhase) * currentConfig.xDrift * bar.side;
          const driftedY =
            bar.baseY + Math.cos(driftPhase * 1.2) * currentConfig.yDrift;
          const dx = pointerWorldX - bar.baseX;
          const dy = pointerWorldY - bar.baseY;
          const distance = Math.hypot(dx, dy * 1.12);
          const influence = clamp(1 - distance / currentConfig.pointerRadius, 0, 1);
          const eased = influence * influence * (3 - 2 * influence);
          const pull = currentConfig.pointerPull * eased;
          const swirl = Math.sin(time * 0.8 + bar.phase) * 0.06 * eased * -bar.side;
          const targetX = driftedX + dx * pull + swirl;
          const targetY = driftedY + dy * pull * 0.32;

          bar.mesh.position.x += (targetX - bar.mesh.position.x) * 0.08;
          bar.mesh.position.y += (targetY - bar.mesh.position.y) * 0.08;
          bar.mesh.scale.x = bar.baseScaleX * (pulse + eased * 0.08);
          bar.mesh.scale.y =
            bar.baseScaleY * (0.96 + Math.cos(driftPhase * 0.8) * 0.04 + eased * 0.06);
        }

        renderer.render(scene, camera);
      };

      const dispose = () => {
        resizeObserver?.disconnect();

        for (const bar of bars) {
          field.remove(bar.mesh);
        }

        scene.remove(particles);
        scene.remove(field);

        for (const material of sharedMaterials) {
          material.dispose();
        }

        particleMaterial.dispose();
        particleGeometry.dispose();
        planeGeometry.dispose();
        texture.dispose();
        renderer.dispose();
      };

      return {
        animate: animateScene,
        renderStatic,
        dispose
      };
    };

    const bootScene = async () => {
      const currentToken = ++bootToken;

      disposeScene();
      setPointerVars(pointer.currentX, pointer.currentY);

      try {
        const nextScene = await createScene();

        if (!nextScene) return;
        if (destroyed || currentToken !== bootToken) {
          nextScene.dispose();
          return;
        }

        sceneHandle = nextScene;
        ready = true;

        if (reducedMotionQuery.matches) {
          sceneHandle.renderStatic();
          return;
        }

        startAnimation();
      } catch {
        ready = false;
        engineLabel = '';
      }
    };

    const handleVisibility = () => {
      visible = document.visibilityState === 'visible';

      if (!visible) {
        stopAnimation();
        return;
      }

      if (reducedMotionQuery.matches) {
        sceneHandle?.renderStatic();
        return;
      }

      startAnimation();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    cleanupVisibility = () => document.removeEventListener('visibilitychange', handleVisibility);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          inViewport = entries.some((entry) => entry.isIntersecting);

          if (!inViewport) {
            stopAnimation();
            return;
          }

          if (reducedMotionQuery.matches) {
            sceneHandle?.renderStatic();
            return;
          }

          startAnimation();
        },
        {
          threshold: 0.05,
          rootMargin: '15% 0px 15% 0px'
        }
      );

      intersectionObserver.observe(rootEl);
    }

    const handleReducedMotion = () => {
      if (reducedMotionQuery.matches) {
        stopAnimation();
      }
      void bootScene();
    };

    const handleCompactChange = () => {
      void bootScene();
    };

    cleanupReducedMotion = bindMediaListener(reducedMotionQuery, handleReducedMotion);
    cleanupCompact = bindMediaListener(compactQuery, handleCompactChange);

    const handlePointerMove = (event: PointerEvent) => {
      if (!rootEl) return;

      const rect = rootEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const withinX = event.clientX >= rect.left && event.clientX <= rect.right;
      const withinY = event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (!withinX || !withinY) {
        resetPointer();
        return;
      }

      pointer.targetX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      pointer.targetY = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    };

    const handleWindowBlur = () => {
      resetPointer();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('blur', handleWindowBlur);
    cleanupPointer = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('blur', handleWindowBlur);
    };

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      disposeScene();
    };

    const handleContextRestored = () => {
      void bootScene();
    };

    canvasEl.addEventListener('webglcontextlost', handleContextLost as EventListener, false);
    canvasEl.addEventListener(
      'webglcontextrestored',
      handleContextRestored as EventListener,
      false
    );
    cleanupContext = () => {
      canvasEl?.removeEventListener('webglcontextlost', handleContextLost as EventListener, false);
      canvasEl?.removeEventListener(
        'webglcontextrestored',
        handleContextRestored as EventListener,
        false
      );
    };

    setPointerVars(pointer.currentX, pointer.currentY);
    void bootScene();

    return () => {
      destroyed = true;
      cleanupVisibility();
      cleanupReducedMotion();
      cleanupCompact();
      cleanupPointer();
      cleanupContext();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      disposeScene();
    };
  });
</script>

<div bind:this={rootEl} class={classes} data-ready={ready} aria-hidden="true">
  <div class="hero-signal-field__fallback"></div>
  <div class="hero-signal-field__guides"></div>

  <div class="hero-signal-field__anchors">
    {#each anchors as anchor}
      <div
        class="hero-signal-field__anchor"
        class:hero-signal-field__anchor--emphasis={anchor.emphasis}
        style={`top:${anchor.top}%;left:${anchor.left}%`}
      >
        <span class="hero-signal-field__anchor-dot"></span>
        <span class="hero-signal-field__anchor-label">{anchor.label}</span>
      </div>
    {/each}
  </div>

  <canvas bind:this={canvasEl} class="hero-signal-field__canvas" data-engine={engineLabel}></canvas>
</div>

<style>
  .hero-signal-field {
    --hero-field-accent: rgba(37, 86, 255, 0.24);
    --hero-field-accent-soft: rgba(70, 154, 255, 0.16);
    --hero-field-edge: rgba(103, 214, 255, 0.18);
    --hero-field-canvas-opacity: 0.94;
    --hero-field-guides-opacity: 0.56;
    --hero-field-pointer-x: 78%;
    --hero-field-pointer-y: 50%;
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
    mask-image: linear-gradient(180deg, transparent 0%, black 10%, black 90%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0%,
      black 10%,
      black 90%,
      transparent 100%
    );
    mask-repeat: no-repeat;
    -webkit-mask-repeat: no-repeat;
    mask-size: 100% 100%;
    -webkit-mask-size: 100% 100%;
  }

  .hero-signal-field__fallback,
  .hero-signal-field__guides,
  .hero-signal-field__anchors,
  .hero-signal-field__canvas {
    position: absolute;
    inset: 0;
  }

  .hero-signal-field__fallback {
    background:
      radial-gradient(
        circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
        rgba(120, 216, 255, 0.16) 0%,
        rgba(120, 216, 255, 0.06) 16%,
        transparent 36%
      ),
      linear-gradient(
        90deg,
        rgba(5, 5, 6, 0.99) 0%,
        rgba(5, 5, 6, 0.97) 34%,
        rgba(5, 5, 6, 0.74) 54%,
        rgba(5, 5, 6, 0.26) 74%,
        rgba(5, 5, 6, 0.58) 100%
      ),
      linear-gradient(
        90deg,
        transparent 0%,
        transparent 54%,
        var(--hero-field-accent-soft) 76%,
        rgba(5, 5, 6, 0) 100%
      );
    opacity: 0.84;
  }

  .hero-signal-field__guides {
    opacity: var(--hero-field-guides-opacity);
    background:
      radial-gradient(
        circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
        rgba(130, 222, 255, 0.14) 0%,
        rgba(130, 222, 255, 0.08) 10%,
        rgba(255, 255, 255, 0) 30%
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0) 52%,
        var(--hero-field-accent-soft) 74%,
        rgba(255, 255, 255, 0) 100%
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0 36px,
        rgba(94, 142, 255, 0.08) 36px 37px,
        rgba(255, 255, 255, 0) 37px 72px
      ),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0) 0 78px,
        rgba(129, 221, 255, 0.04) 78px 79px,
        rgba(255, 255, 255, 0) 79px 156px
      );
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 44%,
      rgba(0, 0, 0, 0.68) 58%,
      black 72%,
      black 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 44%,
      rgba(0, 0, 0, 0.68) 58%,
      black 72%,
      black 100%
    );
    mix-blend-mode: screen;
  }

  .hero-signal-field__guides::before,
  .hero-signal-field__guides::after {
    content: '';
    position: absolute;
    pointer-events: none;
  }

  .hero-signal-field__guides::before {
    inset: 16% 8% 14% 48%;
    border-left: 1px solid rgba(120, 216, 255, 0.08);
    border-right: 1px solid rgba(120, 216, 255, 0.12);
    mask-image: linear-gradient(180deg, transparent 0%, black 18%, black 84%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0%,
      black 18%,
      black 84%,
      transparent 100%
    );
  }

  .hero-signal-field__guides::after {
    top: 16%;
    bottom: 14%;
    right: 16%;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(120, 216, 255, 0),
      rgba(120, 216, 255, 0.9),
      rgba(120, 216, 255, 0)
    );
    box-shadow: 0 0 18px rgba(120, 216, 255, 0.24);
    animation: hero-telemetry-sweep 8.4s ease-in-out infinite;
  }

  .hero-signal-field__anchors {
    opacity: 0.58;
  }

  .hero-signal-field__anchor {
    position: absolute;
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    transform: translate(-50%, -50%);
    opacity: 0.72;
  }

  .hero-signal-field__anchor-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 999px;
    background: rgba(134, 232, 255, 0.92);
    box-shadow:
      0 0 0 4px rgba(73, 161, 255, 0.08),
      0 0 16px rgba(120, 216, 255, 0.36);
  }

  .hero-signal-field__anchor-label {
    padding: 0.26rem 0.46rem;
    border: 1px solid rgba(120, 216, 255, 0.16);
    border-radius: 999px;
    background: rgba(5, 7, 12, 0.58);
    color: rgba(197, 233, 255, 0.66);
    font-family: var(--font-performance-mono, 'IBM Plex Mono', monospace);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    white-space: nowrap;
    backdrop-filter: blur(10px);
  }

  .hero-signal-field__anchor:not(.hero-signal-field__anchor--emphasis)
    .hero-signal-field__anchor-label {
    border-color: rgba(120, 216, 255, 0.12);
    color: rgba(197, 233, 255, 0.52);
  }

  .hero-signal-field__anchor--emphasis .hero-signal-field__anchor-dot {
    box-shadow:
      0 0 0 6px rgba(73, 161, 255, 0.12),
      0 0 24px rgba(120, 216, 255, 0.48);
  }

  .hero-signal-field__anchor--emphasis .hero-signal-field__anchor-label {
    color: rgba(232, 246, 255, 0.96);
    border-color: rgba(120, 216, 255, 0.28);
  }

  .hero-signal-field__canvas {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 260ms ease;
  }

  .hero-signal-field[data-ready='true'] .hero-signal-field__canvas {
    opacity: var(--hero-field-canvas-opacity);
  }

  .hero-signal-field--agency {
    --hero-field-accent: rgba(37, 86, 255, 0.26);
    --hero-field-accent-soft: rgba(70, 154, 255, 0.18);
    --hero-field-edge: rgba(118, 223, 255, 0.2);
    --hero-field-canvas-opacity: 0.78;
    --hero-field-guides-opacity: 0.7;
  }

  .hero-signal-field--io {
    --hero-field-accent: rgba(83, 110, 255, 0.18);
    --hero-field-accent-soft: rgba(175, 190, 255, 0.14);
    --hero-field-edge: rgba(242, 246, 255, 0.12);
  }

  .hero-signal-field--space {
    --hero-field-accent: rgba(37, 86, 255, 0.22);
    --hero-field-accent-soft: rgba(70, 216, 255, 0.18);
    --hero-field-edge: rgba(121, 241, 255, 0.2);
  }

  .hero-signal-field--agency .hero-signal-field__fallback {
    background:
      linear-gradient(
        180deg,
        rgba(5, 5, 6, 0.99) 0%,
        rgba(5, 5, 6, 0.92) 18%,
        rgba(5, 5, 6, 0.68) 48%,
        rgba(5, 5, 6, 0.88) 100%
      ),
      radial-gradient(
        circle at 77% 54%,
        rgba(37, 69, 255, 0.18) 0%,
        rgba(37, 69, 255, 0.08) 16%,
        transparent 42%
      ),
      radial-gradient(
        circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
        rgba(120, 216, 255, 0.16) 0%,
        rgba(120, 216, 255, 0.06) 14%,
        transparent 34%
      ),
      linear-gradient(
        90deg,
        rgba(5, 5, 6, 0.995) 0%,
        rgba(5, 5, 6, 0.97) 36%,
        rgba(5, 5, 6, 0.8) 52%,
        rgba(5, 5, 6, 0.24) 72%,
        rgba(5, 5, 6, 0.42) 100%
      ),
      linear-gradient(
        90deg,
        transparent 0%,
        transparent 58%,
        rgba(70, 154, 255, 0.14) 76%,
        rgba(5, 5, 6, 0) 100%
      );
    opacity: 0.78;
  }

  .hero-signal-field--agency .hero-signal-field__guides {
    background:
      radial-gradient(
        circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
        rgba(120, 216, 255, 0.15) 0%,
        rgba(120, 216, 255, 0.08) 10%,
        rgba(255, 255, 255, 0) 30%
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0) 50%,
        rgba(70, 154, 255, 0.1) 70%,
        rgba(255, 255, 255, 0) 100%
      ),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0) 0 26px,
        rgba(120, 216, 255, 0.1) 26px 27px,
        rgba(255, 255, 255, 0) 27px 54px
      ),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0) 0 104px,
        rgba(120, 216, 255, 0.05) 104px 106px,
        rgba(255, 255, 255, 0) 106px 208px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0 44px,
        rgba(94, 142, 255, 0.035) 44px 45px,
        rgba(255, 255, 255, 0) 45px 88px
      );
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 40%,
      rgba(0, 0, 0, 0.62) 54%,
      black 68%,
      rgba(0, 0, 0, 0.94) 88%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 40%,
      rgba(0, 0, 0, 0.62) 54%,
      black 68%,
      rgba(0, 0, 0, 0.94) 88%,
      transparent 100%
    );
  }

  .hero-signal-field--agency .hero-signal-field__guides::before {
    inset: 18% 8% 18% 52%;
    border: 0;
    background:
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(120, 216, 255, 0.05) 20%,
        rgba(255, 255, 255, 0) 54%
      ),
      repeating-linear-gradient(
        180deg,
        rgba(255, 255, 255, 0) 0 34px,
        rgba(120, 216, 255, 0.08) 34px 35px,
        rgba(255, 255, 255, 0) 35px 68px
      );
    mask-image: linear-gradient(180deg, transparent 0%, black 14%, black 86%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0%,
      black 14%,
      black 86%,
      transparent 100%
    );
  }

  .hero-signal-field--agency .hero-signal-field__guides::after {
    top: 38%;
    bottom: auto;
    left: 56%;
    right: 10%;
    width: auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(120, 216, 255, 0),
      rgba(120, 216, 255, 0.92),
      rgba(120, 216, 255, 0.18),
      rgba(120, 216, 255, 0)
    );
    box-shadow: 0 0 18px rgba(120, 216, 255, 0.2);
    animation: hero-telemetry-sweep-y 8.8s ease-in-out infinite;
  }

  .hero-signal-field--focus-balanced .hero-signal-field__guides {
    mask-image: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 0, 0, 0.46) 20%,
      black 40%,
      black 72%,
      rgba(0, 0, 0, 0.82) 88%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      transparent 0%,
      rgba(0, 0, 0, 0.46) 20%,
      black 40%,
      black 72%,
      rgba(0, 0, 0, 0.82) 88%,
      transparent 100%
    );
  }

  .hero-signal-field--focus-left .hero-signal-field__guides {
    mask-image: linear-gradient(
      90deg,
      black 0%,
      black 30%,
      rgba(0, 0, 0, 0.8) 44%,
      rgba(0, 0, 0, 0.26) 64%,
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      black 0%,
      black 30%,
      rgba(0, 0, 0, 0.8) 44%,
      rgba(0, 0, 0, 0.26) 64%,
      transparent 100%
    );
  }

  @media (max-width: 1100px) {
    .hero-signal-field__anchors {
      opacity: 0.44;
    }

    .hero-signal-field__anchor:not(.hero-signal-field__anchor--emphasis)
      .hero-signal-field__anchor-label {
      display: none;
    }
  }

  @keyframes hero-telemetry-sweep {
    0%,
    100% {
      transform: translateX(0);
      opacity: 0.18;
    }

    50% {
      transform: translateX(-6rem);
      opacity: 0.56;
    }
  }

  @keyframes hero-telemetry-sweep-y {
    0%,
    100% {
      transform: translateY(-1.5rem);
      opacity: 0.16;
    }

    50% {
      transform: translateY(6rem);
      opacity: 0.54;
    }
  }

  @media (max-width: 768px) {
    .hero-signal-field__fallback {
      background:
        linear-gradient(
          90deg,
          rgba(5, 5, 6, 0.995) 0%,
          rgba(5, 5, 6, 0.98) 44%,
          rgba(5, 5, 6, 0.86) 64%,
          rgba(5, 5, 6, 0.46) 82%,
          rgba(5, 5, 6, 0.6) 100%
        ),
        linear-gradient(
          90deg,
          transparent 0%,
          transparent 58%,
          var(--hero-field-accent-soft) 82%,
          rgba(5, 5, 6, 0) 100%
        );
      opacity: 0.78;
    }

    .hero-signal-field__guides {
      opacity: 0.42;
      background:
        radial-gradient(
          circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
          rgba(120, 216, 255, 0.12) 0%,
          rgba(120, 216, 255, 0.06) 10%,
          rgba(255, 255, 255, 0) 26%
        ),
        linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0) 58%,
          var(--hero-field-accent-soft) 84%,
          rgba(255, 255, 255, 0) 100%
        ),
        repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0 24px,
          rgba(94, 142, 255, 0.06) 24px 25px,
          rgba(255, 255, 255, 0) 25px 48px
        );
      mask-image: linear-gradient(
        90deg,
        transparent 0%,
        transparent 54%,
        rgba(0, 0, 0, 0.6) 68%,
        black 86%,
        black 100%
      );
      -webkit-mask-image: linear-gradient(
        90deg,
        transparent 0%,
        transparent 54%,
        rgba(0, 0, 0, 0.6) 68%,
        black 86%,
        black 100%
      );
    }

    .hero-signal-field__guides::before {
      inset: 18% 6% 14% 60%;
    }

    .hero-signal-field__guides::after {
      right: 11%;
    }

    .hero-signal-field__anchors {
      display: none;
    }

    .hero-signal-field__anchor-label {
      font-size: 0.56rem;
      letter-spacing: 0.1em;
    }

    .hero-signal-field--agency {
      --hero-field-canvas-opacity: 0.72;
      --hero-field-guides-opacity: 0.66;
    }

    .hero-signal-field--agency .hero-signal-field__fallback {
      background:
        linear-gradient(
          180deg,
          rgba(5, 5, 6, 0.995) 0%,
          rgba(5, 5, 6, 0.94) 20%,
          rgba(5, 5, 6, 0.76) 52%,
          rgba(5, 5, 6, 0.92) 100%
        ),
        radial-gradient(
          circle at 80% 54%,
          rgba(37, 69, 255, 0.14) 0%,
          rgba(37, 69, 255, 0.06) 18%,
          transparent 38%
        ),
        radial-gradient(
          circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
          rgba(120, 216, 255, 0.12) 0%,
          rgba(120, 216, 255, 0.05) 12%,
          transparent 28%
        ),
        linear-gradient(
          90deg,
          rgba(5, 5, 6, 0.995) 0%,
          rgba(5, 5, 6, 0.975) 46%,
          rgba(5, 5, 6, 0.82) 64%,
          rgba(5, 5, 6, 0.32) 82%,
          rgba(5, 5, 6, 0.5) 100%
        ),
        linear-gradient(
          90deg,
          transparent 0%,
          transparent 64%,
          rgba(70, 154, 255, 0.1) 82%,
          rgba(5, 5, 6, 0) 100%
        );
      opacity: 0.74;
    }

    .hero-signal-field--agency .hero-signal-field__guides {
      background:
        radial-gradient(
          circle at var(--hero-field-pointer-x) var(--hero-field-pointer-y),
          rgba(120, 216, 255, 0.11) 0%,
          rgba(120, 216, 255, 0.05) 10%,
          rgba(255, 255, 255, 0) 22%
        ),
        linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0) 56%,
          rgba(70, 154, 255, 0.08) 82%,
          rgba(255, 255, 255, 0) 100%
        ),
        repeating-linear-gradient(
          180deg,
          rgba(255, 255, 255, 0) 0 22px,
          rgba(120, 216, 255, 0.08) 22px 23px,
          rgba(255, 255, 255, 0) 23px 46px
        ),
        repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0 32px,
          rgba(94, 142, 255, 0.025) 32px 33px,
          rgba(255, 255, 255, 0) 33px 64px
        );
      mask-image: linear-gradient(
        90deg,
        transparent 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.6) 66%,
        black 86%,
        transparent 100%
      );
      -webkit-mask-image: linear-gradient(
        90deg,
        transparent 0%,
        transparent 50%,
        rgba(0, 0, 0, 0.6) 66%,
        black 86%,
        transparent 100%
      );
    }

    .hero-signal-field--agency .hero-signal-field__guides::before {
      inset: 20% 6% 18% 62%;
    }

    .hero-signal-field--agency .hero-signal-field__guides::after {
      left: 64%;
      right: 8%;
      top: 42%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-signal-field__canvas {
      transition: none;
      opacity: 0.7;
    }

    .hero-signal-field__guides::after {
      animation: none;
      transform: translateX(-1rem);
      opacity: 0.32;
    }

    .hero-signal-field--agency .hero-signal-field__guides::after {
      transform: translateY(3rem);
    }
  }
</style>

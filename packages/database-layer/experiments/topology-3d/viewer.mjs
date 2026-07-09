const startedAt = performance.now();
const canvas = document.querySelector('#scene');
const lensFilter = document.querySelector('#lensFilter');
const clusterFilter = document.querySelector('#clusterFilter');
const statusFilter = document.querySelector('#statusFilter');
const tierFilter = document.querySelector('#tierFilter');
const edgeFilter = document.querySelector('#edgeFilter');
const searchFilter = document.querySelector('#searchFilter');
const resetView = document.querySelector('#resetView');

const inspector = {
  nodeCount: document.querySelector('#nodeCount'),
  edgeCount: document.querySelector('#edgeCount'),
  loadMs: document.querySelector('#loadMs'),
  title: document.querySelector('#nodeTitle'),
  cluster: document.querySelector('#nodeCluster'),
  status: document.querySelector('#nodeStatus'),
  tier: document.querySelector('#nodeTier'),
  surface: document.querySelector('#nodeSurface'),
  path: document.querySelector('#nodePath'),
  substrate: document.querySelector('#nodeSubstrate'),
  apiPath: document.querySelector('#nodeApiPath'),
  receipt: document.querySelector('#nodeReceipt'),
  meaning: document.querySelector('#nodeMeaning'),
  clientOverlayButton: document.querySelector('#clientOverlayButton'),
  clientOverlayPanel: document.querySelector('#clientOverlayPanel'),
  clientOverlayTitle: document.querySelector('#clientOverlayTitle'),
  clientOverlayPackageCount: document.querySelector('#clientOverlayPackageCount'),
  clientOverlayReceiptCount: document.querySelector('#clientOverlayReceiptCount'),
  clientOverlayActionCount: document.querySelector('#clientOverlayActionCount'),
  clientOverlayCanvas: document.querySelector('#clientOverlayCanvas'),
  clientOverlayApi: document.querySelector('#clientOverlayApi'),
  clientOverlayMcp: document.querySelector('#clientOverlayMcp'),
  clientOverlayPackages: document.querySelector('#clientOverlayPackages')
};

async function loadThree() {
  const candidates = [
    '../../../../node_modules/.pnpm/three@0.170.0/node_modules/three/build/three.module.min.js',
    '../../../canon/node_modules/three/build/three.module.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js'
  ];

  for (const candidate of candidates) {
    try {
      return await import(candidate);
    } catch {
      // Try the next local path before falling back to the CDN.
    }
  }

  throw new Error('Unable to load Three.js');
}

function hexToRgbUnit(hex) {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16) / 255,
    Number.parseInt(value.slice(2, 4), 16) / 255,
    Number.parseInt(value.slice(4, 6), 16) / 255
  ];
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function text(value) {
  return value === undefined || value === null || value === '' ? 'none' : String(value);
}

function currentLens(artifact) {
  return artifact.lenses?.[lensFilter.value] ?? artifact.lenses?.operational;
}

function lensNodeView(artifact, nodeIndex) {
  const nodeView = currentLens(artifact)?.nodes?.[nodeIndex];
  if (nodeView) return nodeView;

  const node = artifact.nodes[nodeIndex];
  return {
    groupId: node.clusterId,
    x: node.x,
    y: node.y,
    z: node.z,
    color: node.color
  };
}

function buildFilters(artifact) {
  const lens = currentLens(artifact);
  clusterFilter.replaceChildren(
    new Option(lens?.groupLabel ? `All ${lens.groupLabel.toLowerCase()}s` : 'All groups', ''),
    ...(lens?.groups ?? []).map((group) => new Option(`${group.label} (${group.count})`, group.id))
  );
}

function visibleNodeIndexes(artifact) {
  const group = clusterFilter.value;
  const status = statusFilter.value;
  const tier = tierFilter.value;
  const query = searchFilter.value.trim().toLowerCase();
  const indexes = [];

  for (let index = 0; index < artifact.nodes.length; index += 1) {
    const node = artifact.nodes[index];
    const nodeView = lensNodeView(artifact, index);
    if (group && nodeView.groupId !== group) continue;
    if (status && node.status !== status) continue;
    if (tier && node.tier !== tier) continue;
    if (query && !`${node.label} ${node.path} ${node.surface} ${node.owner}`.toLowerCase().includes(query)) {
      continue;
    }
    indexes.push(index);
  }

  return indexes;
}

function visibleEdge(edge, visibleSet) {
  if (!visibleSet.has(edge.source) || !visibleSet.has(edge.target)) return false;
  if (edgeFilter.value === 'all') return true;
  if (edgeFilter.value === 'contains') return edge.relation === 'contains';
  if (edgeFilter.value === 'structural') return edge.relation !== 'contains';

  const source = window.__topology3dArtifact.nodes[edge.source];
  const targetNode = window.__topology3dArtifact.nodes[edge.target];
  return edge.relation !== 'contains' && source?.path !== '.' && targetNode?.path !== '.';
}

function createScene(THREE, artifact) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x05070b, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070b, 0.00108);

  const camera = new THREE.PerspectiveCamera(58, 1, 1, 5000);
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points.threshold = 22;

  const pointer = new THREE.Vector2(10, 10);
  const nodeGroup = new THREE.Group();
  const edgeGroup = new THREE.Group();
  const clusterGroup = new THREE.Group();
  scene.add(edgeGroup, clusterGroup, nodeGroup);

  let activeNodes = [];
  let activeNodeIndexes = [];
  let activeVisibleEdges = [];
  let pointCloud;
  let lineSegments;
  let clusterMesh;
  let selectedNode = artifact.nodes[0];
  let hoveredVisibleIndex = -1;
  let yaw = -0.45;
  let pitch = 0.42;
  let distance = 980;
  let target = new THREE.Vector3(0, 0, 40);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let clientOverlayCoveragePromise;

  const pointMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float pointSize;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = pointSize * (420.0 / max(120.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float d = dot(p, p);
        if (d > 0.25) discard;
        float rim = smoothstep(0.25, 0.12, d);
        gl_FragColor = vec4(vColor * (0.72 + rim * 0.42), 0.96);
      }
    `,
    vertexColors: true
  });

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });

  const clusterMaterial = new THREE.PointsMaterial({
    size: 18,
    transparent: true,
    opacity: 0.34,
    vertexColors: true,
    depthWrite: false
  });

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function updateCamera() {
    const x = Math.cos(pitch) * Math.sin(yaw) * distance;
    const y = Math.sin(pitch) * distance;
    const z = Math.cos(pitch) * Math.cos(yaw) * distance;
    camera.position.set(target.x + x, target.y + y, target.z + z);
    camera.lookAt(target);
  }

  function rebuildGeometry() {
    const visible = visibleNodeIndexes(artifact);
    const visibleSet = new Set(visible);
    activeNodeIndexes = visible;
    activeNodes = visible.map((nodeIndex) => artifact.nodes[nodeIndex]);
    hoveredVisibleIndex = -1;

    const positions = new Float32Array(activeNodes.length * 3);
    const colors = new Float32Array(activeNodes.length * 3);
    const sizes = new Float32Array(activeNodes.length);

    for (let index = 0; index < activeNodes.length; index += 1) {
      const node = activeNodes[index];
      const sourceIndex = visible[index];
      const nodeView = lensNodeView(artifact, sourceIndex);
      const rgb = hexToRgbUnit(nodeView.color);
      positions.set([nodeView.x, nodeView.y, nodeView.z], index * 3);
      colors.set(rgb, index * 3);
      sizes[index] = node.status === 'needs_substrate' ? node.size + 4 : node.size;
    }

    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pointGeometry.setAttribute('pointSize', new THREE.BufferAttribute(sizes, 1));

    activeVisibleEdges = artifact.edges.filter((edge) => visibleEdge(edge, visibleSet));
    const edgePositions = new Float32Array(activeVisibleEdges.length * 6);
    const edgeColors = new Float32Array(activeVisibleEdges.length * 6);

    for (let index = 0; index < activeVisibleEdges.length; index += 1) {
      const edge = activeVisibleEdges[index];
      const source = artifact.nodes[edge.source];
      const targetNode = artifact.nodes[edge.target];
      const sourceView = lensNodeView(artifact, edge.source);
      const targetView = lensNodeView(artifact, edge.target);
      const rgb = hexToRgbUnit(edge.color);
      edgePositions.set([sourceView.x, sourceView.y, sourceView.z, targetView.x, targetView.y, targetView.z], index * 6);
      edgeColors.set([...rgb, ...rgb], index * 6);
    }

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('color', new THREE.BufferAttribute(edgeColors, 3));

    const visibleClusterIds = new Set(visible.map((nodeIndex) => lensNodeView(artifact, nodeIndex).groupId));
    const lens = currentLens(artifact);
    const visibleClusters = (lens?.groups ?? []).filter((cluster) => visibleClusterIds.has(cluster.id));
    const clusterPositions = new Float32Array(visibleClusters.length * 3);
    const clusterColors = new Float32Array(visibleClusters.length * 3);

    for (let index = 0; index < visibleClusters.length; index += 1) {
      const cluster = visibleClusters[index];
      const hasLensLayout = Boolean(currentLens(artifact)?.nodes);
      const x = hasLensLayout ? cluster.x * 0.25 : cluster.x * 0.18;
      const y = hasLensLayout ? cluster.y * 0.28 : cluster.y * 0.32;
      clusterPositions.set([x, y, cluster.z], index * 3);
      clusterColors.set(hexToRgbUnit(cluster.color), index * 3);
    }

    const clusterGeometry = new THREE.BufferGeometry();
    clusterGeometry.setAttribute('position', new THREE.BufferAttribute(clusterPositions, 3));
    clusterGeometry.setAttribute('color', new THREE.BufferAttribute(clusterColors, 3));

    if (pointCloud) {
      pointCloud.geometry.dispose();
      nodeGroup.remove(pointCloud);
    }
    if (lineSegments) {
      lineSegments.geometry.dispose();
      edgeGroup.remove(lineSegments);
    }
    if (clusterMesh) {
      clusterMesh.geometry.dispose();
      clusterGroup.remove(clusterMesh);
    }

    pointCloud = new THREE.Points(pointGeometry, pointMaterial);
    lineSegments = new THREE.LineSegments(edgeGeometry, lineMaterial);
    clusterMesh = new THREE.Points(clusterGeometry, clusterMaterial);
    nodeGroup.add(pointCloud);
    edgeGroup.add(lineSegments);
    clusterGroup.add(clusterMesh);

    inspector.nodeCount.textContent = `${activeNodes.length} nodes`;
    inspector.edgeCount.textContent = `${activeVisibleEdges.length} edges`;
  }

  function selectNode(node) {
    selectedNode = node;
    const nodeIndex = artifact.nodes.findIndex((candidate) => candidate.id === node.id);
    const nodeView = lensNodeView(artifact, nodeIndex);
    const lens = currentLens(artifact);
    const cluster = (lens?.groups ?? []).find((candidate) => candidate.id === nodeView.groupId);
    inspector.title.textContent = node.label;
    inspector.cluster.textContent = cluster?.label ?? node.clusterId;
    inspector.status.textContent = node.status;
    inspector.tier.textContent = node.tier;
    inspector.surface.textContent = node.surface;
    inspector.path.textContent = node.path;
    inspector.substrate.textContent = node.substrate?.mcpUri ?? node.id;
    inspector.apiPath.textContent = node.substrate?.apiPath ?? '';
    inspector.receipt.textContent = node.substrate?.receiptId ?? '';
    inspector.meaning.textContent = cluster?.meaning ?? lens?.meaning ?? 'Topology projection';

    inspector.clientOverlayButton.hidden = !node.clientOverlay;
    if (node.clientOverlay) {
      inspector.clientOverlayButton.textContent = `Open ${node.clientOverlay.clientSlug}`;
    } else {
      hideClientOverlayPanel();
    }
  }

  function nodePacket(nodeIndex) {
    const node = artifact.nodes[nodeIndex];
    if (!node) return null;
    const nodeView = lensNodeView(artifact, nodeIndex);
    const lens = currentLens(artifact);
    const group = (lens?.groups ?? []).find((candidate) => candidate.id === nodeView.groupId);
    return {
      ...node,
      lensView: nodeView,
      group: group
        ? {
            id: group.id,
            label: group.label,
            meaning: group.meaning
          }
        : null
    };
  }

  function getViewState() {
    return {
      lensId: lensFilter.value,
      groupId: clusterFilter.value || null,
      status: statusFilter.value,
      tier: tierFilter.value,
      edgeMode: edgeFilter.value,
      search: searchFilter.value,
      selectedNodeId: selectedNode?.id ?? null
    };
  }

  function setSelectValue(control, value) {
    if (value === undefined) return;
    const normalized = value ?? '';
    if ([...control.options].some((option) => option.value === normalized)) {
      control.value = normalized;
    }
  }

  function selectNodeById(nodeId) {
    const node = artifact.nodes.find((candidate) => candidate.id === nodeId);
    if (!node) return null;
    selectNode(node);
    return node;
  }

  function setViewState(nextState = {}) {
    const previousLens = lensFilter.value;
    setSelectValue(lensFilter, nextState.lensId);

    if (lensFilter.value !== previousLens) {
      buildFilters(artifact);
    }

    setSelectValue(clusterFilter, nextState.groupId);
    setSelectValue(statusFilter, nextState.status);
    setSelectValue(tierFilter, nextState.tier);
    setSelectValue(edgeFilter, nextState.edgeMode);

    if (nextState.search !== undefined) {
      searchFilter.value = nextState.search ?? '';
    }

    rebuildGeometry();

    const selected = nextState.selectedNodeId ? selectNodeById(nextState.selectedNodeId) : activeNodes[0];
    if (selected) selectNode(selected);

    return contextSnapshot();
  }

  function adjacentEdges(nodeIndex) {
    return artifact.edges
      .filter((edge) => edge.source === nodeIndex || edge.target === nodeIndex)
      .map((edge) => ({
        id: edge.id,
        relation: edge.relation,
        source: artifact.nodes[edge.source]?.id,
        target: artifact.nodes[edge.target]?.id,
        evidence: edge.evidence
      }));
  }

  function focusNode(nodeId, lensId) {
    if (lensId) {
      setViewState({ lensId });
    }

    const nodeIndex = artifact.nodes.findIndex((node) => node.id === nodeId);
    if (nodeIndex < 0) return null;
    const node = selectNodeById(nodeId);

    return {
      state: getViewState(),
      node: nodePacket(nodeIndex),
      substrate: artifact.nodes[nodeIndex]?.substrate ?? null,
      lensViews: Object.fromEntries(
        Object.entries(artifact.lenses ?? {}).map(([id, lens]) => [
          id,
          {
            groupId: lens.nodes?.[nodeIndex]?.groupId ?? artifact.nodes[nodeIndex].clusterId,
            groupLabel:
              (lens.groups ?? []).find(
                (group) => group.id === (lens.nodes?.[nodeIndex]?.groupId ?? artifact.nodes[nodeIndex].clusterId)
              )?.label ?? null
          }
        ])
      ),
      adjacentEdges: adjacentEdges(nodeIndex),
      selected: node?.id ?? null
    };
  }

  async function loadClientOverlayCoverage() {
    clientOverlayCoveragePromise ??= fetch('../../data/create-something-client-overlay-coverage.json').then((response) => {
      if (!response.ok) throw new Error(`Client overlay request failed: ${response.status}`);
      return response.json();
    });
    return clientOverlayCoveragePromise;
  }

  function clientOverlaySummary(overlay) {
    const overlaySlug = slug(overlay.clientSlug);
    return {
      clientSlug: overlay.clientSlug,
      slug: overlaySlug,
      recordId: overlay.recordId,
      atlasCanvasId: overlay.atlasCanvasId,
      title: overlay.title,
      owner: overlay.owner,
      status: overlay.status,
      packageCount: overlay.packages.length,
      apiPath: `/api/substrate/client-overlays/${overlaySlug}`,
      mcpUri: `substrate://client-overlays/${overlaySlug}`,
      agentCommand: 'databaseLayer.clientOverlays.get',
      topology3dResourceUri: `topology3d://create-something/internal/client-overlay/${overlaySlug}`
    };
  }

  function findClientOverlay(overlays, key) {
    const normalized = slug(key);
    return overlays.find((overlay) => {
      if (overlay.clientSlug === key || slug(overlay.clientSlug) === normalized) return true;
      if (overlay.recordId === key || slug(overlay.recordId) === normalized) return true;
      if (overlay.atlasCanvasId === key || slug(overlay.atlasCanvasId) === normalized) return true;
      return overlay.packages.some(
        (pkg) =>
          pkg.recordId === key ||
          slug(pkg.recordId) === normalized ||
          pkg.atlasNodeId === key ||
          slug(pkg.atlasNodeId) === normalized ||
          pkg.path === key ||
          slug(pkg.path) === normalized
      );
    });
  }

  async function clientOverlayContextRead(options = {}) {
    const node = options.nodeId
      ? artifact.nodes.find((candidate) => candidate.id === options.nodeId)
      : selectedNode;
    const key = options.clientSlug ?? node?.clientOverlay?.clientSlug ?? node?.clientSlug;
    if (!key) throw new Error('Client overlay context requires a client slug or selected client node.');

    const coverage = await loadClientOverlayCoverage();
    const overlay = findClientOverlay(coverage.overlays ?? [], key);
    if (!overlay) throw new Error(`Unknown client overlay "${key}".`);

    const overlaySlug = slug(overlay.clientSlug);
    return {
      clientOverlay: overlay,
      selectedNode: node ?? null,
      handoff: {
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        clientSlug: overlay.clientSlug,
        clientOverlayApiPath: `/api/substrate/client-overlays/${overlaySlug}`,
        clientOverlayMcpUri: `substrate://client-overlays/${overlaySlug}`,
        clientOverlayAgentCommand: 'databaseLayer.clientOverlays.get',
        clientOverlayTopology3dResourceUri: `topology3d://create-something/internal/client-overlay/${overlaySlug}`,
        clientOverlayAtlasCanvasId: overlay.atlasCanvasId,
        selectedNodeId: node?.id ?? null,
        selectedPath: node?.path ?? null,
        packageCount: overlay.packages.length,
        receiptCount: overlay.receipts.length,
        nextActionCount: overlay.nextActions.length
      },
      boundary:
        'Read-only client overlay context. Client system writes, Atlas write-back, Cloudflare changes, and production promotion require the owning approval workflow.'
    };
  }

  function hideClientOverlayPanel() {
    inspector.clientOverlayPanel.hidden = true;
    inspector.clientOverlayPackages.replaceChildren();
  }

  function renderClientOverlay(context) {
    const overlay = context.clientOverlay;
    inspector.clientOverlayPanel.hidden = false;
    inspector.clientOverlayTitle.textContent = overlay.title;
    inspector.clientOverlayPackageCount.textContent = `${overlay.packages.length} packages`;
    inspector.clientOverlayReceiptCount.textContent = `${overlay.receipts.length} receipts`;
    inspector.clientOverlayActionCount.textContent = `${overlay.nextActions.length} actions`;
    inspector.clientOverlayCanvas.textContent = overlay.atlasCanvasId;
    inspector.clientOverlayApi.textContent = context.handoff.clientOverlayApiPath;
    inspector.clientOverlayMcp.textContent = context.handoff.clientOverlayMcpUri;
    inspector.clientOverlayPackages.replaceChildren(
      ...overlay.packages.map((pkg) => {
        const item = document.createElement('li');
        const label = document.createElement('strong');
        const pathText = document.createElement('span');
        const meta = document.createElement('span');
        label.textContent = pkg.packageName;
        pathText.textContent = pkg.path;
        meta.textContent = `${text(pkg.runtime)} | ${pkg.commands.length} commands | ${pkg.docs.length} docs | ${pkg.workerConfigs.length} workers`;
        item.append(label, pathText, meta);
        return item;
      })
    );
  }

  async function openClientOverlayForNode(node = selectedNode) {
    if (!node?.clientOverlay) return null;
    inspector.clientOverlayButton.disabled = true;
    try {
      const context = await clientOverlayContextRead({ clientSlug: node.clientOverlay.clientSlug, nodeId: node.id });
      renderClientOverlay(context);
      return context;
    } catch (error) {
      inspector.clientOverlayPanel.hidden = false;
      inspector.clientOverlayTitle.textContent = 'Client overlay unavailable';
      inspector.clientOverlayPackageCount.textContent = '0 packages';
      inspector.clientOverlayReceiptCount.textContent = '0 receipts';
      inspector.clientOverlayActionCount.textContent = '0 actions';
      inspector.clientOverlayCanvas.textContent = 'none';
      inspector.clientOverlayApi.textContent = 'none';
      inspector.clientOverlayMcp.textContent = error instanceof Error ? error.message : String(error);
      inspector.clientOverlayPackages.replaceChildren();
      return null;
    } finally {
      inspector.clientOverlayButton.disabled = false;
    }
  }

  function summarizeLens(lensId = lensFilter.value) {
    const lens = artifact.lenses?.[lensId] ?? currentLens(artifact);
    return {
      lens: {
        id: lens.id,
        label: lens.label,
        groupLabel: lens.groupLabel,
        inferred: Boolean(lens.inferred),
        meaning: lens.meaning
      },
      groups: (lens.groups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        count: group.count,
        meaning: group.meaning,
        surfaceCounts: group.surfaceCounts,
        statusCounts: group.statusCounts
      })),
      counts: {
        nodes: artifact.nodes.length,
        edges: artifact.edges.length,
        groups: lens.groups?.length ?? 0
      }
    };
  }

  function insightsRead(options = {}) {
    const lensId = options.lensId ?? lensFilter.value;
    return {
      observations: artifact.insights?.observations ?? [],
      improvementCandidates: artifact.insights?.improvementCandidates ?? [],
      completedImprovements: artifact.insights?.completedImprovements ?? [],
      relationCounts: artifact.insights?.relationCounts ?? {},
      surfaceCounts: artifact.insights?.surfaceCounts ?? {},
      tierCounts: artifact.insights?.tierCounts ?? {},
      lens: artifact.insights?.lenses?.[lensId] ?? null
    };
  }

  function contextSnapshot(options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : 80;
    const lens = currentLens(artifact);
    const visibleGroupIds = new Set(activeNodeIndexes.map((nodeIndex) => lensNodeView(artifact, nodeIndex).groupId));
    const selectedIndex = artifact.nodes.findIndex((node) => node.id === selectedNode?.id);

    return {
      api: artifact.contextApi,
      state: getViewState(),
      lens: {
        id: lens.id,
        label: lens.label,
        groupLabel: lens.groupLabel,
        inferred: Boolean(lens.inferred),
        meaning: lens.meaning
      },
      insights: insightsRead({ lensId: lens.id }),
      counts: {
        totalNodes: artifact.nodes.length,
        totalEdges: artifact.edges.length,
        visibleNodes: activeNodes.length,
        visibleEdges: activeVisibleEdges.length,
        visibleGroups: visibleGroupIds.size
      },
      groups: (lens.groups ?? [])
        .filter((group) => visibleGroupIds.has(group.id))
        .map((group) => ({
          id: group.id,
          label: group.label,
          count: group.count,
          meaning: group.meaning,
          surfaceCounts: group.surfaceCounts,
          statusCounts: group.statusCounts
        })),
      selectedNode: selectedIndex >= 0 ? nodePacket(selectedIndex) : null,
      nodes: activeNodeIndexes.slice(0, limit).map(nodePacket).filter(Boolean),
      edges: activeVisibleEdges.slice(0, limit).map((edge) => ({
        id: edge.id,
        relation: edge.relation,
        source: artifact.nodes[edge.source]?.id,
        target: artifact.nodes[edge.target]?.id,
        evidence: edge.evidence
      }))
    };
  }

  function selectionExport(options = {}) {
    const snapshot = contextSnapshot(options);
    return {
      state: snapshot.state,
      selectedNode: snapshot.selectedNode,
      visibleNodes: snapshot.nodes,
      visibleEdges: snapshot.edges,
      substrate: snapshot.selectedNode?.substrate ?? null,
      clientOverlay: snapshot.selectedNode?.clientOverlay ?? null,
      handoff: {
        topologyId: artifact.topologyId,
        atlasCanvasId: artifact.atlasCanvasId,
        lensId: snapshot.state.lensId,
        groupId: snapshot.state.groupId,
        substrateRecordId: snapshot.selectedNode?.substrate?.recordId ?? snapshot.state.selectedNodeId,
        substrateApiPath: snapshot.selectedNode?.substrate?.apiPath ?? null,
        substrateMcpUri: snapshot.selectedNode?.substrate?.mcpUri ?? null,
        substrateAgentCommand: snapshot.selectedNode?.substrate?.agentCommand ?? null,
        receiptId: snapshot.selectedNode?.substrate?.receiptId ?? null,
        actionId: snapshot.selectedNode?.substrate?.actionId ?? null,
        operatingSliceId: snapshot.selectedNode?.substrate?.operatingSliceId ?? null,
        readinessApiPath: snapshot.selectedNode?.substrate?.readinessApiPath ?? null,
        clientOverlaySlug: snapshot.selectedNode?.clientOverlay?.clientSlug ?? null,
        clientOverlayApiPath: snapshot.selectedNode?.clientOverlay?.apiPath ?? null,
        clientOverlayMcpUri: snapshot.selectedNode?.clientOverlay?.mcpUri ?? null,
        clientOverlayAgentCommand: snapshot.selectedNode?.clientOverlay?.agentCommand ?? null,
        clientOverlayTopology3dResourceUri: snapshot.selectedNode?.clientOverlay?.topology3dResourceUri ?? null,
        selectedNodeId: snapshot.state.selectedNodeId,
        selectedPath: snapshot.selectedNode?.path ?? null,
        selectedGroup: snapshot.selectedNode?.group?.label ?? null,
        visibleNodeCount: snapshot.counts.visibleNodes,
        visibleEdgeCount: snapshot.counts.visibleEdges,
        meaning: snapshot.selectedNode?.group?.meaning ?? snapshot.lens.meaning
      }
    };
  }

  function pickNode() {
    if (!pointCloud) return null;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(pointCloud, false)[0];
    if (!hit) {
      hoveredVisibleIndex = -1;
      return null;
    }
    hoveredVisibleIndex = hit.index;
    return activeNodes[hit.index] ?? null;
  }

  function resetCamera() {
    yaw = -0.45;
    pitch = 0.42;
    distance = 980;
    target = new THREE.Vector3(0, 0, 40);
    updateCamera();
  }

  function render() {
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  function pointerToNdc(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointerup', (event) => {
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
    pointerToNdc(event);
    const node = pickNode();
    if (node) selectNode(node);
  });

  canvas.addEventListener('pointermove', (event) => {
    pointerToNdc(event);
    if (dragging) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      yaw -= dx * 0.006;
      pitch = Math.max(-1.25, Math.min(1.25, pitch + dy * 0.004));
      lastX = event.clientX;
      lastY = event.clientY;
      return;
    }

    const node = pickNode();
    canvas.style.cursor = node ? 'pointer' : 'grab';
  });

  canvas.addEventListener('dblclick', async () => {
    const node = hoveredVisibleIndex >= 0 ? activeNodes[hoveredVisibleIndex] : selectedNode;
    if (node?.clientOverlay) {
      selectNode(node);
      await openClientOverlayForNode(node);
      return;
    }
    if (!node?.targetPath) return;
    window.open(`/${node.targetPath.replace(/^\.\/?/, '')}`, '_blank', 'noopener');
  });

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      distance = Math.max(220, Math.min(2400, distance + event.deltaY * 0.9));
    },
    { passive: false }
  );

  lensFilter.addEventListener('input', () => {
    buildFilters(artifact);
    rebuildGeometry();
    if (activeNodes.length > 0) selectNode(activeNodes[0]);
  });

  for (const control of [clusterFilter, statusFilter, tierFilter, edgeFilter, searchFilter]) {
    control.addEventListener('input', () => {
      rebuildGeometry();
      if (activeNodes.length > 0) selectNode(activeNodes[0]);
    });
  }

  resetView.addEventListener('click', resetCamera);
  inspector.clientOverlayButton.addEventListener('click', () => {
    void openClientOverlayForNode(selectedNode);
  });
  window.addEventListener('resize', resize);

  resize();
  resetCamera();
  rebuildGeometry();
  selectNode(artifact.nodes[0]);
  render();

  return {
    activeNodeCount: () => activeNodes.length,
    edgeCount: () => artifact.edges.length,
    contextSnapshot,
    focusNode,
    getViewState,
    selectionExport,
    setViewState,
    insightsRead,
    summarizeLens,
    clientOverlayContextRead
  };
}

const [THREE, artifact] = await Promise.all([
  loadThree(),
  fetch('../../data/create-something-internal-topology.3d.json').then((response) => {
    if (!response.ok) throw new Error(`Topology artifact request failed: ${response.status}`);
    return response.json();
  })
]);

buildFilters(artifact);
window.__topology3dArtifact = artifact;
const sceneApi = createScene(THREE, artifact);
const loadMs = Math.round(performance.now() - startedAt);
inspector.loadMs.textContent = `${loadMs} ms`;

window.__topology3dReady = true;
window.__topology3dApi = {
  contextRead: sceneApi.contextSnapshot,
  contextSet: sceneApi.setViewState,
  nodeFocus: sceneApi.focusNode,
  insightsRead: sceneApi.insightsRead,
  lensSummarize: sceneApi.summarizeLens,
  selectionExport: sceneApi.selectionExport,
  clientOverlayContextRead: sceneApi.clientOverlayContextRead,
  stateRead: sceneApi.getViewState
};
window.__topology3dMetrics = {
  loadMs,
  nodes: artifact.nodes.length,
  edges: artifact.edges.length,
  clusters: artifact.clusters.length,
  activeNodes: sceneApi.activeNodeCount()
};

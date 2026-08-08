// @ts-nocheck -- Omma v2 runtime mirror with reviewed draw-group correction.
// The three workflow states, built as three named groups so the composition
// solver can bound them precisely.
//
//   1. sourceStack   — compact, precisely registered
//   2. workingPacket — scored, layered edges, one controlled fold
//   3. heldSheet     — single sheet meeting the near-black decision rail
//   4. goldTab       — exactly at the stop/contact point
//
// Units are metres. Sheet face ~ 210 x 297mm scaled to a compact desk metric.

import { Group, Mesh, BoxGeometry, Vector3 } from 'three';
import { makeRng, rangeOf } from './rng.js';
import { createFoldedSheetGeometry, createPlateGeometry } from './geometry.js';

const SHEET_W = 0.297;
const SHEET_D = 0.21;
const SHEET_T = 0.00042;

// BoxGeometry emits six material groups. Reorder its 36 indices into one edge
// range and one face range so each repeated sheet costs two draws, not six,
// without changing its vertices, UVs, normals, or visible material boundary.
function collapseSheetBoxGroups(geometry) {
  const index = geometry.getIndex();
  if (!index || index.count !== 36) return geometry;

  const source = Array.from(index.array);
  const ordered = [
    ...source.slice(0, 12),
    ...source.slice(24, 36),
    ...source.slice(12, 24)
  ];
  geometry.setIndex(ordered);
  geometry.clearGroups();
  geometry.addGroup(0, 24, 0);
  geometry.addGroup(24, 12, 1);
  return geometry;
}

// Registration jitter is intentionally sub-millimetre: "precisely registered"
// means visible craft, not a perfect CAD block and not a messy pile.
function buildSourceStack(materials, seed) {
  const rng = makeRng(seed);
  const group = new Group();
  group.name = 'paperSourceStack';

  const count = 26;
  const plyT = SHEET_T * 1.9;
  const faceMats = [materials.paperEdge, materials.paperFace];

  const geo = collapseSheetBoxGroups(new BoxGeometry(SHEET_W, plyT, SHEET_D));

  for (let i = 0; i < count; i++) {
    const m = new Mesh(geo, faceMats);
    m.name = `sourceSheet_${i}`;
    const jx = rangeOf(rng, -0.0011, 0.0011);
    const jz = rangeOf(rng, -0.0011, 0.0011);
    const jr = rangeOf(rng, -0.0022, 0.0022);
    m.position.set(jx, plyT * (i + 0.5), jz);
    m.rotation.y = jr;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  group.userData.geometries = [geo];
  group.userData.height = plyT * count;
  return group;
}

// The working packet: a smaller run of sheets with one controlled fold on the
// top leaf, and deliberately staggered edges so the lamination reads.
function buildWorkingPacket(materials, seed) {
  const rng = makeRng(seed);
  const group = new Group();
  group.name = 'paperWorkingPacket';

  const plyT = SHEET_T * 2.1;
  const count = 9;
  const geos = [];
  const faceMats = [materials.paperEdge, materials.paperFace];

  const baseGeo = collapseSheetBoxGroups(new BoxGeometry(SHEET_W, plyT, SHEET_D));
  geos.push(baseGeo);

  // Staggered underlayer — each sheet offset a controlled step so the packet
  // shows layered edges rather than a solid slab.
  for (let i = 0; i < count; i++) {
    const m = new Mesh(baseGeo, faceMats);
    m.name = `packetSheet_${i}`;
    const step = i * 0.0042;
    m.position.set(-step * 0.85, plyT * (i + 0.5), step * 0.55);
    m.rotation.y = rangeOf(rng, -0.0016, 0.0016);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }

  // Top leaf carries the single controlled fold.
  const foldGeo = createFoldedSheetGeometry({
    width: SHEET_W,
    depth: SHEET_D,
    thickness: SHEET_T * 2.4,
    foldRatio: 0.66,
    foldAngle: 0.5,
    scoreWidth: 0.016,
    segmentsAlong: 128,
    segmentsAcross: 6
  });
  geos.push(foldGeo);

  const folded = new Mesh(foldGeo, [materials.paperFace, materials.paperEdge]);
  folded.name = 'packetFoldedLeaf';
  folded.position.set(-count * 0.0042 * 0.85 - 0.004, plyT * count + SHEET_T * 1.4, count * 0.0042 * 0.55 + 0.003);
  folded.rotation.y = 0.014;
  folded.castShadow = true;
  folded.receiveShadow = true;
  group.add(folded);

  group.userData.geometries = geos;
  group.userData.height = plyT * count + SHEET_T * 2.4;
  return group;
}

// A single sheet lifted at a shallow angle so its leading edge lands exactly
// against the rail face. The contact is the whole point of the state.
function buildHeldSheet(materials, railX, railTopY, seed) {
  const group = new Group();
  group.name = 'paperHeldSheet';

  const geo = createFoldedSheetGeometry({
    width: SHEET_W,
    depth: SHEET_D,
    thickness: SHEET_T * 2.2,
    foldRatio: 1.0, // no fold — single planar sheet with real thickness
    foldAngle: 0,
    scoreWidth: 0.001,
    segmentsAlong: 48,
    segmentsAcross: 6
  });

  const sheet = new Mesh(geo, [materials.paperFace, materials.paperEdge]);
  sheet.name = 'heldSheetLeaf';
  sheet.castShadow = true;
  sheet.receiveShadow = true;

  // Tilt so the leading (+X) edge rises to meet the rail contact height.
  const tilt = -0.155;
  sheet.rotation.z = tilt;
  group.add(sheet);

  // Position group so the leading edge touches the rail's near face.
  const lead = (SHEET_W / 2) * Math.cos(tilt);
  group.position.set(railX - lead - 0.0004, railTopY * 0.52, 0);

  group.userData.geometries = [geo];
  group.userData.contact = new Vector3(railX, railTopY * 0.52 + (SHEET_W / 2) * Math.sin(-tilt), 0);
  return group;
}

// Near-black machined decision rail. One rail, one stop.
function buildRail(materials, length) {
  const group = new Group();
  group.name = 'decisionRail';

  const bodyW = 0.026;
  const bodyH = 0.052;
  const geoBody = new BoxGeometry(bodyW, bodyH, length, 1, 1, 1);
  const body = new Mesh(geoBody, materials.railMat);
  body.name = 'railBody';
  body.position.y = bodyH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Machined cap with a slight step — instrumentation read, no branding.
  const capW = bodyW * 1.22;
  const capH = 0.006;
  const geoCap = new BoxGeometry(capW, capH, length * 1.004);
  const cap = new Mesh(geoCap, materials.railTopMat);
  cap.name = 'railCap';
  cap.position.y = bodyH + capH / 2;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  // Base foot flange.
  const geoFoot = new BoxGeometry(bodyW * 1.9, 0.0055, length * 0.98);
  const foot = new Mesh(geoFoot, materials.railMat);
  foot.name = 'railFoot';
  foot.position.y = 0.00275;
  foot.castShadow = true;
  foot.receiveShadow = true;
  group.add(foot);

  group.userData.geometries = [geoBody, geoCap, geoFoot];
  group.userData.bodyW = bodyW;
  group.userData.topY = bodyH + capH;
  return group;
}

// The single muted review-gold authority tab, seated exactly at the point
// where the held sheet stops against the rail.
function buildGoldTab(materials, contact, railX, bodyW) {
  const group = new Group();
  group.name = 'goldAuthorityTab';

  const w = 0.019;
  const d = 0.062;
  const t = 0.0055;

  const geo = createPlateGeometry(w, d, t, 0.0022, 5);
  const tab = new Mesh(geo, materials.goldMat);
  tab.name = 'goldTabPlate';
  tab.castShadow = true;
  tab.receiveShadow = true;

  // Stand the tab vertically against the rail's near face, centred on the
  // contact height so it marks the stop and nothing else.
  tab.rotation.z = Math.PI / 2;
  tab.position.set(railX - bodyW / 2 - t / 2 - 0.0002, contact.y, contact.z);
  group.add(tab);

  // A short seat lug that ties the tab to the rail so it reads as hardware.
  const lugGeo = createPlateGeometry(0.008, 0.062, 0.0035, 0.0012, 4);
  const lug = new Mesh(lugGeo, materials.goldMat);
  lug.name = 'goldTabLug';
  lug.position.set(railX - bodyW / 2 - t - 0.004, contact.y + w / 2 - 0.0018, contact.z);
  lug.castShadow = true;
  lug.receiveShadow = true;
  group.add(lug);

  group.userData.geometries = [geo, lugGeo];
  return group;
}

export function buildScene(materials, seed = 20514) {
  const root = new Group();
  root.name = 'paperWorkflowRoot';

  const railLength = 0.5;
  const rail = buildRail(materials, railLength);
  const railX = 0.30;
  rail.position.set(railX, 0, 0.02);
  root.add(rail);

  const held = buildHeldSheet(materials, railX - rail.userData.bodyW / 2, rail.userData.topY, seed + 3);
  held.position.z += 0.02;
  root.add(held);

  const contactWorld = new Vector3(
    railX - rail.userData.bodyW / 2,
    held.userData.contact.y,
    0.02
  );

  const gold = buildGoldTab(materials, contactWorld, railX, rail.userData.bodyW);
  root.add(gold);

  const source = buildSourceStack(materials, seed + 1);
  source.position.set(-0.30, 0, -0.13);
  source.rotation.y = 0.075;
  root.add(source);

  const packet = buildWorkingPacket(materials, seed + 2);
  packet.position.set(-0.055, 0, 0.135);
  packet.rotation.y = -0.055;
  root.add(packet);

  return {
    root,
    rail,
    held,
    gold,
    source,
    packet,
    contact: contactWorld
  };
}

export function disposeBuilt(built) {
  if (!built) return;
  const groups = [built.rail, built.held, built.gold, built.source, built.packet];
  for (const g of groups) {
    if (!g) continue;
    for (const geo of g.userData.geometries || []) geo.dispose();
  }
}

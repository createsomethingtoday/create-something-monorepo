import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const base = process.env.CANVAS_URL || 'http://127.0.0.1:5187';
const out = new URL(`../output/${process.env.CANVAS_RUN_LABEL || 'editing'}/`, import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({
      viewport,
      acceptDownloads: true,
      reducedMotion: 'reduce',
      permissions: ['clipboard-read', 'clipboard-write']
    });
    await context.addInitScript(() => {
      window.__tools = {};
      Object.defineProperty(document, 'modelContext', {
        configurable: true,
        value: {
          registerTool(t) {
            window.__tools[t.name] = t;
          }
        }
      });
    });
    const page = await context.newPage(),
      errors = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) console.log('Navigation', frame.url());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    const call = (name, input = {}) =>
      page.evaluate(async ({ name, input }) => window.__tools[name].execute(input), {
        name,
        input
      });
    const state = () => call('draw_get_state');
    const inspect = () => call('draw_inspect');
    const edit = async (commands) =>
      call('draw_edit', { expectedRevision: (await inspect()).revision, commands });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(async () => {
      try {
        await window.__tools.draw_get_state.execute({});
        return true;
      } catch {
        return false;
      }
    });
    await page.getByRole('button', { name: 'Start sketching', exact: true }).click();
    await page.getByRole('button', { name: 'Rectangle tool (R)', exact: true }).click();
    const box = await page.locator('svg[aria-label="Canvas objects"]').boundingBox();
    await page.mouse.move(box.x + 40, box.y + 150);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + 220, { steps: 8 });
    await page.mouse.up();
    const original = (await state()).document;
    expect(original.objects).toHaveLength(1);
    const id = original.objects[0].id;
    await page.getByRole('button', { name: 'Select tool (V)', exact: true }).click();
    if (viewport.width < 821)
      await page.getByRole('button', { name: 'Layers', exact: true }).click();
    await page.getByLabel('Layer name', { exact: true }).fill('Decision');
    await page.getByLabel('Layer name', { exact: true }).press('Tab');
    await page.getByLabel('Selection width', { exact: true }).fill('120');
    await page.getByLabel('Selection width', { exact: true }).press('Tab');
    expect((await state()).document.objects[0].name).toBe('Decision');
    const dupe = await edit([{ type: 'duplicate', ids: [id], dx: 150, dy: 40 }]);
    const second = dupe.selectedIds[0];
    const dupe2 = await edit([{ type: 'duplicate', ids: [id], dx: 300, dy: 70 }]);
    const third = dupe2.selectedIds[0];
    await edit([
      { type: 'align', ids: [id, second, third], axis: 'top' },
      { type: 'align', ids: [id, second, third], axis: 'horizontal' }
    ]);
    await edit([
      { type: 'style', ids: [id], fill: '#0057b8', strokeWidth: 4 },
      { type: 'transform', ids: [id], rotation: 20 }
    ]);
    await expect(page.locator(`[data-object-id="${id}"]`)).toHaveAttribute('fill', '#0057b8');
    await expect(page.locator(`[data-object-id="${id}"]`)).toHaveAttribute(
      'transform',
      /rotate\(20/
    );
    await call('draw_get_rendered_geometry', { ids: [id] });
    await expect
      .poll(() =>
        page.locator(`[data-object-id="${id}"]`).evaluate((el) => getComputedStyle(el).transform)
      )
      .toMatch(/^matrix\(0\.93969/);
    const snapshot = (await state()).document;
    await expect(
      call('draw_edit', {
        expectedRevision: 'stale',
        commands: [{ type: 'layer', ids: [id], name: 'Wrong' }]
      })
    ).rejects.toThrow(/stale/);
    await expect(
      edit([
        { type: 'layer', ids: [id], name: 'Partial' },
        { type: 'transform', ids: ['missing'], x: 0 }
      ])
    ).rejects.toThrow();
    expect((await state()).document.objects).toEqual(snapshot.objects);
    await edit([{ type: 'layer', ids: [id], locked: true }]);
    await expect(edit([{ type: 'transform', ids: [id], x: 700 }])).rejects.toThrow(/Unlock/);
    await edit([{ type: 'layer', ids: [id], locked: false, hidden: true }]);
    await expect(page.locator(`[data-object-id="${id}"]`)).toHaveCount(0);
    await edit([{ type: 'layer', ids: [id], hidden: false }]);
    await page.screenshot({ path: new URL(`workbench-${viewport.width}.png`, out).pathname });
    if (viewport.width < 821)
      await page.getByRole('button', { name: 'Layers', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await state()).document.objects.find((o) => o.id === id).hidden).toBe(true);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await call('draw_select', { ids: [second, third] });
    await call('draw_apply_operations', {
      expectedRevision: (await inspect()).revision,
      operations: [
        {
          type: 'convert',
          selectedIds: [second, third],
          target: 'group',
          resultId: 'workflow-group',
          createdAt: new Date().toISOString()
        }
      ]
    });
    await edit([
      { type: 'transform', ids: ['workflow-group'], rotation: 15 },
      { type: 'arrange', ids: [id], position: 'front' }
    ]);
    await call('draw_select', { ids: [id] });
    await page.locator(`[data-object-id="${id}"]`).focus();
    await page.keyboard.press('ArrowRight');
    const copiedCount = (await state()).document.objects.length;
    await page.keyboard.press('ControlOrMeta+c');
    await page.keyboard.press('ControlOrMeta+v');
    await expect.poll(async () => (await state()).document.objects.length).toBe(copiedCount + 1);
    await page.keyboard.press('ControlOrMeta+z');
    expect((await state()).document.objects.length).toBe(copiedCount);
    await call('draw_select', { ids: [id] });
    await call('draw_apply_operations', {
      operations: [
        {
          type: 'put_object',
          object: {
            id: 'clipboard-edge',
            kind: 'connector',
            createdAt: new Date().toISOString(),
            fromId: id,
            toId: second,
            label: 'Copy relationship'
          }
        }
      ]
    });
    await edit([{type: 'layer', ids: ['clipboard-edge'], locked: true}]);
    const lockedGraph = (await state()).document.objects;
    await expect(call('draw_apply_operations', {confirmation: 'REPLACE CANVAS', operations: [{type: 'replace_objects', objects: [...lockedGraph].reverse()}]})).rejects.toThrow('stacking order');
    expect((await state()).document.objects).toEqual(lockedGraph);
    await call('draw_select', {ids: [id]});
    await page.locator(`[data-object-id="${id}"]`).focus();
    await page.keyboard.press('Delete');
    expect((await state()).document.objects).toEqual(lockedGraph);
    await page.getByRole('button', {name: 'Eraser tool (E)', exact: true}).click();
    await page.locator(`[data-object-id="${id}"]`).click();
    expect((await state()).document.objects).toEqual(lockedGraph);
    await page.getByRole('button', {name: 'Select tool (V)', exact: true}).click();
    await edit([{type: 'layer', ids: ['clipboard-edge'], locked: false}]);
    await edit([{type: 'transform', ids: ['clipboard-edge', id], rotation: 30}]);
    expect((await state()).document.objects.find(object => object.id === id).rotation).toBe(30);
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    expect((await state()).document.objects.find(object => object.id === id).rotation).toBe(20);
    await call('draw_select', { ids: ['clipboard-edge'] });
    await page.locator('[data-object-id="clipboard-edge"]').focus();
    const beforeConnectorCopy = (await state()).document.objects.length;
    await page.keyboard.press('ControlOrMeta+c');
    await page.keyboard.press('ControlOrMeta+v');
    await expect
      .poll(async () => (await state()).document.objects.length)
      .toBe(beforeConnectorCopy + 3);
    const pastedConnector = (await state()).document.objects.find(
      (o) => o.kind === 'connector' && o.id !== 'clipboard-edge'
    );
    expect(pastedConnector.fromId).not.toBe(id);
    expect(pastedConnector.toId).not.toBe(second);
    await page.keyboard.press('ControlOrMeta+z');
    await call('draw_apply_operations', {
      operations: [{ type: 'remove_objects', ids: ['clipboard-edge'] }]
    });
    await call('draw_select', { ids: [id] });
    const revision = (await inspect()).revision;
    const handle = await page
      .getByRole('button', { name: 'Resize selection', exact: true })
      .boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await expect(
      call('draw_edit', {
        expectedRevision: revision,
        commands: [{ type: 'layer', ids: [id], name: 'Racing' }]
      })
    ).rejects.toThrow(/gesture/);
    await page.mouse.move(handle.x + 20, handle.y + 20);
    await page.mouse.up();
    // Rotation follows the pointer delta from the existing angle, with no first-move jump.
    const rotateHandle = await page.getByRole('button', {name: 'Rotate selection', exact: true}).boundingBox();
    const rotateStart = {x: rotateHandle.x + rotateHandle.width / 2, y: rotateHandle.y + rotateHandle.height / 2};
    await page.mouse.move(rotateStart.x, rotateStart.y);
    await page.mouse.down();
    await page.mouse.move(rotateStart.x + 1, rotateStart.y);
    await page.mouse.up();
    expect((await state()).document.objects.find(o => o.id === id).rotation).toBeGreaterThanOrEqual(20);
    expect((await state()).document.objects.find(o => o.id === id).rotation).toBeLessThanOrEqual(22);
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    expect((await state()).document.objects.find(o => o.id === id).rotation).toBe(20);

    // Lasso through invisible artwork must leave no selection, including hidden group children.
    await call('draw_apply_operations', {expectedRevision: (await inspect()).revision, operations: [
      {type: 'put_object', object: {id: 'hidden-lasso-child', kind: 'rectangle', createdAt: new Date().toISOString(), from: {x: 20, y: 300}, to: {x: 60, y: 340}, color: '#ffffff'}},
      {type: 'put_object', object: {id: 'hidden-lasso-group', kind: 'group', createdAt: new Date().toISOString(), x: 10, y: 290, width: 70, height: 60, label: 'Invisible', childIds: ['hidden-lasso-child'], hidden: true}}
    ]});
    const hiddenProjection = await call('draw_inspect', {ids: ['hidden-lasso-child']});
    expect(hiddenProjection.objects[0]).toMatchObject({hidden: true, ownHidden: false});
    await call('draw_select', {ids: []});
    const lassoBox = await page.locator('svg[aria-label="Canvas objects"]').boundingBox();
    const camera = (await state()).document.viewport;
    await page.mouse.move(lassoBox.x + camera.x + 5 * camera.zoom, lassoBox.y + camera.y + 280 * camera.zoom);
    await page.mouse.down();
    await page.mouse.move(lassoBox.x + camera.x + 90 * camera.zoom, lassoBox.y + camera.y + 360 * camera.zoom, {steps: 5});
    await page.mouse.up();
    await expect(page.getByRole('button', {name: 'Resize selection', exact: true})).toHaveCount(0);
    await call('draw_apply_operations', {expectedRevision: (await inspect()).revision, operations: [{type: 'remove_objects', ids: ['hidden-lasso-group', 'hidden-lasso-child']}]});
    const createdAt = new Date().toISOString();
    const probe = (id, x, y) => ({id,kind:'rectangle',createdAt,from:{x,y},to:{x:x+4,y:y+4},color:'#ffffff',fill:'#ffffff'});
    const geometryFixtures = [
      {id:'weighted-arrow',kind:'arrow',createdAt,from:{x:10,y:400},to:{x:110,y:400},color:'#ffffff',strokeWidth:24},
      {id:'filled-path',kind:'stroke',createdAt,color:'#ffffff',fill:'#0057b8',width:2,points:[{x:600,y:300},{x:700,y:300},{x:700,y:330},{x:630,y:330},{x:630,y:400},{x:600,y:400}]},
      probe('inside-path',610,350), probe('outside-path',650,350),
      {id:'rotated-note',kind:'note',createdAt,x:600,y:100,width:100,height:100,text:'Note',rotation:45},
      probe('note-corner',580,80), probe('note-center',648,148),
      {id:'rotated-group',kind:'group',createdAt,x:800,y:100,width:100,height:100,label:'Group',childIds:[],rotation:45},
      probe('group-corner',780,80), probe('group-center',848,148)
    ];
    await call('draw_apply_operations', {operations: geometryFixtures.map(object => ({type:'put_object',object}))});
    await expect(page.locator('marker#arrowhead')).toHaveAttribute('markerUnits','userSpaceOnUse');
    const weightedGeometry=await call('draw_get_rendered_geometry',{ids:['weighted-arrow']});
    expect(weightedGeometry.objects[0].worldBounds.height).toBeGreaterThanOrEqual(24);
    expect(weightedGeometry.objects[0].worldBounds.height).toBeLessThan(25);
    for(const [target, inside, outside] of [['filled-path','inside-path','outside-path'],['rotated-note','note-center','note-corner'],['rotated-group','group-center','group-corner']]) {
      expect((await call('draw_get_rendered_geometry', {ids:[target,inside]})).overlaps).toHaveLength(1);
      expect((await call('draw_get_rendered_geometry', {ids:[target,outside]})).overlaps).toHaveLength(0);
    }
    await call('draw_apply_operations', {operations:[{type:'remove_objects',ids:geometryFixtures.map(object => object.id)}]});
    const beforeReload = (await state()).document;
    await expect(page.locator('.statusbar')).toContainText('Saved');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(async () => {
      try {
        await window.__tools.draw_get_state.execute({});
        return true;
      } catch {
        return false;
      }
    });
    expect((await state()).document.objects).toEqual(beforeReload.objects);
    await page.locator('.file-menu summary').click();
    for (const format of ['JSON', 'SVG', 'PNG']) {
      const promise = page.waitForEvent('download');
      await page.getByRole('button', { name: format, exact: true }).click();
      const download = await promise;
      const path = new URL(`${viewport.width}-${download.suggestedFilename()}`, out).pathname;
      await download.saveAs(path);
      const bytes = await readFile(path);
      if (format === 'JSON')
        expect(JSON.parse(bytes.toString()).objects).toEqual(beforeReload.objects);
      if (format === 'SVG') {
        expect(bytes.toString()).toContain('#0057b8');
        expect(bytes.toString()).toContain('rotate(20');
        expect(bytes.toString()).not.toContain('Resize selection');
      }
      if (format === 'PNG')
        expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
    await page.locator('.file-menu summary').click();
    await Promise.all([
      page.waitForURL('**/animate?project=*', { waitUntil: 'networkidle' }),
      page
        .getByRole('navigation', { name: 'Project mode' })
        .getByRole('link', { name: 'Motion', exact: true })
        .click()
    ]);
    await page.waitForFunction(async () => {
      try {
        await window.__tools.draw_animation_inspect.execute({});
        return true;
      } catch {
        return false;
      }
    });
    const motion = await call('draw_animation_inspect');
    const drawing = (await call('draw_animation_drawing', { id })).drawing;
    expect(drawing.fill).toBe('#0057b8');
    const hiddenOverlay = {
      ...drawing,
      id: 'hidden-hit-proof',
      name: 'Hidden overlay',
      hidden: true
    };
    delete hiddenOverlay.source;
    await call('draw_animation_apply', {
      expectedRevision: motion.revision,
      operations: [{ type: 'put_drawing', drawing: hiddenOverlay }]
    });
    const stage = await page
      .locator('canvas[aria-label="Illustration animation canvas"]')
      .boundingBox();
    const center = {
      x:
        (Math.min(...drawing.points.map((p) => p.x)) +
          Math.max(...drawing.points.map((p) => p.x))) /
        2,
      y:
        (Math.min(...drawing.points.map((p) => p.y)) +
          Math.max(...drawing.points.map((p) => p.y))) /
        2
    };
    await page.mouse.click(
      stage.x + (center.x / motion.width) * stage.width,
      stage.y + (center.y / motion.height) * stage.height
    );
    await expect(page.getByLabel('Drawing name', { exact: true })).toHaveValue('Decision');
    await call('draw_animation_apply', {
      expectedRevision: (await call('draw_animation_inspect')).revision,
      operations: [{ type: 'remove_drawing', id: 'hidden-hit-proof' }]
    });

    await call('draw_animation_apply', {
      expectedRevision: (await call('draw_animation_inspect')).revision,
      operations: [
        { type: 'put_pose', id, pose: { ...drawing.poses[0], time: 1, x: drawing.poses[0].x + 80 } }
      ]
    });
    await writeFile(new URL(`motion-${viewport.width}.json`, out), JSON.stringify(motion, null, 2));
    await page.screenshot({ path: new URL(`motion-${viewport.width}.png`, out).pathname });
    expect(new URL(page.url()).searchParams.get('project')).toBe(original.id);
    await page
      .getByRole('navigation', { name: 'Project mode' })
      .getByRole('link', { name: 'Preview', exact: true })
      .click();
    await expect(page.locator('main')).toHaveClass(/preview-mode/);
    await expect(page.getByLabel('Animation title', { exact: true })).toBeDisabled();
    const previewState = await call('draw_animation_inspect');
    await expect(call('draw_animation_apply', {expectedRevision: previewState.revision, operations: [{type: 'settings', title: 'Unexpected preview edit'}]})).rejects.toThrow('Preview is read-only');
    await expect(call('draw_animation_history', {direction: 'undo'})).rejects.toThrow('Preview is read-only');
    expect(await call('draw_animation_inspect')).toEqual(previewState);
    await page.screenshot({ path: new URL(`preview-${viewport.width}.png`, out).pathname });
    await Promise.all([
      page.waitForURL('**/?project=*', { waitUntil: 'networkidle' }),
      page
        .getByRole('navigation', { name: 'Project mode' })
        .getByRole('link', { name: 'Canvas', exact: true })
        .click()
    ]);
    await page.waitForFunction(async () => {
      try {
        await window.__tools.draw_get_state.execute({});
        return true;
      } catch {
        return false;
      }
    });
    expect((await state()).document.objects).toEqual(beforeReload.objects);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    expect(errors).toEqual([]);
    await page.locator('.file-menu summary').click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'New canvas', exact: true }).click();
    await page.waitForFunction(async (id) => {
      try {
        return (await window.__tools.draw_get_state.execute({})).document.id !== id;
      } catch {
        return false;
      }
    }, original.id);
    await expect(page.getByLabel('Open Draw project')).toBeVisible();
    await Promise.all([
      page.waitForURL(`**/?project=${original.id}`, { waitUntil: 'networkidle' }),
      page.getByLabel('Open Draw project').selectOption(original.id)
    ]);
    await page.waitForFunction(async (id) => {
      try {
        return (await window.__tools.draw_get_state.execute({})).document.id === id;
      } catch {
        return false;
      }
    }, original.id);
    expect((await state()).document.objects).toEqual(beforeReload.objects);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    expect(errors).toEqual([]);
    await page.screenshot({ path: new URL(`projects-${viewport.width}.png`, out).pathname });
    await writeFile(
      new URL(`receipt-${viewport.width}.json`, out),
      JSON.stringify(
        { passed: true, projectId: original.id, objects: beforeReload.objects, errors },
        null,
        2
      )
    );
    await context.close();
  }
  console.log('Editing workflow passed on desktop and mobile.');
} finally {
  await browser.close();
}

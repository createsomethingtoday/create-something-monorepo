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
    await call('draw_animation_apply', {
      expectedRevision: motion.revision,
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

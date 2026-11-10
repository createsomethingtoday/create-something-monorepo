// Synthetic native boundary against the actual DEV React/Astryx renderer.
// No real workspace, provider request, external network, or filesystem write.
// Evidence is written outside the source tree unless explicitly overridden.
import { createServer } from "vite";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const app = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(
  process.env.GIGI_DEV_WORK_EVIDENCE || "/tmp/gigi-dev-astryx-work",
);
mkdirSync(out, { recursive: true });
const { chromium } = createRequire(
  new URL("../../../packages/agency/package.json", import.meta.url),
)("@playwright/test");
const server = await createServer({
  configFile: resolve(app, "vite.config.mjs"),
  root: app,
  server: { port: 0, strictPort: false, host: "127.0.0.1" },
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    timezoneId: "America/New_York",
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(10000);
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== origin) external.push(request.url());
  });
  await page.addInitScript(() => {
    const today = new Date(),
      day = (date) =>
        [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
    const plus = (amount) => {
      const value = new Date(today);
      value.setDate(value.getDate() + amount);
      return day(value);
    };
    const task = (id, title, due, status = "To do") => ({
      id,
      workspaceId: "synthetic-calm",
      entity: "tasks",
      title,
      updatedAt: "revision-one",
      fields: {
        Status: status,
        ...(due ? { "Due Date": due } : {}),
        "Estimated Time": 2,
        Recurring: "Keep this custom setting",
      },
      source: { kind: "manual" },
      relations: [],
    });
    globalThis.calmRecords = {
      tasks: [
        task("overdue", "Send the updated stage plot", plus(-1)),
        task("today", "Confirm Saturday’s soundcheck", plus(0), "In progress"),
        task("tomorrow", "Check the artwork proof", plus(1), "Waiting"),
        task("later", "Send December availability", plus(12)),
        task("undated", "Choose the next studio date", null),
        task("done", "Save the final bounce", plus(-3), "Done"),
      ],
      gigs: [
        {
          id: "g1",
          workspaceId: "synthetic-calm",
          entity: "gigs",
          title: "Saturday at The Green Room",
          updatedAt: "gig-one",
          fields: {
            Date: plus(1),
            Status: "Confirmed",
            "Call Time": "18:00",
            "Set Time": "21:00",
            Fee: 45000,
            "Lead Source": "Keep custom source",
          },
          source: { kind: "manual" },
          relations: [
            {
              fromEntity: "gigs",
              fromId: "g1",
              toEntity: "locations",
              toId: "l1",
              toTitle: "The Green Room",
              role: "Location",
            },
          ],
        },
      ],
    };
    globalThis.calmProfile = {
      id: "profile",
      title: "Synthetic artist",
      fields: {
        ...(localStorage.getItem("testCurrencyUnset")
          ? {}
          : { Currency: "USD" }),
        "Invoice Prefix": "KEEP",
      },
      source: { kind: "manual" },
    };
    globalThis.calmFailToday = false;
    globalThis.calmCalls = [];
    globalThis.calmFailSave = false;
    globalThis.calmFailRead = false;
    globalThis.__TAURI__ = {
      core: {
        invoke: async (_, { operation, input }) => {
          calmCalls.push({ operation, input: structuredClone(input) });
          if (operation === "workspace.get")
            return { id: "synthetic-calm", name: "Rehearsal workspace" };
          if (operation === "records.list") {
            if (input.entity === "profile")
              return { items: [{ id: "profile" }], count: 1 };
            if (input.entity === "locations")
              return {
                items: [{ id: "l1", title: "The Green Room" }],
                count: 1,
              };
            if (input.tasks) {
              if (calmFailRead) throw Error("Synthetic task read unavailable");
              const done = (t) => t.fields.Status === "Done",
                tomorrow = plus(1),
                query = input.tasks.query.toLowerCase();
              const matching = calmRecords.tasks.filter((t) =>
                  t.title.toLowerCase().includes(query),
                ),
                date = (t) => t.fields["Due Date"] || t.fields["Do Date"];
              const views = {
                soon: matching.filter(
                  (t) => !done(t) && date(t) && date(t) <= tomorrow,
                ),
                all: matching.filter((t) => !done(t)),
                done: matching.filter(done),
              };
              const items = views[input.tasks.view]
                .sort((a, b) =>
                  (date(a) || "9999").localeCompare(date(b) || "9999"),
                )
                .map((t) => ({
                  ...t,
                  status: t.fields.Status,
                  date: date(t) || null,
                  dateSource: date(t) ? "due" : null,
                }));
              return {
                items,
                count: items.length,
                total: calmRecords.tasks.length,
                viewCounts: Object.fromEntries(
                  Object.entries(views).map(([k, v]) => [k, v.length]),
                ),
                today: plus(0),
              };
            }
            if (input.gigs) {
              const items = calmRecords.gigs.map((g) => ({
                ...g,
                status: g.fields.Status,
                date: g.fields.Date,
                callTime: g.fields["Call Time"],
                setTime: g.fields["Set Time"],
                locationNames: ["The Green Room"],
                locationCount: 1,
              }));
              return {
                items: input.gigs.view === "past" ? [] : items,
                count: input.gigs.view === "past" ? 0 : 1,
                total: 1,
                viewCounts: { upcoming: 1, all: 1, past: 0 },
                needsDateCount: 0,
                statusOptions: ["Confirmed"],
                typeOptions: [],
              };
            }
            return { items: [], count: 0 };
          }
          if (operation === "workspace.search")
            return {
              groups: [
                {
                  entity: "tasks",
                  label: "Tasks",
                  count: 1,
                  items: [
                    { id: "today", title: "Confirm Saturday’s soundcheck" },
                  ],
                },
                {
                  entity: "gigs",
                  label: "Gigs",
                  count: 1,
                  items: [{ id: "g1", title: "Saturday at The Green Room" }],
                },
              ],
            };
          if (operation === "records.get")
            return input.entity === "profile"
              ? structuredClone(calmProfile)
              : structuredClone(
                  calmRecords[input.entity]?.find((r) => r.id === input.id) ||
                    {},
                );
          if (operation === "relations.link") {
            const gig = calmRecords.gigs.find((g) => g.id === input.fromId);
            gig.relations.push({
              fromEntity: "gigs",
              fromId: gig.id,
              toEntity: "locations",
              toId: input.toId,
              toTitle: "The Green Room",
              role: "Location",
            });
            return {};
          }
          if (operation === "records.save") {
            if (input.entity === "profile") {
              if (
                JSON.stringify(input.expectedRecord) !==
                JSON.stringify({
                  title: calmProfile.title,
                  fields: calmProfile.fields,
                  source: calmProfile.source,
                })
              )
                throw Error("Synthetic profile snapshot mismatch");
              Object.assign(calmProfile, {
                title: input.title,
                fields: input.fields,
              });
              return structuredClone(calmProfile);
            }
            if (calmFailSave) throw Error("Synthetic save conflict");
            const list = calmRecords[input.entity],
              index = list.findIndex((r) => r.id === input.id),
              old = list[index];
            if (
              old &&
              JSON.stringify(input.expectedRecord) !==
                JSON.stringify({
                  title: old.title,
                  fields: old.fields,
                  source: old.source,
                })
            )
              throw Error("Synthetic snapshot mismatch");
            const saved = {
              ...old,
              id: input.id || "new-" + list.length,
              workspaceId: "synthetic-calm",
              title: input.title,
              fields: input.fields,
              source: old?.source || { kind: "manual" },
              relations: old?.relations || [],
              updatedAt: "revision-" + calmCalls.length,
            };
            if (index < 0) list.push(saved);
            else list[index] = saved;
            return structuredClone(saved);
          }
          if (operation === "schema.describe")
            return {
              relationFields: [{ name: "Location", targetEntity: "locations" }],
            };
          if (operation === "gigs.summary")
            return { financialsComplete: false };
          if (operation === "today.read") {
            if (calmFailToday) throw Error("Synthetic Today read unavailable");
            const base = new Date(plus(0) + "T12:00:00");
            base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
            const current = day(base),
              start = input.weekStart || current,
              endDate = new Date(start + "T12:00:00");
            endDate.setDate(endDate.getDate() + 6);
            return {
              today: plus(0),
              calendar: {
                weekStart: start,
                weekEnd: day(endDate),
                count: 1,
                items: [
                  {
                    id: "week-gig",
                    entity: "gigs",
                    title:
                      start === current
                        ? "This week performance"
                        : "Another week performance",
                    date: start,
                    endDate: start,
                    fields: { Date: start, "Call Time": "16:00" },
                    identity: { recordKind: "performance" },
                  },
                ],
              },
              tasks: {
                items: [
                  {
                    id: "today",
                    title: "Confirm Saturday’s soundcheck",
                    date: plus(0),
                    fields: { Priority: "High" },
                  },
                ],
                count: 1,
              },
              payable: {
                items: [
                  {
                    id: "pay-1",
                    title: "Equipment rental",
                    date: plus(-1),
                    status: "Expected",
                    moneyCents: 12000,
                  },
                ],
                count: 1,
              },
              receivable: {
                items: [
                  {
                    id: "receive-1",
                    title: "Venue performance invoice",
                    date: plus(1),
                    status: "Invoiced",
                    moneyCents: 90000,
                  },
                ],
                count: 1,
              },
              financialThrough: day(
                new Date(
                  base.getFullYear(),
                  base.getMonth(),
                  base.getDate() + 6,
                ),
              ),
            };
          }
          if (operation.startsWith("attention."))
            return { items: [], unreadCount: 0, settings: { enabled: false } };
          if (operation === "agent.chat.list") return { sessions: [] };
          if (operation === "agent.chat.status") return { available: false };
          if (operation === "notifications.status")
            return { permission: "unknown" };
          if (
            /save|restore|create|import|send|approve|begin|link/.test(operation)
          )
            throw Error("Denied operation: " + operation);
          return {};
        },
      },
    };
  });

  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  const navigate = async (group, name) => {
    const menu = page.locator(`[data-nav-menu="${group}"]`);
    await menu.locator("summary").click();
    await menu.getByRole("button", { name, exact: true }).click();
  };
  const taskRows = () => page.locator(".dev-task-row:not(.dev-list-columns)");
  const dismiss = async () => {
    const close = page.locator("[data-notice-dismiss]");
    if (await close.count()) await close.click();
  };
  const fits = async (label) =>
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `${label}: no document overflow`,
    );
  const snap = async (label) => {
    // Astryx briefly carries an inert visual copy during viewport adaptation.
    // Review the settled layout rather than capturing that finite transition.
    await page.waitForFunction(() => [...document.querySelectorAll('[aria-hidden="true"][inert]')]
      .every((copy) => !copy.querySelector('.gigi-dev-topbar')));
    await fits(label);
    const geometry = await page.evaluate(() => ({
      viewport: {width: innerWidth, height: innerHeight},
      body: {width: document.body.scrollWidth, height: document.body.scrollHeight},
      topbars: [...document.querySelectorAll('.gigi-dev-topbar')].map((bar) => ({
        rect: bar.getBoundingClientRect().toJSON(),
        hidden: Boolean(bar.closest('[aria-hidden="true"], [inert]')),
        parent: bar.parentElement?.outerHTML.slice(0, 200)
      }))
    }));
    writeFileSync(resolve(out, `${label}-geometry.json`), JSON.stringify(geometry, null, 2));
    await page.screenshot({
      path: resolve(out, `${label}.png`),
      fullPage: true,
    });
    if (label === 'react-tasks-880x620' || label === 'react-tasks-390x844') {
      await page.screenshot({ path: resolve(out, `${label}-viewport.png`), fullPage: false });
    }
  };
  const choose = async (id, label, value) => {
    await page.locator(`#${id}-display`).click();
    const sheet = page.getByRole("dialog", { name: label, exact: true });
    await sheet.getByRole("option", { name: value, exact: true }).click();
    await sheet.waitFor({ state: "hidden" });
  };
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "Upcoming Gigs", exact: true })
    .waitFor();
  assert.equal(await page.locator(".dev-calendar-day").count(), 7,
    "weekly calendar keeps all seven days");
  const calendarGeometry = await page.locator(".dev-week-calendar").evaluate((calendar) => {
    const days = [...calendar.querySelectorAll(".dev-calendar-day")].map((day) => day.getBoundingClientRect());
    return {sameRow: days.every((day) => Math.abs(day.top - days[0].top) < 1),
      ordered: days.every((day, index) => index === 0 || day.left >= days[index - 1].right - 1)};
  });
  assert.ok(calendarGeometry.sameRow && calendarGeometry.ordered,
    "calendar days stay in one ordered weekly row");
  // Calendar navigation changes only the week input. Task/payment windows
  // are returned by the native Today query and remain tied to today's date.
  const week = () =>
    page.evaluate(
      () =>
        calmCalls.filter((c) => c.operation === "today.read").at(-1).input
          .weekStart || null,
    );
  assert.equal(await week(), null);
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await page.getByText("Another week performance", { exact: true }).waitFor();
  assert.ok(await week());
  assert.equal(
    await page
      .locator("[data-today-week=next]")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(
    await page
      .getByText("Confirm Saturday’s soundcheck", { exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page.getByText("Venue performance invoice", { exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "Current week", exact: true }).click();
  await page.getByText("This week performance", { exact: true }).waitFor();
  assert.equal(await week(), null);
  await page.evaluate(() => {
    calmFailToday = true;
  });
  await page
    .getByRole("button", { name: "Previous week", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Could not refresh Today" })
    .waitFor();
  assert.equal(
    await page.getByText("This week performance", { exact: true }).count(),
    1,
  );
  await page.evaluate(() => {
    calmFailToday = false;
  });
  await page
    .getByRole("button", { name: "Read local records again", exact: true })
    .click();
  await page.getByText("Another week performance", { exact: true }).waitFor();
  await snap("react-weekly-today-1280");
  await page
    .getByRole("heading", { name: "Financials", exact: true })
    .scrollIntoViewIfNeeded();
  await snap("react-today-financials-1280");
  await page.setViewportSize({ width: 600, height: 900 });
  await page
    .getByRole("heading", { name: "Upcoming Gigs", exact: true })
    .scrollIntoViewIfNeeded();
  await snap("react-weekly-today-600");
  await page
    .getByRole("heading", { name: "Financials", exact: true })
    .scrollIntoViewIfNeeded();
  await snap("react-today-financials-600");
  await page.setViewportSize({ width: 1280, height: 900 });
  await navigate("Admin", "Tasks");
  await taskRows().first().waitFor();
  assert.equal(
    await taskRows().count(),
    3,
    "native soon view contains overdue/today/tomorrow only",
  );
  assert.equal(
    await page.evaluate(
      () => calmCalls.filter((c) => c.input.tasks).at(-1).input.tasks.view,
    ),
    "soon",
  );
  await snap("react-tasks-studio-1280");
  for (const [width, height] of [[1440, 900], [880, 620], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await snap(`react-tasks-${width}x${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("#tasks-search").fill("No matching synthetic task");
  await page
    .getByRole("heading", { name: "No matching tasks.", exact: true })
    .waitFor();
  assert.equal(await taskRows().count(), 0);
  await page.locator("#tasks-search").fill("");
  await taskRows().first().waitFor();
  assert.equal(await taskRows().count(), 3);

  await page.getByRole("button", { name: /^All open/ }).click();
  await page
    .getByRole("button", { name: "Choose the next studio date", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /^Done/ }).click();
  await page
    .getByRole("button", { name: "Save the final bounce", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /^Due soon/ }).click();
  await taskRows().first().waitFor();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Complete Send the updated stage plot",
      exact: true,
    })
    .click();
  await page.getByText("Task completed.", { exact: true }).waitFor();
  assert.equal(await taskRows().count(), 2);
  const completion = await page.evaluate(() =>
    calmCalls.find(
      (c) => c.operation === "records.save" && c.input.id === "overdue",
    ),
  );
  assert.equal(
    completion.input.expectedRecord.fields.Recurring,
    "Keep this custom setting",
  );
  assert.equal(completion.input.fields.Status, "Done");
  assert.equal(
    await page.evaluate(() => calmRecords.tasks[0].fields.Recurring),
    "Keep this custom setting",
  );
  assert.ok(
    (await page.evaluate(
      () =>
        calmCalls.filter(
          (c) => c.operation === "records.get" && c.input.id === "overdue",
        ).length,
    )) >= 2,
    "completion reads full record and confirms readback",
  );
  await page.evaluate(() => {
    calmFailSave = true;
  });
  await page
    .getByRole("button", {
      name: "Complete Confirm Saturday’s soundcheck",
      exact: true,
    })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Synthetic save conflict" })
    .waitFor();
  assert.equal(await taskRows().count(), 2);
  await dismiss();
  await page.evaluate(() => {
    calmFailSave = false;
  });
  await page
    .getByRole("button", { name: "Confirm Saturday’s soundcheck", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  assert.equal(
    await page.locator("#field-estimated-time").isVisible(),
    false,
    "supporting fields start closed",
  );
  assert.equal(
    await page.locator("#field-due-date-display").isVisible(),
    true,
    "native ISO date fallback is visible",
  );
  await page.locator("#title").fill("Unsaved task draft");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  assert.equal(await page.locator("#title").inputValue(), "Unsaved task draft");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => calmRecords.tasks.find((t) => t.id === "today").title,
    ),
    "Confirm Saturday’s soundcheck",
  );
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await page.locator("#title").fill("Confirm soundcheck with the venue");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        calmRecords.tasks.find((t) => t.id === "today").fields[
          "Estimated Time"
        ],
    ),
    2,
  );
  assert.equal(
    await page.evaluate(
      () => calmRecords.tasks.find((t) => t.id === "today").fields.Recurring,
    ),
    "Keep this custom setting",
  );
  await navigate("Work", "Gigs");
  await page.locator(".dev-gig-row").waitFor();
  assert.ok(
    (await page.locator(".dev-gig-row").innerText()).includes("The Green Room"),
  );
  for (const width of [1440, 1280, 880, 600, 390]) {
    await page.setViewportSize({ width, height: width === 880 ? 620 : 900 });
    await snap(`react-gigs-${width}`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await dismiss();
  await page.locator(".dev-gig-row button").focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Edit details", exact: true }).waitFor();
  await page.locator("[data-back]").click();
  await page.locator(".dev-gig-row").waitFor();
  assert.equal(await page.locator(".dev-gig-row button").evaluate((button) => document.activeElement === button), true,
    "record row returns focus to its own real button");
  await page.evaluate(() => {
    calmRecords.gigs[0].relations = [];
  });
  await page.locator(".dev-gig-row").click();
  for (const key of ["gig-money", "gig-artwork", "work-related"])
    assert.equal(
      await page.locator(`[data-view-key="${key}"]`).getAttribute("open"),
      null,
      `${key} starts collapsed`,
    );
  await snap("react-gig-detail");
  await page.getByRole("button", { name: "Add location", exact: true }).click();
  await choose("link-record", "Place", "The Green Room");
  await page.getByRole("button", { name: "Add location", exact: true }).click();
  await page.getByText(/^(Location added\.|Records linked\.)$/).waitFor();
  assert.equal(
    await page.evaluate(() => calmRecords.gigs[0].relations[0].toId),
    "l1",
  );
  assert.ok(
    await page.evaluate(() =>
      calmCalls.some(
        (c) =>
          c.operation === "records.get" &&
          c.input.entity === "gigs" &&
          c.input.id === "g1",
      ),
    ),
  );
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  assert.equal(
    await page.locator("#field-fee").isVisible(),
    false,
    "fee starts collapsed",
  );
  await page.locator("#title").fill("Saturday — live set");
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => calmRecords.gigs[0].fields.Fee),
    45000,
  );
  assert.equal(
    await page.evaluate(() => calmRecords.gigs[0].fields["Lead Source"]),
    "Keep custom source",
  );
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  const beforeInvalid = await page.evaluate(
    () => calmCalls.filter((c) => c.operation === "records.save").length,
  );
  await page.locator("#field-set-time").fill("25:00");
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(
      () => calmCalls.filter((c) => c.operation === "records.save").length,
    ),
    beforeInvalid,
    "invalid newly-entered clock cannot save",
  );
  await page.getByRole("alert").filter({ hasText: "Set time" }).waitFor();
  await page.locator("#field-set-time").fill("21:00");
  await page.locator("#field-date-display").fill("2026-02-31");
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page.waitForTimeout(100);
  assert.equal(
    await page.evaluate(
      () => calmCalls.filter((c) => c.operation === "records.save").length,
    ),
    beforeInvalid,
    "impossible newly-entered date cannot save",
  );
  await page.getByRole("alert").filter({ hasText: "Date" }).waitFor();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  // Retained timestamps/ranges and custom status must survive a title edit.
  await page.evaluate(() => {
    Object.assign(calmRecords.gigs[0].fields, {
      Date: "2026-11-12T18:00:00-05:00/2026-11-13T01:00:00-05:00",
      "Call Time": "2026-11-12T17:00:00-05:00",
      "Set Time": "2026-11-12T21:00:00-05:00",
      Status: "Offer under review",
    });
  });
  await navigate("Work", "Gigs");
  await page.locator(".dev-gig-row").click();
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  assert.equal(
    await page.locator("#field-status").inputValue(),
    "Offer under review",
  );
  assert.equal(
    await page.locator("#field-date").isVisible(),
    false,
    "complex date remains behind explicit timing adjustment",
  );
  await page.locator("#title").fill("Timing preserved");
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .waitFor();
  const timing = await page.evaluate(() => calmRecords.gigs[0].fields);
  assert.equal(
    timing.Date,
    "2026-11-12T18:00:00-05:00/2026-11-13T01:00:00-05:00",
  );
  assert.equal(timing["Set Time"], "2026-11-12T21:00:00-05:00");
  assert.equal(timing.Status, "Offer under review");
  await navigate("Admin", "Tasks");
  await page.evaluate(() => {
    calmFailRead = true;
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Synthetic task read unavailable" })
    .waitFor();
  assert.ok((await taskRows().count()) > 0);
  assert.equal(
    await page.locator(".dev-record-name").first().isDisabled(),
    true,
    "stale rows do not open under changed criteria",
  );
  await page.evaluate(() => {
    calmFailRead = false;
  });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Confirm soundcheck with the venue",
      exact: true,
    })
    .waitFor();
  // Begin a separate synthetic workspace/profile pass with currency unset.
  await page.evaluate(() => localStorage.setItem("testCurrencyUnset", "1"));
  await page.reload();
  await page
    .getByRole("heading", { name: "Upcoming Gigs", exact: true })
    .waitFor();
  await navigate("Work", "Gigs");
  await page.getByRole("button", { name: "New gig", exact: true }).click();
  await page.locator("#title").fill("First paid show");
  await page.locator('[data-view-key="work-editor-more"] > summary').click();
  await page.locator("#field-fee").fill("125");
  assert.equal(
    await page.locator("#first-money-currency").inputValue(),
    "",
    "currency is never guessed",
  );
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Choose your currency" })
    .waitFor();
  assert.equal(await page.locator("#field-fee").inputValue(), "125");
  assert.equal(
    await page.evaluate(
      () => calmCalls.filter((c) => c.operation === "records.save").length,
    ),
    0,
    "no save occurs without explicit currency",
  );
  await dismiss();
  await choose("first-money-currency", "Workspace currency", "EUR");
  await page.getByRole("button", { name: "Save gig", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit details", exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => calmProfile.fields.Currency), "EUR");
  assert.equal(
    await page.evaluate(() => calmProfile.fields["Invoice Prefix"]),
    "KEEP",
  );
  assert.equal(
    await page.evaluate(() => calmRecords.gigs.at(-1).fields.Fee),
    12500,
  );
  assert.deepEqual(errors, [], "no uncaught errors");
  assert.deepEqual(external, [], "no external requests");
  assert.equal(
    await page.evaluate(() =>
      calmCalls.some((c) =>
        /^(connections\.(begin|openConsent)|imports\.commit|agent\.chat\.(send|approve)|backup\.restore)$/.test(
          c.operation,
        ),
      ),
    ),
    false,
  );
  console.log(
    "PASS: React weekly Today and Calm Tasks/Gigs, native task windows and readback, conflict/draft retention, dirty/back, custom status/range preservation, collapsed supporting/payment/artwork, location readback, explicit first-money currency, narrow layout; synthetic only",
  );
} finally {
  await browser.close();
  await server.close();
}

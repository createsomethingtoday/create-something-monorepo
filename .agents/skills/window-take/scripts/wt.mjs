#!/usr/bin/env node
// window-take: record one macOS app window while a script drives it with a smooth pointer.
// Every action is logged with its time, so the render step can cut, speed up, blur, zoom and caption.
// Usage: node wt.mjs <command> [args]. Coordinates are in points, from the window's top left corner.
import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CURRENT = join(homedir(), ".cache", "window-take", "current.json");
const [command, ...args] = process.argv.slice(2);
const POINTER_MODE = (() => { const i = args.indexOf("--pointer"); return i !== -1 && args[i + 1] === "drawn" ? "drawn" : "real"; })();
const flag = (name) => { const i = args.indexOf(`--${name}`); return i === -1 ? null : args[i + 1] ?? ""; };
const has = (name) => args.includes(`--${name}`);
const plain = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] ?? "").startsWith("--"));
const osa = (script) => execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim();
/** Move the pointer. The first line of the answer is the result; the rest is the path, which goes to pointer.log in window points. */
const pointer = (...a) => {
  const [word, ...path] = execFileSync("osascript", ["-l", "JavaScript", join(here, "pointer.js"), ...a.map(String)], { encoding: "utf8" }).trim().split("\n");
  if (path.length && existsSync(CURRENT)) {
    try {
      const t = take();
      appendFileSync(join(t.dir, "pointer.log"), path.map((line) => { const [at, x, y, mark] = line.split(" "); return [at, Math.round((Number(x) - t.bounds.x) * 10) / 10, Math.round((Number(y) - t.bounds.y) * 10) / 10, mark ?? ""].join(" ").trim(); }).join("\n") + "\n");
    } catch { /* the path is extra; a failure here must not stop the action */ }
  }
  return word;
};
const sleep = (seconds) => execFileSync("sleep", [String(seconds)]);
const fail = (message) => { console.error(message); process.exit(1); };

const take = () => {
  if (!existsSync(CURRENT)) fail("No take is open. Run: wt start --app <name> --out <folder>");
  const dir = JSON.parse(readFileSync(CURRENT, "utf8")).dir;
  return { dir, ...JSON.parse(readFileSync(join(dir, "take.json"), "utf8")) };
};
const log = (t, event) => appendFileSync(join(t.dir, "events.jsonl"), JSON.stringify({ at: Date.now(), ...event }) + "\n");
const front = () => osa('tell application "System Events" to get name of first process whose frontmost is true');
/** No pointer or key action goes to another app: a click in the wrong window is the worst failure of a take. */
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
const guard = (t) => {
  ensure(t);
  const f = front(); if (f !== t.app) fail(`SKIP: "${f}" is in front, not "${t.app}". Nothing was sent.`);
};
/** Start the recorder on a new file. A take is one or more segments; the render joins them. */
const record = (dir, bounds, file) => {
  // "real": the system pointer is in the recording (-C) with click marks (-k). "drawn": it is left out, and the render draws a larger one.
  const mode = existsSync(join(dir, "take.json")) ? JSON.parse(readFileSync(join(dir, "take.json"), "utf8")).pointer : POINTER_MODE;
  const rec = spawn("nohup", ["screencapture", "-v", ...(mode === "drawn" ? [] : ["-C", "-k"]), "-x", `-R${bounds.x},${bounds.y},${bounds.w},${bounds.h}`, join(dir, file)], { detached: true, stdio: "ignore" });
  rec.unref();
  return rec.pid;
};
const toScreen = (t, x, y) => [t.bounds.x + Number(x), t.bounds.y + Number(y)];
const windowBounds = (app) => {
  const [x, y, w, h] = osa(`tell application "System Events" to tell process "${app}" to get {position, size} of window 1`).split(",").map((n) => Number(n.trim()));
  return { x, y, w, h };
};
const KEYS = { return: 36, enter: 36, tab: 48, space: 49, delete: 51, esc: 53, escape: 53, left: 123, right: 124, down: 125, up: 126, home: 115, end: 119, pageup: 116, pagedown: 121 };
const using = () => { const m = ["cmd", "shift", "alt", "ctrl"].filter(has).map((k) => ({ cmd: "command down", shift: "shift down", alt: "option down", ctrl: "control down" })[k]); return m.length ? ` using {${m.join(", ")}}` : ""; };

/** Start a new segment. The time between the old one's end and this start is not in the film. */
function newSegment(t, activate) {
  if (activate) { osa(`tell application "${t.app}" to activate`); sleep(1.2); }
  if (front() !== t.app) fail(`The recorder stopped and "${t.app}" is not in front, so it was not started again. Bring the app forward and run: wt resume`);
  const now = windowBounds(t.app);
  if (now.x !== t.bounds.x || now.y !== t.bounds.y || now.w !== t.bounds.w || now.h !== t.bounds.h) fail(`The window moved or changed size. Put it back at ${JSON.stringify(t.bounds)}, then run: wt resume`);
  const info = JSON.parse(readFileSync(join(t.dir, "take.json"), "utf8"));
  info.segments = info.segments ?? [{ file: "raw.mov", startedAt: info.startedAt }];
  const file = `raw-${info.segments.length + 1}.mov`;
  info.recPid = record(t.dir, t.bounds, file);
  info.segments.push({ file, startedAt: Date.now() });
  writeFileSync(join(t.dir, "take.json"), JSON.stringify(info, null, 1));
  t.recPid = info.recPid;
  sleep(1.5);
  log(t, { type: "segment", file });
  console.log(`RESUMED as ${file}: the recorder had stopped. Check that the last step was filmed.`);
}
function ensure(t) { if (!alive(t.recPid)) newSegment(t, false); }

switch (command) {
  case "start": {
    const app = flag("app") ?? fail("start needs --app <name>");
    const dir = resolve(flag("out") ?? fail("start needs --out <folder>"));
    mkdirSync(dir, { recursive: true });
    if (existsSync(join(dir, "raw.mov"))) fail(`${dir} already holds a take. Use a new folder.`);
    osa(`tell application "${app}" to activate`);
    sleep(1.2);
    if (front() !== app) fail(`"${app}" did not come to the front.`);
    const bounds = windowBounds(app);
    // -C records the pointer, -k marks clicks, -x is silent. The rectangle is the window and nothing else.
    const recPid = record(dir, bounds, "raw.mov");
    mkdirSync(dirname(CURRENT), { recursive: true });
    writeFileSync(join(dir, "take.json"), JSON.stringify({ app, bounds, recPid, pointer: POINTER_MODE, startedAt: Date.now(), segments: [{ file: "raw.mov", startedAt: Date.now() }] }, null, 1));
    writeFileSync(join(dir, "events.jsonl"), "");
    writeFileSync(CURRENT, JSON.stringify({ dir }));
    sleep(2);
    console.log(JSON.stringify({ recording: dir, window: bounds }));
    break;
  }
  case "move": case "click": case "dblclick": {
    const t = take(); guard(t);
    const [x, y] = toScreen(t, plain[0], plain[1]);
    console.log(pointer(command, x, y));
    log(t, { type: command, x: Number(plain[0]), y: Number(plain[1]) });
    break;
  }
  case "scroll": {
    const t = take(); guard(t);
    const [x, y] = toScreen(t, plain[0], plain[1]);
    console.log(pointer("scroll", x, y, plain[2], plain[3] ?? 0));
    log(t, { type: "scroll", x: Number(plain[0]), y: Number(plain[1]), dy: Number(plain[2]) });
    break;
  }
  case "type": case "paste": {
    const t = take(); guard(t);
    const text = plain.join(" ");
    if (command === "type") {
      // One key at a time, at a typing pace a viewer can follow.
      for (const ch of text) { osa(`tell application "System Events" to keystroke ${JSON.stringify(ch)}`); sleep(0.035); }
    } else {
      const before = execFileSync("pbpaste", { encoding: "utf8" });
      execFileSync("pbcopy", { input: text });
      osa('tell application "System Events" to keystroke "v" using {command down}');
      sleep(0.4);
      execFileSync("pbcopy", { input: before });
    }
    log(t, { type: command, chars: text.length });
    console.log(command === "type" ? "typed" : "pasted");
    break;
  }
  case "key": {
    const t = take(); guard(t);
    const name = plain[0], repeats = Number(plain[1] ?? 1);
    for (let i = 0; i < repeats; i++) {
      osa(name in KEYS ? `tell application "System Events" to key code ${KEYS[name]}${using()}` : `tell application "System Events" to keystroke ${JSON.stringify(name)}${using()}`);
      sleep(0.12);
    }
    log(t, { type: "key", name, repeats });
    console.log("keyed");
    break;
  }
  // Marks for the render step. A beat is a caption that stays until the next beat; an empty beat clears it.
  case "beat": { const t = take(); log(t, { type: "beat", text: plain.join(" ") }); console.log("beat"); break; }
  case "title": { const t = take(); log(t, { type: "title", text: plain[0] ?? "", sub: plain[1] ?? "", seconds: Number(flag("seconds") ?? 3) }); console.log("title"); break; }
  // cut: these frames are removed. fast: these frames play at --rate (default 8), for a wait the viewer must know happened.
  case "cut": case "fast": case "blur": case "focus": {
    const t = take();
    const edge = plain[0] === "end" ? "end" : "start";
    const event = { type: command, edge };
    if (command === "fast" && edge === "start") event.rate = Number(flag("rate") ?? 8);
    if ((command === "blur" || command === "focus") && edge === "start") {
      const [x, y, w, h] = plain.slice(plain[0] === "start" ? 1 : 0).map(Number);
      Object.assign(event, { x, y, w, h });
      if (command === "focus") event.zoom = Number(flag("zoom") ?? 0);
    }
    log(t, event);
    console.log(`${command} ${edge}`);
    break;
  }
  case "recorder": {
    // Runs in the foreground until the recording ends. For an agent harness that ends the child processes of a finished
    // command: run this one as a background task, and it holds the recorder for the whole take. "wt stop" ends it.
    const t = take();
    if (alive(t.recPid)) fail("The recorder is already running.");
    osa(`tell application "${t.app}" to activate`);
    sleep(1.2);
    const info = JSON.parse(readFileSync(join(t.dir, "take.json"), "utf8"));
    info.segments = info.segments ?? [{ file: "raw.mov", startedAt: info.startedAt }];
    const file = `raw-${info.segments.length + 1}.mov`;
    const rec = spawn("screencapture", ["-v", ...(info.pointer === "drawn" ? [] : ["-C", "-k"]), "-x", `-R${t.bounds.x},${t.bounds.y},${t.bounds.w},${t.bounds.h}`, join(t.dir, file)], { stdio: "ignore" });
    info.recPid = rec.pid;
    info.segments.push({ file, startedAt: Date.now() });
    writeFileSync(join(t.dir, "take.json"), JSON.stringify(info, null, 1));
    log(t, { type: "segment", file });
    console.log(`recording ${file} (pid ${rec.pid})`);
    for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => { try { rec.kill("SIGINT"); } catch { /* gone */ } });
    await new Promise((done) => rec.on("exit", (code, signal) => { console.log(`recorder ended (code ${code}, signal ${signal}) after ${Math.round((Date.now() - info.segments.at(-1).startedAt) / 1000)} s`); done(); }));
    break;
  }
  case "resume": { const t = take(); if (alive(t.recPid)) fail("The recorder is still running. Nothing to resume."); newSegment(t, true); break; }
  case "resume-old": {
    // The recorder stopped, or the take continues later. A new segment starts; what happened in between is not in the film.
    const t = take();
    if (alive(t.recPid)) fail("The recorder is still running. Nothing to resume.");
    osa(`tell application "${t.app}" to activate`);
    sleep(1.2);
    if (front() !== t.app) fail(`"${t.app}" did not come to the front.`);
    const now = windowBounds(t.app);
    if (now.x !== t.bounds.x || now.y !== t.bounds.y || now.w !== t.bounds.w || now.h !== t.bounds.h) fail(`The window moved or changed size. Put it back at ${JSON.stringify(t.bounds)} first.`);
    const info = JSON.parse(readFileSync(join(t.dir, "take.json"), "utf8"));
    info.segments = info.segments ?? [{ file: "raw.mov", startedAt: info.startedAt }];
    const file = `raw-${info.segments.length + 1}.mov`;
    info.recPid = record(t.dir, t.bounds, file);
    info.segments.push({ file, startedAt: Date.now() });
    writeFileSync(join(t.dir, "take.json"), JSON.stringify(info, null, 1));
    sleep(2);
    log(t, { type: "segment", file });
    console.log(JSON.stringify({ recording: file }));
    break;
  }
  case "wait": {
    const total = Number(plain[0] ?? 1);
    if (total <= 5 || !existsSync(CURRENT)) { sleep(total); console.log("waited"); break; }
    const t = take();
    for (let left = total; left > 0; left -= 4) { sleep(Math.min(4, left)); if (alive(t.recPid) === false) { try { ensure(t); } catch { /* reported at the next action */ } } }
    console.log("waited");
    break;
  }
  case "shot": {
    // A still for the agent to look at. It is not part of the film.
    const t = take();
    const file = join(t.dir, "looks", `${plain[0] ?? Date.now()}.png`);
    mkdirSync(dirname(file), { recursive: true });
    execFileSync("screencapture", ["-x", `-R${t.bounds.x},${t.bounds.y},${t.bounds.w},${t.bounds.h}`, file]);
    execFileSync("sips", ["-Z", String(Math.max(t.bounds.w, t.bounds.h)), file], { stdio: "ignore" });
    console.log(`${file} (front: ${front()}; recorder ${alive(t.recPid) ? "running" : "STOPPED: run wt resume"}; 1 image pixel = 1 window point)`);
    break;
  }
  case "status": { const t = take(); console.log(JSON.stringify({ dir: t.dir, app: t.app, recording: alive(t.recPid), front: front(), window: t.bounds, seconds: Math.round((Date.now() - t.startedAt) / 1000) })); break; }
  case "stop": {
    const t = take();
    log(t, { type: "stop" });
    try { process.kill(t.recPid, "SIGINT"); } catch { /* already stopped */ }
    sleep(3);
    console.log(JSON.stringify({ stopped: t.dir, next: `node ${join(here, "render.mjs")} ${t.dir}` }));
    break;
  }
  default:
    console.log("commands: start --app <name> --out <folder> [--pointer drawn] | move x y | click x y | dblclick x y | scroll x y dy [seconds] | type <text> | paste <text> | key <name|char> [repeats] [--cmd --shift --alt --ctrl] | beat <caption> | title <text> <sub> | cut start|end | fast start|end [--rate 8] | blur start x y w h | blur end | focus start x y w h | focus end | shot <name> | wait <seconds> | status | resume | stop");
}

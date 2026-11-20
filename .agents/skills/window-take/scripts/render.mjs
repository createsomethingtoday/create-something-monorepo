#!/usr/bin/env node
// window-take render: raw.mov + events.jsonl -> film.mp4, with cuts, sped-up waits, blurs, smooth zooms, captions and titles.
// Usage: node render.mjs <take folder> [--width 1920] [--fps 30] [--no-overlays]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(process.argv[2] ?? "");
if (!existsSync(join(dir, "raw.mov"))) { console.error("usage: node render.mjs <take folder> (with raw.mov and events.jsonl)"); process.exit(1); }
const opt = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i === -1 ? fallback : process.argv[i + 1]; };
const FPS = Number(opt("fps", 30)), OUT_W = Number(opt("width", 1920));
const work = join(dir, "work");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "inherit", "inherit"] });
const probe = (file, entry) => execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", entry, "-of", "csv=p=0", file], { encoding: "utf8" }).trim();

const takeInfo = JSON.parse(readFileSync(join(dir, "take.json"), "utf8"));
const events = readFileSync(join(dir, "events.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const stop = events.find((e) => e.type === "stop") ?? { at: events.at(-1)?.at ?? Date.now() };

// 1. A fixed frame rate first. The screen recorder writes frames when the screen changes, and times drift without this.
// A take is one or more segments (the recorder can stop, and "wt resume" starts a new file). They are joined here.
const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
const listed = (takeInfo.segments ?? [{ file: "raw.mov" }]).filter((s) => existsSync(join(dir, s.file)));
const segments = [];
let offset = 0;
listed.forEach((s, i) => {
  const out = join(work, `cfr-${i}.mp4`);
  ff(["-i", join(dir, s.file), "-vf", `fps=${FPS}`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", "-an", out]);
  const d = duration(out);
  // A segment ends when "stop" is logged (the last one) or when its file was last written (one that stopped on its own).
  const file = statSync(join(dir, s.file)).mtimeMs;
  const end = i === listed.length - 1 && Math.abs(file - stop.at) < 8000 ? stop.at : file;
  segments.push({ out, d, end, start: end - d * 1000, offset });
  offset += d;
});
writeFileSync(join(work, "segments.txt"), segments.map((s) => `file '${s.out}'`).join("\n") + "\n");
ff(["-f", "concat", "-safe", "0", "-i", join(work, "segments.txt"), "-c", "copy", join(work, "cfr.mp4")]);
const D = offset;
const [SRC_W, SRC_H] = probe(join(work, "cfr.mp4"), "stream=width,height").split(",").map(Number);
const px = SRC_W / takeInfo.bounds.w; // recorded pixels per window point
// An event's time in the joined recording. An event from a time that no segment holds lands on the start of the next segment.
const inSegment = (e) => segments.find((s) => e.at >= s.start && e.at <= s.end);
const T = (e) => {
  const s = inSegment(e);
  if (s) return s.offset + (e.at - s.start) / 1000;
  const next = segments.find((n) => n.start > e.at);
  return next ? next.offset : D;
};

// 2. Ranges, on the recording's own time.
const ranges = (type) => {
  const out = [], open = [];
  for (const e of events) {
    if (e.type !== type) continue;
    // A blur holds for the rest of the take, so it counts from any time. Other marks from unfilmed time are dropped.
    if (!inSegment(e) && type !== "blur") { if (e.edge === "end" && open.length) out.push({ ...open.pop(), to: T(e) }); continue; }
    if (e.edge === "start") open.push({ ...e, from: T(e) });
    else if (open.length) out.push({ ...open.pop(), to: T(e) });
  }
  for (const o of open) out.push({ ...o, to: D });
  return out.filter((r) => r.to - r.from > 0.05);
};
const cuts = ranges("cut"), fasts = ranges("fast"), blurs = ranges("blur"), focuses = ranges("focus");

// 3. The film's time for a recording time: cut ranges take no time, fast ranges take 1/rate of theirs.
// The ranges are split at every edge into pieces that do not overlap. Where a cut and a fast range overlap, the cut wins.
const marked = [...cuts.map((c) => ({ ...c, rate: Infinity })), ...fasts];
const edges = [...new Set(marked.flatMap((p) => [p.from, p.to]))].sort((a, b) => a - b);
const pieces = edges.slice(0, -1).flatMap((from, i) => {
  const over = marked.filter((p) => p.from <= from && p.to >= edges[i + 1]);
  return over.length ? [{ from, to: edges[i + 1], rate: Math.max(...over.map((p) => p.rate)) }] : [];
});
const film = (t) => {
  let lost = 0;
  for (const p of pieces) {
    if (t <= p.from) break;
    const span = Math.min(t, p.to) - p.from;
    lost += p.rate === Infinity ? span : span * (1 - 1 / p.rate);
  }
  return t - lost;
};
const LENGTH = film(D);

// 4. One ffmpeg pass: blur (recording time), then drop frames for cuts and fast ranges, then zoom, then scale.
const even = (n) => 2 * Math.round(n / 2);
const OUT_H = even(OUT_W * SRC_H / SRC_W);
const f = (n) => Number(n).toFixed(3);
const chain = [];
let last = "0:v";
blurs.forEach((b, i) => {
  const [x, y, w, h] = [b.x, b.y, b.w, b.h].map((v) => even(v * px));
  chain.push(`[${last}]split[m${i}][c${i}]`, `[c${i}]crop=${w}:${h}:${x}:${y},gblur=sigma=22[b${i}]`, `[m${i}][b${i}]overlay=${x}:${y}:enable='between(t,${f(b.from)},${f(b.to)})'[v${i}]`);
  last = `v${i}`;
});
const keep = pieces.length
  ? pieces.map((p) => `between(t,${f(p.from)},${f(p.to)})*${p.rate === Infinity ? 0 : `not(mod(n,${Math.round(p.rate)}))`}`).join("+") + `+not(${pieces.map((p) => `between(t,${f(p.from)},${f(p.to)})`).join("+")})`
  : "1";
let tail = `select='${keep}',setpts=N/${FPS}/TB`;
if (focuses.length) {
  // The camera. Each focus eases in over RAMP seconds and out again; outside a focus the frame is whole.
  // The frame is scaled to the zoom of that moment and then cropped, both per frame. This moves in steps of one
  // output pixel. (zoompan steps in source pixels and then scales up, which shows as a shake.)
  const RAMP = 0.9;
  const weights = focuses.map((z) => {
    const a = film(z.from), b = Math.max(film(z.to), a + 2 * RAMP);
    const up = `clip((t-${f(a)})/${RAMP},0,1)`, down = `clip((${f(b)}-t)/${RAMP},0,1)`;
    // Smootherstep: no jerk at either end of the move.
    const smooth = (u) => `pow(${u},3)*((${u})*(6*(${u})-15)+10)`;
    const zoom = z.zoom || Math.min(1.8, Math.max(1.25, 0.85 * Math.min(takeInfo.bounds.w / z.w, takeInfo.bounds.h / z.h)));
    return { w: `(${smooth(up)}*${smooth(down)})`, zoom, cx: (z.x + z.w / 2) / takeInfo.bounds.w, cy: (z.y + z.h / 2) / takeInfo.bounds.h };
  });
  const Z = `(1+${weights.map((k) => `${f(k.zoom - 1)}*${k.w}`).join("+")})`;
  // The point the camera looks at, as a share of the frame (0.5 is the middle).
  const look = (axis) => `(0.5+${weights.map((k) => `(${f(k[axis])}-0.5)*${k.w}`).join("+")})`;
  tail += `,scale=w='2*trunc(${OUT_W}*${Z}/2)':h='2*trunc(${OUT_H}*${Z}/2)':eval=frame:flags=bicubic`;
  // The crop filter keeps the frame size it saw first, so the scaled size of this moment is written out in full.
  const SW = `(2*trunc(${OUT_W}*${Z}/2))`, SH = `(2*trunc(${OUT_H}*${Z}/2))`;
  tail += `,crop=${OUT_W}:${OUT_H}:x='clip(${look("cx")}*${SW}-${OUT_W}/2,0,${SW}-${OUT_W})':y='clip(${look("cy")}*${SH}-${OUT_H}/2,0,${SH}-${OUT_H})'`;
} else tail += `,scale=${OUT_W}:${OUT_H}:flags=lanczos`;
chain.push(`[${last}]${tail}[out]`);
writeFileSync(join(work, "graph.txt"), chain.join(";\n"));
ff(["-i", join(work, "cfr.mp4"), "-/filter_complex", join(work, "graph.txt"), "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), join(work, "cut.mp4")]);

// 5. The overlay timeline, on the film's time. A caption stays until the next beat. One inside a cut is dropped.
const inCut = (t) => cuts.some((c) => t > c.from && t < c.to);
const beats = events.filter((e) => e.type === "beat" && inSegment(e) && !inCut(T(e)));
const captions = beats.map((b, i) => ({ from: film(T(b)), to: i + 1 < beats.length ? film(T(beats[i + 1])) : LENGTH, text: b.text })).filter((c) => c.text && c.to - c.from > 0.4);
const titles = events.filter((e) => e.type === "title" && inSegment(e)).map((e) => ({ from: film(T(e)), to: film(T(e)) + e.seconds, text: e.text, sub: e.sub }));
// A join is a place where frames were removed: a cut, or the gap between two segments. The overlay softens it.
const joins = [...new Set([...cuts.map((c) => film(c.from)), ...segments.slice(1).map((s) => film(s.offset))].map((t) => Math.round(t * FPS) / FPS))].filter((t) => t > 0.5 && t < LENGTH - 0.5).sort((x, y) => x - y);
// A drawn pointer: the path from pointer.log, on the film's time. Points from removed frames are left out.
let pointerPath = [];
if (takeInfo.pointer === "drawn" && existsSync(join(dir, "pointer.log"))) {
  for (const line of readFileSync(join(dir, "pointer.log"), "utf8").split("\n")) {
    const [at, x, y, mark] = line.split(" ");
    if (!y) continue;
    const e = { at: Number(at) };
    if (!inSegment(e) || inCut(T(e))) continue;
    pointerPath.push([Math.round(film(T(e)) * 1000) / 1000, Number(x) / takeInfo.bounds.w, Number(y) / takeInfo.bounds.h, mark === "down" ? 1 : 0]);
  }
  pointerPath.sort((p, q) => p[0] - q[0]);
}
// The camera, in the same terms the zoom filter uses, so the overlay can put the pointer where the camera shows it.
const camera = focuses.map((z) => { const a = film(z.from); return { a, b: Math.max(film(z.to), a + 2 * 0.9), ramp: 0.9, zoom: z.zoom || Math.min(1.8, Math.max(1.25, 0.85 * Math.min(takeInfo.bounds.w / z.w, takeInfo.bounds.h / z.h))), cx: (z.x + z.w / 2) / takeInfo.bounds.w, cy: (z.y + z.h / 2) / takeInfo.bounds.h }; });
const speeds = fasts.map((p) => ({ from: film(p.from), to: film(p.to), rate: Math.round(p.rate) })).filter((p) => p.to - p.from > 1);
const timeline = { width: OUT_W, height: OUT_H, fps: FPS, length: LENGTH, captions, titles, joins, speeds, pointer: pointerPath, camera };
writeFileSync(join(dir, "timeline.json"), JSON.stringify(timeline, null, 1));

const finalFile = join(dir, "film.mp4");
if (process.argv.includes("--no-overlays") || (!captions.length && !titles.length && !joins.length && !speeds.length && !pointerPath.length)) {
  ff(["-i", join(work, "cut.mp4"), "-c", "copy", "-movflags", "+faststart", finalFile]);
} else {
  // 6. Chrome draws the overlay page. A frame that looks like the one before it is not drawn again.
  const corePath = process.env.PLAYWRIGHT_CORE ?? join(here, "node_modules", "playwright-core", "index.mjs");
  if (!existsSync(corePath)) { console.error(`playwright-core is missing. Run: npm install --prefix ${here} playwright-core`); process.exit(1); }
  const { chromium } = await import(pathToFileURL(corePath).href);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: OUT_W, height: OUT_H }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(here, "overlay.html")).href);
  await page.evaluate((tl) => window.__setup(tl), timeline);
  mkdirSync(join(work, "ov"), { recursive: true });
  const frames = Math.ceil(LENGTH * FPS);
  const list = ["ffconcat version 1.0"];
  let lastKey = null, lastFile = null, run = 0, shots = 0;
  const flush = () => { if (lastFile) list.push(`file '${lastFile}'`, `duration ${(run / FPS).toFixed(6)}`); };
  for (let n = 0; n < frames; n++) {
    const t = n / FPS;
    const key = await page.evaluate((time) => window.__key(time), t);
    if (key === lastKey) { run++; continue; }
    flush();
    await page.evaluate((time) => window.__seek(time), t);
    lastFile = join(work, "ov", `${String(shots++).padStart(6, "0")}.png`);
    await page.screenshot({ path: lastFile, omitBackground: true });
    lastKey = key; run = 1;
  }
  flush();
  if (lastFile) list.push(`file '${lastFile}'`);
  await browser.close();
  writeFileSync(join(work, "overlay.ffconcat"), list.join("\n") + "\n");
  ff(["-i", join(work, "cut.mp4"), "-f", "concat", "-safe", "0", "-i", join(work, "overlay.ffconcat"), "-filter_complex", `[1:v]fps=${FPS},format=rgba[ov];[0:v][ov]overlay=eof_action=pass:format=auto[out]`, "-map", "[out]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", finalFile]);
  console.log(`overlay pictures drawn: ${shots} for ${frames} frames`);
}

// 7. A contact sheet: one frame per caption, to check each beat and to look for anything private before sharing.
const marks = (captions.length ? captions.map((c) => Math.min(LENGTH - 0.1, c.from + Math.min(1.5, (c.to - c.from) / 2))) : Array.from({ length: 12 }, (_, i) => (LENGTH * (i + 0.5)) / 12)).slice(0, 48);
marks.forEach((t, i) => ff(["-ss", f(t), "-i", finalFile, "-frames:v", "1", "-vf", "scale=640:-2", join(work, `sheet-${String(i).padStart(2, "0")}.png`)]));
const columns = Math.min(4, marks.length);
ff(["-pattern_type", "glob", "-i", join(work, "sheet-*.png"), "-vf", `tile=${columns}x${Math.ceil(marks.length / columns)}:padding=6:color=black`, "-frames:v", "1", join(dir, "contact-sheet.png")]);
console.log(JSON.stringify({ film: finalFile, seconds: Math.round(LENGTH), recorded: Math.round(D), size: `${OUT_W}x${OUT_H}`, captions: captions.length, cuts: cuts.length, fast: fasts.length, blurs: blurs.length, zooms: focuses.length, sheet: join(dir, "contact-sheet.png") }));

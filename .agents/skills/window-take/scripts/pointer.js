// Smooth pointer for macOS, run with: osascript -l JavaScript pointer.js <action> <args...>
// Screen coordinates in points. Actions: move x y | click x y | dblclick x y | scroll x y dy [seconds] | where
ObjC.import("CoreGraphics");
function run(argv) {
  const [action, ...rest] = argv;
  const n = rest.map(Number);
  const here = () => { const p = $.CGEventGetLocation($.CGEventCreate(null)); return { x: p.x, y: p.y }; };
  // Every pointer position is noted with its time, so the render can draw its own pointer on the same path.
  const path = [];
  const post = (type, x, y) => { $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateMouseEvent(null, type, $.CGPointMake(x, y), $.kCGMouseButtonLeft)); path.push(Date.now() + " " + Math.round(x * 10) / 10 + " " + Math.round(y * 10) / 10); };
  const done = (word) => word + "\n" + path.join("\n");
  // Minimum-jerk easing: the speed curve of a hand, slow at both ends.
  const ease = (u) => u * u * u * (u * (6 * u - 15) + 10);
  const glide = (tx, ty) => {
    const from = here();
    const dx = tx - from.x, dy = ty - from.y, dist = Math.hypot(dx, dy);
    if (dist < 2) { post($.kCGEventMouseMoved, tx, ty); return; }
    const seconds = Math.min(1.1, Math.max(0.35, 0.3 + dist / 1500));
    const steps = Math.round(seconds * 120);
    // A slight arc, so the path is not a ruler line.
    const bow = Math.min(40, dist * 0.06) * (dx >= 0 ? 1 : -1);
    const nx = -dy / dist, ny = dx / dist;
    for (let i = 1; i <= steps; i++) {
      const u = ease(i / steps), arc = Math.sin(Math.PI * u) * bow;
      post($.kCGEventMouseMoved, from.x + dx * u + nx * arc, from.y + dy * u + ny * arc);
      delay(1 / 120);
    }
  };
  const press = (x, y, count) => {
    for (let c = 1; c <= count; c++) {
      for (const type of [$.kCGEventLeftMouseDown, $.kCGEventLeftMouseUp]) {
        const event = $.CGEventCreateMouseEvent(null, type, $.CGPointMake(x, y), $.kCGMouseButtonLeft);
        $.CGEventSetIntegerValueField(event, $.kCGMouseEventClickState, c);
        $.CGEventPost($.kCGHIDEventTap, event);
        if (type === $.kCGEventLeftMouseDown) path.push(Date.now() + " " + x + " " + y + " down");
        delay(0.07);
      }
    }
  };
  if (action === "where") { const p = here(); return `${Math.round(p.x)},${Math.round(p.y)}`; }
  if (action === "move") { glide(n[0], n[1]); return done("moved"); }
  if (action === "click" || action === "dblclick") { glide(n[0], n[1]); delay(0.18); press(n[0], n[1], action === "click" ? 1 : 2); delay(0.12); return done("clicked"); }
  if (action === "scroll") {
    glide(n[0], n[1]); delay(0.15);
    // dy in pixels, negative is down the page. The wheel speeds up and slows down like a trackpad flick.
    const total = n[2], seconds = n[3] || Math.min(2.2, Math.max(0.5, Math.abs(total) / 900)), steps = Math.round(seconds * 60);
    let sent = 0;
    for (let i = 1; i <= steps; i++) {
      const want = Math.round(total * ease(i / steps)), step = want - sent;
      sent = want;
      if (step) $.CGEventPost($.kCGHIDEventTap, $.CGEventCreateScrollWheelEvent(null, $.kCGScrollEventUnitPixel, 1, step));
      delay(1 / 60);
    }
    return done("scrolled");
  }
  return "unknown action";
}

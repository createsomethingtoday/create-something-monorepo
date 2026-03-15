import { a7 as attr_class, a5 as attr_style, a8 as stringify } from "./index.js";
function OrbitingCircles($$renderer, $$props) {
  let {
    radius = 80,
    duration = 20,
    delay = 0,
    reverse = false,
    startAngle = 0,
    class: className = "",
    children
  } = $$props;
  const direction = reverse ? "reverse" : "normal";
  $$renderer.push(`<div${attr_class(`orbiting-circle ${stringify(className)}`, "svelte-1kebh65")}${attr_style(` --radius: ${stringify(radius)}px; --duration: ${stringify(duration)}s; --delay: ${stringify(delay)}s; --direction: ${stringify(direction)}; --start-angle: ${stringify(startAngle)}deg; `)}>`);
  children?.($$renderer);
  $$renderer.push(`<!----></div>`);
}
export {
  OrbitingCircles as O
};

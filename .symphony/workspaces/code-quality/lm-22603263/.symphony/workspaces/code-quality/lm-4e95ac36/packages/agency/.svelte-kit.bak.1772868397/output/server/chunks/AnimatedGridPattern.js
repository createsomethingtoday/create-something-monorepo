import { a7 as attr_class, a5 as attr_style, a4 as attr, aa as ensure_array_like, a8 as stringify } from "./index.js";
function AnimatedGridPattern($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      class: className = "",
      width = 40,
      height = 40,
      x = -1,
      y = -1,
      strokeDasharray = 0,
      numSquares = 50,
      maxOpacity = 0.3,
      duration = 3,
      repeatDelay = 1
    } = $$props;
    const id = "ssr";
    let squares = [];
    $$renderer2.push(`<svg aria-hidden="true"${attr_class(
      `animated-grid-pattern ${stringify(
        // Regenerate squares when dimensions change
        className
      )}`,
      "svelte-16nwyix"
    )}${attr_style(`--duration: ${stringify(duration)}s; --repeat-delay: ${stringify(repeatDelay)}s; --max-opacity: ${stringify(maxOpacity)};`)}><defs class="svelte-16nwyix"><pattern${attr("id", `grid-${stringify(id)}`)}${attr("width", width)}${attr("height", height)} patternUnits="userSpaceOnUse"${attr("x", x)}${attr("y", y)} class="svelte-16nwyix"><path${attr("d", `M.5 ${stringify(height)}V.5H${stringify(width)}`)} fill="none"${attr("stroke-dasharray", strokeDasharray)} class="svelte-16nwyix"></path></pattern></defs><rect width="100%" height="100%"${attr("fill", `url(#grid-${stringify(id)})`)} class="svelte-16nwyix"></rect><svg${attr("x", x)}${attr("y", y)} class="overflow-visible svelte-16nwyix"><!--[-->`);
    const each_array = ensure_array_like(squares);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let square = each_array[$$index];
      $$renderer2.push(`<rect class="animated-square svelte-16nwyix"${attr("width", width - 1)}${attr("height", height - 1)}${attr("x", square.col * width + 1)}${attr("y", square.row * height + 1)}${attr_style(`animation-delay: ${stringify(square.delay)}s;`)}></rect>`);
    }
    $$renderer2.push(`<!--]--></svg></svg>`);
  });
}
export {
  AnimatedGridPattern as A
};

import { a7 as attr_class, a5 as attr_style, a8 as stringify } from "./index.js";
function BorderBeam($$renderer, $$props) {
  let {
    size = 200,
    duration = 15,
    anchor = 90,
    borderWidth = 1.5,
    colorFrom = "#ffaa40",
    colorTo = "#9c40ff",
    delay = 0,
    class: className = ""
  } = $$props;
  $$renderer.push(`<div${attr_class(`border-beam ${stringify(className)}`, "svelte-qvtxrj")} aria-hidden="true"${attr_style("", {
    "--beam-size": `${stringify(size)}px`,
    "--beam-duration": `${stringify(duration)}s`,
    "--beam-anchor": `${stringify(anchor)}%`,
    "--beam-border-width": `${stringify(borderWidth)}px`,
    "--beam-color-from": colorFrom,
    "--beam-color-to": colorTo,
    "--beam-delay": `${stringify(delay)}s`
  })}></div>`);
}
export {
  BorderBeam as B
};

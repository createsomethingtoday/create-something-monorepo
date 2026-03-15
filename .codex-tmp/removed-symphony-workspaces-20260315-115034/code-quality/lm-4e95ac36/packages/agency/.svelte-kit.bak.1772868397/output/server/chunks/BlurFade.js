import { a7 as attr_class, a5 as attr_style, a8 as stringify } from "./index.js";
function BlurFade($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      class: className = "",
      duration = 0.4,
      delay = 0,
      yOffset = 6,
      blur = "6px",
      inView = true,
      inViewMargin = "-50px",
      children
    } = $$props;
    let isVisible = false;
    $$renderer2.push(`<div${attr_class(`blur-fade ${stringify(className)}`, "svelte-10637sd", { "visible": isVisible })}${attr_style(` --duration: ${stringify(duration)}s; --delay: ${stringify(0.04 + delay)}s; --y-offset: ${stringify(yOffset)}px; --blur: ${stringify(blur)}; `)}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
  });
}
export {
  BlurFade as B
};

import { a4 as attr, a7 as attr_class, a5 as attr_style, a8 as stringify } from "./index.js";
function ShimmerButton($$renderer, $$props) {
  let {
    class: className = "",
    shimmerColor = "#ffffff",
    shimmerSize = "0.05em",
    borderRadius = "10px",
    shimmerDuration = "3s",
    background = "rgba(0, 0, 0, 1)",
    children,
    onclick,
    href,
    disabled = false
  } = $$props;
  if (href) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<a${attr("href", href)}${attr_class(`shimmer-button ${stringify(className)}`, "svelte-4zbr7j", { "disabled": disabled })}${attr_style(` --spread: 90deg; --shimmer-color: ${stringify(shimmerColor)}; --radius: ${stringify(borderRadius)}; --speed: ${stringify(shimmerDuration)}; --cut: ${stringify(shimmerSize)}; --bg: ${stringify(background)}; `)}><div class="spark-container svelte-4zbr7j"><div class="spark svelte-4zbr7j"><div class="spark-inner svelte-4zbr7j"></div></div></div> <span class="content svelte-4zbr7j">`);
    children?.($$renderer);
    $$renderer.push(`<!----></span> <div class="highlight svelte-4zbr7j"></div> <div class="backdrop svelte-4zbr7j"></div></a>`);
  } else {
    $$renderer.push("<!--[!-->");
    $$renderer.push(`<button type="button"${attr_class(`shimmer-button ${stringify(className)}`, "svelte-4zbr7j", { "disabled": disabled })}${attr("disabled", disabled, true)}${attr_style(` --spread: 90deg; --shimmer-color: ${stringify(shimmerColor)}; --radius: ${stringify(borderRadius)}; --speed: ${stringify(shimmerDuration)}; --cut: ${stringify(shimmerSize)}; --bg: ${stringify(background)}; `)}><div class="spark-container svelte-4zbr7j"><div class="spark svelte-4zbr7j"><div class="spark-inner svelte-4zbr7j"></div></div></div> <span class="content svelte-4zbr7j">`);
    children?.($$renderer);
    $$renderer.push(`<!----></span> <div class="highlight svelte-4zbr7j"></div> <div class="backdrop svelte-4zbr7j"></div></button>`);
  }
  $$renderer.push(`<!--]-->`);
}
export {
  ShimmerButton as S
};

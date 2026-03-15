import { a4 as attr, a7 as attr_class, ag as clsx } from "./index.js";
function Card($$renderer, $$props) {
  let {
    variant = "standard",
    radius = "lg",
    padding = "lg",
    hover = false,
    href,
    class: className = "",
    children,
    onclick
  } = $$props;
  const paddingMap = { none: "", sm: "p-4", md: "p-6", lg: "p-8", xl: "p-12" };
  const baseClasses = `card card-${variant} card-radius-${radius} ${hover ? "card-hover" : ""} ${paddingMap[padding]} ${className}`;
  if (href) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<a${attr("href", href)}${attr_class(clsx(baseClasses), "svelte-n8k6h")}>`);
    if (children) {
      $$renderer.push("<!--[-->");
      children($$renderer);
      $$renderer.push(`<!---->`);
    } else {
      $$renderer.push("<!--[!-->");
    }
    $$renderer.push(`<!--]--></a>`);
  } else {
    $$renderer.push("<!--[!-->");
    if (onclick) {
      $$renderer.push("<!--[-->");
      $$renderer.push(`<button type="button"${attr_class(clsx(baseClasses), "svelte-n8k6h")}>`);
      if (children) {
        $$renderer.push("<!--[-->");
        children($$renderer);
        $$renderer.push(`<!---->`);
      } else {
        $$renderer.push("<!--[!-->");
      }
      $$renderer.push(`<!--]--></button>`);
    } else {
      $$renderer.push("<!--[!-->");
      $$renderer.push(`<div${attr_class(clsx(baseClasses), "svelte-n8k6h")}>`);
      if (children) {
        $$renderer.push("<!--[-->");
        children($$renderer);
        $$renderer.push(`<!---->`);
      } else {
        $$renderer.push("<!--[!-->");
      }
      $$renderer.push(`<!--]--></div>`);
    }
    $$renderer.push(`<!--]-->`);
  }
  $$renderer.push(`<!--]-->`);
}
export {
  Card as C
};

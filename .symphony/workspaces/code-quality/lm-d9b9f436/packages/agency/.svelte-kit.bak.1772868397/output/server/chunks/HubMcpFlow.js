import { a7 as attr_class, a5 as attr_style, a4 as attr, a8 as stringify, aa as ensure_array_like, a6 as escape_html } from "./index.js";
import { B as BlurFade } from "./BlurFade.js";
import { B as BorderBeam } from "./BorderBeam.js";
function AnimatedBeam($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      fromX = 0,
      fromY = 50,
      toX = 200,
      toY = 50,
      curvature = 0,
      duration = 2,
      pathWidth = 2,
      gradientStartColor = "#9333ea",
      gradientStopColor = "#3b82f6",
      reverse = false,
      delay = 0,
      class: className = ""
    } = $$props;
    const id = "ssr";
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2 + curvature;
    const pathD = curvature !== 0 ? `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}` : `M ${fromX} ${fromY} L ${toX} ${toY}`;
    $$renderer2.push(`<svg${attr_class(`animated-beam ${stringify(className)}`, "svelte-g5vdao")}${attr_style(` --duration: ${stringify(duration)}s; --delay: ${stringify(delay)}s; `)} aria-hidden="true"><defs class="svelte-g5vdao"><linearGradient${attr("id", `beam-gradient-${stringify(id)}`)}${attr("x1", reverse ? "100%" : "0%")} y1="0%"${attr("x2", reverse ? "0%" : "100%")} y2="0%" class="svelte-g5vdao"><stop offset="0%"${attr("stop-color", gradientStartColor)} stop-opacity="0" class="svelte-g5vdao"></stop><stop offset="50%"${attr("stop-color", gradientStartColor)} stop-opacity="1" class="svelte-g5vdao"></stop><stop offset="100%"${attr("stop-color", gradientStopColor)} stop-opacity="0" class="svelte-g5vdao"></stop></linearGradient><mask${attr("id", `beam-mask-${stringify(id)}`)} class="svelte-g5vdao"><rect class="beam-mask-rect svelte-g5vdao" x="0" y="0" width="100%" height="100%" fill="white"></rect></mask></defs><path${attr("d", pathD)} fill="none" stroke="rgba(255, 255, 255, 0.1)"${attr("stroke-width", pathWidth)} stroke-linecap="round" class="svelte-g5vdao"></path><path${attr("d", pathD)} fill="none"${attr("stroke", `url(#beam-gradient-${stringify(id)})`)}${attr("stroke-width", pathWidth)} stroke-linecap="round" class="beam-path svelte-g5vdao"></path></svg>`);
  });
}
function Marquee($$renderer, $$props) {
  let {
    class: className = "",
    reverse = false,
    pauseOnHover = false,
    vertical = false,
    repeat = 4,
    duration = 40,
    gap = 16,
    children
  } = $$props;
  $$renderer.push(`<div${attr_class(`marquee-container ${stringify(className)}`, "svelte-1j0iu5m", { "vertical": vertical, "pause-on-hover": pauseOnHover })} aria-live="off"${attr_style(` --duration: ${stringify(duration)}s; --gap: ${stringify(gap)}px; `)}><!--[-->`);
  const each_array = ensure_array_like(Array(repeat));
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    each_array[i];
    $$renderer.push(`<div${attr_class("marquee-group svelte-1j0iu5m", void 0, { "reverse": reverse })}${attr("data-duplicate", i > 0 ? "true" : void 0)}${attr("aria-hidden", i > 0)}${attr("inert", i > 0, true)}>`);
    children?.($$renderer);
    $$renderer.push(`<!----></div>`);
  }
  $$renderer.push(`<!--]--></div>`);
}
function HubMcpFlow($$renderer) {
  const decisionStates = [
    { id: "allow", label: "Allow", tone: "allow" },
    { id: "review", label: "Review", tone: "review" },
    { id: "block", label: "Block", tone: "block" }
  ];
  const DESKTOP_LAYOUT = {
    width: 800,
    height: 430,
    hub: { x: 400, y: 150 },
    policy: { x: 400, y: 275 },
    initiators: [
      { id: "ai", name: "Client LLM", x: 110, y: 110, curvature: 36 },
      {
        id: "slack",
        name: "Slack Agent",
        x: 110,
        y: 320,
        curvature: 44
      }
    ],
    services: [
      {
        id: "notion",
        name: "Notion Sync",
        x: 690,
        y: 90,
        curvature: -46
      },
      {
        id: "db",
        name: "Cloudflare D1",
        x: 690,
        y: 215,
        curvature: -24
      },
      {
        id: "custom",
        name: "Custom Workflow",
        x: 690,
        y: 340,
        curvature: -46
      }
    ]
  };
  let containerWidth = DESKTOP_LAYOUT.width;
  const isCompact = containerWidth < 700;
  const layout = DESKTOP_LAYOUT;
  const primaryBeam = "rgba(96, 165, 250, 0.9)";
  const secondaryBeam = "rgba(167, 139, 250, 0.4)";
  $$renderer.push(`<div${attr_class("mcp-viz-container svelte-48wgln", void 0, { "compact": isCompact })}><div class="mcp-grid-box svelte-48wgln"${attr_style(`width: ${stringify(layout.width)}px; height: ${stringify(layout.height)}px;`)}><!--[-->`);
  const each_array = ensure_array_like(layout.initiators);
  for (let i = 0, $$length = each_array.length; i < $$length; i++) {
    let init = each_array[i];
    AnimatedBeam($$renderer, {
      fromX: init.x,
      fromY: init.y,
      toX: layout.hub.x,
      toY: layout.hub.y,
      curvature: init.curvature,
      duration: 3,
      delay: i * 0.5,
      pathWidth: 2,
      gradientStartColor: secondaryBeam,
      gradientStopColor: primaryBeam
    });
  }
  $$renderer.push(`<!--]--> `);
  AnimatedBeam($$renderer, {
    fromX: layout.hub.x,
    fromY: layout.hub.y,
    toX: layout.policy.x,
    toY: layout.policy.y,
    duration: 2,
    delay: 0.9,
    pathWidth: 2.25,
    gradientStartColor: primaryBeam,
    gradientStopColor: "rgba(255, 255, 255, 0.8)"
  });
  $$renderer.push(`<!----> <!--[-->`);
  const each_array_1 = ensure_array_like(layout.services);
  for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
    let serv = each_array_1[i];
    AnimatedBeam($$renderer, {
      fromX: layout.policy.x,
      fromY: layout.policy.y,
      toX: serv.x,
      toY: serv.y,
      curvature: serv.curvature,
      duration: 2.6,
      delay: 1.45 + i * 0.3,
      pathWidth: 2,
      gradientStartColor: primaryBeam,
      gradientStopColor: secondaryBeam
    });
  }
  $$renderer.push(`<!--]-->  <!--[-->`);
  const each_array_2 = ensure_array_like(layout.initiators);
  for (let i = 0, $$length = each_array_2.length; i < $$length; i++) {
    let init = each_array_2[i];
    BlurFade($$renderer, {
      delay: 0.2 + i * 0.2,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="node initiator-node svelte-48wgln"${attr_style(`left: ${stringify(init.x)}px; top: ${stringify(init.y)}px;`)}>${escape_html(init.name)}</div>`);
      },
      $$slots: { default: true }
    });
  }
  $$renderer.push(`<!--]--> `);
  BlurFade($$renderer, {
    delay: 0.8,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="node hub-node svelte-48wgln"${attr_style(`left: ${stringify(layout.hub.x)}px; top: ${stringify(layout.hub.y)}px;`)}><div class="flow-kicker svelte-48wgln">Routes</div> <div class="hub-lockup svelte-48wgln"><span class="hub-title svelte-48wgln">Hub MCP</span> <span class="hub-sub svelte-48wgln">Tenant, alias, proxy</span></div></div>`);
    },
    $$slots: { default: true }
  });
  $$renderer.push(`<!----> `);
  BlurFade($$renderer, {
    delay: 1.15,
    children: ($$renderer2) => {
      $$renderer2.push(`<div class="node policy-node svelte-48wgln"${attr_style(`left: ${stringify(layout.policy.x)}px; top: ${stringify(layout.policy.y)}px;`)}>`);
      BorderBeam($$renderer2, {
        size: 150,
        duration: 8,
        colorFrom: primaryBeam,
        colorTo: secondaryBeam
      });
      $$renderer2.push(`<!----> <div class="flow-kicker svelte-48wgln">Decides</div> <div class="hub-lockup svelte-48wgln"><span class="policy-title svelte-48wgln">Control Layer</span> <span class="hub-sub svelte-48wgln">Trust boundary</span></div> <div class="decision-row svelte-48wgln"><!--[-->`);
      const each_array_3 = ensure_array_like(decisionStates);
      for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
        let decision = each_array_3[$$index_3];
        $$renderer2.push(`<span${attr_class(`decision-pill ${stringify(decision.tone)}`, "svelte-48wgln")}>${escape_html(decision.label)}</span>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    },
    $$slots: { default: true }
  });
  $$renderer.push(`<!----> <!--[-->`);
  const each_array_4 = ensure_array_like(layout.services);
  for (let i = 0, $$length = each_array_4.length; i < $$length; i++) {
    let serv = each_array_4[i];
    BlurFade($$renderer, {
      delay: 1.55 + i * 0.16,
      children: ($$renderer2) => {
        $$renderer2.push(`<div class="node service-node svelte-48wgln"${attr_style(`left: ${stringify(serv.x)}px; top: ${stringify(serv.y)}px;`)}>${escape_html(serv.name)}</div>`);
      },
      $$slots: { default: true }
    });
  }
  $$renderer.push(`<!--]--></div></div>`);
}
export {
  HubMcpFlow as H,
  Marquee as M
};

import { json } from "@sveltejs/kit";
const SERVICES = [
  {
    slug: "workflow-infrastructure",
    title: "Workflow Infrastructure",
    description: "CREATE SOMETHING builds production-safe workflow infrastructure for business-critical operations with clear trust boundaries.",
    category: "service"
  },
  {
    slug: "reliability-and-control-layer",
    title: "Reliability and Control Layer",
    description: "CREATE SOMETHING .agency provides evals, release gates, policy controls, and incident loops for production automation.",
    category: "service"
  },
  {
    slug: "enterprise-extension",
    title: "Enterprise Extension",
    description: "Custom orchestration for high-stakes, cross-system, and compliance-heavy workflows.",
    category: "service"
  },
  {
    slug: "mcp-only-discovery",
    title: "MCP-only (Discovery/Compliance)",
    description: "Scoped entry wedge for read-only or limited-scope connectivity when teams need a safe workflow starting point before broader automation.",
    category: "service"
  }
];
const WORK = [
  {
    slug: "arc-for-gmail",
    title: "Arc for Gmail",
    description: "Agent-powered email assistant with Gmail integration",
    category: "case-study"
  },
  {
    slug: "kickstand",
    title: "Kickstand",
    description: "Artist discovery and curation platform for Half Dozen",
    category: "case-study"
  },
  {
    slug: "maverick-x",
    title: "Maverick X",
    description: "Full rebrand and platform delivery in 3 weeks",
    category: "case-study"
  },
  {
    slug: "the-stack",
    title: "The Stack",
    description: "Restaurant website with reservations and location management",
    category: "case-study"
  },
  {
    slug: "viralytics",
    title: "Viralytics",
    description: "Social media analytics and content optimization platform",
    category: "case-study"
  }
];
const GET = async () => {
  return json({
    property: "agency",
    services: SERVICES,
    work: WORK,
    // Legacy format for backward compatibility
    serviceSlugs: SERVICES.map((s) => s.slug),
    workSlugs: WORK.map((w) => w.slug),
    generated: (/* @__PURE__ */ new Date()).toISOString()
  });
};
export {
  GET
};

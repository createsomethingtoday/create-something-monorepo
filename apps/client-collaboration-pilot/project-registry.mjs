const deny = () => {
  throw Error("project_unavailable");
};
function canonical(input) {
  if (
    typeof input !== "string" ||
    input.length > 2048 ||
    /[\\\u0000-\u0020\u007f]/.test(input)
  )
    return deny();
  let url;
  try {
    url = new URL(input);
  } catch {
    return deny();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port ||
    url.hostname.endsWith(".")
  )
    return deny();
  return { origin: url.origin, path: url.pathname };
}
/** No fetch, DNS lookup, redirect following, filesystem root, token or credential output. */
export function createProjectRegistry({ entries, authorizePrincipal }) {
  const origins = new Map();
  for (const row of structuredClone(entries)) {
    if (
      !row.projectId ||
      !row.tenant ||
      !row.repositoryKey ||
      !row.previewTargetId ||
      !Array.isArray(row.pages) ||
      !row.pages.length ||
      !Array.isArray(row.origins) ||
      !row.origins.length
    )
      throw Error("invalid_project_registry");
    for (const origin of row.origins) {
      const c = canonical(origin);
      if (c.path !== "/" || origins.has(c.origin))
        throw Error("ambiguous_project_origin");
      origins.set(c.origin, row);
    }
  }
  return {
    resolve(input, principal) {
      const c = canonical(input),
        entry = origins.get(c.origin);
      if (
        !entry ||
        !authorizePrincipal(principal) ||
        principal.tenant !== entry.tenant ||
        principal.channel !== "review-ui" ||
        !["member", "reviewer"].includes(principal.role) ||
        !entry.pages.includes(c.path)
      )
        return deny();
      return {
        projectId: entry.projectId,
        tenant: entry.tenant,
        page: c.path,
        canonicalOrigin: entry.origins[0],
        repositoryKey: entry.repositoryKey,
        previewTargetId: entry.previewTargetId,
        authorization: "verified-project-membership",
        productionApproval: "micah-only",
        credentialAccess: false,
      };
    },
  };
}

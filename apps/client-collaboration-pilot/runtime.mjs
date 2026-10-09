import { mkdirSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "./store.mjs";
import { repository } from "./repository.mjs";

export const defaultHome = fileURLToPath(
  new URL("./.local/repository-loop/", import.meta.url),
);
// home is an operator launch setting, never read from request or MCP arguments.
export function openRuntime(home = defaultHome, options = {}) {
  if (process.env.NODE_ENV === "production")
    throw Error("Synthetic runtime cannot run in production");
  if (options.deploymentSnapshots !== undefined) {
    for (const tenant of ["maverickx", "other-client"]) {
      if (
        !options.deploymentSnapshots ||
        !Object.hasOwn(options.deploymentSnapshots, tenant) ||
        typeof options.deploymentSnapshots[tenant] !== "function"
      )
        throw Error("deployment_reader_required:" + tenant);
    }
  }
  mkdirSync(home, { recursive: true });
  home = realpathSync(home);
  const repositories = Object.fromEntries(
    ["maverickx", "other-client"].map((tenant) => {
      const repo = repository(join(home, tenant + ".git"), tenant, {
        ...options.repositoryOptions,
        ...(options.deploymentSnapshots
          ? {
              readDeployment: options.deploymentSnapshots[tenant],
              now: options.now,
            }
          : {}),
      });
      repo.initialize();
      return [tenant, repo];
    }),
  );
  return {
    repositories,
    store: openStore(join(home, "state.sqlite"), {
      repositories,
      beforeCommit: options.beforeCommit,
      authorizePrincipal: options.authorizePrincipal,
      promotionPolicy: options.promotionPolicy,
    }),
  };
}

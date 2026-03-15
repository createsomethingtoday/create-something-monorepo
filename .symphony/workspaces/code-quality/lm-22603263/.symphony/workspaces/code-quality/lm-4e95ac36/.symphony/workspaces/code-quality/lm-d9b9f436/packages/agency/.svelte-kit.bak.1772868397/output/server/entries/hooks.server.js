import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { createAuthHooks } from "../chunks/session.js";
const deprecatedRedirects = {
  "/categories": "/services",
  "/category": "/services",
  "/work": "/",
  "/discover": "/"
};
const redirectHandle = async ({ event, resolve }) => {
  const path = event.url.pathname;
  if (deprecatedRedirects[path]) {
    throw redirect(301, deprecatedRedirects[path]);
  }
  for (const [prefix, target] of Object.entries(deprecatedRedirects)) {
    if (path.startsWith(prefix + "/")) {
      throw redirect(301, target);
    }
  }
  return resolve(event);
};
const authHandle = createAuthHooks({
  protectedPaths: ["/account", "/dashboard", "/admin", "/mcp-access"],
  loginPath: "/login",
  includeRedirect: true
});
const handle = sequence(redirectHandle, authHandle);
export {
  handle
};

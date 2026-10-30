import { syntheticWindow } from "../../../../../../synthetic-access.mjs";
import { createLoginHandler } from "@create-something/canon/auth/handlers";
const login = createLoginHandler({
  audience: "ona-agents",
  isProduction: true,
});
const origin = "https://goldin-coordination-test.pages.dev";
export const POST = async (event) => {
  const checkWindow = () =>
    syntheticWindow({
      ENVIRONMENT: "synthetic",
      IDENTITY_ISSUER: "https://id.createsomething.space",
      IDENTITY_JWKS_URL:
        "https://id.createsomething.space/.well-known/jwks.json",
      IDENTITY_AUDIENCE: "ona-agents",
      SYNTHETIC_TEST_STARTED_AT:
        event.platform?.env?.GOLDIN_SYNTHETIC_STARTED_AT,
      SYNTHETIC_TEST_EXPIRES_AT:
        event.platform?.env?.GOLDIN_SYNTHETIC_EXPIRES_AT,
    });
  try {
    checkWindow();
  } catch {
    return Response.json({ success: false, error: "Sign-in disabled" }, { status: 503, headers: {"Cache-Control":"no-store"} });
  }
  if (event.platform?.env?.GOLDIN_LOGIN_ENABLED !== "true")
    return Response.json({ success: false, error: "Sign-in disabled" }, { status: 503, headers: {"Cache-Control":"no-store"} });
  if (
    event.url.origin !== origin ||
    event.request.headers.get("Origin") !== origin ||
    event.request.headers.get("Sec-Fetch-Site") !== "same-origin"
  )
    return Response.json({ success: false, error: "Forbidden" }, { status: 403, headers: {"Cache-Control":"no-store"} });
  const reader = event.request.body?.getReader();
  let bytes = 0;
  const chunks = [];
  if (!reader) return Response.json({ success: false, error: "Invalid body" }, { status: 400, headers: {"Cache-Control":"no-store"} });
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 8192) {
      await reader.cancel();
      return Response.json({ success: false, error: "Body too large" }, { status: 413, headers: {"Cache-Control":"no-store"} });
    }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const c of chunks) {
    body.set(c, offset);
    offset += c.length;
  }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (parsed.email?.toLowerCase() !== "synthetic.operator@example.test")
      return Response.json({ success: false, error: "Forbidden" }, { status: 403, headers: {"Cache-Control":"no-store"} });
  } catch {
    return Response.json({ success: false, error: "Invalid body" }, { status: 400, headers: {"Cache-Control":"no-store"} });
  }
  try {
    checkWindow();
  } catch {
    return Response.json({ success: false, error: "Sign-in disabled" }, { status: 503, headers: {"Cache-Control":"no-store"} });
  }
  return login({ ...event, request: new Request(event.request, { body }) });
};

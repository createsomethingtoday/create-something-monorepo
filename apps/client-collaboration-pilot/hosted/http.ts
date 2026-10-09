import { BoundaryError, requireValue } from "./common";
import type { membershipBoundary } from "./identity";
import type { collaborationService } from "./service";
export function httpBoundary({
  origin,
  project,
  identity,
  service,
}: {
  origin: string;
  project: string;
  identity: ReturnType<typeof membershipBoundary>;
  service: ReturnType<typeof collaborationService>;
}) {
  const methods = {
    feedback: service.feedback,
    "agent-request": service.requestAgent,
    review: service.review,
    preview: service.requestPreview,
    "production-review": service.approveProduction,
  };
  return {
    async fetch(request: Request) {
      try {
        const url = new URL(request.url);
        requireValue(
          url.origin === origin && !url.search,
          "request_rejected",
          403,
        );
        const member = await identity.resolve(request, project);
        if (request.method === "GET" && url.pathname === "/api/collaboration")
          return response(await service.query(member));
        requireValue(
          request.method === "POST" &&
            request.headers.get("origin") === origin &&
            request.headers.get("content-type") === "application/json",
          "request_rejected",
          403,
        );
        // Same-origin JSON plus fetch-site checks prevent simple cross-site cookie posts.
        requireValue(
          !request.headers.has("sec-fetch-site") ||
            request.headers.get("sec-fetch-site") === "same-origin",
          "request_rejected",
          403,
        );
        const method =
          methods[
            url.pathname.replace(
              "/api/collaboration/",
              "",
            ) as keyof typeof methods
          ];
        requireValue(
          url.pathname.startsWith("/api/collaboration/") &&
            Object.hasOwn(
              methods,
              url.pathname.slice("/api/collaboration/".length),
            ) &&
            method,
          "not_found",
          404,
        );
        requireValue(
          !request.headers.has("content-length") ||
            Number(request.headers.get("content-length")) <= 16384,
          "body_too_large",
          413,
        );
        const reader = request.body?.getReader();
        requireValue(reader, "body_required", 400);
        let size = 0;
        const chunks: Uint8Array[] = [];
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 16384) {
            await reader.cancel();
            throw new BoundaryError("body_too_large", 413);
          }
          chunks.push(part.value);
        }
        let raw = "";
        const decoder = new TextDecoder();
        for (const chunk of chunks)
          raw += decoder.decode(chunk, { stream: true });
        raw += decoder.decode();
        let args;
        try {
          args = JSON.parse(raw);
        } catch {
          throw new BoundaryError("invalid_json", 400);
        }
        requireValue(
          args && typeof args === "object" && !Array.isArray(args),
          "invalid_body",
          400,
        );
        return response(await method(member, args));
      } catch (e) {
        return response(
          {
            error:
              e instanceof BoundaryError ? e.code : "temporarily_unavailable",
          },
          e instanceof BoundaryError ? e.status : 503,
        );
      }
    },
  };
}
function response(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}

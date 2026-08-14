from http.client import HTTPConnection
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os


UPSTREAM_HOST = os.environ.get("UPSTREAM_HOST", "host.docker.internal")
UPSTREAM_PORT = int(os.environ.get("UPSTREAM_PORT", "4173"))
BLOCKED_PREFIXES = ("/book", "/api", "/admin")
HOP_BY_HOP_HEADERS = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


class AgencyBridge(BaseHTTPRequestHandler):
    server_version = "AgencyBridge/1.0"

    def log_message(self, fmt, *args):
        print("agency-bridge", fmt % args, flush=True)

    def _reject(self, status, message):
        body = message.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _forward(self, method):
        path = self.path.split("?", 1)[0]
        if path.startswith(BLOCKED_PREFIXES):
            return self._reject(403, "This evaluation proxy does not permit booking or API routes.")
        connection = HTTPConnection(UPSTREAM_HOST, UPSTREAM_PORT, timeout=30)
        try:
            # Vite's dev-server host check accepts its loopback name. The
            # bridge still connects to the Docker Desktop host address; only
            # the HTTP Host header is normalized for the local server.
            connection.request(method, self.path, headers={"Host": f"localhost:{UPSTREAM_PORT}"})
            response = connection.getresponse()
            body = response.read()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in HOP_BY_HOP_HEADERS and key.lower() != "content-length":
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if method != "HEAD":
                self.wfile.write(body)
        finally:
            connection.close()

    def do_GET(self):
        self._forward("GET")

    def do_HEAD(self):
        self._forward("HEAD")

    def do_POST(self):
        self._reject(405, "This evaluation proxy is read-only.")

    do_PUT = do_POST
    do_PATCH = do_POST
    do_DELETE = do_POST


ThreadingHTTPServer(("0.0.0.0", 8080), AgencyBridge).serve_forever()

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
import select
import socket


ALLOWED_CONNECT_HOSTS = frozenset(
    host.strip().lower()
    for host in os.environ.get(
        "ALLOWED_CONNECT_HOSTS",
        "auth.openai.com,chatgpt.com,api.openai.com",
    ).split(",")
    if host.strip()
)


class LlmBridge(BaseHTTPRequestHandler):
    """A fixed-host TLS tunnel for Codex subscription authentication and inference."""

    server_version = "LlmBridge/1.0"

    def log_message(self, fmt, *args):
        print("llm-bridge", fmt % args, flush=True)

    def _reject(self, status, message):
        body = message.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_CONNECT(self):
        target, separator, port_text = self.path.rpartition(":")
        host = target.lower()
        if (
            not separator
            or not target
            or port_text != "443"
            or host not in ALLOWED_CONNECT_HOSTS
        ):
            return self._reject(403, "Only fixed OpenAI TLS hosts are permitted.")

        try:
            upstream = socket.create_connection((host, 443), timeout=30)
        except OSError as exc:
            return self._reject(502, f"Could not connect to allowed upstream: {exc}")

        self.send_response(200, "Connection Established")
        self.end_headers()
        self.connection.setblocking(False)
        upstream.setblocking(False)
        try:
            sockets = (self.connection, upstream)
            while True:
                readable, _, _ = select.select(sockets, [], [], 120)
                if not readable:
                    return
                for source in readable:
                    destination = upstream if source is self.connection else self.connection
                    data = source.recv(65536)
                    if not data:
                        return
                    destination.sendall(data)
        finally:
            upstream.close()

    def do_GET(self):
        self._reject(405, "Only fixed-host TLS CONNECT requests are permitted.")

    do_POST = do_GET
    do_PUT = do_GET
    do_PATCH = do_GET
    do_DELETE = do_GET


ThreadingHTTPServer(("0.0.0.0", 8000), LlmBridge).serve_forever()

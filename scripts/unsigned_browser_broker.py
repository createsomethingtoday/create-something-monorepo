#!/usr/bin/env python3
"""Host-only, task-scoped unsigned HTML readback. No browser starts on import.

The agent API cannot run scripts or interact with pages. All page HTTP is
fulfilled by a bounded, address-pinned GET fetcher; Chromium has a dead proxy.
See docs/guides/UNSIGNED_BROWSER_BROKER.md for scope and host verification.
"""

from __future__ import annotations

import argparse
import base64
import contextlib
import ctypes
import hmac
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urljoin, urlsplit

MAX_INPUT = 4096
MAX_OUTPUT = 2 * 1024 * 1024
MAX_RESOURCE = 2 * 1024 * 1024
MAX_TOTAL = 8 * 1024 * 1024
MAX_REQUESTS = 64
WORKER_SECONDS = 25
NAVIGATION_MS = 10000
SETTLE_MS = 500
# Fixed broker code, never caller-supplied. Remove transports/worker constructors
# that can escape ordinary HTTP request routing, in every document realm.
DISABLE_UNROUTED_APIS = """(() => {
  for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection',
                      'WebSocket', 'WebTransport', 'Worker', 'SharedWorker']) {
    Object.defineProperty(globalThis, name, {
      value: undefined, writable: false, configurable: false
    });
  }
})();"""


class Rejected(Exception):
    def __init__(self, status: int, code: str):
        self.status, self.code = status, code
        super().__init__(code)


class CleanupFailed(Rejected):
    def __init__(self, residual_path=None):
        super().__init__(503, "cleanup_failed_session_closed")
        # Operator-only location; never include profile, token or exception text.
        self.residual_path = residual_path


def parse_url(value: str):
    if (not isinstance(value, str) or not value or len(value) > 2048
            or not value.isascii() or any(ord(c) <= 32 or ord(c) == 127 for c in value)
            or "\\" in value or "#" in value):
        raise Rejected(400, "invalid_url")
    try:
        p = urlsplit(value)
        if (p.scheme not in ("http", "https") or not p.hostname or p.username is not None
                or p.password is not None or "%" in p.netloc or p.fragment
                or p.hostname.endswith(".")):
            raise ValueError()
        port = p.port or (443 if p.scheme == "https" else 80)
        if not 1 <= port <= 65535 or p.port == 0:
            raise ValueError()
        host = p.hostname.lower()
        if not re.fullmatch(r"[a-z0-9.:-]+", host):
            raise ValueError()
        authority = f"[{host}]" if ":" in host else host
        origin = f"{p.scheme}://{authority}:{port}"
        return p, origin, host, port
    except ValueError as exc:
        raise Rejected(400, "invalid_url") from exc


@dataclass(frozen=True)
class Policy:
    public: frozenset[str]
    local: frozenset[str]

    def csp(self):
        origins = " ".join(sorted(self.public | self.local))
        return ("sandbox allow-same-origin allow-scripts; default-src 'none'; "
                f"script-src {origins} 'unsafe-inline'; connect-src {origins}; "
                f"style-src {origins} 'unsafe-inline'; img-src {origins} data:; "
                f"font-src {origins}; worker-src 'none'; form-action 'none'; "
                "frame-src 'none'; object-src 'none'; base-uri 'none'")

    @classmethod
    def create(cls, public=(), local=()):
        def normalize(values, is_local):
            result = set()
            for value in values:
                p, origin, host, _ = parse_url(value)
                if p.path not in ("", "/") or p.query:
                    raise Rejected(400, "origin_required")
                if is_local:
                    if host not in ("127.0.0.1", "::1") or p.port is None:
                        raise Rejected(400, "exact_loopback_origin_required")
                else:
                    if host == "localhost" or host.endswith(".localhost"):
                        raise Rejected(400, "public_origin_required")
                    try:
                        address = ipaddress.ip_address(host)
                    except ValueError:
                        pass
                    else:
                        if not address.is_global:
                            raise Rejected(400, "public_origin_required")
                result.add(origin)
            return frozenset(result)
        policy = cls(normalize(public, False), normalize(local, True))
        if not policy.public and not policy.local:
            raise Rejected(400, "allowlist_required")
        return policy

    def check(self, url: str):
        parsed = parse_url(url)
        if parsed[1] not in self.public | self.local:
            raise Rejected(403, "origin_denied")
        return parsed

    def addresses(self, url: str):
        p, origin, host, port = self.check(url)
        entries = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        if not entries:
            raise Rejected(403, "address_denied")
        for family, _, _, _, sockaddr in entries:
            address = ipaddress.ip_address(sockaddr[0])
            if family not in (socket.AF_INET, socket.AF_INET6):
                raise Rejected(403, "address_denied")
            if origin in self.local:
                if str(address) != host:
                    raise Rejected(403, "address_denied")
            elif (not address.is_global or address.is_multicast or address.is_reserved or
                  isinstance(address, ipaddress.IPv6Address) and (
                      address.ipv4_mapped is not None or address.sixtofour is not None
                      or address.teredo is not None
                      or address in ipaddress.ip_network("64:ff9b::/96"))):
                raise Rejected(403, "address_denied")
        return p, host, port, entries[0]


class Fetcher:
    """No proxy, cookie jar, auth, redirect following, or second DNS resolution."""

    def __init__(self, policy, deadline):
        self.policy, self.deadline = policy, deadline
        self.count = self.total = 0

    def get(self, url):
        self.count += 1
        if self.count > MAX_REQUESTS or time.monotonic() >= self.deadline:
            raise Rejected(413, "network_budget_exceeded")
        p, host, port, (family, socktype, proto, _, sockaddr) = self.policy.addresses(url)
        remaining = min(5, self.deadline - time.monotonic())
        if remaining <= 0:
            raise Rejected(504, "deadline_exceeded")
        connection = http.client.HTTPConnection(host, port, timeout=remaining)
        sock = socket.socket(family, socktype, proto)
        try:
            sock.settimeout(remaining)
            sock.connect(sockaddr)
            if p.scheme == "https":
                sock = ssl.create_default_context().wrap_socket(sock, server_hostname=host)
            connection.sock = sock
            path = p.path or "/"
            if p.query:
                path += "?" + p.query
            connection.request("GET", path, headers={
                "Accept-Encoding": "identity", "User-Agent": "UnsignedReadback/1.0",
                "Connection": "close", "Accept": "*/*",
            })
            response = connection.getresponse()
            if response.getheader("Content-Encoding", "identity").lower() != "identity":
                raise Rejected(502, "encoded_response_denied")
            if response.getheader("Content-Disposition", "").lower().startswith("attachment"):
                raise Rejected(403, "download_denied")
            data = response.read(min(MAX_RESOURCE, MAX_TOTAL - self.total) + 1)
            self.total += len(data)
            if len(data) > MAX_RESOURCE or self.total > MAX_TOTAL:
                raise Rejected(413, "network_budget_exceeded")
            # Deliberate response-header allowlist: never set cookies, refresh,
            # authentication challenges, alt-svc, preload links, or reporting URLs.
            csp = self.policy.csp()
            upstream_csp = response.getheader("Content-Security-Policy")
            if upstream_csp:
                csp += ", " + upstream_csp  # Both policies apply; never weaken the site's CSP.
            headers = {"content-type": response.getheader("Content-Type", "text/plain"),
                       "content-security-policy": csp, "cache-control": "no-store"}
            if response.getheader("Access-Control-Allow-Origin"):
                headers["access-control-allow-origin"] = response.getheader("Access-Control-Allow-Origin")
            if 300 <= response.status < 400:
                location = response.getheader("Location")
                if not location:
                    raise Rejected(502, "invalid_redirect")
                location = urljoin(url, location)
                self.policy.check(location)
                headers["location"] = location
            return response.status, headers, data
        finally:
            connection.close()
            sock.close()


def record_launch_intent(launcher):
    # This must precede creation of the Playwright driver, not just Chromium.
    # Presence means a detached launcher may still publish enrollment later.
    path = Path(launcher).with_name("browser-launch-intent")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as output:
        output.write("launch may be pending\n")


def render(job):
    """Only called in the disposable host worker, never in nonbrowser tests."""
    record_launch_intent(job["browser_launcher"])
    from playwright.sync_api import sync_playwright

    policy = Policy.create(job["public"], job["local"])
    fetcher = Fetcher(policy, time.monotonic() + WORKER_SECONDS - 3)
    blocked = 0
    # Non-forwarding proxy guards network paths outside Playwright routing.
    # Hold the port open for this worker's lifetime; never accept or forward.
    with socket.socket() as dead_proxy, sync_playwright() as playwright:
        dead_proxy.bind(("127.0.0.1", 0))
        dead_proxy.listen(1)
        browser = playwright.chromium.launch(
            executable_path=job["browser_launcher"], headless=True, chromium_sandbox=True,
            timeout=NAVIGATION_MS,
            proxy={"server": f"http://127.0.0.1:{dead_proxy.getsockname()[1]}",
                   "bypass": "<-loopback>"},
            args=["--disable-extensions", "--disable-quic", "--disable-background-networking",
                  "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                  "--host-resolver-rules=MAP * ~NOTFOUND"],
        )
        try:
            context = browser.new_context(
                viewport={"width": 800, "height": 600}, device_scale_factor=1,
                storage_state={"cookies": [], "origins": []}, permissions=[],
                service_workers="block", java_script_enabled=True, accept_downloads=False,
            )
            try:
                initial_cookies = len(context.cookies())
                context.add_init_script(DISABLE_UNROUTED_APIS)
                context.route_web_socket("**/*", lambda route: route.close())
                page = context.new_page()
                context.on("page", lambda extra: extra.close())

                def route_request(route):
                    nonlocal blocked
                    request = route.request
                    try:
                        if (request.method != "GET" or request.resource_type not in
                                {"document", "stylesheet", "image", "font", "script", "fetch", "xhr"}
                                or request.frame != page.main_frame):
                            raise Rejected(403, "request_denied")
                        status, headers, data = fetcher.get(request.url)
                        route.fulfill(status=status, headers=headers, body=data)
                    except Exception:
                        blocked += 1
                        route.abort("blockedbyclient")

                context.route("**/*", route_request)
                response = page.goto(job["url"], timeout=NAVIGATION_MS, wait_until="load")
                page.wait_for_timeout(SETTLE_MS)
                policy.check(page.url)
                text = page.locator("body").inner_text(timeout=2000)
                result = {"task_id": job["task_id"], "url": page.url,
                          "status": response.status if response else None,
                          "title": page.title()[:1024], "text": text[:65536],
                          "text_truncated": len(text) > 65536,
                          "blocked_requests": blocked, "initial_cookies": initial_cookies,
                          "cookies": len(context.cookies()),
                          "coverage": "unsigned-get-only-site-scripts; load plus 500ms settle"}
                if job["screenshot"]:
                    result["screenshot_png_base64"] = base64.b64encode(page.screenshot(
                        type="png", full_page=False, timeout=3000, animations="disabled"
                    )).decode("ascii")
                return result
            finally:
                context.close()
        finally:
            browser.close()


def encode_result(result):
    data = json.dumps(result, ensure_ascii=True, separators=(",", ":")).encode()
    if len(data) > MAX_OUTPUT:
        raise Rejected(413, "response_too_large")
    return data


class ProcessUniqueInfo(ctypes.Structure):
    # Darwin proc_uniqidentifierinfo, PROC_PIDUNIQIDENTIFIERINFO (17).
    # p_uniqueid changes on fork/spawn, survives exec; lstart seconds do not
    # uniquely identify processes. Require the full ABI, never a time fallback.
    _fields_ = [("uuid", ctypes.c_uint8 * 16), ("uniqueid", ctypes.c_uint64),
                ("parent_uniqueid", ctypes.c_uint64), ("idversion", ctypes.c_int32),
                ("original_parent_version", ctypes.c_int32),
                ("reserved2", ctypes.c_uint64), ("reserved3", ctypes.c_uint64)]


def process_birth(pid):
    # Keep the serialized 'birth' key, but v5 accepts kernel IDs only.
    if sys.platform != "darwin" or type(pid) is not int or pid <= 1:
        raise CleanupFailed()
    library = ctypes.CDLL("/usr/lib/libproc.dylib", use_errno=True)
    inspect = library.proc_pidinfo
    inspect.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_uint64,
                       ctypes.c_void_p, ctypes.c_int]
    inspect.restype = ctypes.c_int
    info = ProcessUniqueInfo()
    if (ctypes.sizeof(info) != 56
            or inspect(pid, 17, 0, ctypes.byref(info), ctypes.sizeof(info)) != ctypes.sizeof(info)
            or not info.uniqueid):
        raise CleanupFailed()
    return f"darwin-uniqueid:{info.uniqueid}"


def valid_identity(value):
    return isinstance(value, str) and re.fullmatch(r"darwin-uniqueid:[1-9][0-9]*", value) is not None


def write_browser_launcher(directory, executable):
    """Enroll the detached browser group before exec; failure means no launch.

    The private record survives Python-worker exit/reparenting. The wrapper
    execs the operator's explicit cached binary without changing PID or PGID.
    It preserves Playwright's inherited debugging-pipe descriptors.
    """
    record = Path(directory) / "browser-owner.json"
    intent = Path(directory) / "browser-launch-intent"
    launcher = Path(directory) / "launch-browser"
    source = f'''#!{sys.executable}
import json, os, runpy, sys
if not os.path.isfile({str(intent)!r}):
    raise SystemExit("Browser launch intent required")
pid, group = os.getpid(), os.getpgrp()
if pid != group:
    raise SystemExit("Browser must own its process group")
birth = runpy.run_path({str(Path(__file__).resolve())!r})["process_birth"](pid)
if not birth:
    raise SystemExit("Cannot establish browser identity")
pending = {str(record) + '.pending'!r}
descriptor = os.open(pending, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(descriptor, "w") as output:
    json.dump({{"pid": pid, "group": group, "birth": birth}}, output)
os.link(pending, {str(record)!r})
os.unlink(pending)
os.execv({executable!r}, [{executable!r}, *sys.argv[1:]])
'''
    with launcher.open("x") as output:
        output.write(source)
    launcher.chmod(0o700)
    return launcher, record


def process_table():
    rows = subprocess.check_output(
        ["/bin/ps", "-axo", "pid=,ppid=,pgid=,stat="], timeout=2, text=True,
        env={"PATH": "/usr/bin:/bin"},
    )
    table = {}
    for line in rows.splitlines():
        values = line.split()
        if values:
            pid, parent, group = map(int, values[:3])
            if values[3].startswith("Z"):
                # Already dead; Darwin may no longer expose its unique ID.
                # Live members still require a verified identity anchor.
                continue
            try:
                identity = process_birth(pid)
            except (CleanupFailed, OSError, AttributeError):
                # Unrelated/inaccessible/exited processes confer no ownership.
                identity = None
            table[pid] = {"pid": pid, "parent": parent, "group": group,
                          "state": values[3], "birth": identity}
    return table


def owned_groups(table, owners, disqualified, witnessed):
    # Disqualification is terminal across the whole cleanup attempt. Even an
    # absent replacement leader in a later snapshot cannot restore authority.
    if disqualified:
        raise CleanupFailed()
    groups = set()
    for group, birth in owners.items():
        leader = table.get(group)
        members = {pid: row for pid, row in table.items() if row["group"] == group}
        if (not valid_identity(birth)
                or leader and (leader["birth"] != birth or leader["group"] != group)):
            disqualified.add(group)
            raise CleanupFailed()
        if not members:
            continue
        prior = witnessed.get(group, {})
        if (any(not valid_identity(row["birth"]) or pid in prior and prior[pid] != row["birth"]
                for pid, row in members.items())
                or not leader and not any(prior.get(pid) == row["birth"] for pid, row in members.items())):
            disqualified.add(group)
            raise CleanupFailed()
        groups.add(group)
    descendants = {pid for pid, row in table.items() if row["group"] in groups}
    while True:
        expanded = descendants | {pid for pid, row in table.items() if row["parent"] in descendants}
        if expanded == descendants:
            break
        descendants = expanded
    for pid in descendants:
        group = table[pid]["group"]
        if group in descendants:
            identity = table[group]["birth"]
            if (group in disqualified or not valid_identity(identity)
                    or group in owners and owners[group] != identity):
                disqualified.add(group)
                raise CleanupFailed()
            groups.add(group)
            owners.setdefault(group, identity)
    for group in groups:
        members = {pid: row["birth"] for pid, row in table.items() if row["group"] == group}
        if any(not valid_identity(identity) for identity in members.values()):
            disqualified.add(group)
            raise CleanupFailed()
        witnessed.setdefault(group, {}).update(members)
    return groups


def quiesce_groups(owners, disqualified, witnessed, process=None):
    """Return only after observed owned groups have no live members."""
    groups = owned_groups(process_table(), owners, disqualified, witnessed)
    for group in groups:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(group, signal.SIGTERM)
    # Give Playwright's signal handlers a bounded chance to close gracefully.
    if process is not None:
        try:
            process.wait(timeout=1)
        except subprocess.TimeoutExpired:
            pass
    groups = owned_groups(process_table(), owners, disqualified, witnessed)
    for group in groups:
        with contextlib.suppress(ProcessLookupError):
            os.killpg(group, signal.SIGKILL)
    if process is not None:
        process.wait(timeout=2)
    deadline = time.monotonic() + 1
    while True:
        table = process_table()
        groups = owned_groups(table, owners, disqualified, witnessed)
        if not any(row["group"] in groups and not row["state"].startswith("Z")
                   for row in table.values()):
            return
        if time.monotonic() >= deadline:
            raise CleanupFailed()
        time.sleep(0.02)


def stop_worker(process, worker_birth, browser_record):
    # Ordered states: quiesce producer -> reconcile launch -> quiesce enrolled
    # browser. Never infer "no browser" from a pre-quiescence record check.
    owners = {process.pid: worker_birth}
    disqualified, witnessed = set(), {}
    quiesce_groups(owners, disqualified, witnessed, process)

    browser_record = Path(browser_record)
    intent = browser_record.with_name("browser-launch-intent")
    if not intent.exists():
        # The now-quiescent worker never crossed the launch boundary. A record
        # without intent violates the protocol and cannot establish success.
        if browser_record.exists():
            raise CleanupFailed()
        return
    # Intent without a complete record may be a still-running detached
    # launcher. Fail closed, retaining its future publication destination.
    if not browser_record.is_file():
        raise CleanupFailed()
    record = json.loads(browser_record.read_text())
    pid, birth = record.get("pid"), record.get("birth")
    if (type(pid) is not int or pid <= 1 or record.get("group") != pid
            or not valid_identity(birth) or pid in owners and owners[pid] != birth):
        raise CleanupFailed()
    owners[pid] = birth
    quiesce_groups(owners, disqualified, witnessed)


def run_worker(job, timeout, scratch):
    # Every request owns its profile, HOME, TMPDIR and process group. No caller
    # environment secrets, profile, browser flags, or executable come from API input.
    # Do not use TemporaryDirectory's automatic finalizer: a cleanup failure
    # must retain the ownership record and profile for operator reconciliation.
    temporary = tempfile.mkdtemp(prefix="unsigned-readback-", dir=scratch)
    cleanup_confirmed = True  # No process exists until Popen succeeds.
    try:
        launcher, browser_record = write_browser_launcher(temporary, job["executable"])
        job = dict(job, browser_launcher=str(launcher))
        environment = {"PATH": "/usr/bin:/bin:/opt/homebrew/bin", "HOME": temporary,
                       "TMPDIR": temporary, "LANG": "en_US.UTF-8"}
        with tempfile.TemporaryFile(dir=temporary) as output:
            cleanup_confirmed = False
            try:
                process = subprocess.Popen(
                    [sys.executable, "-I", "-B", str(Path(__file__).resolve()), "--worker"],
                    stdin=subprocess.PIPE, stdout=output, stderr=subprocess.DEVNULL,
                    env=environment, start_new_session=True,
                )
            except Exception:
                # Popen reaps a child whose exec failed before raising.
                cleanup_confirmed = True
                raise
            worker_birth = None
            try:
                worker_birth = process_birth(process.pid)
                if not worker_birth:
                    raise CleanupFailed()
                process.communicate(json.dumps(job).encode(), timeout=timeout)
                output.seek(0)
                data = output.read(MAX_OUTPUT + 1)
                if process.returncode != 0:
                    raise Rejected(502, "render_failed")
                if len(data) > MAX_OUTPUT:
                    raise Rejected(413, "response_too_large")
                return json.loads(data)
            except subprocess.TimeoutExpired as exc:
                raise Rejected(504, "render_timeout") from exc
            finally:
                try:
                    if not worker_birth:
                        raise CleanupFailed()
                    stop_worker(process, worker_birth, browser_record)
                    cleanup_confirmed = True
                except Exception:
                    # A Popen PID is not continuing proof of ownership. It may
                    # already have been reaped and reused, or inspection may
                    # have failed before identity was established. Do not signal
                    # any fallback group: revoke and retain evidence for host
                    # reconciliation when verified cleanup cannot complete.
                    raise CleanupFailed(temporary) from None
    finally:
        if cleanup_confirmed:
            try:
                shutil.rmtree(temporary)
            except OSError:
                # Even confirmed process teardown can leave a partially removed
                # directory; preserve its exact path and close the capability.
                raise CleanupFailed(temporary) from None


def unique_object(pairs):
    obj = {}
    for key, value in pairs:
        if key in obj:
            raise Rejected(400, "duplicate_field")
        obj[key] = value
    return obj


class Session:
    def __init__(self, task_id, policy, executable, ttl, scratch, renderer=run_worker):
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", task_id) or not 1 <= ttl <= 900:
            raise Rejected(400, "invalid_session")
        self.task_id, self.policy, self.executable = task_id, policy, executable
        self.token = secrets.token_urlsafe(32)
        self.deadline = time.monotonic() + ttl
        self.expires_at = time.time() + ttl
        self.scratch, self.renderer = scratch, renderer
        self.requests = 0

    def authenticate(self, authorization):
        if time.monotonic() >= self.deadline:
            raise Rejected(410, "session_expired")
        if not isinstance(authorization, str) or not hmac.compare_digest(
                authorization.encode(), ("Bearer " + self.token).encode()):
            raise Rejected(401, "invalid_token")

    def read(self, authorization, body):
        self.authenticate(authorization)
        if len(body) > MAX_INPUT:
            raise Rejected(413, "input_too_large")
        try:
            request = json.loads(body, object_pairs_hook=unique_object)
        except (ValueError, UnicodeError, RecursionError) as exc:
            raise Rejected(400, "invalid_json") from exc
        if (not isinstance(request, dict) or set(request) != {"task_id", "url", "screenshot"}
                or type(request["screenshot"]) is not bool):
            raise Rejected(400, "invalid_fields")
        if request["task_id"] != self.task_id:
            raise Rejected(403, "task_denied")
        self.policy.check(request["url"])
        self.requests += 1
        if self.requests > 100:
            raise Rejected(429, "session_budget_exceeded")
        job = dict(request, public=sorted(self.policy.public), local=sorted(self.policy.local),
                   executable=self.executable)
        result = self.renderer(job, min(WORKER_SECONDS, self.deadline - time.monotonic()), self.scratch)
        self.authenticate(authorization)  # Never return readback after expiry.
        return encode_result(result)


class Handler(BaseHTTPRequestHandler):
    server_version = "UnsignedReadback"

    def setup(self):
        super().setup()
        self.connection.settimeout(3)
        # Absolute input deadline also stops clients dripping header/body bytes.
        self.input_timer = threading.Timer(3, self.close_input)
        self.input_timer.daemon = True
        self.input_timer.start()

    def close_input(self):
        with contextlib.suppress(OSError):
            self.connection.shutdown(socket.SHUT_RDWR)

    def finish(self):
        self.input_timer.cancel()
        super().finish()

    def log_message(self, *_):
        pass  # Never log URLs, headers, tokens, or page content.

    def do_POST(self):
        try:
            if self.path != "/read":
                raise Rejected(404, "not_found")
            expected_host = f"127.0.0.1:{self.server.server_port}"
            if self.headers.get_all("Host", []) != [expected_host]:
                raise Rejected(403, "host_denied")
            if any(name in self.headers for name in ("Origin", "Referer", "Sec-Fetch-Site")):
                raise Rejected(403, "browser_caller_denied")
            auth = self.headers.get_all("Authorization", [])
            if len(auth) != 1:
                raise Rejected(401, "invalid_token")
            self.server.session.authenticate(auth[0])
            if (self.headers.get_all("Content-Type", []) != ["application/json"]
                    or "Transfer-Encoding" in self.headers):
                raise Rejected(400, "invalid_framing")
            lengths = self.headers.get_all("Content-Length", [])
            if len(lengths) != 1 or not re.fullmatch(r"[0-9]{1,9}", lengths[0]):
                raise Rejected(400, "invalid_length")
            length = int(lengths[0])
            if length > MAX_INPUT:
                raise Rejected(413, "input_too_large")
            body = self.rfile.read(length)
            if len(body) != length:
                raise Rejected(400, "incomplete_input")
            self.input_timer.cancel()
            data = self.server.session.read(auth[0], body)
            self.respond(200, data)
        except CleanupFailed as exc:
            self.server.session.deadline = 0
            if exc.residual_path is not None:
                print(json.dumps({"error": exc.code, "residual_path": exc.residual_path}),
                      file=sys.stderr, flush=True)
            self.respond(exc.status, encode_result({"error": exc.code}))
        except Rejected as exc:
            self.respond(exc.status, encode_result({"error": exc.code}))
        except Exception:
            self.respond(502, b'{"error":"readback_failed"}')

    def respond(self, status, data):
        self.close_connection = True
        try:
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(data)
        except OSError:
            pass


class Server(HTTPServer):
    allow_reuse_address = False
    request_queue_size = 4

    def handle_error(self, *_):
        pass


def serve(args):
    policy = Policy.create(args.allow_origin, args.allow_local_origin)
    executable = Path(args.executable).resolve(strict=True)
    if not executable.is_file() or not os.access(executable, os.X_OK):
        raise Rejected(400, "invalid_executable")
    session = Session(args.task_id, policy, str(executable), args.ttl, args.scratch_dir)
    with Server(("127.0.0.1", 0), Handler) as server:
        server.session = session
        origin = f"http://127.0.0.1:{server.server_port}"
        if origin in policy.local:
            raise Rejected(400, "broker_origin_denied")
        # Explicit operator-owned path; exclusive create, no overwrite or symlinks.
        descriptor = os.open(args.session_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        owned = os.fstat(descriptor)
        try:
            with os.fdopen(descriptor, "w") as output:
                json.dump({"url": origin + "/read", "task_id": session.task_id,
                           "token": session.token, "expires_at": session.expires_at}, output)
            server.timeout = 0.25
            while time.monotonic() < session.deadline:
                server.handle_request()
        finally:
            # Do not remove another process's replacement file.
            with contextlib.suppress(FileNotFoundError):
                current = os.lstat(args.session_file)
                if (current.st_dev, current.st_ino) == (owned.st_dev, owned.st_ino):
                    os.unlink(args.session_file)


def main():
    if sys.argv[1:] == ["--worker"]:
        try:
            result = render(json.loads(sys.stdin.buffer.read(16384)))
            sys.stdout.buffer.write(encode_result(result))
        except Exception:
            return 1
        return 0
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--task-id", required=True)
    parser.add_argument("--allow-origin", action="append", default=[])
    parser.add_argument("--allow-local-origin", action="append", default=[])
    parser.add_argument("--executable", required=True)
    parser.add_argument("--session-file", required=True)
    parser.add_argument("--scratch-dir", required=True)
    parser.add_argument("--ttl", type=int, default=300)
    args = parser.parse_args()
    def stop(*_):
        raise SystemExit(0)
    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        serve(args)
    except (Rejected, OSError) as exc:
        print(f"Broker startup failed: {type(exc).__name__}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Focused tests: fake renderer and local HTTP only; never launch Chromium."""

import http.client
import io
import json
import os
from pathlib import Path
import runpy
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

import unsigned_browser_broker as broker


def finish_owned_test_process(process, birth, record, scratch, cleanup_confirmed):
    """Remove test scratch only after identity-checked process cleanup succeeds."""
    try:
        if not cleanup_confirmed and birth is not None:
            broker.stop_worker(process, birth, record)
            cleanup_confirmed = True
        if cleanup_confirmed:
            process.wait(timeout=2)
            shutil.rmtree(scratch)
    finally:
        for stream in (process.stdin, process.stdout, process.stderr):
            if stream is not None:
                stream.close()
    return cleanup_confirmed


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = broker.Policy.create(["https://example.com"], ["http://127.0.0.1:8123"])

    def test_exact_origins(self):
        self.policy.check("https://example.com/path?q=yes")
        self.policy.check("http://127.0.0.1:8123/")
        for url in ["https://example.com.evil/", "https://sub.example.com/",
                    "http://example.com/", "https://example.com:444/",
                    "http://127.0.0.1:8124/", "http://localhost:8123/"]:
            with self.subTest(url=url), self.assertRaises(broker.Rejected):
                self.policy.check(url)

    def test_site_script_csp_retains_read_only_boundaries(self):
        csp = self.policy.csp()
        self.assertIn("script-src http://127.0.0.1:8123 https://example.com:443 'unsafe-inline'", csp)
        self.assertIn("connect-src http://127.0.0.1:8123 https://example.com:443", csp)
        for directive in ["worker-src 'none'", "form-action 'none'", "frame-src 'none'"]:
            self.assertIn(directive, csp)
        self.assertNotIn("unsafe-eval", csp)

    def test_ambiguous_and_non_http_urls(self):
        for url in ["file:///etc/passwd", "data:text/html,hello", "javascript:alert(1)",
                    "https://user:pass@example.com", "https://example.com\\@evil/",
                    "https://example.com/%0d%0a", "https://example.com/#fragment",
                    "https://example.com\n/", "https://example.com./", "https://%65xample.com/",
                    "https://example.com:0/", None, 7, "https://éxample.com/"]:
            # Encoded CR/LF in a path stays encoded on the wire and is not a header.
            if url == "https://example.com/%0d%0a":
                self.policy.check(url)
                continue
            with self.subTest(url=url), self.assertRaises(broker.Rejected):
                self.policy.check(url)

    def test_configuration_requires_explicit_origins(self):
        for public, local in [([], []), (["https://example.com/path"], []),
                              (["http://10.0.0.1"], []), (["http://localhost"], []),
                              ([], ["http://127.0.0.1"]), ([], ["http://192.168.1.1:80"]),
                              ([], ["http://localhost:8123"])]:
            with self.subTest(public=public, local=local), self.assertRaises(broker.Rejected):
                broker.Policy.create(public, local)

    def test_dns_rebinding_and_mixed_answers_denied(self):
        def answer(ip):
            return (socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))
        for ips in [["127.0.0.1"], ["10.0.0.1"], ["169.254.169.254"], ["100.64.0.1"],
                    ["93.184.216.34", "192.168.1.1"], ["224.0.0.1"]]:
            with self.subTest(ips=ips), patch.object(socket, "getaddrinfo", return_value=[answer(ip) for ip in ips]):
                with self.assertRaises(broker.Rejected):
                    self.policy.addresses("https://example.com/")
        with patch.object(socket, "getaddrinfo", return_value=[answer("93.184.216.34")]):
            self.assertEqual(self.policy.addresses("https://example.com/")[-1][-1][0], "93.184.216.34")

    def test_ipv6_transition_and_local_expansion_denied(self):
        for ip in ["::1", "::ffff:8.8.8.8", "64:ff9b::a00:1", "2002:7f00:1::", "ff02::1"]:
            with self.subTest(ip=ip), patch.object(socket, "getaddrinfo", return_value=[
                    (socket.AF_INET6, socket.SOCK_STREAM, 6, "", (ip, 443, 0, 0))]):
                with self.assertRaises(broker.Rejected):
                    self.policy.addresses("https://example.com/")


class SessionFixture:
    def setUp(self):
        self.renderer = MagicMock(return_value={"text": "Example Domain"})
        self.session = broker.Session("CRE-121", broker.Policy.create(["https://example.com"]),
                                      "/explicit/chromium", 60, None, self.renderer)
        self.auth = "Bearer " + self.session.token
        self.body = json.dumps({"task_id": "CRE-121", "url": "https://example.com/", "screenshot": True}).encode()

    def rejected(self, status, auth=None, body=None):
        with self.assertRaises(broker.Rejected) as raised:
            self.session.read(self.auth if auth is None else auth, self.body if body is None else body)
        self.assertEqual(raised.exception.status, status)
        self.renderer.assert_not_called()


class SessionTests(SessionFixture, unittest.TestCase):
    def test_invalid_token_never_starts_worker(self):
        for auth in ["", "Bearer wrong", "Basic xxx", "Bearer é"]:
            self.rejected(401, auth=auth)

    def test_expiry_never_starts_worker(self):
        self.session.deadline = time.monotonic() - 1
        self.rejected(410)

    def test_input_size_never_starts_worker(self):
        self.rejected(413, body=b"x" * (broker.MAX_INPUT + 1))

    def test_wrong_task_origin_and_arbitrary_code_rejected(self):
        for updates, status in [({"task_id": "CRE-other"}, 403),
                                ({"url": "http://127.0.0.1/"}, 403),
                                ({"script": "alert(1)"}, 400), ({"screenshot": "true"}, 400),
                                ({"headers": {"Cookie": "session=x"}}, 400)]:
            body = dict(json.loads(self.body), **updates)
            self.rejected(status, body=json.dumps(body).encode())

    def test_duplicate_keys_and_invalid_json(self):
        for body in [b'{"url":"a","url":"b"}', b"[]", b"null", b"\xff", b"{"]:
            self.rejected(400, body=body)

    def test_valid_job_contains_no_credential(self):
        data = json.loads(self.session.read(self.auth, self.body))
        self.assertEqual(data["text"], "Example Domain")
        job, timeout, scratch = self.renderer.call_args.args
        self.assertEqual(job["executable"], "/explicit/chromium")
        self.assertNotIn(self.session.token, json.dumps(job))
        self.assertLessEqual(timeout, broker.WORKER_SECONDS)

    def test_result_after_expiry_is_withheld(self):
        def expire(*_):
            self.session.deadline = 0
            return {"text": "must not escape"}
        self.renderer.side_effect = expire
        with self.assertRaises(broker.Rejected) as raised:
            self.session.read(self.auth, self.body)
        self.assertEqual(raised.exception.status, 410)

    def test_output_limit(self):
        self.renderer.return_value = {"text": "x" * broker.MAX_OUTPUT}
        with self.assertRaises(broker.Rejected) as raised:
            self.session.read(self.auth, self.body)
        self.assertEqual(raised.exception.status, 413)


class HttpTests(SessionFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        self.server = broker.Server(("127.0.0.1", 0), broker.Handler)
        self.server.session = self.session
        self.thread = threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.01})
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def request(self, headers=None, body=None, method="POST", path="/read"):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=2)
        try:
            combined = {"Authorization": self.auth, "Content-Type": "application/json"}
            combined.update(headers or {})
            connection.request(method, path, self.body if body is None else body, combined)
            response = connection.getresponse()
            return response.status, response.read()
        finally:
            connection.close()

    def test_http_auth_origin_and_size(self):
        for headers, body, expected in [({"Authorization": "Bearer bad"}, None, 401),
                                        ({"Origin": "https://example.com"}, None, 403),
                                        ({"Host": "evil.example"}, None, 403),
                                        ({}, b"x" * (broker.MAX_INPUT + 1), 413),
                                        ({"Transfer-Encoding": "chunked"}, b"", 400)]:
            with self.subTest(headers=headers):
                self.assertEqual(self.request(headers, body)[0], expected)
        self.renderer.assert_not_called()

    def test_valid_http_and_no_other_routes(self):
        self.assertEqual(self.request()[0], 200)
        self.assertEqual(self.request(path="/eval")[0], 404)
        self.assertEqual(self.request(method="GET")[0], 501)

    def test_http_expiry(self):
        self.session.deadline = 0
        self.assertEqual(self.request()[0], 410)
        self.renderer.assert_not_called()

    def test_cleanup_failure_revokes_session(self):
        self.renderer.side_effect = broker.CleanupFailed("/owned/private/residual")
        diagnostics = io.StringIO()
        with patch.object(sys, "stderr", diagnostics):
            status, body = self.request()
        self.assertEqual(status, 503)
        self.assertEqual(json.loads(body), {"error": "cleanup_failed_session_closed"})
        self.assertEqual(json.loads(diagnostics.getvalue()), {
            "error": "cleanup_failed_session_closed", "residual_path": "/owned/private/residual"})
        self.assertNotIn(self.session.token, diagnostics.getvalue())
        self.assertNotIn(b"/owned/private/residual", body)
        self.assertEqual(self.request()[0], 410)
        self.renderer.assert_called_once()

    def test_duplicate_length_is_rejected(self):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=2)
        try:
            connection.putrequest("POST", "/read")
            connection.putheader("Authorization", self.auth)
            connection.putheader("Content-Type", "application/json")
            connection.putheader("Content-Length", "0")
            connection.putheader("Content-Length", "1")
            connection.endheaders()
            response = connection.getresponse()
            self.assertEqual(response.status, 400)
            response.read()
            self.renderer.assert_not_called()
        finally:
            connection.close()


class FetchTests(unittest.TestCase):
    def test_real_loopback_get_does_not_keep_cookies(self):
        from http.server import BaseHTTPRequestHandler, HTTPServer
        observed = []
        class Fixture(BaseHTTPRequestHandler):
            def do_GET(self):
                observed.append(dict(self.headers))
                self.send_response(200)
                self.send_header("Set-Cookie", "session=must-not-persist")
                self.send_header("Content-Length", "2")
                self.end_headers()
                self.wfile.write(b"ok")
            def log_message(self, *_):
                pass
        server = HTTPServer(("127.0.0.1", 0), Fixture)
        thread = threading.Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
        thread.start()
        try:
            origin = f"http://127.0.0.1:{server.server_port}"
            fetcher = broker.Fetcher(broker.Policy.create(local=[origin]), time.monotonic() + 5)
            for _ in range(2):
                status, headers, data = fetcher.get(origin + "/")
                self.assertEqual((status, data), (200, b"ok"))
                self.assertNotIn("set-cookie", headers)
            self.assertEqual(len(observed), 2)
            self.assertTrue(all("Cookie" not in headers for headers in observed))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_address_pinned_no_cookies_auth_or_redirect_follow(self):
        policy = broker.Policy.create(["http://example.com"])
        response = MagicMock(status=200)
        response.getheader.side_effect = lambda name, default=None: {
            "Content-Type": "text/html", "Set-Cookie": "secret=1"}.get(name, default)
        response.read.return_value = b"<h1>Example</h1>"
        with patch.object(socket, "getaddrinfo", return_value=[
                (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80))]) as dns, \
                patch.object(socket, "socket") as make_socket, \
                patch.object(http.client, "HTTPConnection") as make_connection:
            connection = make_connection.return_value
            connection.getresponse.return_value = response
            status, headers, data = broker.Fetcher(policy, time.monotonic() + 10).get("http://example.com/")
            make_socket.return_value.connect.assert_called_once_with(("93.184.216.34", 80))
            dns.assert_called_once()
            sent = connection.request.call_args.kwargs["headers"]
            self.assertNotIn("Cookie", sent)
            self.assertNotIn("Authorization", sent)
            self.assertNotIn("set-cookie", headers)
            self.assertEqual(status, 200)
            self.assertEqual(data, b"<h1>Example</h1>")
            connection.close.assert_called_once()

    def test_redirect_private_and_oversize_rejected(self):
        policy = broker.Policy.create(["http://example.com"])
        for status, location, content, expected in [(302, "http://127.0.0.1/", b"", 403),
                                                   (200, None, b"x" * (broker.MAX_RESOURCE + 1), 413)]:
            response = MagicMock(status=status)
            response.read.return_value = content
            response.getheader.side_effect = lambda name, default=None: location if name == "Location" else default
            with patch.object(policy.__class__, "addresses", return_value=(
                    broker.parse_url("http://example.com/")[0], "example.com", 80,
                    (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 80)))), \
                    patch.object(socket, "socket"), patch.object(http.client, "HTTPConnection") as connection:
                connection.return_value.getresponse.return_value = response
                with self.assertRaises(broker.Rejected) as raised:
                    broker.Fetcher(policy, time.monotonic() + 10).get("http://example.com/")
                self.assertEqual(raised.exception.status, expected)
                connection.return_value.close.assert_called_once()


class WorkerTests(unittest.TestCase):
    @staticmethod
    def rows(*pids):
        return {pid: {"pid": pid, "parent": parent, "group": group,
                      "birth": "darwin-uniqueid:100", "state": "S"}
                for pid, parent, group in pids}

    def test_kernel_identity_distinguishes_same_pid_without_timestamp_fallback(self):
        identifiers = iter((101, 102))
        def inspect(pid, flavor, arg, buffer, size):
            self.assertEqual((pid, flavor, arg, size), (900, 17, 0, 56))
            buffer._obj.uniqueid = next(identifiers)
            return size
        with patch.object(broker.ctypes, "CDLL") as library, \
                patch.object(sys, "platform", "darwin"), \
                patch.object(subprocess, "check_output") as ps:
            library.return_value.proc_pidinfo.side_effect = inspect
            first, second = broker.process_birth(900), broker.process_birth(900)
        self.assertEqual((first, second), ("darwin-uniqueid:101", "darwin-uniqueid:102"))
        ps.assert_not_called()

    def test_kernel_identity_failure_has_no_coarse_fallback(self):
        for size, uniqueid in ((0, 100), (55, 100), (56, 0)):
            def inspect(_pid, _flavor, _arg, buffer, _size):
                buffer._obj.uniqueid = uniqueid
                return size
            with self.subTest(size=size, uniqueid=uniqueid), \
                    patch.object(broker.ctypes, "CDLL") as library, \
                    patch.object(sys, "platform", "darwin"), \
                    patch.object(subprocess, "check_output") as ps:
                library.return_value.proc_pidinfo.side_effect = inspect
                with self.assertRaises(broker.CleanupFailed):
                    broker.process_birth(900)
                ps.assert_not_called()

    def test_disqualification_survives_replacement_leader_exit(self):
        owners, disqualified, witnessed = {902: "darwin-uniqueid:99"}, set(), {}
        # R3: first a mismatched leader, then only a member of its reused PGID,
        # then an empty table. None can turn terminal failure into success.
        snapshots = [self.rows((902, 1, 902), (903, 902, 902)),
                     self.rows((903, 1, 902)), {}]
        for rows in snapshots:
            with self.assertRaises(broker.CleanupFailed):
                broker.owned_groups(rows, owners, disqualified, witnessed)
            self.assertEqual(disqualified, {902})

    def test_r3_retains_record_without_signals_or_success(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            process = MagicMock(pid=900, returncode=0)
            captured = {}
            owner = {"pid": 902, "group": 902, "birth": "darwin-uniqueid:99"}
            def spawn(*_, **kwargs):
                directory = Path(kwargs["env"]["HOME"])
                captured["directory"] = directory
                broker.record_launch_intent(directory / "launch-browser")
                descriptor = os.open(directory / "browser-owner.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(descriptor, "w") as output:
                    json.dump(owner, output)
                kwargs["stdout"].write(b'{"text":"must not return success"}')
                return process
            with patch.object(subprocess, "Popen", side_effect=spawn), \
                    patch.object(broker, "process_birth", return_value="darwin-uniqueid:100"), \
                    patch.object(broker, "process_table", side_effect=[
                        self.rows((902, 1, 902), (903, 902, 902)),
                        self.rows((902, 1, 902), (903, 902, 902)),
                        self.rows((902, 1, 902), (903, 902, 902)),
                        self.rows((902, 1, 902), (903, 902, 902)),
                        self.rows((903, 1, 902)), {}]) as table, \
                    patch.object(os, "killpg") as kill:
                with self.assertRaises(broker.CleanupFailed) as raised:
                    broker.run_worker({"executable": sys.executable}, 1, scratch)
            kill.assert_not_called()
            self.assertEqual(table.call_count, 4)  # Worker quiesced; reject browser before disappearance.
            directory = captured["directory"]
            self.assertEqual(raised.exception.residual_path, str(directory))
            self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
            record = directory / "browser-owner.json"
            self.assertEqual(record.stat().st_mode & 0o777, 0o600)
            self.assertEqual(json.loads(record.read_text()), owner)

    def test_leaderless_group_requires_previously_verified_member(self):
        owners, disqualified, witnessed = {902: "darwin-uniqueid:100"}, set(), {}
        rows = self.rows((902, 1, 902), (903, 902, 902))
        self.assertEqual(broker.owned_groups(rows, owners, disqualified, witnessed), {902})
        rows = self.rows((903, 1, 902))
        self.assertEqual(broker.owned_groups(rows, owners, disqualified, witnessed), {902})
        # A PGID alone with no enrolled leader or known member is ambiguous.
        with self.assertRaises(broker.CleanupFailed):
            broker.owned_groups(rows, owners, set(), {})
        # Reuse of an observed member is also terminal.
        rows[903]["birth"] = "darwin-uniqueid:101"
        with self.assertRaises(broker.CleanupFailed):
            broker.owned_groups(rows, owners, disqualified, witnessed)
        self.assertEqual(disqualified, {902})

    def test_cleanup_failure_retains_private_recovery_record(self):
        # Reproduce R1 for both a timed-out render and an apparently successful
        # render: failed teardown must not erase the reconciliation evidence.
        for timed_out in (True, False):
            with self.subTest(timed_out=timed_out), tempfile.TemporaryDirectory(
                    dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
                process = MagicMock(pid=900, returncode=0)
                captured = {}
                owner = {"pid": 902, "group": 902, "birth": "darwin-uniqueid:100"}
                def spawn(*_, **kwargs):
                    directory = Path(kwargs["env"]["HOME"])
                    captured["directory"] = directory
                    def communicate(*_, **__):
                        record = directory / "browser-owner.json"
                        descriptor = os.open(record, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                        with os.fdopen(descriptor, "w") as output:
                            json.dump(owner, output)
                        profile = directory / "profile"
                        profile.mkdir()
                        (profile / "private-test-data").write_text("private-profile-sentinel")
                        if timed_out:
                            raise subprocess.TimeoutExpired("worker", 1)
                        kwargs["stdout"].write(b'{"text":"private-rendered-sentinel"}')
                    process.communicate.side_effect = communicate
                    return process
                with patch.object(subprocess, "Popen", side_effect=spawn), \
                        patch.object(broker, "process_birth", return_value=owner["birth"]), \
                        patch.object(broker, "stop_worker", side_effect=PermissionError("private-error-sentinel")), \
                        patch.object(os, "killpg") as kill:
                    with self.assertRaises(broker.CleanupFailed) as raised:
                        broker.run_worker({"url": "https://example.com", "executable": sys.executable}, 1, scratch)
                kill.assert_not_called()
                directory = captured["directory"]
                self.assertEqual(raised.exception.residual_path, str(directory))
                self.assertEqual(raised.exception.status, 503)
                self.assertEqual(str(raised.exception), "cleanup_failed_session_closed")
                self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
                record = directory / "browser-owner.json"
                self.assertEqual(record.stat().st_mode & 0o777, 0o600)
                self.assertEqual(json.loads(record.read_text()), owner)
                self.assertTrue((directory / "profile" / "private-test-data").is_file())
                self.assertTrue((directory / "launch-browser").is_file())
                self.assertEqual(list(Path(scratch).iterdir()), [directory])

    def test_unverified_worker_never_receives_fallback_signal(self):
        # Exercise run_worker AND stop_worker: the first snapshot excludes a
        # reused PID, then inspection fails. No fallback may undo that decision.
        for failure in ("reused_then_inspection_failure", "missing_birth", "empty_birth", "birth_lookup_failure"):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory(
                    dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
                process = MagicMock(pid=900, returncode=0)
                owner = {"pid": 902, "group": 902, "birth": "darwin-uniqueid:99"}
                captured = {}
                def spawn(*_, **kwargs):
                    directory = Path(kwargs["env"]["HOME"])
                    captured["directory"] = directory
                    record = directory / "browser-owner.json"
                    descriptor = os.open(record, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    with os.fdopen(descriptor, "w") as output:
                        json.dump(owner, output)
                    kwargs["stdout"].write(b'{"text":"withheld"}')
                    return process
                birth = MagicMock(return_value=owner["birth"])
                if failure == "missing_birth":
                    birth.return_value = None
                elif failure == "empty_birth":
                    birth.return_value = ""
                elif failure == "birth_lookup_failure":
                    birth.side_effect = PermissionError("inspection denied")
                with patch.object(subprocess, "Popen", side_effect=spawn), \
                        patch.object(broker, "process_birth", birth), \
                        patch.object(broker, "process_table", side_effect=[
                            self.rows((900, 1, 900), (902, 1, 902)),
                            PermissionError("inspection denied")]) as table, \
                        patch.object(os, "killpg") as kill:
                    with self.assertRaises(broker.CleanupFailed) as raised:
                        broker.run_worker({"executable": sys.executable}, 1, scratch)
                kill.assert_not_called()
                self.assertEqual(table.call_count, 1 if failure == "reused_then_inspection_failure" else 0)
                directory = captured["directory"]
                self.assertEqual(raised.exception.residual_path, str(directory))
                self.assertEqual(raised.exception.status, 503)
                self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
                record = directory / "browser-owner.json"
                self.assertEqual(record.stat().st_mode & 0o777, 0o600)
                self.assertEqual(json.loads(record.read_text()), owner)
                self.assertTrue((directory / "launch-browser").is_file())

    def test_successful_cleanup_removes_request_directory(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            process = MagicMock(pid=900, returncode=0)
            def spawn(*_, **kwargs):
                kwargs["stdout"].write(b'{"text":"ok"}')
                return process
            with patch.object(subprocess, "Popen", side_effect=spawn), \
                    patch.object(broker, "process_birth", return_value="darwin-uniqueid:100"), \
                    patch.object(broker, "stop_worker") as stop:
                result = broker.run_worker({"url": "https://example.com", "executable": sys.executable}, 1, scratch)
            self.assertEqual(result, {"text": "ok"})
            stop.assert_called_once()
            self.assertEqual(list(Path(scratch).iterdir()), [])

    def test_launch_intent_is_private_and_precedes_driver_creation(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            launcher = Path(scratch) / "launch-browser"
            marker = launcher.with_name("browser-launch-intent")
            sync_api = MagicMock()
            def driver():
                self.assertTrue(marker.is_file())
                self.assertEqual(marker.stat().st_mode & 0o777, 0o600)
                raise RuntimeError("stop before driver starts")
            sync_api.sync_playwright.side_effect = driver
            job = {"browser_launcher": str(launcher), "public": ["https://example.com"], "local": []}
            with patch.dict("sys.modules", {"playwright.sync_api": sync_api}):
                with self.assertRaisesRegex(RuntimeError, "stop before driver"):
                    broker.render(job)
                # Exclusive creation fails before a second driver can start.
                with self.assertRaises(FileExistsError):
                    broker.render(job)
            sync_api.sync_playwright.assert_called_once()

    def test_late_browser_enrollment_is_reconciled_after_worker_quiescence(self):
        # R5's interleaving: worker/driver already exited, detached launcher
        # publishes during the first cleanup snapshot. Browser stays unrelated
        # by PPID and can only be found by reconciling enrollment afterward.
        for browser_stops in (False, True):
            with self.subTest(browser_stops=browser_stops), tempfile.TemporaryDirectory(
                    dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
                process = MagicMock(pid=900, returncode=0)
                process.communicate.side_effect = subprocess.TimeoutExpired("worker", 1)
                captured = {}
                owner = {"pid": 902, "group": 902, "birth": "darwin-uniqueid:100"}
                def spawn(*_, **kwargs):
                    directory = Path(kwargs["env"]["HOME"])
                    captured["directory"] = directory
                    broker.record_launch_intent(directory / "launch-browser")
                    (directory / "profile-evidence").write_text("private sentinel")
                    return process
                snapshots = 0
                def snapshot():
                    nonlocal snapshots
                    snapshots += 1
                    directory = captured["directory"]
                    if snapshots == 1:
                        descriptor = os.open(directory / "browser-owner.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                        with os.fdopen(descriptor, "w") as output:
                            json.dump(owner, output)
                    if browser_stops and snapshots >= 6:
                        return {}
                    return self.rows((902, 1, 902))
                with patch.object(subprocess, "Popen", side_effect=spawn), \
                        patch.object(broker, "process_birth", return_value="darwin-uniqueid:100"), \
                        patch.object(broker, "process_table", side_effect=snapshot), \
                        patch.object(time, "monotonic", side_effect=[0, 10, 20]), \
                        patch.object(os, "killpg") as kill:
                    with self.assertRaises(broker.Rejected) as raised:
                        broker.run_worker({"executable": sys.executable}, 1, scratch)
                self.assertEqual([call.args for call in kill.call_args_list],
                                 [(902, signal.SIGTERM), (902, signal.SIGKILL)])
                self.assertEqual(snapshots, 6)
                directory = captured["directory"]
                if browser_stops:
                    self.assertEqual(raised.exception.status, 504)
                    self.assertFalse(directory.exists())
                else:
                    self.assertIsInstance(raised.exception, broker.CleanupFailed)
                    self.assertEqual(raised.exception.status, 503)
                    self.assertEqual(raised.exception.residual_path, str(directory))
                    self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
                    record = directory / "browser-owner.json"
                    self.assertEqual(record.stat().st_mode & 0o777, 0o600)
                    self.assertEqual(json.loads(record.read_text()), owner)
                    self.assertTrue((directory / "profile-evidence").is_file())

    def test_pending_enrollment_retains_destination_for_future_publication(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            process = MagicMock(pid=900, returncode=0)
            process.communicate.side_effect = subprocess.TimeoutExpired("worker", 1)
            captured = {}
            def spawn(*_, **kwargs):
                directory = Path(kwargs["env"]["HOME"])
                captured["directory"] = directory
                broker.record_launch_intent(directory / "launch-browser")
                return process
            with patch.object(subprocess, "Popen", side_effect=spawn), \
                    patch.object(broker, "process_birth", return_value="darwin-uniqueid:100"), \
                    patch.object(broker, "process_table", return_value=self.rows((902, 1, 902))), \
                    patch.object(os, "killpg") as kill:
                with self.assertRaises(broker.CleanupFailed) as raised:
                    broker.run_worker({"executable": sys.executable}, 1, scratch)
            kill.assert_not_called()  # No enrolled identity authorizes a signal.
            directory = captured["directory"]
            self.assertEqual(raised.exception.residual_path, str(directory))
            self.assertEqual(directory.stat().st_mode & 0o777, 0o700)
            self.assertTrue((directory / "browser-launch-intent").exists())
            # A detached launcher can still publish after cleanup returned 503;
            # the destination survives and no finalizer erases its evidence.
            record = directory / "browser-owner.json"
            descriptor = os.open(record, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w") as output:
                json.dump({"pid": 902, "group": 902, "birth": "darwin-uniqueid:100"}, output)
            self.assertEqual(record.stat().st_mode & 0o777, 0o600)
            self.assertTrue(record.exists())

    def test_launcher_enrolls_identity_before_exec_of_exact_binary(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            launcher, record = broker.write_browser_launcher(scratch, "/explicit/cached/chromium")
            broker.record_launch_intent(launcher)
            observed = []
            def observe_exec(executable, argv):
                observed.append((executable, argv, json.loads(record.read_text())))
            def inspect(_pid, _flavor, _arg, buffer, size):
                buffer._obj.uniqueid = 100
                return size
            with patch.object(os, "getpid", return_value=902), \
                    patch.object(os, "getpgrp", return_value=902), \
                    patch.object(broker.ctypes, "CDLL") as library, \
                    patch.object(sys, "platform", "darwin"), \
                    patch.object(os, "execv", side_effect=observe_exec), \
                    patch.object(sys, "argv", [str(launcher), "--remote-debugging-pipe"]):
                library.return_value.proc_pidinfo.side_effect = inspect
                runpy.run_path(str(launcher), run_name="__main__")
            self.assertEqual(observed, [("/explicit/cached/chromium",
                ["/explicit/cached/chromium", "--remote-debugging-pipe"],
                {"pid": 902, "group": 902, "birth": "darwin-uniqueid:100"})])
            self.assertEqual(record.stat().st_mode & 0o777, 0o600)
            self.assertFalse(Path(str(record) + ".pending").exists())

    def test_launcher_cannot_exec_without_prior_intent(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            launcher, record = broker.write_browser_launcher(scratch, "/explicit/cached/chromium")
            with patch.object(os, "execv") as execute:
                with self.assertRaisesRegex(SystemExit, "intent required"):
                    runpy.run_path(str(launcher), run_name="__main__")
            execute.assert_not_called()
            self.assertFalse(record.exists())

    def test_timeout_sanitizes_environment_and_reaps_owned_groups(self):
        process = MagicMock(pid=900)
        process.communicate.side_effect = subprocess.TimeoutExpired("worker", 1)
        process.poll.return_value = None
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            with patch.object(subprocess, "Popen", return_value=process) as popen, \
                    patch.object(broker, "process_birth", return_value="darwin-uniqueid:100"), \
                    patch.object(broker, "process_table", side_effect=[
                        self.rows((900, 1, 900), (901, 900, 900), (902, 901, 902), (55, 1, 55)),
                        self.rows((900, 1, 900), (902, 1, 902)), {}]), \
                    patch.object(os, "killpg") as kill:
                with self.assertRaises(broker.Rejected) as raised:
                    broker.run_worker({"url": "https://example.com", "executable": sys.executable}, 1, scratch)
                self.assertEqual(raised.exception.status, 504)
                environment = popen.call_args.kwargs["env"]
                self.assertEqual(set(environment), {"PATH", "HOME", "TMPDIR", "LANG"})
                self.assertTrue(popen.call_args.kwargs["start_new_session"])
                self.assertIn("-I", popen.call_args.args[0])
                self.assertEqual({call.args[0] for call in kill.call_args_list}, {900, 902})
                self.assertEqual(list(Path(scratch).iterdir()), [])

    def test_exited_worker_reaps_enrolled_reparented_browser(self):
        process = MagicMock(pid=900)
        process.poll.return_value = 0
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            record = Path(scratch) / "browser-owner.json"
            broker.record_launch_intent(Path(scratch) / "launch-browser")
            record.write_text(json.dumps({"pid": 902, "group": 902, "birth": "darwin-uniqueid:100"}))
            rows = self.rows((902, 1, 902), (903, 902, 902), (55, 1, 55))
            with patch.object(broker, "process_table", side_effect=[rows, rows, rows, rows, rows, {}]), \
                    patch.object(os, "killpg") as kill:
                broker.stop_worker(process, "darwin-uniqueid:100", record)
            self.assertEqual([call.args for call in kill.call_args_list],
                             [(902, signal.SIGTERM), (902, signal.SIGKILL)])

    def test_reused_browser_pid_is_not_killed(self):
        process = MagicMock(pid=900)
        process.poll.return_value = 0
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            record = Path(scratch) / "browser-owner.json"
            broker.record_launch_intent(Path(scratch) / "launch-browser")
            record.write_text(json.dumps({"pid": 902, "group": 902, "birth": "darwin-uniqueid:99"}))
            with patch.object(broker, "process_table", return_value=self.rows((902, 1, 902))), \
                    patch.object(os, "killpg") as kill:
                with self.assertRaises(broker.CleanupFailed):
                    broker.stop_worker(process, "darwin-uniqueid:99", record)
            kill.assert_not_called()

    def test_real_detached_nonbrowser_child_is_reaped_after_worker_exit(self):
        # Runs Python sleep, never Chromium. The launcher registers then execs
        # it exactly as it will the cached browser. Worker exit reparents it.
        try:
            broker.process_birth(os.getpid())
            broker.process_table()
        except (PermissionError, broker.CleanupFailed):
            self.skipTest("sandbox denies process inspection; run this nonbrowser teardown test on host")
        scratch = tempfile.mkdtemp(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR"))
        try:
            launcher, record = broker.write_browser_launcher(scratch, sys.executable)
            broker.record_launch_intent(launcher)
            code = ("import subprocess,sys; sys.stdin.read(); "
                    "p=subprocess.Popen([sys.argv[1], '-c', 'import time; time.sleep(30)'], "
                    "start_new_session=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, "
                    "stderr=subprocess.DEVNULL); print(p.pid, flush=True)")
            process = subprocess.Popen([sys.executable, "-B", "-c", code, str(launcher)],
                                       start_new_session=True, stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            child_pid = None
            birth = None
            cleanup_confirmed = False
            try:
                birth = broker.process_birth(process.pid)
                output, error = process.communicate(b"", timeout=3)
                self.assertEqual(process.returncode, 0, error)
                child_pid = int(output)
                deadline = time.monotonic() + 3
                while time.monotonic() < deadline and not record.exists():
                    time.sleep(0.01)
                enrolled = json.loads(record.read_text())
                self.assertEqual(enrolled["pid"], child_pid)
                self.assertIn(child_pid, broker.process_table())
                broker.stop_worker(process, birth, record)
                cleanup_confirmed = True
                row = broker.process_table().get(child_pid)
                self.assertTrue(row is None or row["state"].startswith("Z"))
            finally:
                finish_owned_test_process(process, birth, record, scratch, cleanup_confirmed)
        except Exception:
            # An uncertain cleanup keeps the private record and profile for
            # host reconciliation; never remove it merely to end the test.
            raise

    def test_host_finalizer_has_no_post_success_fallback_signals(self):
        scratch = tempfile.mkdtemp()
        process = MagicMock(pid=900, stdin=None, stdout=None, stderr=None)
        with patch.object(broker, "stop_worker") as stop, patch.object(os, "killpg") as kill:
            self.assertTrue(finish_owned_test_process(
                process, "darwin-uniqueid:100", Path(scratch) / "browser-owner.json",
                scratch, cleanup_confirmed=True))
        stop.assert_not_called()
        kill.assert_not_called()
        self.assertFalse(Path(scratch).exists())

    def test_host_finalizer_preserves_evidence_without_verified_identity(self):
        scratch = tempfile.mkdtemp()
        process = MagicMock(pid=900, stdin=None, stdout=None, stderr=None)
        try:
            with patch.object(broker, "stop_worker") as stop, patch.object(os, "killpg") as kill:
                self.assertFalse(finish_owned_test_process(
                    process, None, Path(scratch) / "browser-owner.json",
                    scratch, cleanup_confirmed=False))
            stop.assert_not_called()
            kill.assert_not_called()
            self.assertTrue(Path(scratch).exists())
        finally:
            shutil.rmtree(scratch)

    def test_host_finalizer_preserves_evidence_when_identity_reused(self):
        scratch = tempfile.mkdtemp()
        process = MagicMock(pid=900, stdin=None, stdout=None, stderr=None)
        try:
            with patch.object(broker, "stop_worker", side_effect=broker.CleanupFailed()), \
                    patch.object(os, "killpg") as kill:
                with self.assertRaises(broker.CleanupFailed):
                    finish_owned_test_process(process, "darwin-uniqueid:100",
                        Path(scratch) / "browser-owner.json", scratch, cleanup_confirmed=False)
            kill.assert_not_called()
            self.assertTrue(Path(scratch).exists())
        finally:
            shutil.rmtree(scratch)

    def test_render_uses_fresh_context_and_closes_on_error(self):
        sync_api = MagicMock()
        browser = sync_api.sync_playwright.return_value.__enter__.return_value.chromium.launch.return_value
        context = browser.new_context.return_value
        context.new_page.return_value.goto.side_effect = RuntimeError("navigation failed")
        with patch.dict("sys.modules", {"playwright.sync_api": sync_api}), patch.object(socket, "socket"), \
                patch.object(broker, "record_launch_intent"):
            with self.assertRaises(RuntimeError):
                broker.render({"public": ["https://example.com"], "local": [],
                               "browser_launcher": "/owned/launch-browser", "url": "https://example.com/"})
        config = browser.new_context.call_args.kwargs
        self.assertEqual(config["storage_state"], {"cookies": [], "origins": []})
        self.assertTrue(config["java_script_enabled"])
        self.assertFalse(config["accept_downloads"])
        self.assertEqual(config["service_workers"], "block")
        self.assertEqual(config["permissions"], [])
        context.add_init_script.assert_called_once_with(broker.DISABLE_UNROUTED_APIS)
        context.close.assert_called_once()
        browser.close.assert_called_once()

    def test_routes_allow_site_get_scripts_fetch_xhr_and_reject_mutations(self):
        sync_api = MagicMock()
        browser = sync_api.sync_playwright.return_value.__enter__.return_value.chromium.launch.return_value
        context = browser.new_context.return_value
        page = context.new_page.return_value
        page.goto.side_effect = RuntimeError("stop after route registration")
        with patch.dict("sys.modules", {"playwright.sync_api": sync_api}), patch.object(socket, "socket"), \
                patch.object(broker, "record_launch_intent"), \
                patch.object(broker.Fetcher, "get", return_value=(200, {}, b"ok")) as fetch:
            with self.assertRaises(RuntimeError):
                broker.render({"public": ["https://example.com"], "local": [],
                               "browser_launcher": "/owned/launch-browser", "url": "https://example.com/"})
            route_handler = context.route.call_args.args[1]
            for kind in ["script", "fetch", "xhr"]:
                route = MagicMock()
                route.request.method = "GET"
                route.request.resource_type = kind
                route.request.frame = page.main_frame
                route.request.url = "https://example.com/resource"
                route_handler(route)
                route.fulfill.assert_called_once()
                route.abort.assert_not_called()
            self.assertEqual(fetch.call_count, 3)
            for method, kind in [("POST", "fetch"), ("PUT", "xhr"), ("GET", "websocket"), ("GET", "other")]:
                route = MagicMock()
                route.request.method = method
                route.request.resource_type = kind
                route.request.frame = page.main_frame
                route_handler(route)
                route.abort.assert_called_once()
                route.fulfill.assert_not_called()
            self.assertEqual(fetch.call_count, 3)

    def test_idle_expiry_removes_credential_and_listener(self):
        from argparse import Namespace
        with tempfile.TemporaryDirectory(dir=os.environ.get("PAPERCLIP_SCRATCH_DIR") or os.environ.get("PAPERCLIP_RUN_SCRATCH_DIR")) as scratch:
            credential = Path(scratch) / "session.json"
            args = Namespace(allow_origin=["https://example.com"], allow_local_origin=[],
                             executable="/usr/bin/true", task_id="CRE-121", ttl=1,
                             scratch_dir=scratch, session_file=str(credential))
            failures = []
            def run():
                try:
                    broker.serve(args)
                except Exception as exc:
                    failures.append(exc)
            thread = threading.Thread(target=run)
            thread.start()
            try:
                deadline = time.monotonic() + 0.8
                while time.monotonic() < deadline:
                    if credential.exists() and credential.stat().st_size:
                        break
                    time.sleep(0.01)
                saved = json.loads(credential.read_text())
                self.assertEqual(credential.stat().st_mode & 0o777, 0o600)
                self.assertEqual(len(saved["token"]), 43)
            finally:
                thread.join(timeout=3)
            self.assertFalse(thread.is_alive())
            self.assertEqual(failures, [])
            self.assertFalse(credential.exists())
            port = broker.urlsplit(saved["url"]).port
            with socket.socket() as sock:
                self.assertNotEqual(sock.connect_ex(("127.0.0.1", port)), 0)


if __name__ == "__main__":
    unittest.main()

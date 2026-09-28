"""Boundary regression: printed lifecycle claims cannot substitute for Ego inventory."""

import importlib.util
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
from unittest.mock import patch


SOURCE = Path(__file__).with_name("paperclip-ego-operator.py")
SPEC = importlib.util.spec_from_file_location("paperclip_ego_operator", SOURCE)
operator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(operator)


class OperatorBoundaryTest(unittest.TestCase):
    ISSUE_ID = "26d4ae3e-d969-44bc-97e8-ed32bb1f631e"
    APPROVAL_ID = "28ad2f1d-c991-4a5b-90c7-ce80cb1904cb"

    def test_forged_creation_receipt_without_new_space_retains_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            lease_dir = Path(temporary) / "lease"
            issue_id = self.ISSUE_ID
            argv = ["operator", "--issue-id", issue_id, "--space-name", "approved-space",
                    "--task-script", str(Path(temporary) / "task.js")]
            with (patch.object(sys, "argv", argv),
                  patch.object(operator, "LEASE_DIR", lease_dir),
                  patch.object(operator, "require_host_user", return_value=os.getuid()),
                  patch.object(operator, "require_ego_executable"),
                  patch.object(operator, "require_host_script", return_value=b"console.log('work');"),
                  patch.object(operator, "read_task_approval", return_value={"approvalId": self.APPROVAL_ID}),
                  patch.object(operator, "consume_task_approval"),
                  patch.object(operator, "read_issue", return_value={
                      "id": issue_id, "identifier": "CRE-124", "assigneeUserId": "local-board"}),
                  patch.object(operator, "list_task_spaces", side_effect=[{}, {}, {}]),
                  patch.object(operator, "run_ego", return_value='PAPERCLIP_CREATED={"id":12,"name":"approved-space"}')):
                with self.assertRaisesRegex(RuntimeError, "did not match observed list delta"):
                    operator.main()
            state = json.loads((lease_dir / "active.json").read_text())
            self.assertEqual(state["outcome"], "failed")
            self.assertEqual(state["stage"], "reconciliation_required")
            self.assertEqual(state["failedStage"], "approved_once")
            self.assertIn("did not match observed list delta", state["failureMessage"])
            self.assertIsNone(state["taskSpaceId"])

    def test_approval_consumes_once_and_caps_lifetime(self):
        with tempfile.TemporaryDirectory() as temporary:
            lease_dir = Path(temporary)
            approval_file = lease_dir / "approved-task.json"
            script = b"console.log('work');"
            issued = datetime.now(timezone.utc)
            approval = {
                "approvalId": str(uuid4()), "issueId": self.ISSUE_ID,
                "spaceName": "approved-space",
                "scriptSha256": operator.hashlib.sha256(script).hexdigest(),
                "egoCliSha256": operator.EGO_CLI_SHA256,
                "issuedAt": issued.isoformat(),
                "expiresAt": (issued + timedelta(minutes=5)).isoformat(),
                "approvedBy": "local-board",
            }
            approval_file.write_text(json.dumps(approval))
            approval_file.chmod(0o600)
            with (patch.object(operator, "LEASE_DIR", lease_dir),
                  patch.object(operator, "APPROVAL_FILE", approval_file)):
                read = operator.read_task_approval(os.getuid(), self.ISSUE_ID,
                                                   "approved-space", script)
                operator.consume_task_approval(os.getuid(), read)
                with self.assertRaises(FileNotFoundError):
                    operator.read_task_approval(os.getuid(), self.ISSUE_ID,
                                                "approved-space", script)
                self.assertTrue((lease_dir / "consumed-approvals" / f"{approval['approvalId']}.json").exists())
                approval["expiresAt"] = (issued + timedelta(minutes=20)).isoformat()
                approval_file.write_text(json.dumps(approval))
                approval_file.chmod(0o600)
                with self.assertRaisesRegex(RuntimeError, "15-minute window"):
                    operator.read_task_approval(os.getuid(), self.ISSUE_ID,
                                                "approved-space", script)

    def test_work_failure_retains_observed_stage_and_reason(self):
        with tempfile.TemporaryDirectory() as temporary:
            lease_dir = Path(temporary) / "lease"
            argv = ["operator", "--issue-id", self.ISSUE_ID,
                    "--space-name", "approved-space", "--task-script", str(Path(temporary) / "task.js")]
            issue = {"id": self.ISSUE_ID, "identifier": "CRE-124", "assigneeUserId": "local-board"}
            with (patch.object(sys, "argv", argv),
                  patch.object(operator, "LEASE_DIR", lease_dir),
                  patch.object(operator, "require_host_user", return_value=os.getuid()),
                  patch.object(operator, "require_ego_executable"),
                  patch.object(operator, "require_host_script", return_value=b"console.log('work');"),
                  patch.object(operator, "read_task_approval", return_value={"approvalId": self.APPROVAL_ID}),
                  patch.object(operator, "consume_task_approval"),
                  patch.object(operator, "read_issue", return_value=issue),
                  patch.object(operator, "list_task_spaces", side_effect=[{}, {12: "approved-space"}, {12: "approved-space"}]),
                  patch.object(operator, "run_ego", side_effect=[
                      'PAPERCLIP_CREATED={"id":12,"name":"approved-space"}', RuntimeError("Ego command exited 7")])):
                with self.assertRaisesRegex(RuntimeError, "exited 7"):
                    operator.main()
            state = json.loads((lease_dir / "active.json").read_text())
            self.assertEqual(state["taskSpaceId"], 12)
            self.assertEqual(state["failedStage"], "created")
            self.assertEqual(state["failureMessage"], "Ego command exited 7")
            self.assertEqual(state["observedSpacesAtFailure"], {"12": "approved-space"})

    def test_complete_inventory_restoration_clears_active_lease(self):
        with tempfile.TemporaryDirectory() as temporary:
            lease_dir = Path(temporary) / "lease"
            argv = ["operator", "--issue-id", self.ISSUE_ID,
                    "--space-name", "approved-space", "--task-script", str(Path(temporary) / "task.js")]
            issue = {"id": self.ISSUE_ID, "identifier": "CRE-124", "assigneeUserId": "local-board"}
            with (patch.object(sys, "argv", argv),
                  patch.object(operator, "LEASE_DIR", lease_dir),
                  patch.object(operator, "require_host_user", return_value=os.getuid()),
                  patch.object(operator, "require_ego_executable"),
                  patch.object(operator, "require_host_script", return_value=b"console.log('work');"),
                  patch.object(operator, "read_task_approval", return_value={"approvalId": self.APPROVAL_ID}),
                  patch.object(operator, "consume_task_approval"),
                  patch.object(operator, "read_issue", return_value=issue),
                  patch.object(operator, "list_task_spaces", side_effect=[{}, {12: "approved-space"},
                                                                         {12: "approved-space"}, {}]),
                  patch.object(operator, "run_ego", side_effect=[
                      'PAPERCLIP_CREATED={"id":12,"name":"approved-space"}',
                      "work completed", "PAPERCLIP_FINISHED=12"])):
                with contextlib.redirect_stdout(io.StringIO()) as output:
                    self.assertEqual(operator.main(), 0)
            receipt = json.loads(output.getvalue())
            self.assertEqual(receipt["outcome"], "passed")
            self.assertEqual(receipt["taskSpaceId"], 12)
            self.assertFalse((lease_dir / "active.json").exists())


if __name__ == "__main__":
    unittest.main()

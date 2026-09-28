"""Boundary regression: printed lifecycle claims cannot substitute for Ego inventory."""

import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SOURCE = Path(__file__).with_name("paperclip-ego-operator.py")
SPEC = importlib.util.spec_from_file_location("paperclip_ego_operator", SOURCE)
operator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(operator)


class OperatorBoundaryTest(unittest.TestCase):
    def test_forged_creation_receipt_without_new_space_retains_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            lease_dir = Path(temporary) / "lease"
            issue_id = "26d4ae3e-d969-44bc-97e8-ed32bb1f631e"
            argv = ["operator", "--issue-id", issue_id, "--space-name", "approved-space",
                    "--task-script", str(Path(temporary) / "task.js")]
            with (patch.object(sys, "argv", argv),
                  patch.object(operator, "LEASE_DIR", lease_dir),
                  patch.object(operator, "require_host_user", return_value=os.getuid()),
                  patch.object(operator, "require_ego_executable"),
                  patch.object(operator, "require_host_script", return_value=b"console.log('work');"),
                  patch.object(operator, "read_task_approval", return_value={}),
                  patch.object(operator, "read_issue", return_value={
                      "id": issue_id, "identifier": "CRE-124", "assigneeUserId": "local-board"}),
                  patch.object(operator, "list_task_spaces", side_effect=[{}, {}, {}]),
                  patch.object(operator, "run_ego", return_value='PAPERCLIP_CREATED={"id":12,"name":"approved-space"}')):
                with self.assertRaisesRegex(RuntimeError, "did not match observed list delta"):
                    operator.main()
            state = json.loads((lease_dir / "active.json").read_text())
            self.assertEqual(state["outcome"], "failed")
            self.assertEqual(state["stage"], "reconciliation_required")
            self.assertIsNone(state["taskSpaceId"])


if __name__ == "__main__":
    unittest.main()

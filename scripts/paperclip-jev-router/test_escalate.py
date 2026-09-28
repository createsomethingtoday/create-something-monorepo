import hashlib
import json
import unittest
import urllib.error
import uuid
from datetime import datetime, timezone

import escalate
from route import build_request


def ident(number):
    return str(uuid.UUID(int=number))


def fence(name, value):
    return "```" + name + "\n" + json.dumps(value, sort_keys=True) + "\n```"


def fixture():
    issue_id, jev_id, selected_id, fallback_id, verifier_id, controller_id = [ident(n) for n in range(1, 7)]
    route_comment_id, approval_comment_id, verifier_comment_id = [ident(n) for n in range(7, 10)]
    source_run_id, verifier_run_id = ident(10), ident(11)
    now = datetime(2026, 9, 28, 10, 6, tzinfo=timezone.utc)
    goal = "Deliver a reviewed local code change that satisfies the stated acceptance checks."
    route_packet = json.loads(json.dumps({"taskId": issue_id, "summary": "A routine bounded code update with an independent verifier.", "goal": goal, "riskFlags": []}, sort_keys=True))
    route_receipt = {"taskId": issue_id, "requestHash": hashlib.sha256(build_request(route_packet)).hexdigest(), "status": "advisory", "servedModel": "jev-1.13.0", "recommendation": "sol", "humanGate": False}
    policy = {
        "schema": "paperclip-escalation.v1", "taskId": issue_id, "linearIssue": "CRE-2156",
        "productionGoal": goal, "acceptanceCriteria": ["Focused verification passes", "Independent review passes"],
        "autonomyLevel": "A1", "riskFlags": [], "routingReceiptCommentId": route_comment_id,
        "selectedAgentId": selected_id, "fallbackAgentId": fallback_id, "verifierAgentId": verifier_id,
        "maxTotalLandedCostCents": 1000, "fallbackReserveCents": 300,
        "expiresAt": "2026-09-29T10:00:00Z",
    }
    policy_hash = escalate.compact_hash(policy)
    verification = {
        "schema": "paperclip-verification.v1", "taskId": issue_id, "policyHash": policy_hash,
        "sourceRunId": source_run_id, "verifierRunId": verifier_run_id,
        "result": "failed", "failureKind": "quality", "criteriaPassed": 1, "criteriaTotal": 2,
        "observedLandedCostCents": 100, "costBasis": "Measured allocation plus review time",
        "evidence": ["test run output showed one failed criterion"],
    }
    issue = {"id": issue_id, "status": "in_review", "assigneeAgentId": verifier_id, "description": fence("jev-routing", route_packet) + "\n" + fence("paperclip-escalation-v1", policy)}
    comments = [
        {"id": route_comment_id, "authorAgentId": jev_id, "createdAt": "2026-09-28T09:59:00Z", "body": fence("jev-routing-receipt", route_receipt)},
        {"id": approval_comment_id, "authorUserId": "local-board", "createdAt": "2026-09-28T10:00:00Z", "body": fence("paperclip-escalation-approval-v1", {"taskId": issue_id, "policyHash": policy_hash})},
        {"id": verifier_comment_id, "authorAgentId": verifier_id, "createdAt": "2026-09-28T10:04:00Z", "body": fence("paperclip-verification-v1", verification)},
    ]
    runs = [
        {"runId": source_run_id, "agentId": selected_id, "contextIssueId": issue_id, "status": "succeeded", "startedAt": "2026-09-28T10:01:00Z", "finishedAt": "2026-09-28T10:02:00Z"},
        {"runId": verifier_run_id, "agentId": verifier_id, "contextIssueId": issue_id, "status": "succeeded", "startedAt": "2026-09-28T10:03:00Z", "finishedAt": "2026-09-28T10:05:00Z"},
    ]
    agents = {
        selected_id: {"id": selected_id, "adapterType": "codex_local", "adapterConfig": {"model": "gpt-6-sol"}, "status": "idle"},
        fallback_id: {"id": fallback_id, "adapterType": "codex_local", "adapterConfig": {"model": "gpt-6-astra"}, "status": "idle"},
        verifier_id: {"id": verifier_id, "adapterType": "codex_local", "adapterConfig": {"model": "gpt-6-astra"}, "status": "idle"},
    }
    source_events = [{"eventType": "adapter.invoke", "payload": {"commandArgs": ["exec", "--model", "gpt-6-sol"]}}]
    return {"issue": issue, "policy": policy, "comments": comments, "runs": runs, "agents": agents, "source_events": source_events, "now": now, "board_user_id": "local-board", "jev_agent_id": jev_id, "controller_agent_id": controller_id}


class EscalationTests(unittest.TestCase):
    def evaluate(self, data):
        return escalate.evaluate(**data)

    def test_verified_quality_failure_promotes_one_lane_within_cap(self):
        data = fixture()
        for agent in data["agents"].values():
            agent.pop("adapterConfig")  # Paperclip redacts peers' config from agent tokens.
        decision = self.evaluate(data)
        self.assertEqual(decision["fromModel"], "gpt-6-sol")
        self.assertEqual(decision["toModel"], "gpt-6-astra")
        self.assertEqual(decision["observedLandedCostCents"] + decision["fallbackReserveCents"], 400)

    def test_accepted_result_does_not_escalate(self):
        data = fixture()
        receipt = escalate.fenced_json(data["comments"][2]["body"], escalate.VERIFICATION_FENCE)
        receipt.update(result="passed", failureKind="none", criteriaPassed=2)
        data["comments"][2]["body"] = fence("paperclip-verification-v1", receipt)
        self.assertIsNone(self.evaluate(data))

    def test_environment_failure_requires_operator(self):
        data = fixture()
        receipt = escalate.fenced_json(data["comments"][2]["body"], escalate.VERIFICATION_FENCE)
        receipt["failureKind"] = "environment"
        data["comments"][2]["body"] = fence("paperclip-verification-v1", receipt)
        with self.assertRaisesRegex(ValueError, "operator recovery"):
            self.evaluate(data)

    def test_stale_route_and_missing_approval_fail_closed(self):
        data = fixture()
        data["issue"]["description"] = data["issue"]["description"].replace("routine bounded code update", "different work")
        with self.assertRaisesRegex(ValueError, "stale"):
            self.evaluate(data)
        data = fixture()
        data["comments"][1]["authorUserId"] = "another-user"
        with self.assertRaisesRegex(ValueError, "board approval"):
            self.evaluate(data)

    def test_budget_model_and_attempt_guards(self):
        data = fixture()
        receipt = escalate.fenced_json(data["comments"][2]["body"], escalate.VERIFICATION_FENCE)
        receipt["observedLandedCostCents"] = 900
        data["comments"][2]["body"] = fence("paperclip-verification-v1", receipt)
        with self.assertRaisesRegex(ValueError, "cost cap"):
            self.evaluate(data)
        data = fixture()
        data["source_events"][0]["payload"]["commandArgs"][-1] = "gpt-6-luna"
        with self.assertRaisesRegex(ValueError, "Jev route"):
            self.evaluate(data)
        data = fixture()
        data["source_events"].append({"eventType": "adapter.invoke", "payload": {"commandArgs": ["exec", "--model", "gpt-6-astra"]}})
        with self.assertRaisesRegex(ValueError, "Jev route"):
            self.evaluate(data)
        data = fixture()
        data["comments"].append({"id": ident(12), "authorAgentId": data["controller_agent_id"], "body": fence("paperclip-escalation-decision-v1", {"policyHash": escalate.compact_hash(data["policy"])})})
        with self.assertRaisesRegex(ValueError, "already recorded"):
            self.evaluate(data)

    def test_high_authority_and_expired_packets_fail_closed(self):
        data = fixture()
        data["policy"]["riskFlags"] = ["production_release"]
        data["issue"]["description"] = data["issue"]["description"].split("\n```paperclip-escalation-v1")[0] + "\n" + fence("paperclip-escalation-v1", data["policy"])
        with self.assertRaisesRegex(ValueError, "A1 only"):
            self.evaluate(data)
        data = fixture()
        data["policy"]["expiresAt"] = "2026-09-28T10:00:00Z"
        data["issue"]["description"] = data["issue"]["description"].split("\n```paperclip-escalation-v1")[0] + "\n" + fence("paperclip-escalation-v1", data["policy"])
        with self.assertRaisesRegex(ValueError, "expiry"):
            self.evaluate(data)

    def test_independence_and_freshness_guards(self):
        data = fixture()
        data["comments"][2]["authorAgentId"] = data["policy"]["selectedAgentId"]
        with self.assertRaisesRegex(ValueError, "independent verifier"):
            self.evaluate(data)
        data = fixture()
        data["runs"].append({"runId": ident(30), "agentId": data["policy"]["selectedAgentId"], "startedAt": "2026-09-28T10:06:00Z"})
        with self.assertRaisesRegex(ValueError, "stale after"):
            self.evaluate(data)
        data = fixture()
        data["agents"][data["policy"]["fallbackAgentId"]]["status"] = "running"
        with self.assertRaisesRegex(ValueError, "unavailable"):
            self.evaluate(data)
        data = fixture()
        data["issue"]["description"] = data["issue"]["description"].split("\n```paperclip-escalation-v1")[0]
        with self.assertRaisesRegex(ValueError, "policy changed"):
            self.evaluate(data)

    def test_scan_writes_one_assignment_with_idempotent_comment(self):
        data = fixture()
        class FakeAPI:
            def __init__(self):
                self.patches = []
            def get(self, path):
                if path == f"/api/companies/{escalate.CANONICAL_COMPANY_ID}":
                    return {"id": escalate.CANONICAL_COMPANY_ID, "name": escalate.CANONICAL_COMPANY_NAME}
                if path.endswith("/agents"):
                    return list(data["agents"].values())
                if "/issues?" in path:
                    return [{**data["issue"], "description": data["issue"]["description"][:50]}]
                if path.endswith("/live-runs"):
                    return []
                if path.endswith("/comments?limit=500"):
                    return data["comments"]
                if path.endswith("/runs"):
                    return data["runs"]
                if "/heartbeat-runs/" in path:
                    return data["source_events"]
                return data["issue"]
            def patch(self, path, body):
                self.patches.append(body)
                return {"assigneeAgentId": body["assigneeAgentId"]}
        api = FakeAPI()
        kwargs = {"company_id": escalate.CANONICAL_COMPANY_ID, "board_user_id": data["board_user_id"], "jev_agent_id": data["jev_agent_id"], "controller_agent_id": data["controller_agent_id"], "now": data["now"], "assignment_now": data["now"]}
        self.assertEqual(escalate.scan(api, apply=False, **kwargs)["eligible"], 1)
        self.assertEqual(api.patches, [])
        result = escalate.scan(api, apply=True, **kwargs)
        self.assertEqual(result["escalated"], 1)
        self.assertEqual(api.patches[0]["assigneeAgentId"], data["policy"]["fallbackAgentId"])
        self.assertEqual(api.patches[0]["assigneeAdapterOverrides"], {"adapterConfig": {"model": "gpt-6-astra"}})
        uuid.UUID(api.patches[0]["commentClientRequestId"])
        with self.assertRaisesRegex(ValueError, "canonical company"):
            escalate.scan(api, apply=False, **{**kwargs, "company_id": ident(20)})
        expired = escalate.scan(api, apply=True, **{**kwargs, "assignment_now": datetime(2026, 9, 30, tzinfo=timezone.utc)})
        self.assertEqual(expired["held"], 1)
        self.assertEqual(len(api.patches), 1)

    def test_scan_holds_if_live_run_starts_before_assignment(self):
        data = fixture()
        class RacingAPI:
            def __init__(self):
                self.live_reads = 0
                self.patches = []
            def get(self, path):
                if path == f"/api/companies/{escalate.CANONICAL_COMPANY_ID}":
                    return {"id": escalate.CANONICAL_COMPANY_ID, "name": escalate.CANONICAL_COMPANY_NAME}
                if path.endswith("/agents"):
                    return list(data["agents"].values())
                if "/issues?" in path:
                    return [data["issue"]]
                if path.endswith("/live-runs"):
                    self.live_reads += 1
                    return [] if self.live_reads == 1 else [{"runId": ident(40)}]
                if path.endswith("/comments?limit=500"):
                    return data["comments"]
                if path.endswith("/runs"):
                    return data["runs"]
                if "/heartbeat-runs/" in path:
                    return data["source_events"]
                return data["issue"]
            def patch(self, path, body):
                self.patches.append(body)
                return {"assigneeAgentId": body["assigneeAgentId"]}
        api = RacingAPI()
        result = escalate.scan(api, company_id=escalate.CANONICAL_COMPANY_ID, board_user_id=data["board_user_id"], jev_agent_id=data["jev_agent_id"], controller_agent_id=data["controller_agent_id"], now=data["now"], assignment_now=data["now"], apply=True)
        self.assertEqual(result["escalated"], 0)
        self.assertEqual(result["held"], 1)
        self.assertEqual(api.patches, [])

    def test_unavailable_unrelated_issue_does_not_stop_scan(self):
        data = fixture()
        missing_id = ident(50)
        class FlakyAPI:
            def get(self, path):
                if path == f"/api/companies/{escalate.CANONICAL_COMPANY_ID}":
                    return {"id": escalate.CANONICAL_COMPANY_ID, "name": escalate.CANONICAL_COMPANY_NAME}
                if path.endswith("/agents"):
                    return list(data["agents"].values())
                if "/issues?" in path:
                    return [{"id": missing_id}, {"id": data["issue"]["id"]}]
                if path == f"/api/issues/{missing_id}":
                    raise urllib.error.URLError("temporary detail failure")
                if path.endswith("/live-runs"):
                    return []
                if path.endswith("/comments?limit=500"):
                    return data["comments"]
                if path.endswith("/runs"):
                    return data["runs"]
                if "/heartbeat-runs/" in path:
                    return data["source_events"]
                return data["issue"]
        result = escalate.scan(FlakyAPI(), company_id=escalate.CANONICAL_COMPANY_ID, board_user_id=data["board_user_id"], jev_agent_id=data["jev_agent_id"], controller_agent_id=data["controller_agent_id"], now=data["now"], apply=False)
        self.assertEqual(result["held"], 1)
        self.assertEqual(result["eligible"], 1)


if __name__ == "__main__":
    unittest.main()

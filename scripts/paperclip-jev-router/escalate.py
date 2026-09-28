#!/usr/bin/env python3
"""Bounded, verifier-driven Paperclip model escalation for approved A1 issues."""

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone

from route import PACKET_PATTERN, build_request, paperclip_api_base, paperclip_headers, validate_packet

POLICY_FENCE = re.compile(r"```paperclip-escalation-v1\s*\n(.*?)\n```", re.DOTALL)
APPROVAL_FENCE = re.compile(r"```paperclip-escalation-approval-v1\s*\n(.*?)\n```", re.DOTALL)
VERIFICATION_FENCE = re.compile(r"```paperclip-verification-v1\s*\n(.*?)\n```", re.DOTALL)
ROUTE_FENCE = re.compile(r"```jev-routing-receipt\s*\n(.*?)\n```", re.DOTALL)
DECISION_FENCE = re.compile(r"```paperclip-escalation-decision-v1\s*\n(.*?)\n```", re.DOTALL)
LANE_BY_MODEL = {"gpt-6-luna": "luna", "gpt-6-sol": "sol", "gpt-6-astra": "astra"}
MODEL_BY_LANE = {lane: model for model, lane in LANE_BY_MODEL.items()}
NEXT_LANE = {"luna": "sol", "sol": "astra"}
CANONICAL_COMPANY_ID = "1fb053c2-aa2a-4d88-8c45-0ef82ac8aef5"
CANONICAL_COMPANY_NAME = "CREATE SOMETHING"
POLICY_KEYS = {
    "schema", "taskId", "linearIssue", "productionGoal", "acceptanceCriteria",
    "autonomyLevel", "riskFlags", "routingReceiptCommentId", "selectedAgentId",
    "fallbackAgentId", "verifierAgentId", "maxTotalLandedCostCents",
    "fallbackReserveCents", "expiresAt",
}
VERIFICATION_KEYS = {
    "schema", "taskId", "policyHash", "sourceRunId", "verifierRunId",
    "result", "failureKind", "criteriaPassed", "criteriaTotal",
    "observedLandedCostCents", "costBasis", "evidence",
}


def compact_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def fenced_json(body, pattern):
    matches = pattern.findall(body or "")
    if len(matches) != 1:
        raise ValueError("expected exactly one matching fenced JSON packet")
    value = json.loads(matches[0])
    if not isinstance(value, dict):
        raise ValueError("fenced packet must be an object")
    return value


def utc(value):
    if not isinstance(value, str):
        raise ValueError("invalid timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("timestamp must have timezone")
    return parsed.astimezone(timezone.utc)


def positive_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def nonnegative_int(value):
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def validate_policy(policy, issue_id, now):
    if set(policy) != POLICY_KEYS or policy.get("schema") != "paperclip-escalation.v1":
        raise ValueError("invalid escalation policy schema")
    if policy["taskId"] != issue_id:
        raise ValueError("policy task ID mismatch")
    if not re.fullmatch(r"CRE-\d+", policy["linearIssue"]):
        raise ValueError("Linear issue required")
    if not isinstance(policy["productionGoal"], str) or not 10 <= len(policy["productionGoal"].strip()) <= 600:
        raise ValueError("production goal required")
    criteria = policy["acceptanceCriteria"]
    if not isinstance(criteria, list) or not 1 <= len(criteria) <= 8 or any(not isinstance(item, str) or not item.strip() or len(item) > 240 for item in criteria):
        raise ValueError("acceptance criteria required")
    if policy["autonomyLevel"] != "A1" or policy["riskFlags"] != []:
        raise ValueError("automatic escalation is A1 only and has no risk flags")
    ids = [policy[key] for key in ("routingReceiptCommentId", "selectedAgentId", "fallbackAgentId", "verifierAgentId")]
    try:
        for value in ids:
            uuid.UUID(value)
    except (AttributeError, TypeError, ValueError) as error:
        raise ValueError("invalid agent or comment ID") from error
    if len(set(ids[1:])) != 3:
        raise ValueError("selected, fallback, and verifier must differ")
    if not positive_int(policy["maxTotalLandedCostCents"]) or not positive_int(policy["fallbackReserveCents"]):
        raise ValueError("positive cost cap and fallback reserve required")
    if policy["maxTotalLandedCostCents"] > 5000:
        raise ValueError("A1 cost cap exceeds $50")
    if policy["fallbackReserveCents"] > policy["maxTotalLandedCostCents"]:
        raise ValueError("fallback reserve exceeds cap")
    if not now < utc(policy["expiresAt"]) <= now + timedelta(days=30):
        raise ValueError("escalation policy expiry is outside the 30-day window")
    return policy


def validate_verification(receipt, policy, policy_hash):
    if set(receipt) != VERIFICATION_KEYS or receipt.get("schema") != "paperclip-verification.v1":
        raise ValueError("invalid verifier receipt schema")
    if receipt["taskId"] != policy["taskId"] or receipt["policyHash"] != policy_hash:
        raise ValueError("verifier receipt policy mismatch")
    for key in ("sourceRunId", "verifierRunId"):
        try:
            uuid.UUID(receipt[key])
        except (AttributeError, TypeError, ValueError) as error:
            raise ValueError("invalid verifier run ID") from error
    if receipt["result"] not in ("passed", "failed") or receipt["failureKind"] not in ("none", "quality", "environment", "scope", "unknown"):
        raise ValueError("invalid verifier result")
    total = len(policy["acceptanceCriteria"])
    if receipt["criteriaTotal"] != total or not nonnegative_int(receipt["criteriaPassed"]) or receipt["criteriaPassed"] > total:
        raise ValueError("invalid criteria count")
    if receipt["result"] == "passed" and (receipt["criteriaPassed"] != total or receipt["failureKind"] != "none"):
        raise ValueError("passed receipt must satisfy every criterion")
    if receipt["result"] == "failed" and receipt["criteriaPassed"] == total:
        raise ValueError("failed receipt must identify unmet criteria")
    if not nonnegative_int(receipt["observedLandedCostCents"]):
        raise ValueError("observed landed cost required")
    if not isinstance(receipt["costBasis"], str) or not receipt["costBasis"].strip() or len(receipt["costBasis"]) > 240:
        raise ValueError("cost basis required")
    if not isinstance(receipt["evidence"], list) or not 1 <= len(receipt["evidence"]) <= 8 or any(not isinstance(item, str) or not item.strip() or len(item) > 500 for item in receipt["evidence"]):
        raise ValueError("verifier evidence required")
    return receipt


def run_model(events):
    models = []
    for event in events:
        if event.get("eventType") != "adapter.invoke":
            continue
        args = (event.get("payload") or {}).get("commandArgs")
        if not isinstance(args, list) or "--model" not in args:
            return None
        index = args.index("--model")
        if index + 1 >= len(args) or not isinstance(args[index + 1], str):
            return None
        models.append(args[index + 1])
    return models[0] if models and len(set(models)) == 1 else None


def current_policy(issue, expected):
    matches = POLICY_FENCE.findall(issue.get("description") or "")
    if len(matches) != 1 or json.loads(matches[0]) != expected:
        raise ValueError("escalation policy changed or was removed")
    return expected


def evaluate(issue, policy, comments, runs, agents, source_events, now, *, board_user_id, jev_agent_id, controller_agent_id):
    current_policy(issue, policy)
    validate_policy(policy, issue["id"], now)
    policy_hash = compact_hash(policy)
    if issue.get("status") != "in_review" or issue.get("assigneeAgentId") != policy["verifierAgentId"]:
        raise ValueError("issue is not awaiting the named verifier")
    comment_by_id = {item.get("id"): item for item in comments if isinstance(item, dict)}
    route_comment = comment_by_id.get(policy["routingReceiptCommentId"])
    if not route_comment or route_comment.get("authorAgentId") != jev_agent_id:
        raise ValueError("Jev routing receipt unavailable")
    route_receipt = fenced_json(route_comment.get("body"), ROUTE_FENCE)
    if route_receipt.get("taskId") != issue["id"] or route_receipt.get("status") != "advisory" or route_receipt.get("servedModel") != "jev-1.13.0" or route_receipt.get("humanGate") is not False:
        raise ValueError("Jev route is not eligible")
    route_packets = PACKET_PATTERN.findall(issue.get("description") or "")
    if len(route_packets) != 1:
        raise ValueError("exactly one current Jev routing packet required")
    route_packet = validate_packet(json.loads(route_packets[0]))
    if route_packet["taskId"] != issue["id"] or route_packet["goal"] != policy["productionGoal"]:
        raise ValueError("Jev routing packet no longer matches the approved goal")
    if route_receipt.get("requestHash") != hashlib.sha256(build_request(route_packet)).hexdigest():
        raise ValueError("Jev routing receipt is stale")
    selected = agents[policy["selectedAgentId"]]
    fallback = agents[policy["fallbackAgentId"]]
    verifier = agents[policy["verifierAgentId"]]
    if any(agent.get("adapterType") != "codex_local" for agent in (selected, fallback, verifier)):
        raise ValueError("escalation agents must use the Codex adapter")
    selected_model = run_model(source_events)
    selected_lane = LANE_BY_MODEL.get(selected_model)
    fallback_lane = NEXT_LANE.get(selected_lane)
    if route_receipt.get("recommendation") != selected_lane or fallback_lane is None:
        raise ValueError("Jev route and fallback model ladder disagree")
    fallback_model = MODEL_BY_LANE[fallback_lane]
    if fallback.get("status") != "idle":
        raise ValueError("fallback agent is unavailable")
    for comment in comments:
        if comment.get("authorAgentId") != controller_agent_id or not DECISION_FENCE.search(comment.get("body") or ""):
            continue
        decision = fenced_json(comment.get("body"), DECISION_FENCE)
        if decision.get("policyHash") == policy_hash:
            raise ValueError("escalation already recorded")
    verifier_comments = [item for item in comments if item.get("authorAgentId") == policy["verifierAgentId"] and VERIFICATION_FENCE.search(item.get("body") or "")]
    if len(verifier_comments) != 1:
        raise ValueError("exactly one independent verifier receipt required")
    verifier_comment = verifier_comments[0]
    receipt = validate_verification(fenced_json(verifier_comment.get("body"), VERIFICATION_FENCE), policy, policy_hash)
    run_by_id = {item.get("runId"): item for item in runs}
    source = run_by_id.get(receipt["sourceRunId"])
    review = run_by_id.get(receipt["verifierRunId"])
    if not source or not review or source.get("status") != "succeeded" or review.get("status") != "succeeded":
        raise ValueError("executor and verifier runs must have succeeded")
    if source.get("agentId") != selected["id"] or review.get("agentId") != verifier["id"]:
        raise ValueError("run agents do not match policy")
    if source.get("contextIssueId") != issue["id"] or review.get("contextIssueId") != issue["id"]:
        raise ValueError("runs are not bound to this issue")
    if not (utc(source["finishedAt"]) <= utc(review["startedAt"]) <= utc(verifier_comment["createdAt"]) <= utc(review["finishedAt"])):
        raise ValueError("verifier timing is not independent")
    approvals = []
    for comment in comments:
        if comment.get("authorUserId") != board_user_id or not APPROVAL_FENCE.search(comment.get("body") or ""):
            continue
        value = fenced_json(comment.get("body"), APPROVAL_FENCE)
        if value == {"taskId": issue["id"], "policyHash": policy_hash} and utc(comment["createdAt"]) <= utc(source["startedAt"]):
            approvals.append(comment)
    if len(approvals) != 1:
        raise ValueError("one pre-execution board approval required")
    if any(item.get("agentId") == selected["id"] and utc(item["startedAt"]) > utc(source["startedAt"]) for item in runs if item.get("startedAt")):
        raise ValueError("verifier receipt is stale after a newer executor run")
    if receipt["result"] == "passed":
        return None
    if receipt["failureKind"] != "quality":
        raise ValueError("non-quality failure needs operator recovery")
    projected = receipt["observedLandedCostCents"] + policy["fallbackReserveCents"]
    if projected > policy["maxTotalLandedCostCents"]:
        raise ValueError("fallback would exceed the approved cost cap")
    decision = {
        "schema": "paperclip-escalation-decision.v1", "taskId": issue["id"],
        "linearIssue": policy["linearIssue"], "policyHash": policy_hash,
        "sourceRunId": source["runId"], "verifierRunId": review["runId"],
        "verifierCommentId": verifier_comment["id"],
        "fromAgentId": selected["id"], "toAgentId": fallback["id"],
        "fromModel": selected_model, "toModel": fallback_model,
        "observedLandedCostCents": receipt["observedLandedCostCents"],
        "fallbackReserveCents": policy["fallbackReserveCents"],
        "maxTotalLandedCostCents": policy["maxTotalLandedCostCents"],
        "reason": "independent_quality_failure_within_preapproved_A1_fallback",
    }
    return decision


class Paperclip:
    def __init__(self, base, headers):
        self.base = base
        self.headers = headers

    def request(self, method, path, body=None):
        data = None if body is None else json.dumps(body).encode()
        headers = self.headers if body is None else {**self.headers, "Content-Type": "application/json"}
        request = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        with urllib.request.urlopen(request, timeout=8) as response:
            return json.load(response)

    def get(self, path):
        return self.request("GET", path)

    def patch(self, path, body):
        return self.request("PATCH", path, body)


def scan(api, *, company_id, board_user_id, jev_agent_id, controller_agent_id, now, apply, assignment_now=None):
    if company_id != CANONICAL_COMPANY_ID:
        raise ValueError("controller is not bound to the canonical company")
    company = api.get(f"/api/companies/{CANONICAL_COMPANY_ID}")
    if not isinstance(company, dict) or company.get("id") != CANONICAL_COMPANY_ID or company.get("name") != CANONICAL_COMPANY_NAME:
        raise ValueError("canonical Paperclip instance identity unavailable")
    summary = {"scanned": 0, "eligible": 0, "escalated": 0, "held": 0, "dryRun": not apply}
    agents = {item["id"]: item for item in api.get(f"/api/companies/{company_id}/agents")}
    for offset in range(0, 500, 100):
        query = urllib.parse.urlencode({"status": "in_review", "limit": 100, "offset": offset})
        issues = api.get(f"/api/companies/{company_id}/issues?{query}")
        if not isinstance(issues, list):
            raise ValueError("issue list unavailable")
        for item in issues:
            try:
                # Company issue lists truncate descriptions; read the complete issue before
                # looking for a policy fence or deciding the issue is out of scope.
                issue_id = item["id"]
                issue = api.get(f"/api/issues/{issue_id}")
                matches = POLICY_FENCE.findall(issue.get("description") or "")
                if not matches:
                    continue
                summary["scanned"] += 1
                if len(matches) != 1:
                    raise ValueError("multiple escalation policies")
                policy = json.loads(matches[0])
                if api.get(f"/api/issues/{issue_id}/live-runs"):
                    raise ValueError("issue has a live run")
                comments = api.get(f"/api/issues/{issue_id}/comments?limit=500")
                runs = api.get(f"/api/issues/{issue_id}/runs")
                verifier_receipts = [c for c in comments if c.get("authorAgentId") == policy.get("verifierAgentId") and VERIFICATION_FENCE.search(c.get("body") or "")]
                if len(verifier_receipts) != 1:
                    raise ValueError("verifier receipt unavailable")
                claimed_receipt = fenced_json(verifier_receipts[0]["body"], VERIFICATION_FENCE)
                source_run = claimed_receipt.get("sourceRunId")
                source_events = api.get(f"/api/heartbeat-runs/{source_run}/events?limit=500") if source_run else []
                decision = evaluate(issue, policy, comments, runs, agents, source_events, now, board_user_id=board_user_id, jev_agent_id=jev_agent_id, controller_agent_id=controller_agent_id)
                if decision is None:
                    continue
                summary["eligible"] += 1
                if not apply:
                    continue
                fresh_issue = api.get(f"/api/issues/{issue_id}")
                fresh_comments = api.get(f"/api/issues/{issue_id}/comments?limit=500")
                fresh_runs = api.get(f"/api/issues/{issue_id}/runs")
                fresh_agents = {agent["id"]: agent for agent in api.get(f"/api/companies/{company_id}/agents")}
                fresh_source_events = api.get(f"/api/heartbeat-runs/{decision['sourceRunId']}/events?limit=500")
                refreshed = evaluate(fresh_issue, policy, fresh_comments, fresh_runs, fresh_agents, fresh_source_events, assignment_now or datetime.now(timezone.utc), board_user_id=board_user_id, jev_agent_id=jev_agent_id, controller_agent_id=controller_agent_id)
                if refreshed != decision:
                    raise ValueError("escalation evidence changed before fallback assignment")
                if api.get(f"/api/issues/{issue_id}/live-runs"):
                    raise ValueError("issue gained a live run before fallback assignment")
                # One assignment and its durable comment are written in the same Paperclip issue mutation.
                body = "Approved A1 model fallback after independent verification. Production authority is unchanged.\n\n```paperclip-escalation-decision-v1\n" + json.dumps(decision, sort_keys=True) + "\n```"
                request_id = str(uuid.uuid5(uuid.NAMESPACE_URL, decision["policyHash"] + ":" + decision["sourceRunId"]))
                updated = api.patch(f"/api/issues/{issue_id}", {"assigneeAgentId": decision["toAgentId"], "assigneeAdapterOverrides": {"adapterConfig": {"model": decision["toModel"]}}, "status": "todo", "comment": body, "commentClientRequestId": request_id})
                if updated.get("assigneeAgentId") != decision["toAgentId"]:
                    raise ValueError("fallback assignment readback mismatch")
                summary["escalated"] += 1
                return summary
            except (KeyError, TypeError, ValueError, TimeoutError, json.JSONDecodeError, urllib.error.URLError) as error:
                summary["held"] += 1
                print(json.dumps({"taskId": item.get("id"), "status": "held", "reason": str(error)}))
        if len(issues) < 100:
            break
    return summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--approval-for", help="JSON file containing a complete issue-specific escalation policy")
    args = parser.parse_args()
    if args.approval_for:
        try:
            with open(args.approval_for, encoding="utf-8") as handle:
                policy = json.load(handle)
            validate_policy(policy, policy["taskId"], datetime.now(timezone.utc))
            print("```paperclip-escalation-approval-v1\n" + json.dumps({"taskId": policy["taskId"], "policyHash": compact_hash(policy)}, sort_keys=True) + "\n```")
            return 0
        except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
            print(json.dumps({"status": "error", "reason": str(error)}))
            return 1
    base = paperclip_api_base()
    key = os.environ.get("PAPERCLIP_API_KEY", "")
    run_id = os.environ.get("PAPERCLIP_RUN_ID", "")
    company = os.environ.get("PAPERCLIP_COMPANY_ID", "")
    agent = os.environ.get("PAPERCLIP_AGENT_ID", "")
    jev = os.environ.get("JEV_ADVISOR_AGENT_ID", "")
    board = os.environ.get("ESCALATION_APPROVER_USER_ID", "")
    if not all((base, key, run_id, company, agent, jev, board)):
        print(json.dumps({"status": "error", "reason": "Paperclip escalation context unavailable"}))
        return 1
    api = Paperclip(base, paperclip_headers())
    try:
        result = scan(api, company_id=company, board_user_id=board, jev_agent_id=jev, controller_agent_id=agent, now=datetime.now(timezone.utc), apply=os.environ.get("ESCALATION_APPLY") == "true")
        print(json.dumps(result))
    except (KeyError, TypeError, ValueError, TimeoutError, json.JSONDecodeError, urllib.error.URLError) as error:
        print(json.dumps({"status": "error", "reason": str(error)}))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

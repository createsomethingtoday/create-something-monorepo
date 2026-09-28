import importlib.util
import io
import json
import pathlib
import unittest


SPEC = importlib.util.spec_from_file_location("jev_router", pathlib.Path(__file__).with_name("route.py"))
router = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(router)


def packet(**updates):
    value = {"taskId": "task-1", "summary": "Update a bounded UI component", "goal": "Verified responsive behavior", "riskFlags": []}
    value.update(updates)
    return router.validate_packet(value)


class Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()


class RouterTests(unittest.TestCase):
    def test_risk_rules_bypass_provider_and_keep_human_gate(self):
        def fail(*_, **__):
            raise AssertionError("Jev must not be called")
        security = router.route(packet(riskFlags=["security_boundary"]), "", opener=fail)
        release = router.route(packet(riskFlags=["production_release"]), "", opener=fail)
        self.assertEqual((security["recommendation"], security["status"], security["humanGate"]), ("daybreak", "policy_route", True))
        self.assertEqual((release["recommendation"], release["status"], release["humanGate"]), ("astra", "policy_route", True))

    def test_valid_typed_response_produces_advisory_receipt(self):
        distribution = {name: (0.8 if name == "sol" else 0.05) for name in router.LANES}
        data = {"model": router.MODEL, "answers": {"route": {"type": "choice", "choice": "sol", "confidence": 0.8, "probabilities": distribution}}, "usage": {"input_tokens": 45, "output_tokens": 4}}
        result = router.route(packet(), "test-key", opener=lambda *_args, **_kwargs: Response(json.dumps(data).encode()))
        self.assertEqual(result["recommendation"], "sol")
        self.assertEqual(result["status"], "advisory")
        self.assertEqual(result["usage"], data["usage"])
        self.assertFalse(result["humanGate"])
        self.assertEqual(len(result["requestHash"]), 64)

    def test_invalid_answer_abstains(self):
        data = {"model": router.MODEL, "answers": {"route": {"type": "choice", "choice": "sol", "confidence": 0.9, "probabilities": {"sol": 1}}}}
        result = router.route(packet(), "test-key", opener=lambda *_args, **_kwargs: Response(json.dumps(data).encode()))
        self.assertEqual(result["recommendation"], "no_match")
        self.assertEqual(result["status"], "abstained")
        self.assertEqual(result["failure"], "ValueError")

    def test_missing_key_and_unsafe_packet_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "TYPESAFE_API_KEY unavailable"):
            router.route(packet(), "")
        with self.assertRaisesRegex(ValueError, "credential material"):
            packet(summary="API key = abc")
        with self.assertRaisesRegex(ValueError, "invalid riskFlags"):
            packet(riskFlags=[["security_boundary"]])


if __name__ == "__main__":
    unittest.main()

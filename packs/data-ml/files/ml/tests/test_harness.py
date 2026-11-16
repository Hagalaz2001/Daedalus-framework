import json
import tempfile
import unittest
from pathlib import Path

from evals.harness import gate, load_cases, run, score
from evals.run import main


class ScoreTests(unittest.TestCase):
    def test_scorers(self):
        self.assertTrue(score({"scorer": "exact", "expected": "a"}, " a "))
        self.assertTrue(score({"scorer": "contains", "expected": "30 DAYS"}, "within 30 days"))
        self.assertTrue(score({"scorer": "regex", "expected": r"^\d+$"}, "123"))
        self.assertFalse(score({"scorer": "regex", "expected": r"^\d+$"}, "12a"))
        self.assertTrue(score({"scorer": "json_keys", "expected": ["a"]}, '{"a": 1}'))
        self.assertFalse(score({"scorer": "json_keys", "expected": ["a"]}, "not json"))
        self.assertFalse(score({"scorer": "json_keys", "expected": ["a"]}, "[1]"))
        self.assertTrue(score({"scorer": "not_contains", "expected": "secret"}, "no leak"))
        with self.assertRaises(ValueError):
            score({"scorer": "nope"}, "x")


class RunTests(unittest.TestCase):
    cases = [
        {"id": "a", "input": "x", "scorer": "exact", "expected": "x"},
        {"id": "b", "input": "y", "scorer": "exact", "expected": "z"},
    ]

    def test_report_lists_failures(self):
        r = run(self.cases, lambda t: t)
        self.assertEqual((r["total"], r["passed"]), (2, 1))
        self.assertEqual([f["id"] for f in r["failures"]], ["b"])

    def test_crashing_model_is_a_failure_not_a_crash(self):
        def boom(_):
            raise RuntimeError("down")

        self.assertEqual(run(self.cases, boom)["passed"], 0)

    def test_gate(self):
        good = {"total": 10, "rate": 0.95}
        self.assertEqual(gate(good, {"rate": 0.95}, 0.9), [])
        self.assertEqual(len(gate({"total": 10, "rate": 0.85}, None, 0.9)), 1)
        self.assertEqual(len(gate({"total": 10, "rate": 0.91}, {"rate": 1.0}, 0.9)), 1)  # dropped 9 points
        self.assertEqual(len(gate({"total": 0, "rate": 0.0}, None, 0.0)), 1)


class LoadTests(unittest.TestCase):
    def test_rejects_bad_files(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "c.jsonl"
            p.write_text('{"id": "a", "input": "x"}\n')
            with self.assertRaises(ValueError):
                load_cases(p)
            p.write_text('{"id": "a", "input": "x", "scorer": "exact"}\n{"id": "a", "input": "y", "scorer": "exact"}\n')
            with self.assertRaises(ValueError):
                load_cases(p)

    def test_shipped_golden_set_passes_with_the_example_model(self):
        here = Path(__file__).parent.parent
        code = main(["--cases", str(here / "evals/golden/example.jsonl"), "--predict", "evals.example_model:predict", "--min-rate", "1.0"])
        self.assertEqual(code, 0)


if __name__ == "__main__":
    unittest.main()

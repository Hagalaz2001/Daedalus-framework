"""Evaluation harness: run golden cases through a predict function, score them, gate on regressions. Standard library only."""
from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterable
from pathlib import Path
from typing import Any

Case = dict[str, Any]
Report = dict[str, Any]


def load_cases(path: str | Path) -> list[Case]:
    cases: list[Case] = []
    for n, line in enumerate(Path(path).read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        case = json.loads(line)
        for key in ("id", "input", "scorer"):
            if key not in case:
                raise ValueError(f"{path}:{n}: case is missing '{key}'")
        cases.append(case)
    ids = [c["id"] for c in cases]
    if len(ids) != len(set(ids)):
        raise ValueError("duplicate case ids")
    return cases


def score(case: Case, output: str) -> bool:
    kind, expected = case["scorer"], case.get("expected")
    if kind == "exact":
        return output.strip() == str(expected).strip()
    if kind == "contains":
        return str(expected).lower() in output.lower()
    if kind == "regex":
        return re.search(str(expected), output, re.S) is not None
    if kind == "json_keys":
        try:
            data = json.loads(output)
        except json.JSONDecodeError:
            return False
        return isinstance(data, dict) and all(k in data for k in expected)
    if kind == "not_contains":  # refusals and leak checks: the output must NOT include this text
        return str(expected).lower() not in output.lower()
    raise ValueError(f"unknown scorer {kind!r}")


def run(cases: Iterable[Case], predict: Callable[[str], str]) -> Report:
    failures: list[dict[str, str]] = []
    total = 0
    for case in cases:
        total += 1
        try:
            output = predict(case["input"])
        except Exception as exc:  # a crashing model call is a failed case, not a crashed run
            output = f"<error: {type(exc).__name__}>"
        if not score(case, output):
            failures.append({"id": case["id"], "output": output[:200]})
    passed = total - len(failures)
    return {"total": total, "passed": passed, "rate": (passed / total) if total else 0.0, "failures": failures}


def gate(report: Report, baseline: Report | None, min_rate: float, max_drop: float = 0.02) -> list[str]:
    """Returns reasons the run must fail; empty means it passes."""
    reasons = []
    if report["total"] == 0:
        reasons.append("no cases ran")
    if report["rate"] < min_rate:
        reasons.append(f"pass rate {report['rate']:.3f} is below the minimum {min_rate:.3f}")
    if baseline and report["rate"] < baseline["rate"] - max_drop:
        reasons.append(f"pass rate {report['rate']:.3f} dropped more than {max_drop:.2f} from baseline {baseline['rate']:.3f}")
    return reasons

"""CLI: python -m evals.run --cases FILE --predict module:function [--baseline FILE] [--min-rate 0.9] [--update-baseline]"""
from __future__ import annotations

import argparse
import importlib
import json
import sys
from pathlib import Path

from evals.harness import gate, load_cases, run


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--cases", required=True)
    p.add_argument("--predict", required=True, help="module:function taking the input text and returning the output text")
    p.add_argument("--baseline")
    p.add_argument("--min-rate", type=float, default=0.9)
    p.add_argument("--update-baseline", action="store_true")
    a = p.parse_args(argv)

    module, _, name = a.predict.partition(":")
    predict = getattr(importlib.import_module(module), name)
    report = run(load_cases(a.cases), predict)
    print(f"{report['passed']}/{report['total']} passed ({report['rate']:.1%})")
    for f in report["failures"]:
        print(f"  FAIL {f['id']}: {f['output']!r}")

    baseline_path = Path(a.baseline) if a.baseline else None
    baseline = json.loads(baseline_path.read_text()) if baseline_path and baseline_path.exists() else None
    reasons = gate(report, baseline, a.min_rate)
    for r in reasons:
        print(f"GATE: {r}")
    if a.update_baseline and baseline_path and not reasons:
        baseline_path.write_text(json.dumps({"rate": report["rate"], "total": report["total"]}, indent=2) + "\n")
        print(f"baseline updated: {baseline_path}")
    return 1 if reasons else 0


if __name__ == "__main__":
    sys.exit(main())

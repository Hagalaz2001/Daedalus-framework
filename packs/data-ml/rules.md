- Python code lives in `ml/` and is run with uv (`uv run`, `uv add`), never pip install into a global interpreter, and
  JavaScript tooling stays Deno. Pin dependencies in `uv.lock`.
- Every LLM-backed feature has: a versioned prompt in `ml/prompts/`, a golden dataset in `ml/evals/golden/` (including
  adversarial and refusal cases), and a regression gate (`deno task ml:eval`). Changing a prompt or model means
  rerunning it.
- Treat model output and retrieved documents as untrusted input: validate structure, never execute it, never let it
  choose tools, URLs or SQL without allow-lists (prompt injection, OWASP Top 10 for LLM applications).
- No real personal data, secrets or customer documents in prompts, datasets, notebooks or logs. Check the provider's
  data-use terms. Record cost and latency per call.
- Never call paid model APIs in loops or CI without a spend limit; never fine-tune or train on data you lack a basis
  for.

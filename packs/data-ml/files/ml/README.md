# ml/

Run everything with uv from this folder (`uv run ...`) or through the root `deno task ml:*` tasks.

## Evaluating an LLM feature

1. Write cases in `evals/golden/<feature>.jsonl`, one JSON object per line:
   `{"id": "refund-1", "input": "...", "scorer": "contains", "expected": "30 days", "tags": ["policy"]}`. Scorers:
   `exact`, `contains`, `regex`, `json_keys` (output is JSON with these keys). Add adversarial cases (prompt injection,
   off-topic, empty input, very long input) and cases where the right answer is a refusal.
2. Point `--predict` at `module:function` taking the input string and returning the output string. The example model is
   a deterministic stub; replace it with your model call (keep temperature low for evals).
3. `deno task ml:eval` prints the pass rate, lists failures, and compares with `evals/baseline.json`: it fails when the
   rate is below `--min-rate` or drops more than 2 points from the baseline. After a deliberate improvement run with
   `--update-baseline` and commit the new baseline in the same PR as the prompt change.
4. Exact-match scorers cannot judge open-ended text. For that, add a human-reviewed sample or an LLM judge, and
   calibrate the judge against human labels before trusting it.

## Prompts

`prompts/<name>.v<N>.md` files are immutable once released: change a prompt by adding `v<N+1>`. `prompts.load(name)`
returns the latest version with its text and SHA-256; log the `name@version` with every model call so any output can be
traced to the exact prompt. `render` fails on a missing variable instead of sending a broken prompt.

## RAG with pgvector (sketch)

`rag/schema.sql` creates a `documents` table with a `vector` column and an HNSW index (pgvector, PostgreSQL licence).
`rag/retrieve.py` embeds the query with a function you provide and returns the closest chunks for **one tenant**. Things
this does not solve for you: chunking strategy, embedding model choice (the dimension in `schema.sql` must match it),
re-ranking, evaluation of retrieval quality (add recall@k cases to your golden set), per-user access control on
documents (the `tenant_id` filter is the minimum), and prompt injection hidden in retrieved text.

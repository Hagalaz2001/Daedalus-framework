# data-ml pack (status: starter)

Python via uv for data work and LLM features. Read `DISCLAIMER.md`: model output can be wrong, biased or unsafe, and you
are responsible for it.

```
deno task ml:test     # unit tests of the harness and the prompt loader (needs uv: https://docs.astral.sh/uv/)
deno task ml:eval     # run the golden dataset against ml/evals/example_model.py and gate on a pass rate
```

See `ml/README.md` for the evaluation workflow, prompt versioning and the pgvector RAG sketch. Not included: model
serving, training pipelines, feature stores, experiment tracking. The `rag/` SQL and retrieval code were written against
the pgvector and psycopg documentation but not run by the blueprint's tests (they need a PostgreSQL with the extension).

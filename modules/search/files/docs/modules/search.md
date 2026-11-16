# Search module

Status: thin. `GET /search?q=...` returns ranked, highlighted hits over the organization's notes using PostgreSQL
full-text search (`websearch_to_tsquery`: words, `"phrases"`, `or`, `-exclude`). No extra service to run.

To search another table, copy `mod.ts`: build a `to_tsvector` over its columns, filter by `organization_id`, and add its
kind to the `SearchHit` enum in the contract. For one language use its configuration (`'english'`, `'german'`) instead
of `'simple'` to get stemming.

Performance: the query computes the vector per row, fine up to tens of thousands of rows. Beyond that add a generated
column and index in a migration:

```sql
ALTER TABLE notes ADD COLUMN search tsvector GENERATED ALWAYS AS (to_tsvector('simple', text)) STORED;
CREATE INDEX notes_search_idx ON notes USING GIN (search);
```

(on a large live table create the index with `CONCURRENTLY`, see DATABASE.md). Outgrowing Postgres search means typo
tolerance and facets at scale: move to Meilisearch or Typesense (both open source) and keep this endpoint's contract.

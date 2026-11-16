-- pgvector (PostgreSQL licence): https://github.com/pgvector/pgvector
-- The dimension must match your embedding model (1536 here is only an example).
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  tenant_id text not null,
  source text not null,
  chunk text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Approximate nearest neighbour by cosine distance. Build it after the first bulk load for better recall.
create index documents_embedding_hnsw on documents using hnsw (embedding vector_cosine_ops);
create index documents_tenant on documents (tenant_id);

"""Nearest-chunk retrieval over pgvector for one tenant. Needs the 'rag' extra: uv sync --extra rag. Not run by the blueprint tests."""
from __future__ import annotations

from collections.abc import Callable, Sequence


def retrieve(conn, embed: Callable[[str], Sequence[float]], tenant_id: str, query: str, k: int = 5) -> list[dict]:
    """conn is a psycopg connection. The tenant filter is mandatory: never return another tenant's chunks.
    Returned text is untrusted: it can contain instructions aimed at your model."""
    from pgvector.psycopg import register_vector

    register_vector(conn)
    vec = list(embed(query))
    rows = conn.execute(
        "select id, source, chunk, embedding <=> %s::vector as distance "
        "from documents where tenant_id = %s order by embedding <=> %s::vector limit %s",
        (vec, tenant_id, vec, k),
    ).fetchall()
    return [{"id": r[0], "source": r[1], "chunk": r[2], "distance": float(r[3])} for r in rows]

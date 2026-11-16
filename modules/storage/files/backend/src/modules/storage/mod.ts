import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import type { Schemas } from "@app/api";
import { requireTenant } from "../../shared/auth/session.ts";
import { uuidv7 } from "../../shared/db/columns.ts";
import { files } from "../../shared/db/schema.ts";
import { AppError, badRequest, notFound } from "../../shared/errors/problem.ts";
import { keyset } from "../../shared/db/keyset.ts";
import { pageParams, slicePage } from "../../shared/http/pagination.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";
import { type ObjectStore, s3FromEnv } from "./s3.ts";

type FileRecord = Schemas["FileRecord"];
type NewFile = Schemas["NewFile"];

const UPLOAD_SECONDS = 15 * 60;
const DOWNLOAD_SECONDS = 5 * 60;

const toRecord = (r: typeof files.$inferSelect): FileRecord => ({
  id: r.id,
  filename: r.filename,
  contentType: r.contentType,
  sizeBytes: r.sizeBytes ?? undefined,
  status: r.status,
  createdAt: r.createdAt.toISOString(),
});

// Bytes never pass through this server: clients PUT to a signed URL and GET from another. Postgres keeps metadata.
export default {
  name: "storage",
  routes: ({ db }) => {
    const store = (): ObjectStore => s3FromEnv();
    const maxBytes = () => Number(Deno.env.get("FILE_MAX_BYTES") ?? 25 * 1024 * 1024);
    const mine = (organizationId: string, id: string) =>
      and(eq(files.organizationId, organizationId), eq(files.id, id), isNull(files.deletedAt));
    const app = new Hono<AppEnv>();

    app.post("/files", async (c) => {
      const tenant = await requireTenant(c, db);
      const body = c.get("body") as NewFile;
      if (body.sizeBytes > maxBytes()) throw badRequest(`Files may be at most ${maxBytes()} bytes`);
      const s3 = store();
      const id = uuidv7();
      // The key never contains the user's filename, only its sanitized tail, so odd names cannot escape the prefix.
      const safe = body.filename.replace(/[^\w.-]+/g, "_").slice(-80);
      const [row] = await db.insert(files).values({
        id,
        organizationId: tenant.organizationId,
        ownerId: tenant.user.id,
        key: `${tenant.organizationId}/${id}/${safe}`,
        filename: body.filename,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      }).returning();
      const url = await s3.presign("PUT", row!.key, UPLOAD_SECONDS);
      return c.json({ file: toRecord(row!), upload: { url, method: "PUT" as const, expiresIn: UPLOAD_SECONDS } }, 201);
    });

    app.post("/files/:id/complete", async (c) => {
      const tenant = await requireTenant(c, db);
      const [row] = await db.select().from(files).where(mine(tenant.organizationId, c.req.param("id")));
      if (!row) throw notFound("File not found");
      const s3 = store();
      const size = await s3.size(row.key);
      if (size === null) throw new AppError(422, "Unprocessable Content", "The upload has not arrived yet");
      if (size > maxBytes()) {
        await s3.remove(row.key); // S3 cannot cap a signed PUT, so the limit is enforced here.
        throw new AppError(422, "Unprocessable Content", "The uploaded file is too large and was removed");
      }
      const [ready] = await db.update(files).set({ status: "ready", sizeBytes: size }).where(eq(files.id, row.id))
        .returning();
      return c.json(toRecord(ready!));
    });

    app.get("/files", async (c) => {
      const tenant = await requireTenant(c, db);
      const { limit, cursor } = pageParams(c.get("query"));
      const page = keyset(files.id, cursor);
      const rows = await db.select().from(files)
        .where(
          and(
            eq(files.organizationId, tenant.organizationId),
            eq(files.status, "ready"),
            isNull(files.deletedAt),
            page.where,
          ),
        )
        .orderBy(page.order)
        .limit(limit + 1);
      const { items, nextCursor } = slicePage(rows, limit);
      if (nextCursor) c.header("X-Next-Cursor", nextCursor);
      return c.json(items.map(toRecord));
    });

    app.get("/files/:id", async (c) => {
      const tenant = await requireTenant(c, db);
      const [row] = await db.select().from(files).where(mine(tenant.organizationId, c.req.param("id")));
      if (!row) throw notFound("File not found");
      const downloadUrl = await store().presign("GET", row.key, DOWNLOAD_SECONDS);
      return c.json({ file: toRecord(row), downloadUrl });
    });

    app.delete("/files/:id", async (c) => {
      const tenant = await requireTenant(c, db);
      const [row] = await db.update(files).set({ deletedAt: new Date() }).where(
        mine(tenant.organizationId, c.req.param("id")),
      ).returning();
      if (!row) throw notFound("File not found");
      await store().remove(row.key).catch(() => {}); // orphaned bytes are cheaper than a failed request; a lifecycle rule sweeps them
      return c.body(null, 204);
    });

    return app;
  },
} satisfies Module;

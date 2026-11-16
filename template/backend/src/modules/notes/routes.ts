import { Hono } from "hono";
import type { Schemas } from "@app/api";
import { requireTenant } from "../../shared/auth/session.ts";
import { pageParams } from "../../shared/http/pagination.ts";
import type { AppEnv, Deps } from "../../shared/http/types.ts";
import { notesService } from "./service.ts";

type NewNote = Schemas["NewNote"];

// Bodies and query strings are already validated against the contract by the time a handler runs.
export function notesRoutes({ db }: Deps) {
  const service = notesService(db);
  const app = new Hono<AppEnv>();

  app.get("/notes", async (c) => {
    const tenant = await requireTenant(c, db);
    const q = c.get("query");
    const { notes, nextCursor } = await service.list(tenant.organizationId, {
      ...pageParams(q),
      q: q["q"] as string | undefined,
    });
    if (nextCursor) c.header("X-Next-Cursor", nextCursor);
    return c.json(notes);
  });

  app.post("/notes", async (c) => {
    const tenant = await requireTenant(c, db);
    const { text } = c.get("body") as NewNote;
    return c.json(await service.create(tenant.organizationId, tenant.user.id, text), 201);
  });

  app.get("/notes/:id", async (c) => {
    const tenant = await requireTenant(c, db);
    return c.json(await service.get(tenant.organizationId, c.req.param("id")));
  });

  app.patch("/notes/:id", async (c) => {
    const tenant = await requireTenant(c, db);
    const { text } = c.get("body") as NewNote;
    return c.json(await service.update(tenant.organizationId, c.req.param("id"), text));
  });

  app.delete("/notes/:id", async (c) => {
    const tenant = await requireTenant(c, db);
    await service.remove(tenant.organizationId, c.req.param("id"));
    return c.body(null, 204);
  });

  return app;
}

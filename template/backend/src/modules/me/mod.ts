import { Hono } from "hono";
import { listMemberships } from "../../shared/db/membership.ts";
import { requireUser } from "../../shared/auth/session.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";

export default {
  name: "me",
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/me", async (c) => {
      const user = requireUser(c);
      const organizations = await listMemberships(db, user.id);
      return c.json({ id: user.id, email: user.email, name: user.name, organizations });
    }),
} satisfies Module;

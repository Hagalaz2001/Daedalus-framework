import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { member, organization } from "../../shared/db/auth-schema.ts";
import { requireUser } from "../../shared/auth/session.ts";
import type { AppEnv, Module } from "../../shared/http/types.ts";

export default {
  name: "me",
  routes: ({ db }) =>
    new Hono<AppEnv>().get("/me", async (c) => {
      const user = requireUser(c);
      const organizations = await db
        .select({ id: organization.id, name: organization.name, role: member.role })
        .from(member)
        .innerJoin(organization, eq(organization.id, member.organizationId))
        .where(eq(member.userId, user.id))
        .orderBy(asc(member.id));
      return c.json({ id: user.id, email: user.email, name: user.name, organizations });
    }),
} satisfies Module;

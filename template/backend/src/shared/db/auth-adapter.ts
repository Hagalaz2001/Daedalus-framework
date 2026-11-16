import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { sql } from "drizzle-orm";
import * as authSchema from "./auth-schema.ts";
import type { Db } from "./client.ts";
import { uuidv7 } from "./columns.ts";

// Everything in shared/auth/auth.ts that touches the database. The MongoDB flavour replaces this file.

/** Better Auth's storage for users, sessions, accounts, organizations, members and invitations. */
export const authDatabase = (db: Db) => drizzleAdapter(db, { provider: "pg", schema: authSchema });

/** Every new user gets a personal organization so tenant-scoped features work from the first request. */
export async function createPersonalSpace(db: Db, user: { id: string; name: string }) {
  const orgId = uuidv7();
  await db.insert(authSchema.organization).values({
    id: orgId,
    name: `${user.name}'s space`,
    slug: `u-${orgId.slice(-12)}`,
    createdAt: new Date(),
  });
  await db.insert(authSchema.member).values({
    id: uuidv7(),
    organizationId: orgId,
    userId: user.id,
    role: "owner",
    createdAt: new Date(),
  });
}

/**
 * Before an account is deleted: rows that reference the user cascade or are set null (see the schema), but
 * organizations the user was the only member of would be left orphaned with their content, so they go first.
 */
export async function removeOrphanedSpaces(db: Db, userId: string) {
  await db.delete(authSchema.organization).where(sql`${authSchema.organization.id} in (
    select organization_id from member group by organization_id
    having count(*) = 1 and bool_and(user_id = ${userId}))`);
}

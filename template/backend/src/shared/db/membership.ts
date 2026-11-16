import { and, asc, eq } from "drizzle-orm";
import { member, organization } from "./auth-schema.ts";
import type { Db } from "./client.ts";
import { uuidv7 } from "./columns.ts";

// Database access behind the tenancy rules (shared/auth/session.ts). The MongoDB flavour replaces this file.

/** The caller's membership in `organizationId`, or their oldest one (their personal organization) when omitted. */
export async function findMembership(db: Db, userId: string, organizationId?: string) {
  const [row] = await db
    .select({ organizationId: member.organizationId, role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), organizationId ? eq(member.organizationId, organizationId) : undefined))
    .orderBy(asc(member.id))
    .limit(1);
  return row;
}

export async function listMemberships(db: Db, userId: string) {
  return await db
    .select({ id: organization.id, name: organization.name, role: member.role })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(eq(member.userId, userId))
    .orderBy(asc(member.id));
}

/** Adds a member to an organization (tests and seeds; real invitations go through Better Auth). */
export async function addMember(db: Db, organizationId: string, userId: string, role: string) {
  await db.insert(member).values({ id: uuidv7(), organizationId, userId, role, createdAt: new Date() });
}

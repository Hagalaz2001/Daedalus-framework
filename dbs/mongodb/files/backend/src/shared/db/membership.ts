import type { Db } from "./client.ts";
import { uuidv7 } from "./columns.ts";

// Database access behind the tenancy rules (shared/auth/session.ts), MongoDB flavour.

/** The caller's membership in `organizationId`, or their oldest one (their personal organization) when omitted. */
export async function findMembership(db: Db, userId: string, organizationId?: string) {
  const row = await db.models.Member.findOne({ userId, ...(organizationId ? { organizationId } : {}) })
    .sort({ _id: 1 }).lean();
  return row ? { organizationId: row.organizationId as string, role: row.role as string } : undefined;
}

export async function listMemberships(db: Db, userId: string) {
  const members = await db.models.Member.find({ userId }).sort({ _id: 1 }).lean();
  const orgs = await db.models.Organization.find({ _id: { $in: members.map((m) => m.organizationId as string) } })
    .lean();
  const names = new Map((orgs as unknown as { _id: string; name: string }[]).map((o) => [o._id, o.name]));
  return members.map((m) => ({
    id: m.organizationId as string,
    name: names.get(m.organizationId as string) ?? "",
    role: m.role as string,
  }));
}

/** Adds a member to an organization (tests and seeds; real invitations go through Better Auth). */
export async function addMember(db: Db, organizationId: string, userId: string, role: string) {
  await db.models.Member.create({ _id: uuidv7(), organizationId, userId, role, createdAt: new Date() });
}

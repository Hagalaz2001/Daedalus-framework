import { mongodbAdapter } from "@better-auth/mongo-adapter";
import type { Db } from "./client.ts";
import { uuidv7 } from "./columns.ts";

// Everything in shared/auth/auth.ts that touches the database, MongoDB flavour.

/** Better Auth's storage for users, sessions, accounts, organizations, members and invitations. */
// Mongoose bundles its own copy of the `mongodb` driver types, so the same object has two nominal types; it is one object.
export const authDatabase = (db: Db) =>
  mongodbAdapter(db.conn.getClient().db(db.conn.name) as unknown as Parameters<typeof mongodbAdapter>[0]);

/** Every new user gets a personal organization so tenant-scoped features work from the first request. */
export async function createPersonalSpace(db: Db, user: { id: string; name: string }) {
  const orgId = uuidv7();
  await db.models.Organization.create({
    _id: orgId,
    name: `${user.name}'s space`,
    slug: `u-${orgId.slice(-12)}`,
    createdAt: new Date(),
  });
  await db.models.Member.create({
    _id: uuidv7(),
    organizationId: orgId,
    userId: user.id,
    role: "owner",
    createdAt: new Date(),
  });
}

/**
 * Before an account is deleted. MongoDB has no foreign keys, so the cascade is explicit: organizations the user was
 * the only member of go with all their content; elsewhere the user's rows are removed or anonymized (authorship is
 * set to null, like `ON DELETE SET NULL` in the SQL flavour).
 */
export async function removeOrphanedSpaces(db: Db, userId: string) {
  const m = db.models;
  for (const membership of await m.Member.find({ userId }).lean()) {
    const orgId = String(membership.organizationId);
    if (await m.Member.countDocuments({ organizationId: orgId, userId: { $ne: userId } }) > 0) continue;
    await Promise.all([
      m.Note.deleteMany({ organizationId: orgId }),
      m.File.deleteMany({ organizationId: orgId }),
      m.AuditLog.deleteMany({ organizationId: orgId }),
      m.Notification.deleteMany({ organizationId: orgId }),
      m.Invitation.deleteMany({ organizationId: orgId }),
      m.Member.deleteMany({ organizationId: orgId }),
    ]);
    await m.Organization.deleteOne({ _id: orgId });
  }
  await Promise.all([
    m.Member.deleteMany({ userId }),
    m.Invitation.deleteMany({ inviterId: userId }),
    m.Notification.deleteMany({ userId }),
    m.IdempotencyKey.deleteMany({ userId }),
    m.Note.updateMany({ authorId: userId }, { $set: { authorId: null } }),
    m.File.updateMany({ ownerId: userId }, { $set: { ownerId: null } }),
    m.AuditLog.updateMany({ actorId: userId }, { $set: { actorId: null } }),
  ]);
}

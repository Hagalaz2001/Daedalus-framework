import { type Connection, Schema } from "mongoose";
import { uuidv7 } from "./columns.ts";

// Collections of the base schema. Conventions (docs/DATABASE.md, MongoDB section): `_id` is a UUIDv7 string, every
// tenant-owned document carries `organizationId`, `createdAt`/`updatedAt` come from `timestamps`, soft delete is a
// `deletedAt` date. Indexes are declared here and created by migrations (autoIndex is off), never at runtime.
// user, session, account, verification, organization, member and invitation are written by Better Auth's MongoDB
// adapter; their schemas here describe the documents (for indexes, queries and the diagram), not a second source.

const _id = { type: String, default: () => uuidv7() };
/** Per-collection schema options: indexes are created by migrations (autoIndex off), no __v field, optional createdAt/updatedAt. */
const opts = (collection: string, timestamps = false) =>
  ({ collection, autoIndex: false, versionKey: false, timestamps }) as const;
const ref = (to: string, extra: object = {}) => ({ type: String, ref: to, ...extra });

export function buildModels(conn: Connection) {
  const User = conn.model(
    "User",
    new Schema({
      _id: String,
      name: { type: String, required: true },
      email: { type: String, required: true },
      emailVerified: Boolean,
      image: String,
      createdAt: Date,
      updatedAt: Date,
    }, opts("user")).index({ email: 1 }, { unique: true }),
  );
  const Session = conn.model(
    "Session",
    new Schema({
      _id: String,
      userId: ref("User", { required: true }),
      token: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      activeOrganizationId: ref("Organization"),
      ipAddress: String,
      userAgent: String,
      createdAt: Date,
      updatedAt: Date,
    }, opts("session"))
      .index({ token: 1 }, { unique: true })
      .index({ userId: 1 })
      .index({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  );
  const Account = conn.model(
    "Account",
    new Schema({
      _id: String,
      userId: ref("User", { required: true }),
      providerId: { type: String, required: true },
      accountId: { type: String, required: true },
      password: String,
      createdAt: Date,
      updatedAt: Date,
    }, opts("account")).index({ userId: 1 }).index({ providerId: 1, accountId: 1 }, {
      unique: true,
    }),
  );
  const Verification = conn.model(
    "Verification",
    new Schema({
      _id: String,
      identifier: { type: String, required: true },
      value: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      createdAt: Date,
      updatedAt: Date,
    }, opts("verification")).index({ identifier: 1 }).index({ expiresAt: 1 }, {
      expireAfterSeconds: 0,
    }),
  );
  const Organization = conn.model(
    "Organization",
    new Schema({
      _id: String,
      name: { type: String, required: true },
      slug: { type: String, required: true },
      logo: String,
      metadata: String,
      createdAt: Date,
    }, opts("organization")).index({ slug: 1 }, { unique: true }),
  );
  const Member = conn.model(
    "Member",
    new Schema({
      _id: String,
      organizationId: ref("Organization", { required: true }),
      userId: ref("User", { required: true }),
      role: { type: String, required: true },
      createdAt: Date,
    }, opts("member")).index({ organizationId: 1, userId: 1 }, { unique: true }).index({
      userId: 1,
    }),
  );
  const Invitation = conn.model(
    "Invitation",
    new Schema({
      _id: String,
      organizationId: ref("Organization", { required: true }),
      inviterId: ref("User", { required: true }),
      email: { type: String, required: true },
      role: String,
      status: { type: String, required: true },
      expiresAt: { type: Date, required: true },
      createdAt: Date,
    }, opts("invitation")).index({ organizationId: 1, email: 1 }),
  );

  const Note = conn.model(
    "Note",
    new Schema({
      _id,
      organizationId: ref("Organization", { required: true }),
      authorId: ref("User", { default: null }),
      text: { type: String, required: true },
      deletedAt: { type: Date, default: null },
    }, opts("notes", true)).index({ organizationId: 1, _id: -1 }),
  );
  const AuditLog = conn.model(
    "AuditLog",
    new Schema({
      _id,
      organizationId: ref("Organization", { default: null }),
      actorId: ref("User", { default: null }),
      action: { type: String, required: true },
      entityType: String,
      entityId: String,
      requestId: String,
      metadata: { type: Schema.Types.Mixed, default: {} },
    }, opts("audit_log", true)).index({ organizationId: 1, _id: -1 }),
  );
  const FileDoc = conn.model(
    "File",
    new Schema({
      _id,
      organizationId: ref("Organization", { required: true }),
      ownerId: ref("User", { default: null }),
      key: { type: String, required: true },
      filename: { type: String, required: true },
      contentType: { type: String, required: true },
      sizeBytes: Number,
      status: { type: String, enum: ["pending", "ready"], default: "pending" },
      deletedAt: { type: Date, default: null },
    }, opts("files", true)).index({ key: 1 }, { unique: true }).index({
      organizationId: 1,
      _id: -1,
    }),
  );
  const Notification = conn.model(
    "Notification",
    new Schema({
      _id,
      userId: ref("User", { required: true }),
      organizationId: ref("Organization", { default: null }),
      kind: { type: String, required: true },
      title: { type: String, required: true },
      body: String,
      data: { type: Schema.Types.Mixed, default: {} },
      readAt: { type: Date, default: null },
    }, opts("notifications", true)).index({ userId: 1, _id: -1 }),
  );
  // Replay store for the Idempotency-Key header. MongoDB deletes expired rows itself (TTL index): no cleanup job.
  const IdempotencyKey = conn.model(
    "IdempotencyKey",
    new Schema({
      _id,
      userId: ref("User", { required: true }),
      key: { type: String, required: true },
      requestHash: { type: String, required: true },
      status: { type: Number, default: null },
      body: { type: String, default: null },
    }, opts("idempotency_keys", true))
      .index({ userId: 1, key: 1 }, { unique: true })
      .index({ createdAt: 1 }, { expireAfterSeconds: 24 * 3600 }),
  );

  return {
    User,
    Session,
    Account,
    Verification,
    Organization,
    Member,
    Invitation,
    Note,
    AuditLog,
    File: FileDoc,
    Notification,
    IdempotencyKey,
  };
}

export type Models = ReturnType<typeof buildModels>;

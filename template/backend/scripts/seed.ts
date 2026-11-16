// `deno task seed`: fake development data (people, a shared organization, notes). Refuses to run in production.
import { eq } from "drizzle-orm";
import type { AuthLike } from "../src/shared/auth/auth.ts";
import { createApp, discoverModules } from "../src/app.ts";
import { type Config, loadConfig } from "../src/shared/config/config.ts";
import { type Db, openDb } from "../src/shared/db/client.ts";
import { createLogger } from "../src/shared/logging/logger.ts";
import { invitation, member, organization, user } from "../src/shared/db/auth-schema.ts";
import { uuidv7 } from "../src/shared/db/columns.ts";
import { auditLog, notifications } from "../src/shared/db/schema.ts";
import { notes } from "../src/modules/notes/schema.ts";

/** Development password for every seeded account. Never seed a production database. */
export const SEED_PASSWORD = "password1234";

const PEOPLE = [
  { name: "Ada Example", email: "ada@example.com" },
  { name: "Ben Sample", email: "ben@example.com" },
  { name: "Chloe Demo", email: "chloe@example.com" },
];

const NOTES = [
  "Kick-off agenda: goals, owners, first milestone",
  "Customer interview 1: wants offline mode and faster search",
  "Customer interview 2: confused by the invite screen",
  "Pricing idea: free for 3 members, per-seat after that",
  "Launch checklist: privacy page, backups, status page",
  "Retro: ship smaller changes, review earlier",
  "Idea: weekly digest email of unread notes",
  "Bug: attachments over 10 MB time out on mobile",
  "Design review notes: increase contrast on empty states",
  "Support macro: how to reset a password",
  "Roadmap Q1: sharing, comments, search",
  "Reading list: three posts on keyset pagination",
];

/** Fake but realistic data: three people, a shared organization, notes, a pending invitation, notifications. Safe to run twice. */
export async function seed(db: Db, auth: AuthLike, config: Pick<Config, "authUrl">) {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, PEOPLE[0]!.email));
  if (existing) return { created: false };

  const ids: string[] = [];
  for (const p of PEOPLE) {
    const res = await auth.handler(
      new Request(`${config.authUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...p, password: SEED_PASSWORD }),
      }),
    );
    if (!res.ok) throw new Error(`seed sign-up failed for ${p.email}: ${await res.text()}`);
    ids.push((await res.json()).user.id);
  }
  const [ada, ben, chloe] = ids as [string, string, string];

  const orgId = uuidv7();
  await db.insert(organization).values({ id: orgId, name: "Acme Notes", slug: "acme-notes", createdAt: new Date() });
  await db.insert(member).values([
    { id: uuidv7(), organizationId: orgId, userId: ada, role: "owner", createdAt: new Date() },
    { id: uuidv7(), organizationId: orgId, userId: ben, role: "admin", createdAt: new Date() },
    { id: uuidv7(), organizationId: orgId, userId: chloe, role: "member", createdAt: new Date() },
  ]);
  await db.insert(invitation).values({
    id: uuidv7(),
    organizationId: orgId,
    email: "dana@example.com",
    role: "member",
    status: "pending",
    expiresAt: new Date(Date.now() + 7 * 864e5),
    createdAt: new Date(),
    inviterId: ada,
  });

  const authors = [ada, ben, chloe];
  for (const [i, text] of NOTES.entries()) {
    // Sequential inserts keep UUIDv7 ids in the same order as the list above.
    await db.insert(notes).values({ organizationId: orgId, authorId: authors[i % 3]!, text });
  }
  await db.insert(notifications).values({
    userId: chloe,
    organizationId: orgId,
    kind: "invitation.accepted",
    title: "You joined Acme Notes",
    data: { organizationId: orgId },
  });
  await db.insert(auditLog).values([
    { organizationId: orgId, actorId: ada, action: "organization.create", entityType: "organization", entityId: orgId },
    {
      organizationId: orgId,
      actorId: ada,
      action: "member.invite",
      entityType: "invitation",
      metadata: { email: "dana@example.com" },
    },
  ]);
  return { created: true };
}

if (import.meta.main) {
  const config = loadConfig();
  if (config.env === "production") {
    console.error("Refusing to seed with APP_ENV=production.");
    Deno.exit(1);
  }
  const { db, close } = await openDb({ url: config.databaseUrl, dataDir: config.pgliteDir });
  const { deps } = await createApp({ config, db, logger: createLogger("warn") }, await discoverModules());
  const { created } = await seed(db, deps.auth, config);
  console.log(created ? `Seeded. Sign in as ada@example.com / ${SEED_PASSWORD}` : "Already seeded, nothing to do.");
  await close();
}

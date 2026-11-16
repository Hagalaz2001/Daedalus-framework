import { betterAuth, type BetterAuthOptions } from "better-auth";
import { bearer, organization } from "better-auth/plugins";
import type { Config } from "../config/config.ts";
import type { Db } from "../db/client.ts";
import { uuidv7 } from "../db/columns.ts";
import { authDatabase, createPersonalSpace, removeOrphanedSpaces } from "../db/auth-adapter.ts";
import { mailer } from "../mail/mailer.ts";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

/** The slice of Better Auth the app depends on; plugins add more endpoints under /api/auth/*. */
export interface AuthLike {
  handler: (req: Request) => Promise<Response>;
  api: {
    getSession: (o: { headers: Headers }) => Promise<{ user: AuthUser; session: { id: string } } | null>;
  };
}

/**
 * Accounts (Better Auth, MIT), mounted at /api/auth/*; data lives in this project's Postgres.
 * - Web: session cookie (same-site, `credentials: "include"`).
 * - Mobile/desktop: the bearer plugin. Sign in, read the `set-auth-token` response header, keep it in
 *   secure storage, send `Authorization: Bearer <token>`.
 * - Organizations plugin: organizations, members, roles and invitations. Every new user gets a personal
 *   organization so that tenant-scoped features work from the first request.
 * Modules extend this through `Module.auth` (merged in `extra`).
 */
export function createAuth(
  deps: { config: Config; db: Db },
  extra: Partial<BetterAuthOptions> = {},
): AuthLike {
  const { config, db } = deps;
  const auth = betterAuth({
    secret: config.authSecret,
    baseURL: config.authUrl,
    trustedOrigins: config.trustedOrigins,
    database: authDatabase(db),
    advanced: { database: { generateId: () => uuidv7() } },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => await createPersonalSpace(db, user),
        },
      },
    },
    user: {
      deleteUser: {
        enabled: true,
        // Cascades and orphaned personal spaces: see removeOrphanedSpaces.
        beforeDelete: async (user) => await removeOrphanedSpaces(db, user.id),
      },
    },
    ...extra,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) =>
        mailer.send({ to: user.email, subject: "Reset your password", text: `Reset your password: ${url}` }),
      ...extra.emailAndPassword,
    },
    plugins: [
      bearer(),
      organization({
        sendInvitationEmail: ({ id, email, organization, inviter }) =>
          mailer.send({
            to: email,
            subject: `${inviter.user.name} invited you to ${organization.name}`,
            text: `Join ${organization.name}: ${config.trustedOrigins[0]}/accept-invitation/${id}`,
          }),
      }),
      ...(extra.plugins ?? []),
    ],
  });
  return auth as unknown as AuthLike;
}

import { magicLink, twoFactor } from "better-auth/plugins";
import { mailer } from "../../shared/mail/mailer.ts";
import type { Module } from "../../shared/http/types.ts";

const provider = (id: string, secret: string) => {
  const clientId = Deno.env.get(id);
  const clientSecret = Deno.env.get(secret);
  return clientId && clientSecret ? { clientId, clientSecret } : undefined;
};

/** Providers switch on when their client id and secret are set; nothing else to configure. */
export default {
  name: "auth-extras",
  auth: () => {
    const github = provider("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET");
    const google = provider("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
    return {
      socialProviders: { ...(github && { github }), ...(google && { google }) },
      plugins: [
        magicLink({
          sendMagicLink: ({ email, url }) =>
            mailer.send({ to: email, subject: "Your sign-in link", text: `Sign in: ${url}\n\nThe link works once.` }),
        }),
        twoFactor({ issuer: Deno.env.get("APP_NAME") ?? "App" }),
      ],
    };
  },
} satisfies Module;

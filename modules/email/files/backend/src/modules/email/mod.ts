import { mailer, useMailer } from "../../shared/mail/mailer.ts";
import type { Module } from "../../shared/http/types.ts";
import { createMailer } from "./transports.ts";
import { renderMail, templates } from "./templates.tsx";

export { renderMail } from "./templates.tsx";

/** Send a rendered template: `await sendTemplate("welcome", user.email, { name: user.name })`. */
export const sendTemplate = async <K extends keyof typeof templates>(
  name: K,
  to: string,
  props: Parameters<(typeof templates)[K]["component"]>[0],
) => await mailer.send(await renderMail(name, to, props));

export default {
  name: "email",
  setup: () => useMailer(createMailer()),
  // Password-reset mail gets the HTML template; the base already routes it through the mailer.
  auth: () => ({
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) =>
        await sendTemplate("resetPassword", user.email, { name: user.name, url }),
    },
  }),
} satisfies Module;

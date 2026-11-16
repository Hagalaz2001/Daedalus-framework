import nodemailer from "nodemailer";
import type { Mail, Mailer } from "../../shared/mail/mailer.ts";

/** Messages "sent" by the memory transport (tests read this). */
export const outbox: Mail[] = [];

type Env = (name: string) => string | undefined;

function required(env: Env, name: string) {
  const value = env(name);
  if (!value) throw new Error(`${name} is required for EMAIL_TRANSPORT=${env("EMAIL_TRANSPORT")}`);
  return value;
}

/** EMAIL_TRANSPORT: `log` prints (default), `memory` keeps messages in `outbox`, `resend` and `smtp` deliver. */
export function createMailer(env: Env = Deno.env.get.bind(Deno.env)): Mailer {
  const transport = env("EMAIL_TRANSPORT") ?? "log";
  if (transport === "memory") {
    return { send: (mail) => (outbox.push(mail), Promise.resolve()) };
  }
  if (transport === "log") {
    return {
      send: (mail) =>
        Promise.resolve(console.log(JSON.stringify({ level: "info", msg: "mail (log transport)", ...mail }))),
    };
  }
  const from = required(env, "EMAIL_FROM");
  if (transport === "resend") {
    const key = required(env, "RESEND_API_KEY");
    return {
      async send({ to, subject, text, html }) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ from, to, subject, text, html }),
        });
        if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
      },
    };
  }
  if (transport === "smtp") {
    const smtp = nodemailer.createTransport(required(env, "SMTP_URL"));
    return { send: async (mail) => void await smtp.sendMail({ from, ...mail }) };
  }
  throw new Error(`Unknown EMAIL_TRANSPORT "${transport}" (log, memory, resend, smtp)`);
}

/** A message to send. Delivery is a module concern; the base only needs this seam. */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/**
 * Default mailer: prints the message in development (so reset and invitation links work without a provider)
 * and fails loudly elsewhere, because a silent "sent" that never arrives is the worse bug.
 * Install the email module to deliver real mail; it replaces this through `useMailer`.
 */
const unconfigured: Mailer = {
  send(mail) {
    if (Deno.env.get("APP_ENV") === "production") {
      return Promise.reject(new Error("No mailer configured: install the email module (see docs/MODULES.md)"));
    }
    console.log(JSON.stringify({ level: "info", msg: "mail (dev, not sent)", ...mail }));
    return Promise.resolve();
  },
};

let current: Mailer = unconfigured;
export const useMailer = (mailer: Mailer) => void (current = mailer);
export const mailer: Mailer = { send: (mail) => current.send(mail) };

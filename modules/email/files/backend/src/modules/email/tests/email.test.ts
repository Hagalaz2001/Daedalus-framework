import { assert, assertEquals, assertRejects } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";
import { createMailer, outbox } from "../transports.ts";
import { renderMail } from "../templates.tsx";

Deno.env.set("EMAIL_TRANSPORT", "memory");
const t = await createTestApp();

Deno.test("templates render HTML and a plain-text alternative", async () => {
  const mail = await renderMail("welcome", "ada@example.com", { name: "Ada" });
  assert(mail.html?.includes("Welcome, Ada") || mail.html?.includes("Ada"));
  assert(mail.text.toLowerCase().includes("ada")); // plain text upper-cases headings
});

Deno.test("password reset goes through the mailer with the HTML template", async () => {
  await t.signUp("resetme");
  const res = await t.app.request("/api/auth/request-password-reset", {
    method: "POST",
    headers: t.json,
    body: JSON.stringify({ email: "resetme@example.com", redirectTo: "http://localhost:5173/reset" }),
  });
  assertEquals(res.status, 200);
  await new Promise((r) => setTimeout(r, 100)); // Better Auth sends in the background
  const mail = outbox.at(-1);
  assertEquals(mail?.to, "resetme@example.com");
  assert(mail?.html?.includes("Choose a new password"));
  assert(mail?.text.includes("reset-password"));
});

Deno.test("transports validate their settings", async () => {
  const env = (vars: Record<string, string>) => (name: string) => vars[name];
  await assertRejects(
    async () => await createMailer(env({ EMAIL_TRANSPORT: "resend" })).send({ to: "a", subject: "s", text: "t" }),
    Error,
  );
  await assertRejects(
    async () => await createMailer(env({ EMAIL_TRANSPORT: "nope" })).send({ to: "a", subject: "s", text: "t" }),
    Error,
  );
});

addEventListener("unload", () => void t.close());

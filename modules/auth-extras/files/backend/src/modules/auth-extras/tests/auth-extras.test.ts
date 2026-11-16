import { assert, assertEquals } from "@std/assert";
import { type Mail, useMailer } from "../../../shared/mail/mailer.ts";
import { createTestApp } from "../../../shared/testing.ts";

const sent: Mail[] = [];
const t = await createTestApp();
// After createTestApp: an installed email module would otherwise replace this capturing mailer.
useMailer({ send: (mail) => (sent.push(mail), Promise.resolve()) });

Deno.test("magic link: request a link, open it, get a session", async () => {
  const res = await t.app.request("/api/auth/sign-in/magic-link", {
    method: "POST",
    headers: t.json,
    body: JSON.stringify({ email: "magic@example.com", name: "Magic" }),
  });
  assertEquals(res.status, 200);
  await new Promise((r) => setTimeout(r, 100)); // Better Auth sends in the background
  const link = sent.at(-1)?.text.match(/https?:\/\/\S+/)?.[0];
  assert(link, "mail contains a link");
  const verify = await t.app.request(new URL(link).pathname + new URL(link).search);
  assert([200, 302].includes(verify.status), `verify answered ${verify.status}`);
  assert(verify.headers.get("set-cookie")?.includes("session_token"));
});

Deno.test("two-factor: a signed-in user can start enrolment and gets a TOTP URI", async () => {
  const user = await t.signUp("secure");
  const res = await t.app.request("/api/auth/two-factor/enable", {
    method: "POST",
    headers: user.headers,
    body: JSON.stringify({ password: "correct-horse-battery" }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assert(body.totpURI.startsWith("otpauth://totp/"));
  assert(body.backupCodes.length > 0);
});

Deno.test("social providers stay off without credentials", async () => {
  const res = await t.app.request("/api/auth/sign-in/social", {
    method: "POST",
    headers: t.json,
    body: JSON.stringify({ provider: "github", callbackURL: "/" }),
  });
  assert(res.status >= 400);
});

addEventListener("unload", () => void t.close());

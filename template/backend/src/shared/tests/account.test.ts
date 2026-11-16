import { assert, assertEquals } from "@std/assert";
import { type Mail, useMailer } from "../mail/mailer.ts";
import { createTestApp } from "../testing.ts";

const t = await createTestApp();

Deno.test("password reset sends a link through the mailer", async () => {
  const sent: Mail[] = [];
  useMailer({ send: (mail) => (sent.push(mail), Promise.resolve()) });
  await t.signUp("forgetful");
  const res = await t.app.request("/api/auth/request-password-reset", {
    method: "POST",
    headers: t.json,
    body: JSON.stringify({ email: "forgetful@example.com", redirectTo: "http://localhost:5173/reset-password" }),
  });
  assertEquals(res.status, 200);
  await new Promise((r) => setTimeout(r, 100)); // Better Auth sends in the background
  assertEquals(sent.at(-1)?.to, "forgetful@example.com");
  assert(sent.at(-1)?.text.includes("reset-password"));
});

addEventListener("unload", () => void t.close());

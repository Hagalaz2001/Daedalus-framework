import { assert, assertEquals } from "@std/assert";
import { createTestApp } from "../../../shared/testing.ts";

const env = {
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "auto",
  S3_BUCKET: "test-bucket",
  S3_ACCESS_KEY_ID: "test-key",
  S3_SECRET_ACCESS_KEY: "test-secret",
};
for (const [k, v] of Object.entries(env)) Deno.env.set(k, v);
const t = await createTestApp();
const ana = await t.signUp("filer");
const ben = await t.signUp("other");

/** A fake S3: remembers which objects "exist" and what was deleted. */
const objects = new Map<string, number>();
const deleted: string[] = [];
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const req = new Request(input, init);
  if (!req.url.startsWith(env.S3_ENDPOINT)) return realFetch(input, init);
  const key = new URL(req.url).pathname;
  if (req.method === "HEAD") {
    const size = objects.get(key);
    return Promise.resolve(
      size === undefined
        ? new Response(null, { status: 404 })
        : new Response(null, { headers: { "content-length": String(size) } }),
    );
  }
  if (req.method === "DELETE") {
    deleted.push(key);
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  return Promise.resolve(new Response(null, { status: 405 }));
};

const start = (headers: HeadersInit, sizeBytes = 1234) =>
  t.app.request("/files", {
    method: "POST",
    headers,
    body: JSON.stringify({ filename: "my report (final).pdf", contentType: "application/pdf", sizeBytes }),
  });

Deno.test("upload flow: signed PUT URL, complete, list, signed download URL, delete", async () => {
  const res = await start(ana.headers);
  assertEquals(res.status, 201);
  const ticket = await res.json();
  assertEquals(t.deps.contract.validateResponse("POST", "/files", 201, ticket), []);
  const url = new URL(ticket.upload.url);
  assert(url.pathname.startsWith("/test-bucket/") && url.pathname.endsWith("my_report_final_.pdf"));
  assertEquals(url.searchParams.get("X-Amz-Expires"), "900");
  assert(url.searchParams.get("X-Amz-Signature"));

  const id = ticket.file.id;
  assertEquals(
    (await t.app.request(`/files/${id}/complete`, { method: "POST", headers: ana.headers })).status,
    422,
    "nothing uploaded yet",
  );
  objects.set(url.pathname, 1234);
  const done = await t.app.request(`/files/${id}/complete`, { method: "POST", headers: ana.headers });
  assertEquals((await done.json()).status, "ready");

  assertEquals((await (await t.app.request("/files", { headers: ana.headers })).json()).length, 1);
  const got = await (await t.app.request(`/files/${id}`, { headers: ana.headers })).json();
  assert(new URL(got.downloadUrl).searchParams.get("X-Amz-Signature"));

  assertEquals((await t.app.request(`/files/${id}`, { method: "DELETE", headers: ana.headers })).status, 204);
  assertEquals(deleted, [url.pathname]);
  assertEquals((await t.app.request(`/files/${id}`, { headers: ana.headers })).status, 404);
});

Deno.test("another tenant cannot see or complete the file", async () => {
  const ticket = await (await start(ana.headers)).json();
  assertEquals((await t.app.request(`/files/${ticket.file.id}`, { headers: ben.headers })).status, 404);
  assertEquals(
    (await t.app.request(`/files/${ticket.file.id}/complete`, { method: "POST", headers: ben.headers })).status,
    404,
  );
});

Deno.test("too large uploads are refused up front and removed after the fact", async () => {
  assertEquals((await start(ana.headers, 26 * 1024 * 1024)).status, 400);
  const ticket = await (await start(ana.headers)).json();
  objects.set(new URL(ticket.upload.url).pathname, 30 * 1024 * 1024);
  assertEquals(
    (await t.app.request(`/files/${ticket.file.id}/complete`, { method: "POST", headers: ana.headers })).status,
    422,
  );
  assert(deleted.includes(new URL(ticket.upload.url).pathname));
});

Deno.test("without S3 settings the endpoint answers 503, not a crash", async () => {
  Deno.env.delete("S3_BUCKET");
  assertEquals((await start(ana.headers)).status, 503);
  Deno.env.set("S3_BUCKET", env.S3_BUCKET);
});

addEventListener("unload", () => void t.close());

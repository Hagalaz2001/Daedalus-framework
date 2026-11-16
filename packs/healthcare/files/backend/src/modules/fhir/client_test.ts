// deno-lint-ignore-file no-import-prefix
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { FhirClient, FhirError, type Patient } from "./client.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/fhir+json" } });

Deno.test("read sends auth and the FHIR accept header and builds the URL", async () => {
  let seen: Request | undefined;
  const fake: typeof fetch = (input, init) => {
    seen = new Request(input as URL, init);
    return Promise.resolve(json({ resourceType: "Patient", id: "p 1", birthDate: "1990-01-01" }));
  };
  const c = new FhirClient("https://fhir.example.test/r4", () => Promise.resolve("tok"), fake);
  const p = await c.read<Patient>("Patient", "p 1");
  assertEquals(p.birthDate, "1990-01-01");
  assertEquals(seen?.url, "https://fhir.example.test/r4/Patient/p%201");
  assertEquals(seen?.headers.get("authorization"), "Bearer tok");
  assertEquals(seen?.headers.get("accept"), "application/fhir+json");
});

Deno.test("search unwraps bundle entries", async () => {
  const fake: typeof fetch = () =>
    Promise.resolve(
      json({
        resourceType: "Bundle",
        entry: [{ resource: { resourceType: "Patient", id: "a" } }, { resource: { resourceType: "Patient", id: "b" } }],
      }),
    );
  const c = new FhirClient("https://fhir.example.test/r4/", () => Promise.resolve("t"), fake);
  assertEquals((await c.search("Patient", { family: "Synthetic" })).map((p) => p.id), ["a", "b"]);
});

Deno.test("errors carry status and OperationOutcome", async () => {
  const fake: typeof fetch = () => Promise.resolve(json({ resourceType: "OperationOutcome", issue: [] }, 404));
  const c = new FhirClient("https://fhir.example.test/r4", () => Promise.resolve("t"), fake);
  const e = await assertRejects(() => c.read("Patient", "x"), FhirError);
  assertEquals(e.status, 404);
});

// deno-lint-ignore-file no-import-prefix
import { assertEquals } from "jsr:@std/assert@1";
import { scanText } from "./sast.ts";

const rules = (file: string, src: string) => scanText(file, src).map((f) => f.rule);

Deno.test("flags typical AI mistakes", () => {
  assertEquals(rules("a.ts", "eval(x)"), ["js-eval"]);
  assertEquals(rules("a.tsx", "<div dangerouslySetInnerHTML={{__html: h}} />"), ["html-injection"]);
  assertEquals(rules("a.ts", "db.query(`select * from t where id = ${id}`)"), ["sql-concat"]);
  assertEquals(rules("a.ts", 'createHash("md5")'), ["weak-hash"]);
  assertEquals(rules("a.ts", 'const apiKey = "abcdEFGH12345678"'), ["hardcoded-secret"]);
  assertEquals(rules("a.ts", "const total = amount * 1.2"), ["float-money"]);
  assertEquals(rules("a.ts", "const token = Math.random().toString(36)"), ["insecure-random"]);
  assertEquals(rules("a.py", "requests.get(u, verify=False)"), ["tls-verification-off"]);
  assertEquals(rules("a.c", "strcpy(a, b);"), ["c-unsafe-call"]);
});

Deno.test("leaves safe code and reviewed lines alone", () => {
  assertEquals(rules("a.ts", "const x = Math.random() * 10"), []);
  assertEquals(rules("a.ts", 'db.query("select 1 where id = $1", [id])'), []);
  assertEquals(rules("a.ts", "const k = Deno.env.get('API_KEY')"), []);
  assertEquals(rules("a.ts", "el.innerHTML = safe // sast:allow html-injection reviewed, sanitised"), []);
  assertEquals(rules("a.md", "eval(x)"), []);
});

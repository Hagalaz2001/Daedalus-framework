import { assertEquals } from "jsr:@std/assert@1";
import { findViolations } from "./lint-boundaries.ts";

Deno.test("ts: public entry is allowed, internals are not", () => {
  assertEquals(findViolations("ts", "features/a/ui/A.tsx", `import { x } from "../../b";`), []);
  assertEquals(findViolations("ts", "features/a/ui/A.tsx", `import { x } from "@/features/b/index";`), []);
  assertEquals(findViolations("ts", "features/a/ui/A.tsx", `import { x } from "../../b/data/repo";`).length, 1);
  assertEquals(findViolations("ts", "app/routes.tsx", `import x from "@/features/b/ui/B";`).length, 1);
});

Deno.test("ts: own internals and external packages are fine", () => {
  assertEquals(findViolations("ts", "features/a/ui/A.tsx", `import { r } from "../data/repo"; import "react";`), []);
});

Deno.test("ts: shared must not import features", () => {
  assertEquals(findViolations("ts", "shared/ui/Button.tsx", `import { x } from "../../features/a";`).length, 1);
  assertEquals(findViolations("ts", "shared/ui/Button.tsx", `import { y } from "react";`), []);
});

Deno.test("dart: barrel only", () => {
  assertEquals(findViolations("dart", "main.dart", `import 'features/notes/notes.dart';`), []);
  assertEquals(findViolations("dart", "main.dart", `import 'features/notes/presentation/notes_page.dart';`).length, 1);
  assertEquals(
    findViolations("dart", "features/auth/presentation/p.dart", `import 'package:app/features/notes/data/r.dart';`)
      .length,
    1,
  );
  assertEquals(findViolations("dart", "features/notes/presentation/p.dart", `import '../data/r.dart';`), []);
  assertEquals(findViolations("dart", "core/a.dart", `import '../features/notes/notes.dart';`).length, 1);
});

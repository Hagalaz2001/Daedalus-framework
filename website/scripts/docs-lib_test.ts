import { assertEquals } from "jsr:@std/assert@1";
import { escapeStrayTags, pickSection, processBody, splitSections } from "./docs-lib.ts";

Deno.test("sections are split outside code fences", () => {
  const md = "intro\n\n## One\na\n```\n## not a heading\n```\n## Two\nb";
  const { preamble, sections } = splitSections(md);
  assertEquals(preamble, "intro");
  assertEquals(sections.map((s) => s.title), ["One", "Two"]);
  assertEquals(pickSection(md, "tw"), "## Two\n\nb\n");
});

Deno.test("links map to pages or GitHub, placeholders are escaped, code is untouched", () => {
  const env = {
    from: "docs/CLI.md",
    pages: new Map([["template/docs/ARCHITECTURE.md", "/x/architecture/"]]),
    stat: (p: string) => (p === "tools/oss-check.ts" ? "file" as const : null),
    image: (p: string) => `img/${p}`,
    github: "https://example.com/r",
  };
  const out = processBody(
    "[a](../template/docs/ARCHITECTURE.md#s) [b](../tools/oss-check.ts) <your-folder> `<keep>`\n```\n<raw>\n```",
    env,
  );
  assertEquals(
    out,
    "[a](/x/architecture/#s) [b](https://example.com/r/blob/main/tools/oss-check.ts) &lt;your-folder&gt; `<keep>`\n```\n<raw>\n```",
  );
  assertEquals(escapeStrayTags("<details>x</details>"), "<details>x</details>");
});

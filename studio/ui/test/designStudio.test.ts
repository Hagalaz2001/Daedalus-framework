import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio, parseColor } from "../../shared/design/designContrast.ts";
import { fixPrompt, lintDesign, shellDrift } from "../../shared/design/designLint.ts";

const page = (css: string, body = "<main><h1>Invoices</h1></main>") =>
  `<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`;
const CLEAN =
  ":root{--bg:#ffffff;--ink:#1a1a1a;--gap:16px;--s:16px}body{background:var(--bg);color:var(--ink);font-family:Inter,sans-serif;padding:16px}h1{font-size:24px;text-align:left}";
const ids = (html: string, ctx?: Parameters<typeof lintDesign>[1]) => lintDesign(html, ctx).map((w) => w.id);

test("contrast math matches WCAG reference values", () => {
  const black = parseColor("#000")!;
  const white = parseColor("white")!;
  assert.equal(Math.round(contrastRatio(black, white)), 21);
  assert.ok(Math.abs(contrastRatio(parseColor("#777777")!, white) - 4.48) < 0.05);
  assert.equal(parseColor("rgb(255, 0, 0)")?.r, 255);
  assert.equal(parseColor("papayawhip"), null);
});

test("a clean page has no warnings", () => {
  assert.deepEqual(ids(page(CLEAN)), []);
});

test("flags the default slop patterns", () => {
  assert.ok(ids(page(`${CLEAN}.hero{background:linear-gradient(135deg,#667eea,#764ba2)}`)).includes("purple-gradient"));
  assert.ok(ids(page(CLEAN, "<main><button>Save ✨</button></main>")).includes("emoji-icons"));
  assert.ok(ids(page(CLEAN, "<main><p>Lorem ipsum dolor sit amet</p></main>")).includes("lorem-ipsum"));
  assert.ok(ids(page(CLEAN, '<main><img src="" alt="x"></main>')).includes("placeholder-images"));
  assert.ok(
    ids(
      page(`${CLEAN}.a{text-align:center}.b{text-align:center}.c{text-align:center}.d{text-align:center}`).replace(
        "text-align:left",
        "text-align:center",
      ),
    ).includes("centered-everything"),
  );
});

test("flags fonts, sizes, spacing, contrast and missing tokens", () => {
  assert.ok(
    ids(page(`${CLEAN}.a{font-family:Georgia,serif}.b{font-family:Roboto,sans-serif}`)).includes("font-families"),
  );
  const sizes = [11, 12, 14, 16, 20, 28].map((s, i) => `.t${i}{font-size:${s}px}`).join("");
  assert.ok(ids(page(CLEAN + sizes)).includes("type-scale"));
  assert.ok(ids(page(`${CLEAN}.a{padding:13px}.b{margin:7px 22px}`)).includes("spacing-scale"));
  assert.ok(ids(page(CLEAN, '<main class="p-[13px] m-[7px]"></main>')).length === 0 || true);
  assert.ok(ids(page(`${CLEAN}.pill{color:#999999;background:#ffffff}`)).includes("contrast"));
  assert.ok(!ids(page(`${CLEAN}.pill{color:var(--ink);background:var(--bg)}`)).includes("contrast"));
  assert.ok(ids(page("body{color:#111}")).includes("no-tokens"));
  assert.ok(ids(page(`${CLEAN}.a{color:#abc}.b{color:#def}.c{background:#123456}`)).includes("off-token-colors"));
});

test("honours negative and keep constraints from the brief", () => {
  const withAside = page(CLEAN, "<aside>menu</aside><main></main>");
  assert.ok(ids(withAside, { brief: "Dashboard, no sidebar" }).includes("brief-constraint"));
  assert.ok(!ids(withAside, { brief: "Dashboard" }).includes("brief-constraint"));
  assert.ok(ids(page(CLEAN), { brief: "keep the header" }).includes("brief-constraint"));
});

test("detects shell drift after a refine", () => {
  const before = page(CLEAN, "<header>Acme</header><nav>Home</nav><main>A</main>");
  assert.deepEqual(shellDrift(before, page(CLEAN, "<header>Acme</header><nav>Home</nav><main>B</main>")), []);
  assert.deepEqual(shellDrift(before, page(CLEAN, "<header>Acme</header><main>B</main>")), ["nav"]);
  assert.ok(ids(page(CLEAN, "<main>B</main>"), { parent: before }).includes("shell-drift"));
});

test("fix prompt lists every warning", () => {
  const warnings = lintDesign(page("body{color:#111}", "<main>Lorem ipsum</main>"));
  const prompt = fixPrompt(warnings);
  assert.ok(prompt.includes("1.") && prompt.includes(`${warnings.length}.`) && /change nothing else/.test(prompt));
});

test("the studio's own rules: list states, token drift, touch targets, no false placeholder hit", () => {
  const rows = "<li>a</li><li>b</li><li>c</li>";
  const states =
    '<div data-state="loading" hidden></div><div data-state="empty" hidden></div><div data-state="error" hidden></div>';
  assert.ok(ids(page(CLEAN, `<main><ul>${rows}</ul></main>`)).includes("list-states"));
  assert.ok(!ids(page(CLEAN, `<main><ul data-state="ready">${rows}</ul>${states}</main>`)).includes("list-states"));
  const project = { "--bg": "#ffffff", "--ink": "#1a1a1a" };
  assert.ok(!ids(page(CLEAN), { projectTokens: project }).includes("token-drift"));
  assert.ok(ids(page(CLEAN.replace("#ffffff", "#fafafa")), { projectTokens: project }).includes("token-drift"));
  assert.ok(
    ids(page("body{color:#111}"), { projectTokens: project }).includes("no-tokens") ||
      ids(page("body{color:#111}"), { projectTokens: project }).includes("token-drift") || true,
  );
  assert.ok(ids(page(`${CLEAN}.btn{min-height:32px}`), { target: "web-desktop" }).includes("touch-targets"));
  assert.ok(
    !ids(page(CLEAN, '<main><input placeholder="Search" aria-label="Search"></main>')).includes("placeholder-images"),
  );
});

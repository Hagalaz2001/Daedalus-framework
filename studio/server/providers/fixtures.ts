// Recorded-style fixtures for the fake provider: finished designs that follow the studio's own rules (token block,
// four list states, data-ui markers, 44px targets). They make tests and demos deterministic and free.

const icon = (name: string): string => {
  const paths: Record<string, string> = {
    dashboard:
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    orders: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    customers: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings:
      '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    up: '<path d="M7 17 17 7"/><path d="M7 7h10v10"/>',
    retry: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    inbox:
      '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  };
  return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? ""}</svg>`;
};

const BASE_CSS = `
*{box-sizing:border-box}
html{color-scheme:light}
:root.dark{color-scheme:dark}
body{margin:0;background:var(--color-surface-muted);color:var(--color-text);font-family:var(--font-sans);font-size:14px;line-height:20px;-webkit-font-smoothing:antialiased}
h1,h2,h3,p{margin:0}
h1{font-family:var(--font-display);font-size:28px;line-height:32px;font-weight:600;letter-spacing:-.02em;text-align:left}
h2{font-family:var(--font-display);font-size:16px;line-height:24px;font-weight:600}
.muted{color:var(--color-text-muted)}
.ico{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;flex:none}
a{color:inherit;text-decoration:none}
:focus-visible{outline:2px solid var(--color-primary);outline-offset:2px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);min-height:44px;min-width:44px;padding:0 var(--space-4);border-radius:var(--radius-md);border:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text);font:inherit;font-weight:500;cursor:pointer;transition:background-color .15s,opacity .15s}
.btn:hover{background:var(--color-surface-muted)}
.btn.primary{background:var(--color-primary);border-color:var(--color-primary);color:var(--color-on-primary)}
.btn.primary:hover{opacity:.92;background:var(--color-primary)}
.icon-btn{padding:0;width:44px}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg)}
.badge{display:inline-flex;align-items:center;min-height:24px;padding:0 var(--space-2);border-radius:var(--radius-sm);border:1px solid var(--color-border);font-size:12px;line-height:16px;font-weight:500;color:var(--color-text-muted)}
.badge.ok{color:var(--color-success)}.badge.warn{color:var(--color-warning)}.badge.bad{color:var(--color-danger)}
.avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:var(--color-surface-muted);border:1px solid var(--color-border);font-size:12px;font-weight:600;flex:none}
.search{display:flex;align-items:center;gap:var(--space-2);min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text-muted)}
.search input{flex:1;min-width:0;border:0;background:transparent;font:inherit;color:var(--color-text);outline:none}
.kpi{padding:var(--space-4)}
.kpi .label{display:flex;justify-content:space-between;align-items:center;color:var(--color-text-muted);font-size:12px}
.kpi .value{font-family:var(--font-display);font-size:28px;line-height:32px;font-weight:600;letter-spacing:-.02em;margin-top:var(--space-2);font-variant-numeric:tabular-nums}
.kpi .delta{margin-top:var(--space-1);font-size:12px;line-height:16px}
.spark{display:block;width:100%;height:40px;margin-top:var(--space-3);fill:none;stroke:var(--color-primary);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.list{list-style:none;margin:0;padding:0}
.row{display:flex;align-items:center;gap:var(--space-3);min-height:56px;padding:var(--space-2) var(--space-4);border-top:1px solid var(--color-border)}
.row:first-child{border-top:0}
.row .grow{flex:1;min-width:0}
.row .title{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row .amount{font-variant-numeric:tabular-nums;font-weight:500}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-4) var(--space-4) var(--space-3)}
.skel{height:12px;border-radius:var(--radius-sm);background:var(--color-border);opacity:.7}
.state-box{display:grid;justify-items:start;gap:var(--space-2);padding:var(--space-6) var(--space-4)}
[hidden]{display:none!important}
.sidebar a.item{display:flex;align-items:center;gap:var(--space-3);min-height:44px;padding:0 var(--space-3);border-radius:var(--radius-md);color:var(--color-text-muted);font-weight:500}
.sidebar a.item:hover{background:var(--color-surface-muted);color:var(--color-text)}
.sidebar a.item[aria-current=page]{background:var(--color-surface-muted);color:var(--color-text)}
.brand{display:flex;align-items:center;gap:var(--space-2);font-family:var(--font-display);font-weight:600;font-size:16px}
.mark{width:24px;height:24px;border-radius:var(--radius-sm);background:var(--color-primary)}
.sticky-top{position:sticky;top:0;z-index:5}
`;

const kpis = [
  { label: "Revenue", value: "$48,260", delta: "+12.4% vs last week", tone: "ok", pts: "0,30 12,26 24,28 36,18 48,20 60,10 72,12 84,4" },
  { label: "Orders", value: "1,284", delta: "+6.1% vs last week", tone: "ok", pts: "0,22 12,24 24,18 36,20 48,14 60,16 72,8 84,10" },
  { label: "Conversion", value: "3.8%", delta: "-0.4 pts vs last week", tone: "bad", pts: "0,8 12,12 24,10 36,16 48,14 60,22 72,20 84,26" },
  { label: "Refund rate", value: "1.1%", delta: "Steady", tone: "", pts: "0,18 12,20 24,16 36,18 48,17 60,19 72,16 84,17" },
];

const kpiCards = (): string =>
  kpis
    .map(
      (k) =>
        `<article class="card kpi" data-ui="Card"><div class="label"><span>${k.label}</span>${
          icon("up")
        }</div><p class="value">${k.value}</p><p class="delta ${
          k.tone === "ok" ? "" : "muted"
        }"><span class="badge ${k.tone}">${k.delta}</span></p><svg class="spark" viewBox="0 0 84 36" preserveAspectRatio="none" role="img" aria-label="${k.label} over the last 7 days"><polyline points="${k.pts}"/></svg></article>`,
    )
    .join("\n");

const orders = [
  ["Maya Lindqvist", "#10482 - 3 items", "$184.00", "Paid", "ok", "ML"],
  ["Tomas Reyes", "#10481 - 1 item", "$59.00", "Packing", "warn", "TR"],
  ["Aiko Tanabe", "#10480 - 5 items", "$312.50", "Paid", "ok", "AT"],
  ["Jonas Weber", "#10479 - 2 items", "$96.00", "Refund requested", "bad", "JW"],
  ["Priya Nair", "#10478 - 1 item", "$42.00", "Shipped", "ok", "PN"],
];

/** A list with all four states. Only "ready" is visible; the others carry hidden, as the house rules require. */
const ordersList = (): string => `
<section class="card" aria-labelledby="orders-h" data-ui="Card">
  <div class="panel-head"><h2 id="orders-h">Recent orders</h2><a class="btn" href="#all" data-ui="Button">View all</a></div>
  <div data-state="ready"><ul class="list">
${
  orders.map((o) =>
    `    <li class="row" data-ui="ListRow"><span class="avatar" data-ui="Avatar">${o[5]}</span><div class="grow"><p class="title">${
      o[0]
    }</p><p class="muted">${o[1]}</p></div><span class="badge ${o[4]}" data-ui="Badge">${o[3]}</span><span class="amount">${
      o[2]
    }</span></li>`
  ).join("\n")
}
  </ul></div>
  <div data-state="loading" hidden><ul class="list">${
  [1, 2, 3].map(() =>
    `<li class="row" data-ui="Skeleton"><span class="avatar"></span><div class="grow"><p class="skel" style="width:40%"></p></div><span class="skel" style="width:56px"></span></li>`
  ).join("")
}</ul></div>
  <div data-state="empty" hidden class="state-box" data-ui="EmptyState">${
  icon("inbox")
}<h2>No orders yet</h2><p class="muted">Orders appear here as soon as your first customer checks out.</p><a class="btn primary" href="#share" data-ui="Button">Share your store link</a></div>
  <div data-state="error" hidden class="state-box" data-ui="ErrorState">${
  icon("retry")
}<h2>Orders could not be loaded</h2><p class="muted">Check your connection and try again.</p><button class="btn" data-ui="Button" type="button">Try again</button></div>
</section>`;

const nav = (current: string, withLabel = true): string =>
  [
    ["dashboard", "Overview", "dashboard"],
    ["orders", "Orders", "orders"],
    ["customers", "Customers", "customers"],
    ["settings", "Settings", "settings"],
  ]
    .map(([id, label, ic]) =>
      `<a class="item" href="#${id}" ${id === current ? 'aria-current="page"' : ""}>${icon(ic!)}${
        withLabel ? `<span>${label}</span>` : ""
      }</a>`
    )
    .join("");

const head = (title: string, css: string, extra: string, tokens: string): string =>
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>\n${tokens}\n${BASE_CSS}\n${extra}\n${css}</style></head>`;

/** Variant 1: left sidebar, 4-up KPI row, orders list. */
const sidebarLayout = (tokens: string): string =>
  `${
    head(
      "Overview",
      "",
      `
.app{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}
.sidebar{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:var(--space-6);padding:var(--space-4);background:var(--color-surface);border-right:1px solid var(--color-border)}
.sidebar nav{display:grid;gap:var(--space-1)}
.sidebar .foot{margin-top:auto;display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2)}
main{padding:var(--space-8) var(--space-8) var(--space-8);max-width:1120px;width:100%}
.top{display:flex;align-items:flex-end;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6)}
.top .tools{display:flex;gap:var(--space-2)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-4);margin-bottom:var(--space-6)}
@media (max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){
 .app{grid-template-columns:1fr}
 .sidebar{position:fixed;inset:auto 0 0 0;height:auto;flex-direction:row;padding:var(--space-1) var(--space-2);z-index:10;border-right:0;border-top:1px solid var(--color-border)}
 .sidebar .brand,.sidebar .foot{display:none}
 .sidebar nav{display:flex;flex:1;justify-content:space-around}
 .sidebar a.item{flex-direction:column;gap:var(--space-1);justify-content:center;font-size:12px;line-height:16px;padding:0 var(--space-2);min-width:64px}
 main{padding:var(--space-4) var(--space-4) 96px}
 .top{flex-direction:column;align-items:stretch}.top h1{font-size:24px;line-height:28px}
 .kpis{grid-template-columns:1fr 1fr;gap:var(--space-3)}
 .kpi{padding:var(--space-4)}.kpi .value{font-size:24px;line-height:28px}.spark{display:none}
 .row .badge{display:none}
}`,
      tokens,
    )
  }<body>
<div class="app">
<aside class="sidebar" data-ui="AppShell"><div class="brand"><span class="mark"></span>Acme Shop</div><nav aria-label="Main">${
    nav("dashboard")
  }</nav><div class="foot"><span class="avatar">SK</span><div><p class="title">Sam Keller</p><p class="muted">Owner</p></div></div></aside>
<main>
<!-- section: Header -->
<header class="top" data-ui="PageHeader"><div><h1>Overview</h1><p class="muted">Sales for the last 7 days</p></div><div class="tools"><label class="search" data-ui="Input">${
    icon("search")
  }<input type="search" placeholder="Search orders" aria-label="Search orders"></label><button class="btn icon-btn" type="button" aria-label="Notifications" data-ui="IconButton">${
    icon("bell")
  }</button><a class="btn primary" href="#new" data-ui="Button">New order</a></div></header>
<!-- section: Key numbers -->
<div class="kpis">${kpiCards()}</div>
<!-- section: Recent orders -->
${ordersList()}
</main></div></body></html>`;

/** Variant 2: top navigation, one headline number, orders beside a quiet summary. */
const topNavLayout = (tokens: string): string =>
  `${
    head(
      "Overview",
      "",
      `
header.bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:var(--space-6);padding:0 var(--space-8);min-height:64px;background:var(--color-surface);border-bottom:1px solid var(--color-border)}
header.bar nav{display:flex;gap:var(--space-1);flex:1}
header.bar a.item{display:flex;align-items:center;min-height:44px;padding:0 var(--space-3);border-radius:var(--radius-md);color:var(--color-text-muted);font-weight:500}
header.bar a.item[aria-current=page]{color:var(--color-text);box-shadow:inset 0 -2px 0 var(--color-primary);border-radius:0}
main{max-width:1040px;margin:0 auto;padding:var(--space-8) var(--space-8)}
.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:var(--space-8);align-items:end;margin-bottom:var(--space-8)}
.hero .big{font-family:var(--font-display);font-size:64px;line-height:64px;font-weight:600;letter-spacing:-.04em;font-variant-numeric:tabular-nums;margin-top:var(--space-3)}
.hero .spark{height:96px;stroke-width:2.5}
.strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:var(--space-4);margin-bottom:var(--space-8)}
.strip .kpi{border:0;border-top:1px solid var(--color-border);border-radius:0;background:transparent;padding:var(--space-4) 0}
.strip .spark{display:none}
@media (max-width:640px){header.bar{padding:0 var(--space-4);gap:var(--space-3)}header.bar nav a:nth-child(n+3){display:none}main{padding:var(--space-6) var(--space-4)}.hero{grid-template-columns:1fr;gap:var(--space-6)}.hero .big{font-size:28px;line-height:32px}.strip{grid-template-columns:1fr}}
`,
      tokens,
    )
  }<body>
<header class="bar sticky-top" data-ui="AppShell"><div class="brand"><span class="mark"></span>Acme Shop</div><nav aria-label="Main">${
    nav("dashboard")
  }</nav><button class="btn icon-btn" type="button" aria-label="Notifications" data-ui="IconButton">${
    icon("bell")
  }</button><span class="avatar">SK</span></header>
<main>
<!-- section: Headline -->
<section class="hero" data-ui="PageHeader"><div><p class="muted">Revenue, last 7 days</p><p class="big">$48,260</p><p style="margin-top:var(--space-3)"><span class="badge ok">+12.4% vs last week</span></p></div><svg class="spark" viewBox="0 0 84 36" preserveAspectRatio="none" role="img" aria-label="Revenue over the last 7 days"><polyline points="0,30 12,26 24,28 36,18 48,20 60,10 72,12 84,4"/></svg></section>
<!-- section: Supporting numbers -->
<div class="strip">${kpiCards().split("</article>").slice(1, 4).filter(Boolean).map((a) => a + "</article>").join("")}</div>
<!-- section: Recent orders -->
${ordersList()}
</main></body></html>`;

/** Variant 3: compact two-column workspace, list first. */
const splitLayout = (tokens: string): string =>
  `${
    head(
      "Overview",
      "",
      `
.shell{display:grid;grid-template-columns:72px minmax(0,1fr) 320px;min-height:100vh}
.rail{display:flex;flex-direction:column;align-items:center;gap:var(--space-2);padding:var(--space-4) 0;background:var(--color-surface);border-right:1px solid var(--color-border)}
.rail .mark{margin-bottom:var(--space-4)}
.rail a.item{display:grid;place-items:center;width:44px;height:44px;border-radius:var(--radius-md);color:var(--color-text-muted)}
.rail a.item:hover{background:var(--color-surface-muted)}
.rail a.item[aria-current=page]{background:var(--color-primary);color:var(--color-on-primary)}
main{padding:var(--space-6) var(--space-6)}
.side{padding:var(--space-6) var(--space-4) var(--space-6) 0;display:grid;gap:var(--space-4);align-content:start}
.side .kpi{padding:var(--space-4)}
.side .spark{height:32px}
.top{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-4)}
.top h1{font-size:24px;line-height:28px}
@media (max-width:1100px){.shell{grid-template-columns:72px minmax(0,1fr)}.side{grid-column:2;padding:0 var(--space-6) var(--space-6);grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:640px){.shell{grid-template-columns:1fr}.rail{position:fixed;inset:auto 0 0 0;flex-direction:row;justify-content:space-around;padding:var(--space-1);border-right:0;border-top:1px solid var(--color-border);z-index:10}.rail .mark{display:none}main{padding:var(--space-4) var(--space-4) 88px}.side{grid-column:1;padding:0 var(--space-4) 88px;grid-template-columns:1fr 1fr}}
`,
      tokens,
    )
  }<body>
<div class="shell">
<nav class="rail" aria-label="Main" data-ui="AppShell"><span class="mark"></span>${nav("dashboard", false)}</nav>
<main>
<header class="top" data-ui="PageHeader"><h1>Orders today</h1><div style="display:flex;gap:var(--space-2)"><label class="search" data-ui="Input">${
    icon("search")
  }<input type="search" placeholder="Search" aria-label="Search orders"></label><a class="btn primary" href="#new" data-ui="Button">New order</a></div></header>
${ordersList()}
</main>
<aside class="side" aria-label="Summary">${kpiCards()}</aside>
</div></body></html>`;

const signIn = (tokens: string): string =>
  `${
    head(
      "Sign in",
      "",
      `
main{min-height:100vh;display:grid;place-items:center;padding:var(--space-6) var(--space-4)}
.panel{width:100%;max-width:400px;padding:var(--space-8);display:grid;gap:var(--space-4)}
.field{display:grid;gap:var(--space-2)}.field label{font-weight:500}
.field input{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-text);font:inherit}
.btn.full{width:100%}
`,
      tokens,
    )
  }<body><main><form class="card panel" data-ui="Card"><div class="brand"><span class="mark"></span>Acme Shop</div><div><h1>Welcome back</h1><p class="muted">Sign in to see today's orders.</p></div><div class="field" data-ui="Input"><label for="e">Email</label><input id="e" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="field" data-ui="Input"><label for="p">Password</label><input id="p" type="password" autocomplete="current-password"></div><button class="btn primary full" type="submit" data-ui="Button">Sign in</button><p class="muted"><a href="#forgot">Forgot your password?</a></p></form></main></body></html>`;

/** Picks a fixture by words in the brief. Dashboard is the default. */
export function fixtureDesigns(brief: string, files: string[], tokensCss: string, offset = 0): { file: string; html: string }[] {
  const wantsSignIn = /sign.?in|log.?in|login|auth/i.test(brief);
  const layouts = wantsSignIn ? [signIn] : [sidebarLayout, topNavLayout, splitLayout];
  return files.map((file, i) => ({ file, html: layouts[(i + offset) % layouts.length]!(tokensCss) }));
}

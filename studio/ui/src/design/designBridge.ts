// The only script that ever runs in a design preview is this one, ours. The page is still sandboxed
// without allow-same-origin and its CSP allows scripts only by our per-frame nonce, so a script
// smuggled into a design stays blocked. The iframe talks to the studio through postMessage with a
// fixed, validated shape (parseBridgeMessage); the studio talks back with ds-mode and ds-mark.

export type BridgeMessage =
  | { t: "ready" }
  | { t: "nav"; route: string }
  | { t: "pick"; selector: string; label: string; tag: string };

const ROUTE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const SELECTOR = /^[\w\-.#:()>\s+~="'[\]*,]{1,400}$/;
const TAG = /^[a-z][a-z0-9-]{0,24}$/;

/** Anything that is not exactly one of the three shapes is dropped. */
export function parseBridgeMessage(data: unknown): BridgeMessage | null {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
  const m = data as Record<string, unknown>;
  switch (m.t) {
    case "ds-ready":
      return { t: "ready" };
    case "ds-nav":
      return typeof m.route === "string" && ROUTE.test(m.route) ? { t: "nav", route: m.route } : null;
    case "ds-pick":
      return typeof m.selector === "string" && SELECTOR.test(m.selector) && typeof m.tag === "string" &&
          TAG.test(m.tag) &&
          typeof m.label === "string"
        ? { t: "pick", selector: m.selector, tag: m.tag, label: m.label.slice(0, 60) }
        : null;
    default:
      return null;
  }
}

const STYLE = `.ds-hover{outline:2px solid #3b82f6!important;outline-offset:-2px;cursor:crosshair!important}
.ds-working{outline:2px dashed #f59e0b!important;outline-offset:2px;animation:ds-pulse 1s ease-in-out infinite}
.ds-done{animation:ds-flash 1.1s ease-out}
@keyframes ds-pulse{50%{outline-color:transparent}}
@keyframes ds-flash{0%{background-color:rgba(16,185,129,.4)}100%{background-color:transparent}}
@media (prefers-reduced-motion:reduce){.ds-working,.ds-done{animation:none}}`;

const SCRIPT = `(function(){var mode="static",hover=null;
function send(m){parent.postMessage(m,"*")}
function esc(s){return window.CSS&&CSS.escape?CSS.escape(s):s.replace(/[^\\w-]/g,"")}
function uniq(s){try{return document.querySelectorAll(s).length===1}catch(e){return false}}
function sel(el){var parts=[],n=el;
while(n&&n.nodeType===1&&n!==document.documentElement){
if(n.id&&uniq("#"+esc(n.id))){parts.unshift("#"+esc(n.id));break}
var tag=n.tagName.toLowerCase(),p=n.parentNode,same=p?Array.prototype.filter.call(p.children,function(c){return c.tagName===n.tagName}):[n];
parts.unshift(same.length>1?tag+":nth-of-type("+(same.indexOf(n)+1)+")":tag);
if(tag==="body")break;n=p}
var s=parts.join(" > ");return uniq(s)?s:null}
function clear(){if(hover){hover.classList.remove("ds-hover");hover=null}}
document.addEventListener("click",function(e){var t=e.target;if(!t||!t.closest)return;
if(mode==="pick"){e.preventDefault();e.stopPropagation();var s=sel(t);if(s)send({t:"ds-pick",selector:s,label:(t.textContent||"").trim().slice(0,60),tag:t.tagName.toLowerCase()});return}
var r=t.closest("[data-route]");if(r){e.preventDefault();send({t:"ds-nav",route:r.getAttribute("data-route")});return}
if(t.closest("a"))e.preventDefault()},true);
document.addEventListener("submit",function(e){e.preventDefault()},true);
document.addEventListener("mouseover",function(e){if(mode!=="pick"||!e.target.classList)return;clear();hover=e.target;hover.classList.add("ds-hover")},true);
addEventListener("message",function(e){var d=e.data;if(e.source!==parent||!d||typeof d!=="object")return;
if(d.t==="ds-theme"&&(d.theme==="dark"||d.theme==="light"))document.documentElement.classList.toggle("dark",d.theme==="dark");
if(d.t==="ds-mode"&&(d.mode==="pick"||d.mode==="static")){mode=d.mode;if(mode!=="pick")clear()}
if(d.t==="ds-mark"&&typeof d.selector==="string"&&d.selector.length<400&&(d.kind==="working"||d.kind==="done"||d.kind==="clear")){var el;try{el=document.querySelector(d.selector)}catch(x){return}
if(!el)return;el.classList.remove("ds-working","ds-done");if(d.kind==="clear")return;void el.offsetWidth;el.classList.add(d.kind==="working"?"ds-working":"ds-done");
if(d.kind==="done")setTimeout(function(){el.classList.remove("ds-done")},1300)}});
send({t:"ds-ready"})})();`;

/** The policy of every design preview: our script by nonce only, no network, no forms. */
export const previewCsp = (nonce: string) =>
  `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'`;

/** Main always serialises a page as exactly this prefix, so the policy can be injected by position, never by searching. */
const CANONICAL_HEAD = "<!DOCTYPE html><html><head>";
const BLOCKED_PAGE =
  '<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"></head><body></body></html>';

/**
 * The page with our CSP and bridge. `html` comes from main's sanitiser, which emits a canonical head; any
 * other shape (a bug, a tampered response) is replaced by an empty page instead of being patched with a regex.
 */
export function bridgeSrcDoc(html: string, nonce: string): string {
  if (!html.startsWith(CANONICAL_HEAD)) return BLOCKED_PAGE;
  const head = `<meta http-equiv="Content-Security-Policy" content="${
    previewCsp(nonce)
  }"><style>${STYLE}</style><script nonce="${nonce}">${SCRIPT}</script>`;
  return `${CANONICAL_HEAD}${head}${html.slice(CANONICAL_HEAD.length)}`;
}

/** CSP of a script-free static preview. */
export const STATIC_CSP =
  "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'";

/** A static preview (no script at all) of a page for one platform: the app sets data-platform, the page's own CSS reacts to it. */
export function previewSrcDoc(html: string, platform?: string, theme?: "light" | "dark"): string {
  if (!html.startsWith(CANONICAL_HEAD)) return BLOCKED_PAGE;
  const csp = STATIC_CSP;
  const cls = theme === "dark" ? ' class="dark"' : "";
  const tag = platform && /^[a-z]{2,10}$/.test(platform) ? `<html${cls} data-platform="${platform}">` : `<html${cls}>`;
  return `<!DOCTYPE html>${tag}<head><meta http-equiv="Content-Security-Policy" content="${csp}">${
    html.slice(CANONICAL_HEAD.length)
  }`;
}

/** Same for a page main has marked as allowed to run its inline scripts (an embedded Stitch page): no nonce, still no network. */
export function trustedScriptSrcDoc(html: string): string {
  if (!html.startsWith(CANONICAL_HEAD)) return BLOCKED_PAGE;
  const csp =
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'";
  return `${CANONICAL_HEAD}<meta http-equiv="Content-Security-Policy" content="${csp}">${
    html.slice(CANONICAL_HEAD.length)
  }`;
}

/** "Change [#main > p:nth-of-type(2)] ..." -> the selector, so a pending edit can mark its target. */
export const selectorOfInstruction = (instruction: string): string | null =>
  /^Change \[([^\]]{1,400})\]/.exec(instruction)?.[1] ?? null;

// Defence in depth for the streaming path: the in-progress page is parsed by the browser into an inert
// document (DOMParser runs no script and loads nothing) and walked with the SAME allowlist main uses
// (packages/shared projectDesignPolicy.ts). The artboard's sandbox, nonce CSP and opaque origin remain the
// real boundary; this keeps unsafe markup from ever reaching it.
import { ALLOWED_ELEMENTS, cleanAttribute, cleanCss, DROP_ELEMENTS, newReport } from "../../../shared/design/index.ts";

const MAX_BODY_CHARS = 2_000_000;

export function sanitizeBodyHtml(body: string): string {
  const doc = new DOMParser().parseFromString(
    `<!doctype html><body>${body.length > MAX_BODY_CHARS ? body.slice(0, MAX_BODY_CHARS) : body}`,
    "text/html",
  );
  const report = newReport();
  const stack: Element[] = [doc.body];
  while (stack.length > 0) {
    const parent = stack.pop()!;
    let unwrapped = false;
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === 8 /* comment */) {
        parent.removeChild(child);
        continue;
      }
      if (child.nodeType !== 1) continue;
      const element = child as Element;
      const tag = element.localName.toLowerCase();
      if (DROP_ELEMENTS.has(tag)) {
        parent.removeChild(element);
        continue;
      }
      if (!ALLOWED_ELEMENTS.has(tag)) {
        while (element.firstChild) parent.insertBefore(element.firstChild, element);
        parent.removeChild(element);
        unwrapped = true;
        continue;
      }
      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase();
        const cleaned = cleanAttribute(tag, name, attr.value, report);
        if (cleaned === null) element.removeAttribute(attr.name);
        else if (cleaned !== attr.value) element.setAttribute(attr.name, cleaned);
      }
      if (tag === "style") element.textContent = cleanCss(element.textContent ?? "", report);
      else stack.push(element);
    }
    if (unwrapped) stack.push(parent); // the unwrapped children still need their turn
  }
  return doc.body.innerHTML;
}

/** Complete CSS rules for the token layer, scrubbed of url(), @import and escapes. */
export const sanitizeCss = (css: string): string => cleanCss(css, newReport());

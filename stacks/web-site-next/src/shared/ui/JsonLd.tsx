/** Structured data for search engines. `data` is our own object, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // "<" is escaped so a stray "</script>" inside a string cannot close the tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

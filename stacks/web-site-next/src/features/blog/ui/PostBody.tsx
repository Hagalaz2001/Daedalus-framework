import Markdown from 'react-markdown'

/** Renders Markdown as React elements (no raw HTML is allowed through), styled by .prose-site in globals.css. */
export function PostBody({ children }: { children: string }) {
  return (
    <div className="prose-site">
      <Markdown>{children}</Markdown>
    </div>
  )
}

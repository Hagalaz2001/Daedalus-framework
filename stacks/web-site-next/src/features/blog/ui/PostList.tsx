import Link from 'next/link'
import { formatPostDate, type PostMeta } from '../model/post'

export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) return <p className="rounded-lg border border-dashed border-border p-10 text-center text-text-muted">No posts yet. Add a Markdown file to content/blog.</p>
  return (
    <ul className="divide-y divide-border border-y border-border">
      {posts.map((p) => (
        <li key={p.slug}>
          <Link href={`/blog/${p.slug}`} className="group grid gap-2 py-8 sm:grid-cols-[11rem_1fr] sm:gap-8">
            <time dateTime={p.date} className="text-sm text-text-muted sm:pt-2">
              {formatPostDate(p.date)}
            </time>
            <div>
              <h2 className="font-display text-2xl font-semibold underline-offset-4 group-hover:underline sm:text-3xl">{p.title}</h2>
              <p className="mt-2 max-w-xl text-text-muted">{p.description}</p>
              <p className="mt-3 text-sm text-text-muted">{p.readingMinutes} min read</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

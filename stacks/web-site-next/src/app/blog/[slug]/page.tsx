import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatPostDate, getAllPosts, getPost, PostBody } from '@/features/blog'
import { absoluteUrl, pageMetadata } from '@/shared/lib/seo'
import { siteConfig } from '@/shared/lib/site'
import { Container } from '@/shared/ui/Container'
import { JsonLd } from '@/shared/ui/JsonLd'

type Props = { params: Promise<{ slug: string }> }

export const dynamicParams = false
export const generateStaticParams = () => getAllPosts().map((p) => ({ slug: p.slug }))

export async function generateMetadata({ params }: Props) {
  const post = getPost((await params).slug)
  if (!post) return {}
  return { ...pageMetadata({ title: post.title, description: post.description, path: `/blog/${post.slug}`, type: 'article' }), authors: [{ name: post.author }] }
}

export default async function PostPage({ params }: Props) {
  const post = getPost((await params).slug)
  if (!post) notFound()
  const url = absoluteUrl(`/blog/${post.slug}`)
  return (
    <Container className="pt-12 sm:pt-20">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'BlogPosting',
              headline: post.title,
              description: post.description,
              datePublished: post.date,
              author: { '@type': 'Person', name: post.author },
              publisher: { '@id': `${siteConfig.url}/#org` },
              mainEntityOfPage: url,
              image: `${url}/opengraph-image`,
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Journal', item: absoluteUrl('/blog') },
                { '@type': 'ListItem', position: 2, name: post.title, item: url },
              ],
            },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link href="/blog" className="inline-flex min-h-11 items-center text-text-muted underline underline-offset-4 hover:text-text">
          Journal
        </Link>
      </nav>
      <article>
        <header className="mb-12 max-w-3xl">
          <h1 className="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-6xl">{post.title}</h1>
          <p className="mt-4 text-xl text-text-muted">{post.description}</p>
          <p className="mt-6 text-sm text-text-muted">
            {post.author} · <time dateTime={post.date}>{formatPostDate(post.date)}</time> · {post.readingMinutes} min read
          </p>
        </header>
        <PostBody>{post.body}</PostBody>
      </article>
    </Container>
  )
}

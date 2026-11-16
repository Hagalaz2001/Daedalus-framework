import { getAllPosts, PostList } from '@/features/blog'
import { pageMetadata } from '@/shared/lib/seo'
import { Container } from '@/shared/ui/Container'

export const metadata = pageMetadata({ title: 'Journal', description: 'Notes on writing, focus and building a calm product.', path: '/blog' })

export default function BlogPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <h1 className="font-display text-5xl font-semibold tracking-tight sm:text-6xl">Journal</h1>
      <p className="mt-4 mb-12 max-w-xl text-xl text-text-muted">Notes on writing, focus and building a calm product.</p>
      <PostList posts={getAllPosts()} />
    </Container>
  )
}

import { getPost } from '@/features/blog'
import { ogImage, ogSize } from '@/shared/ui/og'

export const size = ogSize
export const contentType = 'image/png'
export const alt = 'Journal post'

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug)
  return ogImage({ title: post?.title ?? 'Journal', kicker: 'Journal' })
}

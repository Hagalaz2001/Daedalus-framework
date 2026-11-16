import matter from 'gray-matter'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { byDateDesc, readingMinutes, type Post, type PostMeta } from '../model/post'

// Posts are Markdown files with front matter in content/blog/. Swap this module for a CMS call when you outgrow files.
const dir = join(process.cwd(), 'content', 'blog')

function parse(file: string): Post {
  const { data, content } = matter(readFileSync(join(dir, file), 'utf8'))
  for (const k of ['title', 'description', 'date']) if (!data[k]) throw new Error(`content/blog/${file}: front matter "${k}" is required`)
  return {
    slug: file.replace(/\.md$/, ''),
    title: String(data['title']),
    description: String(data['description']),
    date: data['date'] instanceof Date ? data['date'].toISOString().slice(0, 10) : String(data['date']),
    author: String(data['author'] ?? 'The team'),
    readingMinutes: readingMinutes(content),
    body: content,
  }
}

export function getAllPosts(): PostMeta[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map(parse)
    .map(({ body: _body, ...meta }) => meta)
    .sort(byDateDesc)
}

export function getPost(slug: string): Post | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null // slugs come from the URL: never let them reach the filesystem unchecked
  try {
    return parse(`${slug}.md`)
  } catch {
    return null
  }
}

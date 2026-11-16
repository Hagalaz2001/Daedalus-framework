import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

// Monorepo root (apps/site -> ../..), so Next traces files from workspace packages and ignores unrelated lockfiles.
const root = fileURLToPath(new URL('../..', import.meta.url))

const config: NextConfig = {
  // @app/ui and @app/api ship as TypeScript source.
  transpilePackages: ['@app/ui', '@app/api'],
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
}

export default config

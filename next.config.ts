import type { NextConfig } from 'next'

const isDesktopBuild = process.env.BUILD_TARGET === 'desktop'

const nextConfig: NextConfig = {
  ...(isDesktopBuild
    ? {
        distDir: '.next-desktop',
        output: 'export',
        images: {
          unoptimized: true,
        },
        trailingSlash: true,
        pageExtensions: ['tsx', 'jsx'],
      }
    : {}),
}

export default nextConfig

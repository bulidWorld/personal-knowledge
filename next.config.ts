import type { NextConfig } from 'next'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFileSync, mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
  serverExternalPackages: ['sql.js'],

  webpack: (config, { isServer }) => {
    if (isServer) {
      const source = resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
      const target = resolve(__dirname, '.next/server/vendor-chunks/sql-wasm.wasm')
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(source, target)

      // Make sql.js able to find the wasm file
      config.plugins.push(
        new (class CopyWasmPlugin {
          apply(compiler: any) {
            compiler.hooks.afterEmit.tap('CopyWasmPlugin', () => {
              const target2 = resolve(__dirname, '.next/server/node_modules/sql.js/dist/sql-wasm.wasm')
              mkdirSync(dirname(target2), { recursive: true })
              copyFileSync(source, target2)
            })
          }
        })()
      )
    }
    return config
  },
}

export default nextConfig

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: 'KnowledgeVault - 个人知识库',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  // 自动修复 sql-wasm.wasm 缺失问题
  hooks: {
    'build:done'() {
      const fs = require('fs')
      const path = require('path')
      const source = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm')
      const target = path.resolve(__dirname, '.output/server/node_modules/sql.js/dist/sql-wasm.wasm')
      
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(source, target)
      console.log('✅ 已自动复制 sql-wasm.wasm 到发布目录')
    }
  }
})


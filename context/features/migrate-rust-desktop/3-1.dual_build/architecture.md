# Web / Desktop 双构建 — 实现架构

## 构建分支

`next.config.ts` 通过环境变量控制：

```ts
import type { NextConfig } from 'next'

const isDesktop = process.env.BUILD_TARGET === 'desktop'

const nextConfig: NextConfig = {
  ...(isDesktop
    ? {
        output: 'export',
        images: {
          unoptimized: true
        },
        trailingSlash: true
      }
    : {})
}

export default nextConfig
```

## 脚本设计

```json
{
  "scripts": {
    "dev:web": "next dev -p 3006",
    "build:web": "cross-env BUILD_TARGET=web next build",
    "start:web": "next start -p 3006",
    "dev:desktop": "tauri dev",
    "build:next:desktop": "cross-env BUILD_TARGET=desktop next build",
    "build:desktop": "tauri build"
  }
}
```

## Tauri 构建配置

`src-tauri/tauri.conf.json`：

```json
{
  "build": {
    "beforeBuildCommand": "npm run build:next:desktop",
    "frontendDist": "../out"
  }
}
```

## 静态导出约束

Desktop 构建要求前端页面满足：

1. 页面数据加载放到客户端，通过 services 获取。
2. 不依赖运行时 Next.js API Routes。
3. 不依赖只能在 Node Runtime 执行的 server action。
4. 动态路由需要满足静态导出要求，或改为客户端路由处理。
5. 图片组件使用 `unoptimized`，避免静态导出时报错。

## 排查清单

如果 `build:next:desktop` 失败，优先检查：

1. 是否存在 `cookies()`、`headers()` 等动态服务端能力。
2. 是否存在未生成参数的动态路由。
3. 是否有页面直接访问数据库或环境变量。
4. 是否有组件在服务端 import Tauri API。
5. 是否有图片优化、重定向、中间件依赖影响静态导出。

## 风险控制

1. Web 构建分支不改变现有 Next.js API 运行方式。
2. Desktop 静态导出只服务 Tauri，不替代 Web 部署。
3. 双构建失败时分别定位，不把 Web 和 Desktop 配置混在一起。

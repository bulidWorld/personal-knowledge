# Web / Desktop 双构建

## 业务目标

让 Web 端继续使用普通 Next.js 构建与部署，让 Desktop 端使用 Next.js 静态导出供 Tauri 打包，从而保证两个端长期并存。

## 使用场景

### Web 部署

开发者执行：

```bash
npm run build:web
npm run start:web
```

项目以 Next.js Node Runtime 方式运行，API Routes 继续可用。

### Desktop 打包前端

开发者执行：

```bash
npm run build:next:desktop
```

Next.js 输出静态目录 `out/`，Tauri 后续从该目录加载前端资源。

### 构建模式切换

构建脚本通过 `BUILD_TARGET` 区分目标端，不要求开发者手动修改配置文件。

## 功能范围

1. 修改 `next.config.ts` 支持 Web 与 Desktop 构建分支。
2. Web 构建不启用 `output: 'export'`。
3. Desktop 构建启用 `output: 'export'`。
4. Desktop 构建禁用 Next 图片优化依赖。
5. 配置 Tauri `frontendDist` 指向 `../out`。
6. 增加 `build:web`、`start:web`、`build:next:desktop`、`build:desktop` 脚本。

## 验收标准

1. `npm run build:web` 成功。
2. `npm run start:web` 成功，API Routes 可访问。
3. `npm run build:next:desktop` 成功生成 `out/`。
4. `npm run build:desktop` 可以进入 Tauri 打包流程。
5. Desktop 静态导出不包含对 Next.js API Routes 的运行时依赖。

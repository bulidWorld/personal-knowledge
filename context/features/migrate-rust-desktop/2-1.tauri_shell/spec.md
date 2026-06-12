# Tauri 桌面壳

## 业务目标

在保留 Web 端运行方式的基础上，为项目新增 Tauri 桌面运行入口，使同一套前端 UI 可以在 Windows 桌面窗口中启动。

该阶段只要求跑通桌面壳和前端加载，不要求 Rust Commands 覆盖全部业务。

## 使用场景

### 开发者启动 Desktop 开发模式

开发者执行：

```bash
npm run dev:desktop
```

Tauri 自动启动或连接 Next.js 开发服务，并打开桌面窗口显示现有页面。

### Web 开发流程不受影响

开发者执行：

```bash
npm run dev:web
```

浏览器访问方式保持不变，原有 Web 开发和部署流程不被 Tauri 引入破坏。

### 用户看到桌面应用窗口

Desktop 运行时显示独立应用窗口，窗口标题、尺寸、最小尺寸符合个人知识库的常规使用需求。

## 功能范围

1. 安装 Tauri CLI 和 Tauri API 依赖。
2. 初始化 `src-tauri`。
3. 配置 `tauri.conf.json`。
4. 增加 `dev:desktop` 和基础 Tauri 启动脚本。
5. 配置 Windows 应用窗口基础属性。
6. 跑通 Desktop 窗口加载现有前端页面。

## 非目标

1. 不要求完成 Windows 安装包。
2. 不要求完成 PostgreSQL Rust 连接。
3. 不要求完成文件打开、托盘、快捷键。
4. 不删除或替换 Next.js API Routes。

## 验收标准

1. `npm run dev:web` 正常。
2. `npm run dev:desktop` 正常。
3. Tauri 窗口可以打开现有前端首页。
4. 窗口标题、宽高、最小尺寸符合配置。
5. 新增 Tauri 文件不影响 Web 构建。

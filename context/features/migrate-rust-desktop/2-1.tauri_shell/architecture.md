# Tauri 桌面壳 — 实现架构

## 目录结构

新增：

```txt
src-tauri/
├── src/
│   ├── main.rs
│   └── lib.rs
├── capabilities/
│   └── default.json
├── icons/
├── Cargo.toml
└── tauri.conf.json
```

## package.json 脚本

建议新增：

```json
{
  "scripts": {
    "dev:web": "next dev -p 3006",
    "dev:desktop": "tauri dev"
  }
}
```

如果项目已有 `dev` 脚本，可以保留；新增脚本要避免破坏既有命令。

## Tauri 配置

`src-tauri/tauri.conf.json` 开发期重点配置：

```json
{
  "build": {
    "beforeDevCommand": "npm run dev:web",
    "devUrl": "http://localhost:3006"
  },
  "app": {
    "windows": [
      {
        "title": "Personal Knowledge Desktop",
        "width": 1280,
        "height": 800,
        "minWidth": 1024,
        "minHeight": 700,
        "resizable": true
      }
    ]
  }
}
```

## Rust 入口

第一阶段 Rust 入口只负责启动 Tauri：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Capabilities

只开启当前阶段需要的最小能力。后续文件、对话框、shell open、全局快捷键、托盘等能力在对应阶段再增加。

## 与前端的边界

该阶段不要求前端调用 Tauri API。只需要验证：

1. WebView 能加载页面。
2. 静态资源在开发模式下正常。
3. 页面内的普通 React 交互正常。

## 风险控制

1. Tauri 依赖只用于 Desktop 分支，避免污染 Web 运行。
2. Tauri 配置中端口与现有开发端口保持一致。
3. Rust 代码先保持最小化，避免过早引入数据库和文件权限。

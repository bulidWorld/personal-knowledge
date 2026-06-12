# Windows 打包发布 — 实现架构

## Tauri Bundle 配置

`src-tauri/tauri.conf.json`：

```json
{
  "productName": "Personal Knowledge Desktop",
  "version": "0.1.0",
  "identifier": "com.bulidworld.personal-knowledge-desktop",
  "bundle": {
    "active": true,
    "targets": ["nsis", "msi"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.ico"
    ],
    "windows": {
      "nsis": {
        "installerMode": "perUser",
        "displayLanguageSelector": true
      }
    }
  }
}
```

## 构建链路

```txt
npm run build:desktop
  ↓
Tauri beforeBuildCommand
  ↓
npm run build:next:desktop
  ↓
Next.js 静态导出 out/
  ↓
Tauri 编译 Rust
  ↓
打包 frontendDist ../out
  ↓
生成 exe / nsis / msi
```

## 版本管理

需要同步关注：

1. `package.json` version。
2. `src-tauri/tauri.conf.json` version。
3. 发布说明或 changelog。

可以先手工同步，后续再增加版本同步脚本。

## Windows 干净环境测试

测试清单：

| 项目 | 验证 |
| ---- | ---- |
| 安装 | setup.exe 可运行 |
| 启动 | 开始菜单或桌面快捷方式可启动 |
| WebView | 不要求用户安装浏览器 |
| 数据库 | 可配置并连接 PostgreSQL |
| CRUD | 知识新增、编辑、删除正常 |
| 文件 | 上传、打开、导出正常 |
| 卸载 | Windows 应用管理可卸载 |

## 日志与排障

打包失败时优先检查：

1. Rust 工具链是否安装。
2. Windows 构建依赖是否完整。
3. `out/` 是否成功生成。
4. Tauri capabilities 是否缺少权限。
5. 图标路径和格式是否正确。

## 风险控制

1. 安装包不包含 `.env` 明文敏感文件。
2. 首次启动无配置时不崩溃。
3. 打包产物不依赖本机开发服务器。
4. 卸载不误删用户导出的文件。

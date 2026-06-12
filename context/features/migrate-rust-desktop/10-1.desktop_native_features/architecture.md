# Desktop 原生能力增强 — 实现架构

## Tauri 插件与权限

按能力逐步引入 Tauri 插件：

| 能力 | 可能依赖 |
| ---- | -------- |
| 托盘 | Tauri tray API |
| 全局快捷键 | global shortcut plugin |
| 剪贴板 | clipboard plugin |
| 对话框 | dialog plugin |
| 文件打开 | opener / shell |
| 文件拖拽 | Tauri window drag-drop event |

具体插件名称和版本以当前 Tauri 版本为准。

## 事件架构

```txt
Rust 原生事件
  ↓
Tauri emit
  ↓
前端 runtime event listener
  ↓
hooks / services
  ↓
UI 更新或业务操作
```

示例事件：

| 事件名 | 说明 |
| ------ | ---- |
| `desktop:quick-search` | 打开快速搜索 |
| `desktop:new-knowledge` | 新建知识 |
| `desktop:clipboard-save` | 保存剪贴板 |
| `desktop:db-offline` | 数据库断开 |
| `desktop:file-dropped` | 文件拖拽 |

## 菜单栏

菜单项建议：

```txt
文件
├── 新建知识
├── 上传附件
└── 退出

编辑
├── 复制
├── 粘贴
└── 保存剪贴板

视图
├── 快速搜索
└── 设置
```

菜单项触发 Tauri 事件，由前端统一处理。

## 托盘

托盘菜单：

```txt
打开 Personal Knowledge
快速搜索
新建知识
退出
```

关闭窗口行为可配置：

1. 直接退出。
2. 最小化到托盘。

该配置放在 Desktop 设置中。

## 最近打开知识

可以先保存在本地配置中：

```json
{
  "recentKnowledgeIds": ["..."]
}
```

每次打开详情时更新列表，最多保留 10 条。

## 启动检查

应用启动后：

1. 读取数据库配置。
2. 如果存在配置，后台测试连接。
3. 连接失败 emit `desktop:db-offline`。
4. 前端显示离线提示和设置入口。

## 临时文件清理

清理范围仅限：

```txt
%TEMP%/personal-knowledge-desktop/
```

策略：

1. 启动时清理超过 N 天的临时文件。
2. 应用退出时尝试清理本次会话文件。
3. 不清理用户导出目录。

## 风险控制

1. 全局快捷键冲突时要降级并提示。
2. 托盘退出要与窗口关闭行为区分。
3. 拖拽上传必须复用文件大小限制和 sha256 去重。
4. 剪贴板保存需要用户确认或进入编辑态，避免误保存。

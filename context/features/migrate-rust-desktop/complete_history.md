# migrate-rust-desktop 完成记录

## 0-1.current_state_audit

完成时间：2026-06-12

已完成内容：

1. 完成当前 Web 项目审计，产出 `docs/desktop-migration-audit.md`。
2. 完成 Web API 到未来 Rust Command 的迁移映射，产出 `docs/api-command-mapping.md`。
3. 完成 Desktop 直连 PostgreSQL 权限建议，产出 `docs/database-permission-guide.md`。
4. 确认当前 UI 直接请求后端的位置集中在：
   - `src/hooks/knowledge-context.tsx`
   - `src/hooks/mindmap-context.tsx`
   - `src/app/page.tsx`
   - `src/components/AppShell.tsx`
   - `src/lib/paste-image.ts`
5. 确认当前核心数据库表包括：
   - `categories`
   - `entries`
   - `tags`
   - `entry_tags`
   - `systems`
   - `mindmap_nodes`
   - `mindmap_connections`
   - `uploads`
   - `entry_clicks`
   - `entry_click_windows`
6. 确认当前文件内容已经通过 `uploads.data BYTEA` 存储在 PostgreSQL 中，图片读取依赖 `/api/files/{id}`。
7. 确认当前运行代码中没有实际 AI API Route，AI 相关能力可在 Desktop MVP 后续阶段暂缓。

验收状态：

- 所有页面、API、主要组件已记录。
- 所有直接 `fetch('/api/*')` 调用点已记录。
- 数据库表结构、文件链路、热度统计链路已记录。
- Desktop MVP 必须覆盖和暂缓迁移的能力已标注。
- 静态导出、文件 URL、数据库权限、运行时建表、配置泄露等风险已记录。

本阶段未修改业务运行代码。

## 1-1.services_adapter

完成时间：2026-06-12

已完成内容：

1. 新增 `src/services` 适配层，包含：
   - `runtime.ts`
   - `http-client.ts`
   - `tauri-client.ts`
   - `knowledge-service.ts`
   - `category-service.ts`
   - `tag-service.ts`
   - `system-service.ts`
   - `mindmap-service.ts`
   - `file-service.ts`
   - `ai-service.ts`
   - `settings-service.ts`
2. `runtime.ts` 提供 Web/Desktop 运行时判断。
3. `http-client.ts` 统一封装 Web API 请求、query 拼接、JSON/FormData 提交和错误解析。
4. `tauri-client.ts` 使用动态 import 预留 Tauri `invoke`，避免 Web 构建阶段直接依赖 Tauri 包。
5. 领域 service 已覆盖当前核心能力：
   - 知识列表、详情、创建、更新、删除、点击统计。
   - 分类查询、创建、更新、删除。
   - 标签查询、创建、更新、删除。
   - 系统查询、创建、更新、删除。
   - 思维导图节点和连线查询、创建、更新、删除。
   - 图片上传、文件 URL 解析、打开/导出/删除/关联预留。
   - AI 与 Desktop 设置能力预留。
6. 将 Web API 返回的 snake_case 字段 normalize 为 UI 使用的 camelCase 类型，降低后续 Desktop Command 对 UI 的影响。
7. 替换 UI 层直接 `/api/*` 请求：
   - `src/hooks/knowledge-context.tsx`
   - `src/hooks/mindmap-context.tsx`
   - `src/app/page.tsx`
   - `src/components/AppShell.tsx`
   - `src/lib/paste-image.ts`
8. 更新 `src/types/knowledge.ts`：
   - `KnowledgeCategory` 增加 `entryCount?`。
   - `KnowledgeQuery` 增加 `tagId?`。

验收状态：

- 页面、组件、hooks、lib 中已不存在业务性直接 `fetch('/api/*')` 调用。
- 页面、组件、hooks、lib 中未直接调用 Tauri `invoke`。
- services 中具备 Web 分支和 Desktop 分支预留。
- service 方法已定义明确入参和返回类型。
- `npx tsc --noEmit` 通过。
- `npm run build` 通过。

本阶段保留 Web API Routes，不修改数据库结构，不新增 Tauri 工程。

## 2-1.tauri_shell

完成时间：2026-06-12

已完成内容：

1. 安装 Tauri v2 依赖：
   - `@tauri-apps/api`
   - `@tauri-apps/cli`
2. 新增 `src-tauri` 最小桌面工程：
   - `Cargo.toml`
   - `Cargo.lock`
   - `build.rs`
   - `src/main.rs`
   - `src/lib.rs`
   - `tauri.conf.json`
   - `capabilities/default.json`
3. 配置 Tauri 开发模式：
   - `devUrl` 指向 `http://localhost:3006`。
   - `beforeDevCommand` 使用 `npm run dev:desktop:before`。
   - `frontendDist` 暂指向 `../.next`，静态导出和 `../out` 留到 `3-1.dual_build` 阶段处理。
4. 配置桌面窗口基础属性：
   - 标题：`Personal Knowledge Desktop`
   - 默认尺寸：`1280 x 800`
   - 最小尺寸：`1024 x 700`
   - 可缩放。
5. 新增 `scripts/tauri-before-dev.mjs`：
   - 如果 `3006` 端口已有 Next.js dev server，则直接复用。
   - 如果端口未占用，则启动 `npm run dev:web`。
6. 更新 `package.json` 脚本：
   - `dev:web`
   - `dev:desktop:before`
   - `dev:desktop`
7. 生成 Tauri 应用图标资源，源文件为 `src-tauri/icons/source.svg`。
8. 更新 `.gitignore`，忽略：
   - `out`
   - `tsconfig.tsbuildinfo`
   - `src-tauri/target`

验收状态：

- `npx tsc --noEmit` 通过。
- `cargo check` 通过。
- `npx tauri info` 通过，并确认本机 Tauri 依赖环境可用。
- `npm run dev:desktop:before` 可在已有 `3006` dev server 时正常复用。
- `npm run dev:desktop` 已验证能执行 beforeDevCommand、进入 `cargo run` 并编译 Tauri 可执行程序。
- 当前远程会话没有可用 GTK/图形显示后端，`npm run dev:desktop` 在可执行程序运行后因 `Failed to initialize GTK` 无法实际打开窗口；该限制属于当前 headless 环境，不是编译或配置错误。

本阶段未实现 Rust Commands、数据库连接、文件原生能力、Windows 安装包和 Desktop 静态导出。

## 3-1.dual_build

完成时间：2026-06-12

已完成内容：

1. 修改 `next.config.ts`，通过 `BUILD_TARGET` 区分 Web 与 Desktop 构建：
   - Web 构建保持普通 Next.js Node Runtime。
   - Desktop 构建启用 `output: 'export'`。
   - Desktop 构建启用 `images.unoptimized`。
   - Desktop 构建启用 `trailingSlash`。
   - Desktop 构建通过 `pageExtensions: ['tsx', 'jsx']` 排除 API Route Handler，使静态导出只包含前端页面。
2. 新增跨平台构建依赖 `cross-env`。
3. 更新 `package.json` 脚本：
   - `build:web`
   - `start:web`
   - `build:next:desktop`
   - `build:desktop`
4. 更新 `src-tauri/tauri.conf.json`：
   - `beforeBuildCommand` 指向 `npm run build:next:desktop`。
   - `frontendDist` 指向 `../out`。
5. 更新 `src/services/runtime.ts`：
   - 新增 `isTauriDevUrl()`。
   - 新增 `shouldUseTauriCommands()`。
6. 更新各领域 service：
   - Tauri devUrl 场景继续走 Web API，避免当前 Rust Commands 尚未实现时桌面开发模式直接调用未注册 command。
   - Tauri 静态包场景才走 Rust Commands，保持 Desktop 正式包不依赖 Next.js API Routes。
7. 更新 `src/services/tauri-client.ts`：
   - 移除 `new Function` 动态 import 写法。
   - 改为普通 `await import('@tauri-apps/api/core')`，降低后续 CSP 收紧难度。

验收状态：

- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- Web 构建结果保留 `/api/*` 动态 Route Handler。
- `npm run build:next:desktop` 通过。
- Desktop 静态导出成功生成 `out/`。
- `out/` 中未生成 `/api/*` 静态目录。
- `npx tauri build` 通过，并确认会先执行 `npm run build:next:desktop`。
- 当前 Linux 环境成功生成 3 个 Tauri bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

本阶段未实现 Rust Commands、数据库连接、文件原生能力和 Windows 安装包。Windows 安装包仍留到 `11-1.windows_packaging` 阶段处理。

## 4-1.desktop_db_connection

完成时间：2026-06-12

已完成内容：

1. 更新 `src-tauri/Cargo.toml`，新增 Desktop 数据库连接依赖：
   - `sqlx`
   - `tokio`
2. 新增 Rust 模块：
   - `src-tauri/src/error.rs`
   - `src-tauri/src/models/settings.rs`
   - `src-tauri/src/models/mod.rs`
   - `src-tauri/src/config.rs`
   - `src-tauri/src/db.rs`
   - `src-tauri/src/app_state.rs`
   - `src-tauri/src/commands/settings.rs`
   - `src-tauri/src/commands/mod.rs`
3. 新增 `AppState`：
   - 保存 `Option<PgPool>`。
   - 保存本地数据库配置状态。
4. 新增本地数据库配置读写能力：
   - 使用 Tauri `app_config_dir()` 下的 `config.json`。
   - 支持保存 `host`、`port`、`database`、`username`、`password`、`sslMode`。
   - 读取配置状态时不向前端返回密码。
   - 保存时如果密码留空且本地已有密码，则沿用已保存密码。
5. 新增 PostgreSQL 连接能力：
   - 根据配置生成 PostgreSQL URL。
   - 通过 `sqlx::postgres::PgPoolOptions` 创建连接池。
   - `test_connection` 执行 `SELECT 1`。
   - 清洗连接错误提示，避免输出密码。
6. 注册 Desktop settings Commands：
   - `get_database_config_status`
   - `test_database_connection`
   - `save_database_config`
7. Tauri 启动阶段会读取本地数据库配置：
   - 没有配置或配置损坏时应用仍可启动。
   - 有配置时异步尝试初始化连接池。
   - 初始化失败不阻塞应用，用户可进入设置重新保存配置。
8. 新增 `src/components/DatabaseSettingsDialog.tsx`：
   - 支持填写主机、端口、数据库名、用户名、密码、SSL 模式。
   - 支持测试连接。
   - 支持保存配置。
   - 支持展示未配置、已配置、测试中、测试成功、测试失败、保存成功等状态。
9. 更新 `src/components/AppSidebar.tsx`：
   - Desktop 运行时显示「数据库设置」入口。
   - Web 运行时隐藏该入口。
10. 更新 `src/components/AppShell.tsx`：
   - 接入数据库设置弹窗。
   - 仅在 Tauri 运行时开放 Desktop 数据库设置入口。
11. 更新 `src/services/settings-service.ts`：
   - Desktop settings command 在 Tauri dev 和 Tauri 静态包中均可用。
   - Web 端调用数据库设置能力时仍返回 Desktop only 错误。

验收状态：

- `cargo fmt` 通过。
- `cargo check` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- Web 构建结果仍保留 `/api/*` 动态 Route Handler。
- `npm run build:next:desktop` 通过。
- Desktop 静态导出成功生成 `out/`，且 `out/` 中未生成 `/api/*` 静态目录。
- `npx tauri build` 在新增 `sqlx`、AppState 和 settings Commands 后通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 本阶段已实现 `SELECT 1` 连接测试 Command 和 UI 入口，但当前远程/headless 环境无法实际打开桌面窗口填写配置并点击测试。
- 本阶段未实现业务数据读写 Commands，知识、分类、标签、系统、思维导图数据 Commands 留到后续阶段。
- 本阶段配置文件暂以 JSON 保存，后续可迁移到 Windows Credential Manager 或系统安全存储。

## 5-1.readonly_commands

完成时间：2026-06-12

已完成内容：

1. 新增 Rust 只读模型：
   - `src-tauri/src/models/category.rs`
   - `src-tauri/src/models/tag.rs`
   - `src-tauri/src/models/system.rs`
   - `src-tauri/src/models/knowledge.rs`
   - `src-tauri/src/models/file.rs`
   - `src-tauri/src/models/mindmap.rs`
2. 新增 Rust 只读 Commands：
   - `list_categories`
   - `list_tags`
   - `list_systems`
   - `list_knowledge`
   - `get_knowledge_detail`
   - `list_files`
   - `get_mindmap`
   - `list_mindmap_nodes`
   - `list_mindmap_connections`
3. 更新 `src-tauri/src/lib.rs`，注册以上只读 Commands。
4. 更新 `src-tauri/src/db.rs`：
   - 新增从 `AppState` 获取连接池的 `get_pool`。
   - 未配置数据库时返回 `DATABASE_NOT_CONFIGURED`。
   - 新增统一查询错误映射。
5. `list_knowledge` 已支持：
   - `page`
   - `pageSize`
   - `search`
   - `categoryId`
   - `tagId`
   - 总数、分页和 `totalPages` 返回。
6. `list_knowledge` 查询结果对齐 Web API：
   - 返回 `{ entries,total,page,pageSize,totalPages }`。
   - 每条知识包含分类样式字段、标签数组、热度字段。
   - 搜索字段覆盖标题、HTML、Markdown、富文本内容。
7. 热度查询做了兼容处理：
   - 如果 `entry_clicks` 表存在，则按 Web 端衰减公式计算 `hotScore` 和 `clickCount`。
   - 如果 `entry_clicks` 表不存在，则只读列表仍可返回，热度按 0 处理，避免只读阶段因懒建表缺失导致列表不可用。
8. `get_knowledge_detail` 已返回详情字段、分类字段和标签数组。
9. 分类、标签、系统查询对齐现有 Web API：
   - 分类返回 `entryCount`。
   - 标签返回 `entryCount`。
   - 系统返回 `nodeCount`。
10. 思维导图只读查询已覆盖：
   - 按 `systemId` 查询节点。
   - 按 `systemId` 查询连线。
   - `get_mindmap` 同时返回节点和连线。
11. 文件只读查询 `list_files` 只返回元数据：
   - `id`
   - `filename`
   - `mimeType`
   - `size`
   - `createdAt`
   - 不读取或返回 `uploads.data BYTEA`。
12. 更新 `src/services/file-service.ts`：
   - 新增 `FileMetadata`。
   - 新增 `listFiles()`，Desktop 分支调用 `list_files`。
13. 更新 `src/services/mindmap-service.ts`：
   - 新增 `getMindMap()`。
   - Desktop 分支调用 `get_mindmap`。
   - Web 分支组合现有节点与连线查询，保持双端 service API 一致。

验收状态：

- Rust Commands 中未新增业务写入 SQL。
- 动态筛选条件使用 `sqlx::QueryBuilder` 和参数绑定。
- 文件列表未查询 `uploads.data`。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- Web 构建结果仍保留 `/api/*` 动态 Route Handler。
- `npm run build:next:desktop` 通过。
- Desktop 静态导出成功生成 `out/`，且 `out/` 中未生成 `/api/*` 静态目录。
- `npx tauri build` 通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 当前远程/headless 环境无法打开桌面窗口，因此未在真实 Tauri UI 中填入数据库配置后核对 Desktop 数据展示。
- 本阶段只实现只读 Commands，未实现创建、更新、删除、点击统计、上传、打开文件等写入或原生文件能力。

## 6-1.write_commands

完成时间：2026-06-12

已完成内容：

1. 新增写入 payload 模型：
   - `CategoryPayload`
   - `TagPayload`
   - `CreateSystemPayload`
   - `UpdateSystemPayload`
   - `KnowledgePayload`
   - `KnowledgeClickResult`
2. 新增 `uuid` 依赖，用于 Desktop Rust Commands 生成业务 ID。
3. 分类写入 Commands：
   - `create_category`
   - `update_category`
   - `delete_category`
4. 分类删除保留 Web 端业务规则：
   - 如果分类下仍有知识条目，则返回明确错误。
   - 不会自动迁移或删除该分类下的知识。
5. 标签写入 Commands：
   - `create_tag`
   - `update_tag`
   - `delete_tag`
6. 标签删除依赖数据库外键级联清理 `entry_tags`。
7. 系统写入 Commands：
   - `create_system`
   - `update_system`
   - `delete_system`
8. 系统创建使用事务：
   - 创建 `systems` 记录。
   - 自动创建根 `topic` 节点。
   - 任一步失败都会回滚。
9. 系统删除使用事务：
   - 删除系统连线。
   - 删除系统节点。
   - 删除系统记录。
10. 知识写入 Commands：
   - `create_knowledge`
   - `update_knowledge`
   - `delete_knowledge`
   - `record_knowledge_click`
   - `favorite_knowledge`
   - `pin_knowledge`
11. 知识创建使用事务：
   - 写入 `entries`。
   - 校验分类存在。
   - 校验标签存在。
   - 同步写入 `entry_tags`。
   - 任一步失败都会回滚。
12. 知识更新使用事务：
   - 更新 `entries`。
   - 校验分类存在。
   - 当 `tagIds` 存在时，全量同步 `entry_tags`。
   - 任一步失败都会回滚。
13. 知识删除复用数据库外键清理关联数据。
14. 点击统计 `record_knowledge_click`：
   - 校验条目存在。
   - 如果 `entry_clicks` 与 `entry_click_windows` 表已存在，则按 Web 端 60 秒窗口规则写入点击。
   - 如果热度表不存在，则返回 `{ success: true, counted: false }`，不创建表、不修改表结构。
15. 收藏/置顶 Commands：
   - 如果 `entries.is_favorite` / `entries.is_pinned` 字段已存在，则执行更新并返回知识详情。
   - 如果当前数据库表结构没有这些字段，则返回 `NOT_IMPLEMENTED`，不自动修改表结构。
16. 更新 `src-tauri/src/lib.rs`，注册所有写入 Commands。

验收状态：

- 未新增 `CREATE TABLE`、`ALTER TABLE`、`DROP TABLE` 等数据库结构变更 SQL。
- 知识创建/更新的条目与标签关联写入已使用事务。
- 系统创建/删除已使用事务。
- SQL 写入均使用参数绑定。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- Web 构建结果仍保留 `/api/*` 动态 Route Handler。
- `npm run build:next:desktop` 通过。
- `npx tauri build` 通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 当前远程/headless 环境无法打开桌面窗口，因此未在真实 Tauri UI 中执行 Desktop 写入回归。
- 本阶段没有生成 Windows `.exe` 或 `.msi`，Windows 打包仍留到 `11-1.windows_packaging` 阶段或 Windows 环境执行。
- 本阶段未实现文件上传、打开、导出、删除等原生文件能力。

## 7-1.desktop_file_module

完成时间：2026-06-12

已完成内容：

1. 新增 Desktop 文件上传模型：
   - `UploadFilePayload`
   - `UploadFileResponse`
   - `ExportFileResponse`
2. 新增 Rust 依赖：
   - `sha2`
   - `hex`
3. 实现 Desktop 文件 Commands：
   - `upload_file_to_postgres`
   - `open_file_from_postgres`
   - `export_file_from_postgres`
   - `delete_file`
   - `attach_file_to_knowledge`
   - `detach_file_from_knowledge`
4. 保留兼容别名 Commands：
   - `upload_image`
   - `open_file`
   - `export_file`
5. 文件上传继续使用现有 PostgreSQL `uploads` 表：
   - `id`
   - `filename`
   - `mime_type`
   - `data BYTEA`
   - `size`
   - `created_at`
6. 上传文件规则：
   - 拒绝空文件。
   - 图片限制 20MB。
   - 普通文档限制 50MB。
   - 默认拒绝视频文件。
   - 默认拒绝常见压缩包。
   - 文件名写入临时目录前会清理路径分隔符和非法字符。
7. 去重策略：
   - 上传时计算 sha256。
   - 在不改数据库结构的前提下，按同尺寸 `uploads.data` 计算 sha256 对比。
   - 若内容相同，则复用已有 `uploads.id`，返回 `reused: true`。
8. 打开文件：
   - 从 `uploads.data` 读取 BYTEA。
   - 写入系统临时目录 `personal-knowledge-desktop/files`。
   - 调用系统默认程序打开。
9. 导出文件：
   - 支持传入 `targetPath` 写入指定路径。
   - 未传 `targetPath` 时写入系统临时目录 `personal-knowledge-desktop/exports`。
   - 返回实际导出路径。
10. 删除文件：
   - `delete_file` 从 `uploads` 删除文件记录。
   - 文件不存在时返回明确 `NOT_FOUND`。
11. 知识-文件关联：
   - 如果当前数据库存在 `knowledge_files` 表，则执行关联/取消关联。
   - 如果当前数据库没有 `knowledge_files` 表，则返回 `NOT_IMPLEMENTED`。
   - 本阶段不会自动创建或修改关联表。
12. 新增 Desktop 文件本地协议：
   - 注册 `pk-file` 自定义 URI scheme。
   - Desktop 渲染 `/api/files/{id}` 时会归一成 `pk-file://localhost/{id}` 或平台对应 localhost 形式。
   - Rust 协议处理器只读 `uploads.data` 和 `uploads.mime_type`，用于 Desktop 静态包中加载图片/文件内容。
13. 新增 `src/lib/file-url.ts`：
   - `resolveFileUrl()`
   - `rewriteFileUrls()`
14. 更新内容渲染：
   - Markdown 渲染结果中的 `/api/files/{id}` 在 Desktop 下自动改写为 `pk-file`。
   - HTML / 富文本内容中的 `/api/files/{id}` 在 Desktop 下自动改写为 `pk-file`。
   - 知识条目的 `imageUrl` 在 Desktop 下也会通过统一解析函数处理。
15. 更新 `src/services/file-service.ts`：
   - `uploadImage()` / `uploadFile()` 调用 `upload_file_to_postgres`。
   - `openFile()` 调用 `open_file_from_postgres`。
   - `exportFile()` 调用 `export_file_from_postgres` 并返回导出路径。
16. 更新 Desktop 构建配置：
   - Desktop 构建使用 `.next-desktop` 作为 `distDir`。
   - 避免正在运行的 `next dev` 和 `tauri build` 同时写 `.next` 导致随机缺失 vendor chunk。
   - `.gitignore` 已忽略 `.next-desktop`。
17. 更新 `src-tauri/src/lib.rs`，注册所有文件 Commands 和 `pk-file` 协议。

验收状态：

- 未新增 `CREATE TABLE`、`ALTER TABLE`、`DROP TABLE` 等数据库结构变更 SQL。
- 文件内容仍存储在 PostgreSQL `uploads.data BYTEA`。
- 文件列表仍只返回元数据，不返回 BYTEA 内容。
- SQL 查询和写入均使用参数绑定。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- Web 构建结果仍保留 `/api/*` 动态 Route Handler。
- `npm run build:next:desktop` 通过。
- Desktop 静态导出成功生成 `out/`，且 `out/` 中未生成 `/api/*` 静态目录。
- `npx tauri build` 通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 当前远程/headless 环境无法打开桌面窗口，因此未在真实 Tauri UI 中点击上传、打开、导出文件。
- 当前项目尚未提供独立的附件列表 UI，本阶段优先完成底层 Commands、service 映射和 Desktop 文件 URL 加载能力。
- 原生保存对话框尚未接入；`export_file_from_postgres` 当前支持外部传入 `targetPath`，未传时导出到系统临时目录。
- 本阶段没有生成 Windows `.exe` 或 `.msi`，Windows 打包仍留到 `11-1.windows_packaging` 阶段或 Windows 环境执行。

### 7-1.review_refactor

完成时间：2026-06-12

重构目标：

- 按代码 review 结果改善可读性、开闭原则和职责边界。
- 不改动业务逻辑、命令名、参数、返回结构、SQL 语义或数据库表结构。

已完成内容：

1. 拆分 Rust 文件模块职责，新增 `src-tauri/src/files/`：
   - `hash.rs`：sha256 计算。
   - `paths.rs`：文件 ID 归一化与文件名清理。
   - `policy.rs`：上传限制、MIME 归一化、视频/压缩包/大小校验。
   - `repository.rs`：`uploads` 与 `knowledge_files` 相关数据库访问。
   - `storage.rs`：临时文件写入与导出路径处理。
   - `system_open.rs`：调用系统默认程序打开文件。
2. 拆分 Desktop 文件协议职责，新增 `src-tauri/src/protocols/`：
   - `protocols/file.rs` 注册并处理 `pk-file` 自定义 URI scheme。
3. 收窄 `src-tauri/src/commands/files.rs`：
   - 保留 Tauri command 函数和流程编排。
   - 文件策略、路径、数据库访问、临时文件、系统打开均改为调用专用模块。
4. 收窄 `src-tauri/src/lib.rs`：
   - 移除文件协议解析、响应构造、文件读取 SQL。
   - 只保留应用启动、数据库配置加载、command 注册和协议注册入口。
5. 保持以下行为不变：
   - `upload_file_to_postgres`
   - `upload_image`
   - `open_file_from_postgres`
   - `open_file`
   - `export_file_from_postgres`
   - `export_file`
   - `delete_file`
   - `attach_file_to_knowledge`
   - `detach_file_from_knowledge`
   - `pk-file` 协议响应逻辑与缓存头逻辑。

验收状态：

- 未新增 `CREATE TABLE`、`ALTER TABLE`、`DROP TABLE` 等数据库结构变更 SQL。
- 未改变文件模块 Commands 的外部接口。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build:web` 通过。
- `npm run build:next:desktop` 通过。
- `npx tauri build` 通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 本次是结构重构，不推进新阶段功能。
- review 中提到的 `pk-file` 错误响应缓存策略属于行为修复，按“不要改动逻辑”的要求本次未修改，后续可单独处理。

## 8-1.unified_error_handling

完成时间：2026-06-12

已完成内容：

1. 结合实际代码确认 `src/types/api.ts`、`src/services/http-client.ts`、`src/services/tauri-client.ts` 和 `src-tauri/src/error.rs` 已具备统一错误基础。
2. 补齐前端错误码：
   - `NOT_IMPLEMENTED`
   - `DESKTOP_ONLY`
3. 更新 `src/lib/api-error.ts`：
   - 统一 Web API 错误响应为 `{ error: { code, message, details? } }`。
   - 新增数据库连接、重复名称、未知异常的统一转换。
   - 对连接串、密码、API Key 等敏感内容做基础脱敏。
4. 更新 Web API Route 错误处理：
   - 分类。
   - 标签。
   - 系统。
   - 知识列表、详情、创建、更新、删除、点击统计。
   - 文件读取。
   - 思维导图节点和连线。
   - 图片上传继续使用统一错误工具。
5. 保留 HTTP status 语义，例如校验错误 400、未找到 404、文件过大 413、未实现 501。
6. 修复 Web/Desktop 双构建后 `tsconfig.tsbuildinfo` 缓存引用不同 `.next/types` 的问题：
   - 将 `tsconfig.json` 的 `incremental` 改为 `false`。
   - 避免 `npx tsc --noEmit` 在 Web/Desktop 构建目标切换后误报缺失类型文件。

验收状态：

- services 能把 Web 和 Rust 错误转换为统一 `ServiceError`。
- Web API 已基本统一错误响应结构。
- Rust Commands 继续返回统一 `CommandError`。
- `npx tsc --noEmit` 通过。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npm run build:web` 通过。

说明：

- UI 仍有少量 `alert()` 用于分类/标签删除错误提示，错误消息来源已统一为 `getErrorMessage()`。
- 当前未新增全局 toast 系统，页面级/弹窗级错误展示沿用现有 UI。

## 9-1.search_mindmap_ai

完成时间：2026-06-12

已完成内容：

1. 补齐 Desktop 搜索 Command：
   - 新增 `search_knowledge`。
   - 复用 `list_knowledge` 分页、排序和 normalize 行为。
   - 搜索范围扩展到标题、内容、分类名、标签名，以及可推断关联的系统节点内容。
2. 扩展 `KnowledgeQuery`：
   - `systemId`
   - `favorite`
   - `pinned`
3. 收藏/置顶筛选在 Web 和 Desktop 都会先检查数据库字段：
   - 如果当前 `entries` 表没有 `is_favorite` / `is_pinned`，返回 `NOT_IMPLEMENTED`。
   - 不自动执行 `ALTER TABLE`。
4. 补齐 Desktop 思维导图写入 Commands：
   - `create_mindmap_node`
   - `update_mindmap_node`
   - `delete_mindmap_node`
   - `create_mindmap_connection`
   - `delete_mindmap_connection`
   - `save_mindmap`
5. `save_mindmap` 使用事务保存节点和连线，避免部分写入。
6. 更新 `src/services/mindmap-service.ts`：
   - 新增 `saveMindMap()`。
   - Desktop 分支调用 Rust `save_mindmap`。
7. 新增 Desktop AI 配置与 Commands：
   - `get_ai_config_status`
   - `save_ai_config`
   - `ai_summarize`
   - `ai_suggest_tags`
   - `ai_auto_tags`
   - `ai_optimize_prompt`
8. AI 配置保存到 Tauri app config 目录下的 `ai-config.json`：
   - 前端状态查询不返回 API Key。
   - 保存时 API Key 留空可沿用已有密钥。
9. AI 调用由 Rust 端通过 OpenAI-compatible `/chat/completions` 发起：
   - 新增 `reqwest`。
   - 限制输入长度。
   - 错误提示不暴露 API Key 或请求头。
10. 更新 `src/services/ai-service.ts`：
   - Tauri dev 和 Tauri 静态包都走 Rust AI Commands。
   - Web 分支继续返回未实现。

验收状态：

- `npx tsc --noEmit` 通过。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npm run build:web` 通过。
- `npm run build:next:desktop` 通过。
- Desktop 静态构建结果 `.next-desktop/` 中未包含 `/api/*` 目录。
- `npx tauri build` 通过，并成功生成 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 当前远程/headless 环境无法打开真实桌面窗口，因此未在 Tauri UI 中手动执行搜索、思维导图编辑和 AI 调用。
- AI 真实调用需要用户先在 Desktop 环境保存有效 API Key、模型和 base URL。
- 系统筛选目前基于 mindmap 节点与知识内容/标题的可推断关联；当前数据库没有独立知识-系统关联表。

## 10-1.desktop_native_features

完成时间：2026-06-12

已完成内容：

1. 新增 `src-tauri/src/desktop.rs`，集中管理 Desktop 原生能力：
   - 应用菜单。
   - 系统托盘。
   - 关闭窗口最小化到托盘。
   - 启动时数据库连接检查。
   - 启动时临时文件清理。
2. Tauri 启用 `tray-icon` feature。
3. 新增应用菜单：
   - 文件：新建知识、上传附件（暂禁用）、退出。
   - 编辑：复制、粘贴、保存剪贴板。
   - 视图：快速搜索、数据库设置。
4. 新增系统托盘菜单：
   - 打开 Personal Knowledge。
   - 快速搜索。
   - 新建知识。
   - 退出。
5. 新增 Desktop 事件桥：
   - `desktop:quick-search`
   - `desktop:new-knowledge`
   - `desktop:clipboard-save`
   - `desktop:open-settings`
   - `desktop:db-offline`
6. 新增 `src/services/desktop-events.ts`，前端监听 Tauri 原生事件。
7. 更新 `src/components/AppShell.tsx`：
   - 响应 Desktop 菜单/托盘事件。
   - 支持 `Ctrl+Shift+K` 聚焦搜索。
   - 支持 `Ctrl+N` 新建知识。
   - 支持 `Ctrl+,` 打开数据库设置。
   - 数据库启动检查失败时显示页面提示并打开数据库设置。
8. 更新 `src/components/SearchBar.tsx` 和 `src/app/page.tsx`：
   - 支持快速搜索聚焦。
   - Desktop 中打开知识时记录最近打开知识。
9. 新增 Desktop 偏好与状态 Commands：
   - `get_desktop_preferences`
   - `save_desktop_preferences`
   - `record_recent_knowledge`
   - `get_desktop_runtime_status`
   - `show_main_window`
   - `cleanup_temp_files`
10. 临时文件清理范围限制在系统临时目录的 `personal-knowledge-desktop/files`，不清理用户导出目录。

验收状态：

- `npx tsc --noEmit` 通过。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npm run build:web` 通过。
- `npm run build:next:desktop` 通过。
- `npx tauri build` 通过，并成功生成 Linux bundle。

说明：

- 当前未接入 Tauri global-shortcut 插件，快捷键为应用窗口内快捷键，不是系统级全局快捷键。
- 拖拽上传和剪贴板快速保存的完整业务 UI 仍未完成；菜单事件已经预留并能打开新建入口。
- 当前远程/headless 环境无法验证真实托盘点击和窗口关闭行为。

## 11-1.windows_packaging

完成时间：2026-06-12

已完成内容：

1. 更新 `src-tauri/tauri.conf.json`：
   - `identifier` 调整为 `com.bulidworld.personal-knowledge-desktop`。
   - `bundle.targets` 显式包含：
     - `deb`
     - `rpm`
     - `appimage`
     - `nsis`
     - `msi`
   - 保留 Windows `icon.ico`。
   - 配置 Windows WebView2 安装模式为 `downloadBootstrapper`。
   - 配置 NSIS：
     - `installMode: currentUser`
     - `displayLanguageSelector: true`
     - `languages: ["English", "SimpChinese"]`
   - 配置 WiX 语言：
     - `en-US`
     - `zh-CN`
2. 修正 Desktop 静态资源路径：
   - Next Desktop 构建使用 `.next-desktop` 作为导出目录。
   - Tauri `frontendDist` 改为 `../.next-desktop`。
   - 避免 `frontendDist: ../out` 在当前 Next 15 + `distDir` 组合下找不到资源。
3. 保持 Web 构建仍生成 `.next`，Desktop 静态构建生成 `.next-desktop`。

验收状态：

- `npx tsc --noEmit` 通过。
- `cargo fmt` 通过。
- `cargo check` 通过。
- `npm run build:web` 通过。
- `npm run build:next:desktop` 通过。
- `npx tauri build` 通过。
- 当前 Linux 环境成功生成 3 个 Linux bundle：
  - `src-tauri/target/release/bundle/deb/Personal Knowledge Desktop_0.1.0_amd64.deb`
  - `src-tauri/target/release/bundle/rpm/Personal Knowledge Desktop-0.1.0-1.x86_64.rpm`
  - `src-tauri/target/release/bundle/appimage/Personal Knowledge Desktop_0.1.0_amd64.AppImage`

说明：

- 当前运行环境是 Linux/headless，没有生成 Windows `.exe`、NSIS `setup.exe` 或 `.msi`。
- Windows 安装、启动、卸载、首次数据库配置、CRUD 和文件操作仍需要在干净 Windows 环境执行最终验收。
- `bundle.targets` 已包含 `nsis` 和 `msi`，但 Tauri 在当前 Linux 环境只产出本平台支持的 bundle。

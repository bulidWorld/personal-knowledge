import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

let db: SqlJsDatabase | null = null

const DATA_DIR = join(process.cwd(), '.data')
const DB_PATH = join(DATA_DIR, 'knowledge.db')

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db

  const SQL = await initSqlJs()

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
    initTables(db)
    seedData(db)
    persist()
  }

  return db
}

function initTables(d: SqlJsDatabase) {
  d.run('PRAGMA foreign_keys = ON')
  d.run(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      border_color TEXT NOT NULL DEFAULT '',
      dot_color TEXT NOT NULL DEFAULT '',
      gradient TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT ''
    )
  `)
  d.run(`
    CREATE TABLE entries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      html_content TEXT NOT NULL DEFAULT '',
      markdown_content TEXT NOT NULL DEFAULT '',
      richtext_content TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'html',
      category_id TEXT NOT NULL,
      iframe_url TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `)
  d.run(`
    CREATE TABLE systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'Network',
      border_color TEXT DEFAULT 'border-l-teal-500',
      dot_color TEXT DEFAULT 'bg-teal-500',
      gradient TEXT DEFAULT 'bg-gradient-to-r from-teal-400 to-teal-500',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  d.run(`
    CREATE TABLE mindmap_nodes (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      title TEXT NOT NULL,
      html_content TEXT DEFAULT '',
      markdown_content TEXT DEFAULT '',
      richtext_content TEXT DEFAULT '',
      content_type TEXT DEFAULT 'html',
      node_type TEXT NOT NULL,
      parent_id TEXT,
      x REAL DEFAULT 300,
      y REAL DEFAULT 250,
      color TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
    )
  `)
  d.run(`
    CREATE TABLE mindmap_connections (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      source_node_id TEXT NOT NULL,
      target_node_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
      FOREIGN KEY (source_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_node_id) REFERENCES mindmap_nodes(id) ON DELETE CASCADE
    )
  `)
}

function seedData(d: SqlJsDatabase) {
  const stmt = d.prepare('SELECT COUNT(*) as cnt FROM categories')
  stmt.step()
  const row = stmt.getAsObject() as { cnt: number }
  stmt.free()
  if (row.cnt > 0) return

  const insertCat = (id: string, name: string, icon: string, border_color: string, dot_color: string, gradient: string, description: string) => {
    d.run('INSERT INTO categories VALUES (?, ?, ?, ?, ?, ?, ?)', [id, name, icon, border_color, dot_color, gradient, description])
  }
  const insertEntry = (id: string, title: string, category_id: string, html_content: string, markdown_content: string, richtext_content: string, iframe_url: string | null, image_url: string | null, content_type = 'html') => {
    const now = new Date().toISOString()
    d.run('INSERT INTO entries VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, title, html_content, markdown_content, richtext_content, content_type, category_id, iframe_url, image_url, now, now])
  }

  insertCat('agent-coding', 'Agent 编码经验', 'Bot', 'border-l-blue-500', 'bg-blue-500', 'bg-gradient-to-r from-blue-400 to-blue-500', 'Agent 开发过程中的编码模式、最佳实践与踩坑记录')
  insertCat('prompts', '常用提示词', 'MessageSquareText', 'border-l-violet-500', 'bg-violet-500', 'bg-gradient-to-r from-violet-400 to-violet-500', '经过验证的高质量提示词模板与调优经验')
  insertCat('cli-tools', '命令行工具', 'Terminal', 'border-l-emerald-500', 'bg-emerald-500', 'bg-gradient-to-r from-emerald-400 to-emerald-500', '常用的命令行工具、脚本与效率技巧')
  insertCat('architecture', '架构总结', 'Workflow', 'border-l-amber-500', 'bg-amber-500', 'bg-gradient-to-r from-amber-400 to-amber-500', '系统架构设计思路、技术选型与演进记录')
  insertCat('practical-cases', '实际应用案例', 'Lightbulb', 'border-l-rose-500', 'bg-rose-500', 'bg-gradient-to-r from-rose-400 to-rose-500', '真实项目中的应用案例、方案与效果')

  const empty = ''

  insertEntry('agent-1', '使用 Claude Code 进行批量重构', 'agent-coding', `<p>在使用 Claude Code 进行大规模代码重构时，关键经验是将任务拆分为小粒度、可验证的步骤。</p>\n<h3>核心原则</h3>\n<ul>\n  <li>每个 commit 保持单一职责，便于回滚</li>\n  <li>使用 CLAUDE.md 记录项目上下文，减少重复解释</li>\n  <li>复杂任务先输出计划，确认后再执行</li>\n</ul>\n<h3>踩坑记录</h3>\n<p>避免在单次对话中处理过多文件，超过 ~2000 行变更时模型容易丢失上下文。</p>`, empty, empty, null, null)
  insertEntry('agent-2', 'Agent 工具链设计模式', 'agent-coding', `<p>设计 Agent 的工具链时，应遵循"工具最小化、组合最大化"的原则。</p>\n<h3>推荐模式</h3>\n<ul>\n  <li>每个工具只做一件事，通过组合实现复杂功能</li>\n  <li>工具描述中包含具体的参数示例和返回值格式</li>\n  <li>为每个工具提供错误处理策略</li>\n</ul>\n<pre><code>// 工具定义模板\n{\n  name: "search_files",\n  description: "搜索匹配模式的文件",\n  parameters: {\n    pattern: "*.ts",\n    directory: "./src"\n  }\n}</code></pre>`, empty, empty, null, null)
  insertEntry('agent-3', '多 Agent 协作策略', 'agent-coding', `<p>复杂任务使用多 Agent 协作时，以"探索 → 规划 → 执行"三阶段划分 Agent 角色效果最佳。</p>\n<ul>\n  <li><strong>Explore Agent</strong>：只读搜索，快速定位相关文件</li>\n  <li><strong>Plan Agent</strong>：分析搜索结果，制定实现计划</li>\n  <li><strong>Implement Agent</strong>：按计划逐步执行代码变更</li>\n</ul>\n<p>各阶段 Agent 的输出通过结构化格式传递，避免信息丢失。</p>`, empty, empty, null, null)
  insertEntry('prompt-1', '代码审查 Prompt', 'prompts', `<p>用于代码审查的系统提示词模板，涵盖安全性、性能、可维护性三个维度。</p>\n<pre><code>你是一位资深代码审查员。请审查以下代码，从以下维度给出反馈：\n\n1. **安全性**：是否存在注入、XSS、敏感信息泄露等漏洞\n2. **性能**：是否有不必要的计算、内存泄漏、阻塞操作\n3. **可维护性**：命名是否清晰、职责是否单一、是否有重复逻辑\n\n对于每个问题，请提供具体的修复建议和代码示例。</code></pre>`, empty, empty, null, null)
  insertEntry('prompt-2', 'API 文档生成 Prompt', 'prompts', `<p>自动从代码中提取 API 文档的提示词。</p>\n<pre><code>请分析以下 API 路由处理代码，为每个端点生成文档条目：\n\n对每个端点输出：\n- HTTP 方法和路径\n- 请求参数（query/body/params）及其类型和必填性\n- 响应结构和状态码\n- 业务逻辑简述（一句话）\n\n输出格式使用 OpenAPI 3.0 规范的 YAML 片段。</code></pre>`, empty, empty, null, null)
  insertEntry('prompt-3', '系统架构分析 Prompt', 'prompts', `<p>帮助理解复杂代码库结构的提示词。</p>\n<pre><code>你是一位系统架构师。请分析以下项目的整体架构：\n\n1. 识别项目的主要模块和它们的职责\n2. 画出模块间的依赖关系（用 Mermaid 图）\n3. 标注出核心数据流路径\n4. 指出架构中的优点和潜在风险点\n\n先阅读目录结构和配置文件，再深入关键模块。</code></pre>`, empty, empty, null, null)
  insertEntry('cli-1', 'jq — JSON 处理瑞士军刀', 'cli-tools', `<p><code>jq</code> 是命令行处理 JSON 数据的必备工具。</p>\n<h3>常用命令</h3>\n<pre><code># 提取字段\ncat data.json | jq '.items[].name'\n\n# 过滤\ncat data.json | jq '.items[] | select(.status == "active")'\n\n# 格式化输出\ncat data.json | jq '.' > formatted.json\n\n# 聚合统计\ncat data.json | jq '[.items[].price] | add / length'</code></pre>`, empty, empty, null, null)
  insertEntry('cli-2', 'fzf — 模糊搜索神器', 'cli-tools', `<p><code>fzf</code> 是一个通用的命令行模糊搜索工具，可以极大提升终端操作效率。</p>\n<h3>常用场景</h3>\n<pre><code># 搜索文件并编辑\nvim $(fzf)\n\n# 搜索 git 分支并切换\ngit checkout $(git branch | fzf)\n\n# 搜索历史命令\nhistory | fzf\n\n# 搜索进程并 kill\nps aux | fzf | awk '{print $2}' | xargs kill</code></pre>`, empty, empty, null, null)
  insertEntry('cli-3', 'ripgrep (rg) — 高速代码搜索', 'cli-tools', `<p><code>rg</code> 是比 grep 更快的递归搜索工具，默认尊重 .gitignore。</p>\n<pre><code># 搜索特定类型文件\nrg "useState" --type ts\n\n# 显示上下文\nrg "error" -C 3\n\n# 只列出匹配的文件\nrg "TODO" -l\n\n# 替换（不修改文件，只输出）\nrg "old_name" -r "new_name"</code></pre>`, empty, empty, null, null)
  insertEntry('arch-1', 'Nuxt 4 项目分层架构', 'architecture', `<p>推荐的 Nuxt 4 项目目录分层：</p>\n<ul>\n  <li><strong>pages/</strong> — 路由层，薄组件，只做数据获取和布局组合</li>\n  <li><strong>components/</strong> — UI 组件，按功能域分文件夹</li>\n  <li><strong>composables/</strong> — 可复用逻辑，每个 composable 单一职责</li>\n  <li><strong>server/</strong> — API 路由、中间件、数据库访问</li>\n  <li><strong>types/</strong> — 共享 TypeScript 类型定义</li>\n</ul>\n<p>数据流：Server API → composable → component，单向数据流，避免组件间的隐式耦合。</p>`, empty, empty, null, null)
  insertEntry('arch-2', '微服务 vs 单体 — 选择决策框架', 'architecture', `<p>选择微服务还是单体架构，核心决策维度：</p>\n<table>\n  <tr><th>维度</th><th>单体优先</th><th>微服务优先</th></tr>\n  <tr><td>团队规模</td><td>&lt;10 人</td><td>&gt;30 人</td></tr>\n  <tr><td>部署频率</td><td>周级</td><td>日级/小时级</td></tr>\n  <tr><td>数据一致性</td><td>强一致</td><td>最终一致可接受</td></tr>\n  <tr><td>技术栈</td><td>统一</td><td>多语言/多框架</td></tr>\n</table>\n<p>经验法则：先用单体快速验证，当单一模块的变更频率显著高于其他模块时，再提取为独立服务。</p>`, empty, empty, null, null)
  insertEntry('case-1', 'Web 端的个人知识库管理', 'practical-cases', `<p>一个使用 Nuxt 4 构建的个人知识库管理应用，支持多分类、标签过滤和全文搜索。</p>\n<h3>技术方案</h3>\n<ul>\n  <li>前端：Nuxt 4 + Vue 3 + Tailwind CSS</li>\n  <li>数据存储：本地 JSON 文件 + Git 版本管理</li>\n  <li>搜索：客户端全文检索</li>\n</ul>`, empty, empty, 'https://example.com/knowledge-app', null)
  insertEntry('case-2', 'Agent 自动化工作流实践', 'practical-cases', `<p>基于 Claude Code 搭建的自动化代码审查流水线。</p>\n<h3>流程概览</h3>\n<ol>\n  <li>开发者提交 PR</li>\n  <li>Agent 自动拉取代码，执行安全检查</li>\n  <li>Agent 生成审查报告并作为 PR comment 提交</li>\n  <li>审查通过后 Agent 自动合并到主分支</li>\n</ol>\n<h3>效果数据</h3>\n<p>代码审查时间从平均 4 小时降低到 30 分钟，同时缺陷发现率提升 15%。</p>`, empty, empty, null, 'https://placehold.co/800x400/2563EB/FFFFFF?text=Agent+Workflow+Diagram')
  insertEntry('case-3', '多项目统一配置管理', 'practical-cases', `<p>使用 monorepo + 共享配置包统一管理多个项目的 ESLint、TypeScript、Prettier 配置。</p>\n<h3>架构设计</h3>\n<p>核心思路是将配置抽离为独立的 npm 包，各项目通过 extends 机制引用。</p>\n<h3>收益</h3>\n<ul>\n  <li>配置更新一处生效，所有项目同步</li>\n  <li>新人 onboarding 时间从 2 天缩短到 2 小时</li>\n  <li>CI 中配置检查完全一致</li>\n</ul>`, empty, empty, null, null)

  seedMindMap(d)
}

function seedMindMap(d: SqlJsDatabase) {
  const now = new Date().toISOString()
  const systemId = 'system-1'
  const empty = ''

  d.run('INSERT INTO systems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    systemId, '示例系统架构', '演示系统建模功能的示例系统', 'Network',
    'border-l-teal-500', 'bg-teal-500', 'bg-gradient-to-r from-teal-400 to-teal-500', now, now,
  ])

  // Root topic
  const t1 = 'node-t1'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    t1, systemId, '用户服务', empty, empty, empty, 'html', 'topic', null, 400, 100, '#10b981', now, now,
  ])

  // Concepts
  const c1 = 'node-c1'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    c1, systemId, '认证模块', empty, empty, empty, 'html', 'concept', t1, 200, 300, '#f59e0b', now, now,
  ])
  const c2 = 'node-c2'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    c2, systemId, '数据存储', empty, empty, empty, 'html', 'concept', t1, 600, 300, '#f59e0b', now, now,
  ])

  // Operations under c1
  const o1 = 'node-o1'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    o1, systemId, 'JWT 令牌签发', empty, empty, empty, 'html', 'operation', c1, 80, 500, '#3b82f6', now, now,
  ])
  const o2 = 'node-o2'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    o2, systemId, 'OAuth2 集成', empty, empty, empty, 'html', 'operation', c1, 320, 500, '#3b82f6', now, now,
  ])

  // Operations under c2
  const o3 = 'node-o3'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    o3, systemId, 'PostgreSQL 主库', empty, empty, empty, 'html', 'operation', c2, 500, 500, '#3b82f6', now, now,
  ])
  const o4 = 'node-o4'
  d.run('INSERT INTO mindmap_nodes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    o4, systemId, 'Redis 缓存', empty, empty, empty, 'html', 'operation', c2, 700, 500, '#3b82f6', now, now,
  ])

  // Connections: topic → concepts
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-1`, systemId, t1, c1, now])
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-2`, systemId, t1, c2, now])
  // Connections: concepts → operations
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-3`, systemId, c1, o1, now])
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-4`, systemId, c1, o2, now])
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-5`, systemId, c2, o3, now])
  d.run('INSERT INTO mindmap_connections VALUES (?, ?, ?, ?, ?)', [`conn-6`, systemId, c2, o4, now])
}

export async function persist() {
  if (!db) return
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

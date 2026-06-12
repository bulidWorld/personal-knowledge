# Desktop 文件模块 — 实现架构

## 模块结构

```txt
src-tauri/src/
├── commands/
│   └── files.rs
├── models/
│   └── file.rs
└── utils/
    ├── hash.rs
    ├── temp_file.rs
    └── path.rs
```

## 数据库表

文件表：

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT NOT NULL,
  sha256 TEXT,
  content BYTEA NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

知识文件关联表：

```sql
CREATE TABLE knowledge_files (
  knowledge_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (knowledge_id, file_id)
);
```

## 上传流程

```txt
用户点击上传
  ↓
前端 file-service 判断 Desktop
  ↓
Tauri dialog.open 选择文件
  ↓
invoke('upload_file_to_postgres', { path, knowledgeId })
  ↓
Rust 读取文件元数据
  ↓
校验大小和类型
  ↓
计算 sha256
  ↓
查询是否已存在相同 sha256
  ↓
不存在则插入 files(content BYTEA)
  ↓
写入 knowledge_files 关联
  ↓
返回 FileMeta
```

## 打开流程

```txt
用户点击打开文件
  ↓
invoke('open_file_from_postgres', { fileId })
  ↓
Rust 查询 original_name、mime_type、content
  ↓
写入应用临时目录
  ↓
调用系统默认程序打开
```

临时目录建议：

```txt
%TEMP%/personal-knowledge-desktop/files/
```

## 导出流程

```txt
用户点击导出
  ↓
Tauri dialog.save 获取目标路径
  ↓
invoke('export_file_from_postgres', { fileId, targetPath })
  ↓
Rust 读取 content BYTEA
  ↓
写入用户选择位置
```

## 去重策略

1. 上传前计算 sha256。
2. 如果 `files.sha256` 已存在，复用已有 file 记录。
3. 仍然写入 `knowledge_files` 关联。
4. 关联插入使用 `ON CONFLICT DO NOTHING`。

## Tauri 权限

需要逐步开启：

1. 文件对话框权限。
2. 文件系统读取权限。
3. 文件系统写入权限。
4. 使用系统默认程序打开文件的 shell 权限。

权限范围尽量收敛到用户选择的路径和应用临时目录。

## services 映射

| Service | Desktop Command |
| ------- | --------------- |
| `uploadFile` | `upload_file_to_postgres` |
| `openFile` | `open_file_from_postgres` |
| `exportFile` | `export_file_from_postgres` |
| `deleteFile` | `delete_file` |
| `attachFileToKnowledge` | `attach_file_to_knowledge` |
| `detachFileFromKnowledge` | `detach_file_from_knowledge` |

## 风险控制

1. 不把大文件内容返回给前端。
2. 上传和关联使用事务。
3. 文件名写入临时目录前做路径清洗。
4. 打开文件失败返回 `FILE_OPEN_FAILED`。
5. 临时文件清理不删除用户导出的文件。

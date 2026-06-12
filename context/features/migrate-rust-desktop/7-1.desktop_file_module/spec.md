# Desktop 文件模块

## 业务目标

Desktop 端支持从本地选择文件上传到 PostgreSQL，从 PostgreSQL 打开、导出、删除文件，并支持知识条目与文件的关联关系。

文件内容继续存储在 PostgreSQL `BYTEA` 中，Web 与 Desktop 共用同一份文件数据。

## 使用场景

### Desktop 上传本地文件

用户点击上传附件，系统打开 Windows 文件选择器。用户选择文件后，Rust 读取本地文件、计算 sha256、写入 PostgreSQL，并关联到当前知识条目。

### Desktop 打开文件

用户点击文件，Rust 从 PostgreSQL 读取 `content BYTEA`，写入临时目录，然后调用系统默认程序打开。

### Desktop 导出文件

用户点击导出，系统打开保存对话框。用户选择路径后，Rust 将数据库中的文件内容写到该路径。

### Web 与 Desktop 文件互通

Web 上传的文件可以在 Desktop 打开；Desktop 上传的文件可以在 Web 看到和下载。

## 功能范围

实现以下 Commands：

| Command | 说明 |
| ------- | ---- |
| `upload_file_to_postgres` | 选择或接收本地文件路径，写入 PostgreSQL |
| `open_file_from_postgres` | 读取文件内容到临时目录并用系统默认程序打开 |
| `export_file_from_postgres` | 导出文件到用户选择的位置 |
| `delete_file` | 删除文件记录或按业务规则删除文件 |
| `attach_file_to_knowledge` | 关联知识和文件 |
| `detach_file_from_knowledge` | 取消知识和文件关联 |

## 文件规则

1. 计算 sha256，用于去重。
2. 文件列表接口只返回元数据。
3. 限制单文件大小。
4. 不建议上传视频和超大压缩包。
5. 临时文件定期清理。

建议限制：

| 类型 | 限制 |
| ---- | ---- |
| 图片 | 20MB |
| 普通文档 | 50MB |
| 压缩包 | 默认禁止或二次确认 |
| 视频 | 不建议入库 |

## 验收标准

1. Desktop 可以选择本地文件上传。
2. 文件成功写入 PostgreSQL。
3. Web 可以看到 Desktop 上传的文件。
4. Desktop 可以打开 Web 上传的文件。
5. Desktop 可以导出文件。
6. Desktop 可以删除文件关联。
7. 重复文件可以复用。
8. 文件过大时有明确提示。

# Markdown 图片粘贴 — 对外接口规格

## 概述

本功能允许用户在 Markdown 编辑器中直接粘贴剪贴板中的图片（Ctrl+V），图片自动上传至服务端并以 `![](url)` 格式插入到 Markdown 文本中。同时，渲染引擎对外部图片添加 `referrerpolicy="no-referrer"` 属性以规避防盗链限制。

## API 端点

### POST /api/upload

上传剪贴板中的图片文件。

**请求**

```
POST /api/upload
Content-Type: multipart/form-data
```

| 字段 | 类型   | 必填 | 说明                     |
| ---- | ------ | ---- | ------------------------ |
| file | File   | 是   | 图片文件，MIME 须为 `image/*` |

**支持的图片格式**

| MIME Type      | 扩展名 |
| -------------- | ------ |
| image/png      | .png   |
| image/jpeg     | .jpg   |
| image/webp     | .webp  |
| image/gif      | .gif   |
| image/svg+xml  | .svg   |
| image/bmp      | .bmp   |

未识别的 MIME 类型默认使用 `.png`。

**成功响应 (200)**

```json
{
  "url": "/uploads/paste-1712345678-a1b2c3.png"
}
```

| 字段 | 类型   | 说明                                       |
| ---- | ------ | ------------------------------------------ |
| url  | string | 图片的相对 URL，可直接用于 `<img src>` 或 Markdown |

**错误响应**

| 状态码 | 响应体                            | 触发条件             |
| ------ | --------------------------------- | -------------------- |
| 400    | `{ "error": "未找到图片文件" }`   | 请求中没有 `file` 字段 |
| 400    | `{ "error": "仅支持图片文件" }`   | 文件 MIME 不是 `image/*` |
| 500    | `{ "error": "上传失败" }`         | 服务端文件写入异常   |

## 静态文件访问

上传的图片存储在 `public/uploads/` 目录下，由 Next.js 静态文件服务直接提供。

- **存储路径**: `{project}/public/uploads/paste-{timestamp}-{random6}.{ext}`
- **访问 URL**: `http://{host}/uploads/{filename}`

文件命名规则: `paste-{Date.now()}-{6位随机字母数字}.{扩展名}`，确保并发场景下不会出现文件名冲突。

## 内容渲染增强

Markdown 渲染引擎在输出 HTML 时，对所有 `<img>` 标签自动注入 `referrerpolicy="no-referrer"` 属性。这使得从具有防盗链保护的外部域名加载图片时，浏览器不会发送 `Referer` 请求头，从而规避 403 错误。

### 示例

输入 Markdown:
```markdown
![](https://example.com/protected-image.png)
```

渲染输出 HTML:
```html
<img referrerpolicy="no-referrer" src="https://example.com/protected-image.png" alt="">
```

### 限制说明

- 图片存储在本地的 `public/uploads/` 目录，不会持久化到数据库
- 无身份验证要求（本地上传场景）
- 无文件大小限制（由 Next.js 默认的 body parser 限制决定）
- `public/uploads/` 目录受 Git 托管，目录结构会被提交，但上传的图片文件建议加入 `.gitignore` 按需管理

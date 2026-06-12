# Windows 打包发布

## 业务目标

将 Desktop 应用打包为 Windows 可执行程序和安装包，用户无需安装 Node.js 或浏览器即可安装运行。

## 使用场景

### 开发者构建安装包

开发者执行：

```bash
npm run build:desktop
```

生成 Windows exe、NSIS setup.exe 和 MSI 安装包。

### 用户安装应用

用户运行 setup.exe，完成安装后从开始菜单或桌面快捷方式启动应用。

### 用户首次启动

首次启动时，如果没有数据库配置，应用引导用户进入设置页配置 PostgreSQL。

### 用户卸载应用

用户通过 Windows 应用管理卸载应用，程序文件被移除。本地配置是否保留按安装器策略决定。

## 功能范围

1. 配置应用图标。
2. 配置产品名称。
3. 配置应用版本。
4. 配置应用 identifier。
5. 配置 NSIS 安装包。
6. 配置 MSI 安装包。
7. 在干净 Windows 环境测试安装、启动、卸载。
8. 验证首次启动数据库配置流程。

## 预期产物

```txt
src-tauri/target/release/
└── personal-knowledge-desktop.exe

src-tauri/target/release/bundle/nsis/
└── Personal Knowledge Desktop_0.1.0_x64-setup.exe

src-tauri/target/release/bundle/msi/
└── Personal Knowledge Desktop_0.1.0_x64_en-US.msi
```

## 验收标准

1. 生成 `setup.exe`。
2. 安装后可以启动。
3. 不要求用户安装 Node.js。
4. 不要求用户安装浏览器。
5. 可以连接远端 PostgreSQL。
6. 可以正常查询、新增、编辑、删除知识。
7. 可以上传、打开、导出文件。
8. 可以正常卸载。

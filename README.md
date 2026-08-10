# 提瓦特特产采集手帐

一个根据角色规划区域特产采集、并记录 46 小时刷新冷却的纯前端 Web 应用。

## 开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建结果位于 `dist/`，可部署到任意静态网站托管服务。

## 桌面与 Android 客户端

项目使用同一套 React + Vite 前端构建 Web、Windows 和 Android 版本。Tauri 代码位于 `src-tauri/`，现有 Web 构建命令保持不变。

Windows 和 Android 客户端导出规划时会打开系统保存界面，并使用 Tauri 文件系统 API 直接写入 JSON；Web 版本仍使用浏览器下载。

Web 与客户端使用独立构建结果：

- `npm run build` 生成 `dist/`，图片继续使用 JSON 中的 CDN 地址；
- `npm run build:tauri` 生成 `dist-tauri/`，优先加载打包在客户端中的原始 PNG，缺失时再回退 CDN。

Windows 开发与构建：

```bash
npm run desktop:dev
npm run desktop:build
```

默认生成 NSIS `.exe` 安装包。如需 MSI，可单独执行 `npm run desktop:build:msi`；首次构建 MSI 时 Tauri 会下载 WiX 工具。

首次生成 Android 工程：

```bash
npm run android:init
```

Android 开发与构建：

```bash
npm run android:dev
npm run android:build
```

生成适合本地安装测试的 arm64 调试 APK：

```bash
npm run android:build:debug
```

Android 构建需要 JDK、Android SDK 和 Android NDK。项目脚本会优先读取 `JAVA_HOME`、`ANDROID_HOME` 和 `NDK_HOME`，并可在 Windows 上自动发现 Android Studio 自带的 JBR 与默认 SDK/NDK 安装目录。

Android 构建前会自动将 `src-tauri/icons/android/` 中的应用图标同步到 Gradle 工程。手动同步可执行：

```bash
npm run android:icons
```

## 客户端图片资源

客户端资源快照位于 `native-assets/UI/`。它只会进入 `dist-tauri/`，不会进入 Cloudflare Pages 使用的 `dist/`。

从工具包根目录的 `cdn-assets/UI/` 同步当前 JSON 实际引用的图片：

```bash
npm run assets:sync
```

同步脚本会：

- 根据 `public/data/characters-regional-specialties.json` 收集图片文件名；
- 校验每个源文件存在且具有 PNG 文件头；
- 删除客户端快照中已经不再被 JSON 引用的 PNG；
- 原样复制需要的图片，不进行压缩或格式转换。

更新上游数据和图片后的建议顺序：

```bash
npm run data:update
node ../scripts/download/downloadRegionalSpecialtyImages.js --input ./public/data/characters-regional-specialties.json --output ../cdn-assets/UI
npm run assets:sync
```

## 数据

应用读取 `public/data/characters-regional-specialties.json`。该文件是只读角色目录，用户的规划和冷却记录保存在浏览器 `localStorage` 中。

在工具包目录结构中更新数据：

```bash
npm run data:update
```

指定其他 `genshin-db` 目录：

```bash
npm run data:update -- --root D:/path/to/genshin-db
```

以上参数也可以组合使用：

```bash
npm run data:update -- --root D:/path/to/genshin-db --image-base https://cdn.example.com/UI/
```

## 图片与 CDN

应用当前默认使用以下自建 CDN 作为图片主地址：

```text
https://1835135675.cdn.123clouddisk.com/1835135675/cdn/genshin/UI/
```

角色头像和区域特产图标都支持加载失败后自动回退，加载顺序如下：

1. 用户自建 CDN；
2. `https://gi.yatta.moe/assets/UI/`；
3. 角色已有的米游社或 HoYoWiki 图片地址（仅角色头像）。

需要在单次数据更新中临时指定其他图片基础地址时：

```bash
npm run data:update -- --image-base https://cdn.example.com/UI/
```

也可以通过环境变量 `GENSHIN_IMAGE_BASE` 覆盖默认地址。导出数据会将自定义地址作为主地址，同时保留上述回退地址。

## 本地数据

- 规划只保存角色 ID；
- 每张养成便签只对应一名角色，不需要填写规划名称；
- 新建时可以一次选择多名角色，并批量生成多张独立便签；
- 每张角色便签都会实时显示对应特产的秒级冷却倒计时；
- 冷却以区域特产 ID 全局共享；
- 完成采集后固定冷却 46 小时；
- 应用不会上传用户数据；
- 可以在页面中导出或导入 JSON 备份。

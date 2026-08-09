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

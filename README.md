# 冰块

> **版权声明**：源码开放供学习与个人非商业使用；引用请保留署名与项目地址，禁止复制、二次分发及商用。详见 [LICENSE](LICENSE)。

《光·遇》每日任务与攻略工具，基于 uni-app（Vue 3 + Vite）开发，一套代码覆盖 H5 与微信小程序。按时间段自动切换日间 / 夜间主题和页面背景。非官方项目。

在线演示：https://ethan-72.github.io/sky-guide/

数据接口：

- 任务文字：`https://api.t1qq.com/api/sky/gyrw`
- 攻略图：`https://api.t1qq.com/api/sky/sc/scrw`（返回 `image/png` 二进制流，可直接作为图片地址使用）
- 明日任务：`https://api.qmkjcm.cn/api/gy_mr_rw/`

## 本地运行

环境要求：Node.js 18+、npm 9+。

```bash
npm install
npm run dev:h5      # H5 预览：http://127.0.0.1:5180/
```

项目源码平铺在根目录，而 uni-app CLI 默认读取 `src/`。所有命令通过 `scripts/run-uni.js` 设置 `UNI_INPUT_DIR`，请勿直接执行 `uni build`。

## 构建

```bash
npm run build:h5              # H5
npm run build:mp-weixin       # 微信小程序 → dist/build/mp-weixin
npm run build:app             # App 资源
```

安卓 APK 需通过 HBuilderX 云打包，需登录 DCloud 账号。

## 接口配置

接口基地址由 `VITE_API_BASE` 控制，默认为相对路径 `/api`：

- Vercel：`vercel.json` 中的 rewrites 将 `/api/:path*` 转发至 `https://api.t1qq.com/api/:path*`
- 本地 H5：`vite.config.js` 的 server.proxy 配置相同的转发规则
- GitHub Pages：无反向代理，构建时注入绝对地址 `https://api.t1qq.com/api`（接口支持跨域）

## 部署

### GitHub Pages

项目页地址为 `/sky-guide/` 子路径，基路径与接口地址需特殊处理，已封装为以下两条命令：

```bash
npm run build:h5:pages
GH_TOKEN=gho_xxx npm run publish:pages   # 通过 GitHub API 推送至 gh-pages 分支
```

使用 API 推送是因为部分网络环境下 `github.com:443` 会被拦截（502），而 `api.github.com` 可正常访问。网络条件允许时，也可直接执行 `git push origin HEAD:gh-pages`。首次发布后，请在仓库 Settings → Pages 中确认来源为 `gh-pages` 分支根目录。

### Vercel

导入 `Ethan-72/sky-guide`，`vercel.json` 已配置构建参数，直接部署：

- Build Command：`npm run build:h5`
- Output Directory：`dist/build/h5`

Vercel 环境应使用 `npm run build:h5`，而非 `build:h5:pages`。

## 微信小程序

通过微信开发者工具导入 `dist/build/mp-weixin`。appid 配置于 `manifest.json`，域名校验已关闭（`manifest.json` 与 `project.config.json` 中的 `urlCheck` 均为 `false`）。非该 appid 开发者可使用「测试号」预览。

## 补充说明

- 迁移项目时请勿复制 `node_modules`；保留 `package-lock.json`，在目标环境重新执行 `npm install`。
- 更换 key 需修改 `pages/index/index.vue` 中的 `apiKey` / `scrwKey`。接口返回 403 表示 key 失效，429 表示请求频率过高。

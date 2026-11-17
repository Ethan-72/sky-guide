# 冰块

《光·遇》每日任务与攻略的小工具，uni-app（Vue 3 + Vite）单页应用。日间 / 夜间双主题，背景按清晨、白天、傍晚、夜晚自动切换。非官方产品。

- 文字任务：`https://api.t1qq.com/api/sky/gyrw`
- 攻略图：`https://api.t1qq.com/api/sky/sc/scrw`（返回 `image/png` 二进制流，URL 直接当图片地址用）
- 明日任务：`https://api.qmkjcm.cn/api/gy_mr_rw/`

线上：https://ethan-72.github.io/sky-guide/

## 本地运行

需要 Node.js 18+、npm 9+。

```bash
npm install
npm run dev:h5      # H5 预览 http://127.0.0.1:5180/
```

配置是平铺在根目录的，uni-app CLI 默认读 `src/`，所以所有命令都走 `scripts/run-uni.js` 设置 `UNI_INPUT_DIR`，别直接敲 `uni build`。

## 构建

```bash
npm run build:h5              # H5
npm run build:mp-weixin       # 微信小程序 → dist/build/mp-weixin
npm run build:app             # App 资源
```

安卓 APK 需在 HBuilderX 里云打包，需登录 DCloud 账号。

## 接口地址

接口基地址由 `VITE_API_BASE` 控制，默认是相对路径 `/api`：

- Vercel：`vercel.json` 的 rewrites 把 `/api/:path*` 转到 `https://api.t1qq.com/api/:path*`
- 本地 H5：`vite.config.js` 的 server.proxy 转发明细同上
- GitHub Pages：没有反代，构建时注入绝对地址 `https://api.t1qq.com/api`（接口本身允许跨域）

## 部署

### GitHub Pages

Pages 项目页 URL 带 `/sky-guide/` 子路径，基路径和接口地址要特殊处理，封装成了两条命令：

```bash
npm run build:h5:pages
GH_TOKEN=gho_xxx npm run publish:pages   # 走 GitHub API 推到 gh-pages 分支
```

用 API 是因为有些网络环境下 `github.com:443` 被拦截（502），只有 `api.github.com` 通。网络正常时 `git push origin HEAD:gh-pages` 也行。首次发布后到仓库 Settings → Pages 确认来源为 `gh-pages` 分支根目录。

### Vercel

导入 `Ethan-72/sky-guide`，构建设置 `vercel.json` 已写好，直接 Deploy：

- Build Command：`npm run build:h5`
- Output Directory：`dist/build/h5`

H5 在 Vercel 上用 `npm run build:h5`，不要用 `build:h5:pages`。

## 微信小程序

微信开发者工具导入 `dist/build/mp-weixin`。appid 在 `manifest.json`，域名校验已关闭（`manifest.json`、`project.config.json` 的 `urlCheck` 均为 `false`）。不是该 appid 开发者的话用「测试号」预览。

## 备注

- 拷贝项目到别的机器时别带 `node_modules`，带上 `package-lock.json` 后在新机器 `npm install`。
- 换 key 改 `pages/index/index.vue` 里的 `apiKey` / `scrwKey`；接口报 403 就是 key 失效，429 是请求太频繁。

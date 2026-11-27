# 冰块

> **版权声明**：本项目代码仅公开展示、供浏览参考。未经作者书面许可，不得复制、fork、修改、二次分发或用于任何商业用途。详见 [LICENSE](LICENSE)。

给《光·遇》玩家做的每日任务小工具，网页和小程序都能用。每天要翻的任务、攻略图、季蜡、复刻这些，都塞在一页里了。主题会跟着时间变，早上、白天、傍晚、夜里各有各的背景。跟官方没关系，自己写着玩的。

在线看：https://ethan-72.github.io/sky-guide/

任务数据来自这几个接口：

- 任务文字：`https://api.t1qq.com/api/sky/gyrw`
- 攻略图：`https://api.t1qq.com/api/sky/sc/scrw`（返回的是图片二进制，直接当图片地址用就行）
- 明日任务：`https://api.qmkjcm.cn/api/gy_mr_rw/`

## 本地跑起来

Node.js 18+、npm 9+。

```bash
npm install
npm run dev:h5      # 打开 http://127.0.0.1:5180/
```

有个坑得先说：项目文件是平铺在根目录的，但 uni-app CLI 默认去 `src/` 找，所以命令都走 `scripts/run-uni.js` 来设 `UNI_INPUT_DIR`。别直接敲 `uni build`，会找不到东西。

## 打包

```bash
npm run build:h5              # 网页
npm run build:mp-weixin       # 微信小程序 → dist/build/mp-weixin
npm run build:app             # App 资源
```

安卓 APK 得在 HBuilderX 里云打包，要登 DCloud 账号。

## 接口是怎么走的

地址跟着 `VITE_API_BASE` 走，默认是相对路径 `/api`：

- Vercel：`vercel.json` 里配了 rewrites，把 `/api/:path*` 转到 `https://api.t1qq.com/api/:path*`
- 本地：`vite.config.js` 的 server.proxy 干同样的事
- GitHub Pages：没法反代，构建时直接注入绝对地址 `https://api.t1qq.com/api`（接口本身允许跨域）

## 部署

### GitHub Pages

项目页地址带 `/sky-guide/` 这一层，基路径和接口地址都得特殊处理，所以封了两条命令：

```bash
npm run build:h5:pages
GH_TOKEN=gho_xxx npm run publish:pages   # 走 GitHub API 推到 gh-pages 分支
```

走 API 是因为有些网络环境下 `github.com:443` 会被拦（502），只有 `api.github.com` 通。网络正常的话，直接 `git push origin HEAD:gh-pages` 也行。第一次发完去 Settings → Pages 确认来源是 `gh-pages` 分支根目录。

### Vercel

导入 `Ethan-72/sky-guide`，`vercel.json` 里构建配置写好了，直接 Deploy：

- Build Command：`npm run build:h5`
- Output Directory：`dist/build/h5`

Vercel 上用 `npm run build:h5`，别用 `build:h5:pages`。

## 微信小程序

用微信开发者工具导入 `dist/build/mp-weixin`。appid 写在 `manifest.json` 里，域名校验关了（`manifest.json` 和 `project.config.json` 的 `urlCheck` 都是 `false`）。不是这个 appid 的开发者，就用「测试号」预览。

## 几个提醒

- 拷项目到别的机器别带 `node_modules`，带上 `package-lock.json`，到新机器再 `npm install`。
- 换 key 改 `pages/index/index.vue` 里的 `apiKey` 和 `scrwKey`。接口报 403 就是 key 失效了，429 是请求太频繁。

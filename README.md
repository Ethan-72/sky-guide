# 每日云海 · sky-guide

uni-app（Vue 3 + Vite）单页应用，展示《光·遇》每日任务与当日攻略图，iOS 液态玻璃风格，支持日间 / 夜间双主题。

- 任务文字接口：`https://api.t1qq.com/api/sky/gyrw`
- 攻略图接口：`https://api.t1qq.com/api/sky/sc/scrw`（直接返回 `image/png` 二进制流，URL 本身即图片地址）

## 目录结构

```
sky-guide/
├─ pages/index/index.vue      页面（模板 / 逻辑 / 样式全部在此）
├─ pages/index/index.json     页面配置（导航栏样式）
├─ App.vue                    应用入口
├─ main.js                    Vue 3 挂载入口
├─ manifest.json              应用配置（appid、mp-weixin 设置）
├─ pages.json                 路由与窗口配置
├─ uni.scss                   全局样式变量
├─ index.html                 H5 模板
├─ vite.config.js             构建配置（已内置 UNI_INPUT_DIR，见下）
├─ package.json / package-lock.json
└─ dist/                      构建产物
   └─ build/mp-weixin/        微信小程序包（开发者工具导入此目录）
```

## 环境要求

- Node.js 18+（实测 Node 24.12 正常）
- npm 9+

## 安装与构建

```bash
npm install                 # 首次或依赖损坏时执行
npm run build:mp-weixin     # 构建微信小程序 -> dist/build/mp-weixin
npm run dev:h5              # 本地 H5 预览 http://127.0.0.1:5180/
npm run build:h5            # 构建 H5
```

> **关于 `UNI_INPUT_DIR`**：本项目是平铺结构（`manifest.json`、`pages.json` 直接在根目录），而 uni-app CLI 默认只从 `src/` 读取配置，会报
> `ENOENT: no such file or directory, open '...\src\manifest.json'`。
> 现在由 `scripts/run-uni.js` 统一设置该环境变量后再启动 CLI，跨平台通用（Windows / macOS / Linux 一致），
> 所以直接 `npm run xxx` 即可，**不要直接敲 `uni build`**。

## 接口与代理

前端所有请求都走相对路径 `/api`，不再出现 `https://api.t1qq.com` 绝对域名：

| 环境 | 转发方式 |
|---|---|
| 本地 `npm run dev:h5` | `vite.config.js > server.proxy` 转发到 `https://api.t1qq.com` |
| 线上 Vercel | `vercel.json > rewrites` 把 `/api/:path*` 转发到 `https://api.t1qq.com/api/:path*` |

好处：不触发跨域、换域名只改一处、代码里没有硬编码域名。

## 部署到 Vercel（H5）

1. 推到 GitHub 仓库
2. Vercel → Add New → Project → Import 该仓库
3. 构建设置（`vercel.json` 已写好，Vercel 会自动读取，无需手填）：
   - Build Command：`npm run build:h5`
   - Output Directory：`dist/build/h5`
4. Deploy 完成后，`https://xxx.vercel.app` 即为线上地址

> 注意：构建脚本必须能在 Linux 运行。本项目已把原来的 `set UNI_INPUT_DIR=%CD%&&` 替换为
> `node scripts/run-uni.js`，否则 Vercel 上会因 `set: command not found` 构建失败。


## 微信小程序

1. 打开微信开发者工具 → 导入项目，目录选 `sky-guide/dist/build/mp-weixin`
2. appid 已配置为 `wx7243fa4fefb1bf34`（`manifest.json > mp-weixin.appid`）
3. 域名校验已关闭：
   - `manifest.json > mp-weixin.setting.urlCheck = false`
   - `project.config.json > setting.urlCheck = false`
   - `project.private.config.json > setting.urlCheck = false`
   三处均需为 `false`，因为开发者工具的 private 配置优先级最高，会覆盖前两者。
4. 若同一微信号不是该 appid 的开发者，可在工具里改用「测试号」预览。

## 安卓 APK

`npm run build:app` 只产出 App 资源，不生成安装包。真正出 APK 需在 HBuilderX 中**云打包**，要求登录 DCloud 账号（需本人操作，无法代登）。

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `'uni' 不是内部或外部命令` | `node_modules` 不完整（`.bin` 缺失） | 删除 `node_modules` 后重新 `npm install` |
| `ENOENT ... src\manifest.json` | 未设置 `UNI_INPUT_DIR` | 使用 `npm run build:h5`（脚本已内置），不要直接敲 `uni build` |
| Vercel 构建报 `set: command not found` | 旧脚本用了 Windows cmd 语法 | 已改为 `node scripts/run-uni.js`，拉最新代码即可 |
| 线上页面能开但没数据 | `vercel.json` 未生效 / 接口地址仍是绝对域名 | 确认 `vercel.json` 已提交，且代码里是 `/api/...` |
| 开发者工具里接口被拦截 | `project.private.config.json` 的 `urlCheck` 覆盖 | 改为 `false`，或用测试号 |
| 长图不显示 | 接口偶发失败 / 无网络 | 页面已有「重新加载」按钮，点击重试 |

## 分发须知

拷贝项目到 U 盘 / 其它电脑时，**不要拷 `node_modules`**：跨盘复制会丢 `.bin` 目录和部分 `package.json`，导致构建直接失败。正确做法是带上 `package-lock.json`，在目标机器执行 `npm install`。

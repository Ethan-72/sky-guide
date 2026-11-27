# Sky Guide

**English** | [简体中文](./README.zh-CN.md)

> **License notice**: The source is open for study and personal, non-commercial use. Attribution and a link to this repository are required when referencing it. Copying, redistributing, or commercial use is not permitted. See [LICENSE](LICENSE) for details.

An unofficial daily-quest and guide companion for *Sky: Children of the Light*, built with uni-app (Vue 3 + Vite) from a single codebase that targets both the web and WeChat Mini Program. The UI switches between day and night themes, along with page backgrounds, based on the time of day.

Live demo: https://ethan-72.github.io/sky-guide/

Data sources:

- Quest text: `https://api.t1qq.com/api/sky/gyrw`
- Guide images: `https://api.t1qq.com/api/sky/sc/scrw` (returns `image/png` binary, usable directly as an image URL)
- Tomorrow's quests: `https://api.qmkjcm.cn/api/gy_mr_rw/`

## Requirements

Node.js 18+ and npm 9+.

## Local development

```bash
npm install
npm run dev:h5      # H5 preview: http://127.0.0.1:5180/
```

The source files live in the repository root, while the uni-app CLI expects them under `src/`. Every script sets `UNI_INPUT_DIR` through `scripts/run-uni.js`, so run the npm scripts rather than calling `uni build` directly.

## Building

```bash
npm run build:h5              # Web
npm run build:mp-weixin       # WeChat Mini Program → dist/build/mp-weixin
npm run build:app             # App resources
```

Android APK builds require HBuilderX cloud packaging and a DCloud account.

## API configuration

The API base URL is controlled by `VITE_API_BASE` and defaults to the relative path `/api`:

- Vercel: `vercel.json` rewrites `/api/:path*` to `https://api.t1qq.com/api/:path*`
- Local H5: the same rule is configured in `server.proxy` in `vite.config.js`
- GitHub Pages: there is no reverse proxy, so the absolute address `https://api.t1qq.com/api` is injected at build time (the API supports cross-origin requests)

## Deployment

### GitHub Pages

The project page is served from the `/sky-guide/` sub-path, so the base path and API address need special handling. Both are wrapped in the following commands:

```bash
npm run build:h5:pages
GH_TOKEN=gho_xxx npm run publish:pages   # push to gh-pages through the GitHub API
```

The API-based publish exists because `github.com:443` is blocked in some network environments (502) while `api.github.com` remains reachable. Where the network allows it, `git push origin HEAD:gh-pages` works as well. After the first deployment, confirm under Settings → Pages that the source is the root of the `gh-pages` branch.

### Vercel

Import `Ethan-72/sky-guide`. `vercel.json` already contains the build settings:

- Build Command: `npm run build:h5`
- Output Directory: `dist/build/h5`

Use `npm run build:h5` on Vercel rather than `build:h5:pages`.

## WeChat Mini Program

Import `dist/build/mp-weixin` in WeChat DevTools. The appid is set in `manifest.json`, and domain checking is disabled (`urlCheck` is `false` in both `manifest.json` and `project.config.json`). Developers without access to that appid can preview with a test account.

## Notes

- When migrating the project, leave `node_modules` behind. Keep `package-lock.json` and run `npm install` in the target environment.
- To change the API keys, edit `apiKey` and `scrwKey` in `pages/index/index.vue`. A 403 response means the key has expired; 429 means the request rate is too high.

import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import uni from '@dcloudio/vite-plugin-uni';

// 本项目采用平铺结构（manifest.json / pages.json 位于根目录），
// 而 uni-app CLI 默认从 src/ 读取配置，这里显式指定输入目录，
// 这样直接执行 npm run build:mp-weixin 即可，无需额外设置环境变量。
const rootDir = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.UNI_INPUT_DIR) {
	process.env.UNI_INPUT_DIR = rootDir;
}

export default defineConfig({
	// 部署基路径：
	//  · Vercel / 自定义域名 → 根路径 '/'（默认）
	//  · GitHub Pages 项目页 → '/sky-guide/'（由 H5_BASE 环境变量注入）
	base: process.env.H5_BASE || '/',
	plugins: [uni()],
	build: {
		// 关键：默认 cssTarget 是 esnext，esbuild 会认为 -webkit-backdrop-filter 多余而删掉，
		// 导致 iOS 16 及更早的 Safari 完全没有毛玻璃效果（液态玻璃的灵魂就没了）。
		// 显式声明目标浏览器，让前缀保留下来。
		cssTarget: ['safari13', 'ios13', 'chrome87', 'edge88', 'firefox78']
	},
	server: {
		host: '127.0.0.1',
		port: 5180,
		// 本地开发代理：把 /api/* 转发到真实接口，线上由 vercel.json 的 rewrites 承担同样职责。
		// 这样接口地址在前后端都是相对路径 /api，本地和线上行为一致，也不会触发跨域。
		proxy: {
			'/api': {
				target: 'https://api.t1qq.com',
				changeOrigin: true,
				secure: true
			}
		}
	}
});

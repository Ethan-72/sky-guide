/**
 * 跨平台 uni-app 构建入口
 * ------------------------------------------------------------------
 * 本项目是「平铺结构」：manifest.json / pages.json 直接放在项目根目录，
 * 而 uni-app CLI 默认只认 src/ 目录，因此必须设置 UNI_INPUT_DIR。
 *
 * 但有两个坑：
 *  1. uni CLI 在加载 vite.config.js 之前就读 UNI_INPUT_DIR，
 *     所以不能只靠 vite.config.js 里赋值；
 *  2. 原来的 "set UNI_INPUT_DIR=%CD%&& uni build" 是 Windows cmd 语法，
 *     在 Vercel / GitHub Actions 等 Linux 环境下会直接报错。
 *
 * 这个脚本用 Node 设置环境变量，Windows / macOS / Linux 全平台一致。
 * 用法：
 *   node scripts/run-uni.js build             # 等同 uni build（H5）
 *   node scripts/run-uni.js build -p mp-weixin
 *   node scripts/run-uni.js dev
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

// 关键：CLI 启动前就把输入目录指到项目根
process.env.UNI_INPUT_DIR = projectRoot;

const cliBin = require.resolve('@dcloudio/vite-plugin-uni/bin/uni.js', {
	paths: [projectRoot]
});

const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [cliBin, ...args], {
	stdio: 'inherit',
	cwd: projectRoot,
	env: process.env
});

if (result.error) {
	console.error('[run-uni] 启动 uni CLI 失败：', result.error.message);
	process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);

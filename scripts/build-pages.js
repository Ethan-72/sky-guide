/**
 * GitHub Pages 专用构建
 * ------------------------------------------------------------------
 * Pages 项目页的地址是 https://<user>.github.io/<repo>/，因此：
 *   · 资源基路径必须是 '/sky-guide/'，否则 /assets/... 会 404
 *   · Pages 没有反向代理，接口必须走绝对地址（该接口返回 Access-Control-Allow-Origin: *）
 *
 * 这些变量在 Node 里设置，避免 Git Bash 把 '/sky-guide/' 误当成路径转换。
 */
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

/* .env 由 vite 自行读取，这里显式兜底一层：CI 或纯 Node 调用时行为一致 */
function loadDotEnv() {
	const file = path.join(projectRoot, '.env');
	if (!fs.existsSync(file)) return;
	for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
		if (!line || line.trim().startsWith('#')) continue;
		const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (!m || process.env[m[1]]) continue;
		process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
	}
}
loadDotEnv();

if (!process.env.VITE_API_KEY) {
	console.warn('[build-pages] 未检测到 VITE_API_KEY，线上接口会因缺少密钥失败：请把 .env.example 复制为 .env 并填入密钥。');
}

process.env.H5_BASE = '/sky-guide/';
process.env.VITE_API_BASE = process.env.VITE_API_BASE || 'https://api.t1qq.com/api';

const result = spawnSync(process.execPath, [path.join(__dirname, 'run-uni.js'), 'build'], {
	stdio: 'inherit',
	cwd: projectRoot,
	env: process.env
});

process.exit(result.status === null ? 1 : result.status);

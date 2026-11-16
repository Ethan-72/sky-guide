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
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

process.env.H5_BASE = '/sky-guide/';
process.env.VITE_API_BASE = 'https://api.t1qq.com/api';

const result = spawnSync(process.execPath, [path.join(__dirname, 'run-uni.js'), 'build'], {
	stdio: 'inherit',
	cwd: projectRoot,
	env: process.env
});

process.exit(result.status === null ? 1 : result.status);

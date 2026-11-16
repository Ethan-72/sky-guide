/**
 * 发布到 GitHub Pages
 * ------------------------------------------------------------------
 * 背景：本机出口代理只放行 api.github.com，github.com:443 的 git 传输会被 502 拦截，
 * 所以不能用 git push，改用 GitHub Git Data API 逐个写 blob → tree → commit → ref。
 *
 * 用法：
 *   set GH_TOKEN=gho_xxx        (Windows cmd)
 *   export GH_TOKEN=gho_xxx     (bash)
 *   npm run publish:pages
 *
 * 前置：先 npm run build:h5:pages 生成 dist/build/h5
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOKEN = process.env.GH_TOKEN;
const OWNER = process.env.GH_OWNER || 'Ethan-72';
const REPO = process.env.GH_REPO || 'sky-guide';
const BRANCH = process.env.GH_BRANCH || 'gh-pages';
const DIST = path.resolve(__dirname, '..', 'dist', 'build', 'h5');

if (!TOKEN) {
	console.error('缺少 GH_TOKEN 环境变量');
	process.exit(1);
}
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
	console.error('未找到构建产物，请先执行 npm run build:h5:pages');
	process.exit(1);
}

const BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;

function api(method, url, body) {
	const args = [
		'-s', '-m', '90', '-X', method,
		'-H', `Authorization: Bearer ${TOKEN}`,
		'-H', 'Accept: application/vnd.github+json',
		'-H', 'X-GitHub-Api-Version: 2022-11-28',
		url
	];
	let input;
	if (body) {
		args.push('-H', 'Content-Type: application/json', '--data-binary', '@-');
		input = JSON.stringify(body);
	}
	const out = execFileSync('curl', args, {
		input: input === undefined ? '' : input,
		maxBuffer: 64 * 1024 * 1024
	}).toString();
	if (!out.trim()) return {};
	return JSON.parse(out);
}

function walk(dir, base = '') {
	const out = [];
	for (const name of fs.readdirSync(dir)) {
		const full = path.join(dir, name);
		const rel = base ? `${base}/${name}` : name;
		if (fs.statSync(full).isDirectory()) out.push(...walk(full, rel));
		else out.push({ rel, full });
	}
	return out;
}

(async () => {
	const files = walk(DIST);
	console.log(`产物文件: ${files.length}`);

	const items = [];
	for (const f of files) {
		const buf = fs.readFileSync(f.full);
		const blob = api('POST', `${BASE}/git/blobs`, buf.includes(0)
			? { content: buf.toString('base64'), encoding: 'base64' }
			: { content: buf.toString('utf8'), encoding: 'utf-8' });
		if (!blob.sha) throw new Error(`blob 失败 ${f.rel}`);
		items.push({ path: f.rel, mode: '100644', type: 'blob', sha: blob.sha });
		console.log('  ' + f.rel);
	}

	const tree = api('POST', `${BASE}/git/trees`, { tree: items });
	const ref = api('GET', `${BASE}/git/ref/heads/${BRANCH}`);
	const parent = ref && ref.object ? ref.object.sha : null;

	const commit = api('POST', `${BASE}/git/commits`, {
		message: `deploy: H5 ${new Date().toISOString()}`,
		tree: tree.sha,
		parents: parent ? [parent] : []
	});

	const res = parent
		? api('PATCH', `${BASE}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: true })
		: api('POST', `${BASE}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: commit.sha });

	console.log('commit:', commit.sha);
	console.log('ref:', res.ref || JSON.stringify(res).slice(0, 200));
	console.log(`访问地址: https://${OWNER.toLowerCase()}.github.io/${REPO}/`);
})().catch(e => {
	console.error('FAILED:', e.message);
	process.exit(1);
});

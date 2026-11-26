/**
 * 把 static/data/*.json 快照同步到 gh-pages 分支。
 *
 * 背景：GitHub Pages 的发布源是 gh-pages 分支，而每日快照由 Actions 写到 main。
 * 若不同步，线上读到的永远是最后一次全量部署时的旧快照。
 * 这里只更新这几个文件，不触发全量构建。
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const OWNER = process.env.GH_OWNER || 'Ethan-72';
const REPO = process.env.GH_REPO || 'sky-guide';
const BRANCH = process.env.GH_BRANCH || 'gh-pages';
const FILES = ['static/data/schedule.json', 'static/data/fuxian.json'];

if (!TOKEN) {
	console.error('缺少 GH_TOKEN / GITHUB_TOKEN 环境变量');
	process.exit(1);
}

function api(method, url, body) {
	const args = [
		'-s', '-m', '90', '-X', method,
		'-H', `Authorization: Bearer ${TOKEN}`,
		'-H', 'Accept: application/vnd.github+json',
		'-H', 'X-GitHub-Api-Version: 2022-11-28',
		url
	];
	let input = '';
	if (body) {
		args.push('-H', 'Content-Type: application/json', '--data-binary', '@-');
		input = JSON.stringify(body);
	}
	const out = execFileSync('curl', args, { input, maxBuffer: 32 * 1024 * 1024 }).toString();
	if (!out.trim()) return {};
	return JSON.parse(out);
}

(async () => {
	for (const FILE of FILES) {
		const src = path.resolve(__dirname, '..', FILE);
		if (!fs.existsSync(src)) {
			console.log('[pages] 跳过 ' + FILE + '（未生成）');
			continue;
		}
		const buf = fs.readFileSync(src);
		const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
		let sha = '';

		try {
			const cur = api('GET', `${url}?ref=${BRANCH}`);
			if (cur && cur.sha) {
				sha = cur.sha;
				if (Buffer.from(cur.content || '', 'base64').equals(buf)) {
					console.log('[pages] ' + FILE + ' 无变化，跳过');
					continue;
				}
			}
		} catch (e) {
			// 目标文件不存在，按新建处理
		}

		const payload = {
			message: 'chore: 同步每日快照到 Pages',
			content: buf.toString('base64'),
			branch: BRANCH
		};
		if (sha) payload.sha = sha;

		const out = api('PUT', url, payload);
		if (!out || !out.commit || !out.commit.sha) {
			throw new Error('写入 gh-pages 失败：' + JSON.stringify(out).slice(0, 200));
		}
		console.log('[pages] 已同步 ' + FILE + ' 到 ' + BRANCH + '：' + out.commit.sha);
	}
})().catch(e => {
	console.error('[pages] FAILED: ' + e.message);
	process.exit(1);
});

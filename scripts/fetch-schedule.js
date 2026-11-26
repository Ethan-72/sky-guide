/**
 * 抓取「活动日历/日程」文字，写成静态快照供前端读取。
 *
 * 来源：倾慕免费公益 API https://api.qmkjcm.cn/gyapi/rwt/rl/
 * 该接口没有 access-control-allow-origin 头，浏览器 fetch 会被 CORS 拦截，
 * 所以由 GitHub Actions 定时抓成 static/data/schedule.json。
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const API = 'https://api.qmkjcm.cn/gyapi/rwt/rl/';
const OUT = path.join(__dirname, '..', 'static', 'data', 'schedule.json');

function get(url) {
	return new Promise((resolve, reject) => {
		https
			.get(url, res => {
				let buf = '';
				res.setEncoding('utf8');
				res.on('data', chunk => (buf += chunk));
				res.on('end', () => resolve({ status: res.statusCode, body: buf }));
			})
			.on('error', reject);
	});
}

async function main() {
	let payload;
	try {
		const res = await get(API);
		if (res.status !== 200) throw new Error('HTTP ' + res.status);
		payload = JSON.parse(res.body);
	} catch (e) {
		console.error('[schedule] 抓取失败：' + e.message);
		process.exit(1);
	}

	const text = String((payload && payload.text) || '');
	// 没拿到家具行就别写仓库，避免把异常数据当成正常快照
	if (!payload || payload.code !== 200 || !/本周家具/.test(text)) {
		console.error('[schedule] 数据异常：code=' + (payload && payload.code) + '，缺少「本周家具」');
		process.exit(1);
	}

	const snapshot = {
		date: String(payload.date || ''),
		status: String(payload.status || ''),
		text,
		image: String(payload.image || ''),
		tcurl: String(payload.tcurl || ''),
		update_time: String(payload.update_time || '')
	};

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
	console.log('[schedule] 已写入 ' + path.relative(process.cwd(), OUT) + '：' + snapshot.date + ' ' + snapshot.update_time);
}

main();

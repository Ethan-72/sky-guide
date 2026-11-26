/**
 * 抓取「复刻先祖」文字与图片，写成静态快照供前端读取。
 *
 * 来源：倾慕 https://api.qmkjcm.cn/gyapi/text/ 与 /gyapi/rwt/
 * t1qq 的 /sky/sc/scfk 与倾慕 /gyapi/rwt/fx 的结构化字段都滞后，
 * 只有当天的 text_detail.fx 与按日期索引的微博原图是准的。
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const API_TEXT = 'https://api.qmkjcm.cn/gyapi/text/';
const API_RWT = 'https://api.qmkjcm.cn/gyapi/rwt/';
const OUT = path.join(__dirname, '..', 'static', 'data', 'fuxian.json');

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
	let textData, rwtData;
	try {
		const [a, b] = await Promise.all([get(API_TEXT), get(API_RWT)]);
		if (a.status !== 200 || b.status !== 200) throw new Error('HTTP ' + a.status + '/' + b.status);
		textData = JSON.parse(a.body);
		rwtData = JSON.parse(b.body);
	} catch (e) {
		console.error('[fuxian] 抓取失败：' + e.message);
		process.exit(1);
	}

	if (!textData || textData.code !== 200 || !textData.text_detail) {
		console.error('[fuxian] text 接口数据异常');
		process.exit(1);
	}

	const fx = textData.text_detail.fx || {};
	let detail = String(fx.detail_text || '').trim();

	// 摘要里的「先祖复刻」段（常规复刻）常被截断，但开头仍含先祖名与时间，
	// 存在时拼到正文前面，避免只显示集体复刻。
	const summary = String(textData.summary || '');
	const m = summary.match(/=『先祖复刻』=([\s\S]*?)(?:\n\n|=『|$)/);
	const regular = m ? m[1].replace(/\.\.\.全文.*$/, '').replace(/可兑换:\s*$/, '').trim() : '';
	if (regular && detail.indexOf(regular) === -1) detail = '=『先祖复刻』=\n' + regular + '\n\n' + detail;

	const hasRevival = !!fx.available && !!detail;

	// 图片：优先用 text_detail.fx 里的，其次用 rwt 分类里的 fx 图
	let image = String(fx.image_url || '');
	if (!image && rwtData && rwtData.type_detail && rwtData.type_detail.fx && rwtData.type_detail.fx.image) {
		image = String(rwtData.type_detail.fx.image.url || '');
	}

	if (!hasRevival || !image) {
		console.error('[fuxian] 无有效复刻数据（available=' + fx.available + '，image=' + (image || '空') + '）');
		process.exit(1);
	}

	const snapshot = {
		date: String(textData.date || ''),
		available: hasRevival,
		text: detail,
		image: image,
		update_time: new Date().toISOString()
	};

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
	console.log('[fuxian] 已写入 ' + path.relative(process.cwd(), OUT) + '：' + snapshot.date + ' ' + image);
}

main();

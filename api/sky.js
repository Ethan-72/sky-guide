/**
 * 光遇数据接口层
 * ------------------------------------------------------------------
 * 所有 uni.request 集中在这里，页面只处理业务状态。
 *  · 密钥不再写死：由构建时注入的 VITE_API_KEY 提供（见 .env.example、scripts/build-pages.js）
 *  · 内置串行队列：任意时刻只有一个请求在飞，且相邻请求间隔 >= REQUEST_GAP，
 *    避免首屏并发把接口打到 429
 */

/* 有代理时走 /api，纯静态托管构建时注入绝对地址 */
export const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api';

/** 第三方接口密钥：构建期注入，源码与仓库中不再出现明文 */
const API_KEY = String((import.meta.env && import.meta.env.VITE_API_KEY) || '').trim();

/** 明日任务接口：固定绝对地址，不参与 /api 代理（CORS: *） */
export const MR_API = 'https://api.qmkjcm.cn/api/gy_mr_rw/';

/* 各接口地址 */
export const URLS = {
	tasks: API_BASE + '/sky/gyrw',
	poster: API_BASE + '/sky/sc/scrw',
	jl: API_BASE + '/sky/sc/lzwz'
};

/* 攻略图 / 攻略文字接口 */
export const GUIDE_API = {
	jl: { img: API_BASE + '/sky/sc/scjl', text: API_BASE + '/sky/sc/lzwz' },
	hs: { json: API_BASE + '/sky/gytq' },
	fk: { img: API_BASE + '/sky/sc/scfk' },
	mf: { img: API_BASE + '/sky/mf/magic', text: API_BASE + '/sky/mf/mf' }
};

/** 给地址补上 key 参数 */
export function withKey(url) {
	return url + (url.indexOf('?') > -1 ? '&' : '?') + 'key=' + API_KEY;
}

/* ==========================================================
   串行请求队列：控速防限流
   ========================================================== */
const REQUEST_GAP = 600; // 相邻请求最小间隔（ms）
let chain = Promise.resolve();
let lastAt = 0;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 把一次请求排进队列：真正执行时若距上次请求不足 REQUEST_GAP 会先等待。
 * @param {Function} task 返回 Promise 的工厂函数
 */
export function enqueue(task) {
	const run = chain.then(async () => {
		const wait = REQUEST_GAP - (Date.now() - lastAt);
		if (wait > 0) await sleep(wait);
		lastAt = Date.now();
		return task();
	});
	// 队列本身不因单次失败中断
	chain = run.then(() => undefined, () => undefined);
	return run;
}

/** 单次 uni.request 的 Promise 包装，永不 reject */
function request(opts) {
	return new Promise(resolve => {
		uni.request(
			Object.assign({}, opts, {
				success: res => resolve({ ok: true, res }),
				fail: err => resolve({ ok: false, err })
			})
		);
	});
}

/* ==========================================================
   通用解析工具
   ========================================================== */

/** 接口偶尔返回 text/json，统一解析一次 */
export function safeJson(data) {
	if (!data) return null;
	if (typeof data === 'object' && !(data instanceof ArrayBuffer)) return data;
	if (typeof data === 'string') {
		try {
			return JSON.parse(data);
		} catch (e) {
			return null;
		}
	}
	return null;
}

/** 清理任务文本里的 #r 等控制符和多余空白 */
export function cleanTaskText(text) {
	return String(text || '')
		.replace(/#[a-zA-Z]/g, '')
		.replace(/[\r\n]+/g, ' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** 季蜡位置格式化：lzwz 返回「雨林1」→「雨林（图1）」 */
export function formatJl(raw) {
	if (!raw) return '';
	const m = /^(.+?)(\d+)$/.exec(raw);
	if (m) return m[1].trim() + '（图' + m[2] + '）';
	return raw;
}

/** 根据接口返回的 code / msg 生成更准确的错误提示 */
export function apiErrMsg(body) {
	const code = body && body.code;
	const msg = String((body && body.msg) || '');
	if (code === 403 || /密钥|key/i.test(msg)) return '接口密钥失效，需更新 key';
	if (code === 429 || /频率|频繁/.test(msg)) return '请求太频繁，请稍后再试';
	return '数据格式异常';
}

/** 从任意 JSON 结构中取出第一个 http(s) 图片地址 */
export function pickImageUrl(body) {
	if (!body) return '';
	if (typeof body === 'string') {
		return /^https?:\/\//.test(body) ? body : '';
	}
	if (typeof body !== 'object') return '';

	const keys = ['img', 'pic', 'image', 'imgUrl', 'imgurl', 'pimg', 'url', 'data', 'result'];
	for (let i = 0; i < keys.length; i++) {
		const v = body[keys[i]];
		if (typeof v === 'string' && /^https?:\/\//.test(v)) return v;
		if (v && typeof v === 'object') {
			const inner = pickImageUrl(v);
			if (inner) return inner;
		}
	}
	return '';
}

/* ==========================================================
   业务接口
   ========================================================== */

/**
 * 今日任务文字
 * → { ok, tasks, reason }
 */
export async function fetchTasks() {
	const r = await enqueue(() =>
		request({
			url: URLS.tasks,
			method: 'GET',
			data: { key: API_KEY },
			timeout: 10000
		})
	);
	if (!r.ok) return { ok: false, reason: '网络异常' };

	const body = safeJson(r.res.data);
	const rw = body && body.rw;
	if (!Array.isArray(rw) || !rw.length) {
		return { ok: false, reason: apiErrMsg(body) };
	}

	// ① 抹掉 #r 等格式控制符 ② 第 5 项「今日季节蜡烛所在地图」改到标题下方单独展示
	const tasks = rw
		.map((item, i) => ({
			id: i + 1,
			text: cleanTaskText(item.text),
			from: item.type || '每日任务'
		}))
		.filter(t => !/季节蜡烛|季蜡/.test(t.text));

	return { ok: true, tasks };
}

/**
 * 今日攻略长图：scrw 返回 image/png 流，URL 本身即图片地址；兼容将来改返回 JSON
 * → { ok, url }
 */
export async function fetchPosterUrl() {
	const url = withKey(URLS.poster);
	const r = await enqueue(() =>
		request({
			url,
			method: 'GET',
			responseType: 'arraybuffer', // 返回二进制图片，避免被当文本解析
			timeout: 20000
		})
	);
	if (!r.ok) return { ok: false };

	const header = r.res.header || {};
	const ct = header['content-type'] || header['Content-Type'] || '';
	if (ct.indexOf('image') > -1) return { ok: true, url };

	const real = pickImageUrl(safeJson(r.res.data) || r.res.data);
	return real ? { ok: true, url: real } : { ok: false };
}

/**
 * 明日任务：接口一次返回今天+明天，按日期分组后交给页面
 * → { ok, grouped }
 */
export async function fetchTomorrow() {
	const r = await enqueue(() => request({ url: MR_API, method: 'GET', timeout: 12000 }));
	if (!r.ok) return { ok: false };

	const body = safeJson(r.res.data);
	const list = body && body.data && body.data.task_list;
	if (!Array.isArray(list) || !list.length) return { ok: false };

	const grouped = {};
	list.forEach(item => {
		if (!item || !item.date || !item.quest_cn) return;
		(grouped[item.date] = grouped[item.date] || []).push({
			text: cleanTaskText(item.quest_cn),
			from: ''
		});
	});
	return { ok: true, grouped };
}

/**
 * 今日季蜡位置
 * → { ok, text }
 */
export async function fetchJinLa() {
	const r = await enqueue(() =>
		request({
			url: URLS.jl,
			method: 'GET',
			data: { key: API_KEY, type: 'json' },
			timeout: 10000
		})
	);
	if (!r.ok) return { ok: false };

	const body = safeJson(r.res.data) || {};
	const raw = body.jlwz && body.jlwz.text ? String(body.jlwz.text).trim() : '';
	return raw ? { ok: true, text: formatJl(raw) } : { ok: false };
}

/**
 * 红石天气：{ data: [jpg, gif] }，gif 是点赞贴纸，必须过滤
 * → { ok, image, empty }
 */
export async function fetchGuideJson(url) {
	const r = await enqueue(() =>
		request({ url, method: 'GET', data: { key: API_KEY }, timeout: 12000 })
	);
	if (!r.ok) return { ok: false, reason: '网络异常，请重试' };

	const body = safeJson(r.res.data) || {};
	const list = Array.isArray(body.data) ? body.data : [];
	const all = list.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u));
	// 优先 jpg/png/webp；只剩 gif 说明当天只返回了表情贴纸
	const usable = all.filter(u => !/\.gif(\?|$)/i.test(u));

	if (usable.length) return { ok: true, image: usable[0] };
	if (all.length) return { ok: false, empty: true, reason: '接口只返回了贴纸图' };
	return { ok: false, reason: '接口返回内容为空' };
}

/**
 * 攻略卡片副标题：文字接口只有几百字节，先拿到就能显示「雨林1」「烟花魔法」
 * → { jl, dl, magic }
 */
export async function fetchGuideTexts() {
	const out = { jl: '', dl: '', magic: '' };

	const a = await enqueue(() =>
		request({ url: GUIDE_API.jl.text, method: 'GET', data: { key: API_KEY }, timeout: 10000 })
	);
	if (a.ok) {
		const b = safeJson(a.res.data) || {};
		out.jl = b.jlwz && b.jlwz.text ? b.jlwz.text : '';
		out.dl = b.dlwz && b.dlwz.text ? b.dlwz.text : '';
	}

	const c = await enqueue(() =>
		request({ url: GUIDE_API.mf.text, method: 'GET', data: { key: API_KEY }, timeout: 10000 })
	);
	if (c.ok) {
		const b = safeJson(c.res.data) || {};
		out.magic = b.magic && b.magic[0] && b.magic[0].text ? b.magic[0].text : '';
	}

	return out;
}

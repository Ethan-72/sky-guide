/**
 * 攻略图切割与红石降落时间配置
 * ------------------------------------------------------------------
 * 四宫格的切割比例原本写死在 computed 里，换一张版式不同的攻略图就得改代码。
 * 统一收到这里：改比例只动 SHOT_RECTS_*，页面逻辑不用碰。
 */

/** 宽高比 >= 这个值按「横版四宫格」处理，否则按「竖版长条」处理 */
export const POSTER_LANDSCAPE_RATIO = 1.15;

/** 攻略图原始尺寸缺失时的兜底值（只影响比例判断与预览兜底，不影响真实切割） */
export const FALLBACK_POSTER_W = 1200;
export const FALLBACK_POSTER_H = 750;

/**
 * 横版四宫格：1 左上 / 2 右上 / 3 左下 / 4 右下（顶部是标题带，先让开）
 * 数值是相对整张图的 { cx, cy, cw, ch }
 */
export const SHOT_RECTS_LANDSCAPE = [
	{ cx: 0.02, cy: 0.152, cw: 0.475, ch: 0.402 },
	{ cx: 0.505, cy: 0.152, cw: 0.475, ch: 0.402 },
	{ cx: 0.02, cy: 0.556, cw: 0.475, ch: 0.412 },
	{ cx: 0.505, cy: 0.556, cw: 0.475, ch: 0.412 }
];

/** 竖版长图：四条自上而下，等距排布 */
export const SHOT_RECTS_PORTRAIT = [0, 1, 2, 3].map(i => ({
	cx: 0.02,
	cy: 0.02 + i * 0.245,
	cw: 0.96,
	ch: 0.235
}));

/** 长图里最多能切几格 */
export const SHOT_COUNT = 4;

/**
 * 按原图宽高返回四格切割矩形
 * @param {number} w 原图宽
 * @param {number} h 原图高
 */
export function getShotRects(w, h) {
	const W = w || FALLBACK_POSTER_W;
	const H = h || FALLBACK_POSTER_H;
	return W / H >= POSTER_LANDSCAPE_RATIO ? SHOT_RECTS_LANDSCAPE : SHOT_RECTS_PORTRAIT;
}

/**
 * 红石 / 黑石降落时间表（按星期几）
 * 本地推算：1-15 号周二黑石、周六周日红石；16 号起周三黑石、周五周日红石。
 */
export const HS_DROP_TABLE = {
	0: ['07:08-08:00', '13:08-14:00', '19:08-20:00'],
	1: ['07:08-08:00', '13:08-14:00', '19:08-20:00'],
	2: ['09:08-10:00', '14:08-15:00', '19:08-20:00'],
	3: ['09:08-10:00', '15:08-16:00', '21:08-22:00'],
	4: ['10:08-11:00', '16:08-17:00', '22:08-23:00'],
	5: ['11:08-12:00', '17:08-18:00', '23:08-24:00'],
	6: ['10:08-11:00', '14:08-15:00', '22:08-23:00']
};

/**
 * 计算某天的红石/黑石降落时间，纯本地不发请求
 * @param {Date} date
 * @returns {{ type: string, slots: string[], line: string }}
 */
export function getHsDrop(date) {
	const d = date || new Date();
	const day = d.getDate();
	const wd = d.getDay(); // 0 = 周日
	let type = '';

	if (day <= 15) {
		if (wd === 2) type = '黑石';
		else if (wd === 6 || wd === 0) type = '红石';
	} else {
		if (wd === 3) type = '黑石';
		else if (wd === 5 || wd === 0) type = '红石';
	}

	const slots = type ? HS_DROP_TABLE[wd] || [] : [];
	return { type, slots, line: slots.join(' / ') };
}

/**
 * 分享图排版与绘制
 * ------------------------------------------------------------------
 * 从 pages/index/index.vue 抽出，只做「算尺寸 + 画」两件事，不依赖组件实例。
 */

const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

/** 画布与排版的固定尺寸 */
export const LAYOUT = {
	W: 600,
	PAD: 26,
	TEXT_W: 600 - 26 * 2 - 46, // 去掉左右内边距与序号徽章后的文字宽度
	LINE_H: 30,
	ROW_GAP: 20,
	HEAD_H: 150,
	FOOT_H: 36,
	TAIL_H: 60,
	JL_H: 44
};

/**
 * 量出每条任务要占几行，顺便把画布总高、日期文案一并算好。
 * H5 用真实 canvas 量文字宽度，其它端用 uni canvas；都量不到时退化为「字数 × 字号」估算。
 * @param {Array<{text:string}>} list 任务列表
 * @param {{ dayOffset:number, jlToday:string }} opts
 * @returns {{ W:number, H:number, PAD:number, cardH:number, tasks:Array, hasJl:boolean, dateText:string, week:string }}
 */
export function measureShareLayout(list, opts) {
	const { dayOffset = 0, jlToday = '' } = opts || {};

	let ctx = null;
	// #ifdef H5
	ctx = document.createElement('canvas').getContext('2d');
	// #endif
	// #ifndef H5
	ctx = uni.createCanvasContext('shareCanvas');
	// #endif

	const { W, PAD, TEXT_W, LINE_H, ROW_GAP, HEAD_H, FOOT_H, TAIL_H, JL_H } = LAYOUT;

	// 量宽度：measureText 不可用时退化为「字数 × 字号」估算
	const measure = (text, size) => {
		try {
			if (!ctx) return String(text).length * size;
			if (typeof ctx.setFontSize === 'function') ctx.setFontSize(size);
			else ctx.font = size + 'px sans-serif';
			const w = ctx.measureText(String(text)).width;
			if (w > 0) return w;
		} catch (e) {
			/* 走估算 */
		}
		return String(text).length * size;
	};

	const wrap = (text, size, maxW) => {
		const lines = [];
		let line = '';
		for (const ch of String(text)) {
			if (line && measure(line + ch, size) > maxW) {
				lines.push(line);
				line = ch;
			} else {
				line += ch;
			}
		}
		if (line) lines.push(line);
		return lines.length ? lines : [''];
	};

	const d = new Date();
	d.setDate(d.getDate() + dayOffset);
	const hasJl = dayOffset === 0 && !!jlToday;
	const tasks = (list || []).map(t => ({ text: t.text, lines: wrap(t.text, 22, TEXT_W) }));
	const tasksH = tasks.reduce((s, t) => s + Math.max(LINE_H, t.lines.length * LINE_H) + ROW_GAP, 0);
	const cardH = PAD * 2 + tasksH + (hasJl ? JL_H : 0);
	const H = Math.round(HEAD_H + cardH + FOOT_H + TAIL_H);

	return {
		W,
		H,
		PAD,
		cardH,
		tasks,
		hasJl,
		dateText: d.getMonth() + 1 + '月' + d.getDate() + '日',
		week: '星期' + '日一二三四五六'[d.getDay()]
	};
}

/** 玻璃卡片的圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/** 三团彩色径向光斑，对应页面里的 blob */
function drawBlobs(ctx, H) {
	const blob = (x, y, r, c0) => {
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, c0);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.fillStyle = g;
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
	};
	blob(90, 120, 260, 'rgba(96,128,255,0.35)');
	blob(520, 320, 240, 'rgba(156,92,232,0.28)');
	blob(300, H - 160, 260, 'rgba(0,188,214,0.20)');
}

/**
 * H5：原生 Canvas 2D 同步绘制，直接返回 dataURL
 * @returns {string} dataUrl
 */
export function drawSharePosterH5(L, jlToday) {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('canvas 2d unavailable');

	const { W, H, PAD, cardH } = L;
	canvas.width = W;
	canvas.height = H;

	// 背景：深夜蓝渐变
	const bg = ctx.createLinearGradient(0, 0, 0, H);
	bg.addColorStop(0, '#0B0E1A');
	bg.addColorStop(1, '#141B31');
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	drawBlobs(ctx, H);

	const fs = n => {
		ctx.font = n + 'px ' + FONT;
	};
	ctx.textBaseline = 'middle';

	// 顶部：小标 + 大日期 + 星期
	fs(24);
	ctx.fillStyle = 'rgba(127,214,255,0.9)';
	ctx.fillText('光遇每日任务', PAD + 6, 56);
	fs(44);
	ctx.fillStyle = '#F2F4F8';
	ctx.fillText(L.dateText, PAD + 6, 104);
	const dateW = ctx.measureText(L.dateText).width;
	fs(24);
	ctx.fillStyle = 'rgba(242,244,248,0.55)';
	ctx.fillText(L.week, PAD + 10 + dateW + 60, 104);

	// 玻璃卡片：半透明白 + 细描边
	const cardY = 150;
	const cardX = 24;
	const cardW = W - 48;
	roundRect(ctx, cardX, cardY, cardW, cardH, 24);
	ctx.fillStyle = 'rgba(255,255,255,0.06)';
	ctx.fill();
	ctx.strokeStyle = 'rgba(255,255,255,0.16)';
	ctx.lineWidth = 1;
	ctx.stroke();

	// 任务列表：序号徽章 + 自动换行文案
	let y = cardY + PAD + 15;
	L.tasks.forEach((t, i) => {
		const bx = cardX + PAD + 16;
		ctx.beginPath();
		ctx.arc(bx, y + 2, 15, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(127,214,255,0.16)';
		ctx.fill();

		fs(16);
		ctx.fillStyle = '#7FD6FF';
		ctx.textAlign = 'center';
		ctx.fillText(String(i + 1), bx, y + 2);
		ctx.textAlign = 'left';

		fs(22);
		ctx.fillStyle = 'rgba(242,244,248,0.92)';
		t.lines.forEach((ln, j) => {
			ctx.fillText(ln, cardX + PAD + 46, y + j * LAYOUT.LINE_H + 2);
		});
		y += Math.max(LAYOUT.LINE_H, t.lines.length * LAYOUT.LINE_H) + LAYOUT.ROW_GAP;
	});

	// 季蜡位置：只有今天有数据才画
	if (L.hasJl) {
		fs(20);
		ctx.fillStyle = '#B49BFF';
		ctx.fillText('今日季蜡 · ' + jlToday, cardX + PAD + 6, y + 4);
	}

	// 底部水印
	fs(22);
	ctx.fillStyle = 'rgba(242,244,248,0.45)';
	ctx.textAlign = 'center';
	ctx.fillText('@冰块', W / 2, H - 34);
	ctx.textAlign = 'left';

	return canvas.toDataURL('image/png');
}

/**
 * 非 H5：用 uni canvas 绘制（调用方负责最终导出）
 * @param {Object} ctx uni.createCanvasContext 返回的上下文
 */
export function drawSharePosterNative(ctx, L, jlToday) {
	const { W, H, PAD, cardH } = L;

	const bg = ctx.createLinearGradient(0, 0, 0, H);
	bg.addColorStop(0, '#0B0E1A');
	bg.addColorStop(1, '#141B31');
	ctx.setFillStyle(bg);
	ctx.fillRect(0, 0, W, H);

	ctx.setFillStyle('rgba(96,128,255,0.35)');
	const blob = (x, y, r, c0) => {
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, c0);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		ctx.setFillStyle(g);
		ctx.fillRect(x - r, y - r, r * 2, r * 2);
	};
	blob(90, 120, 260, 'rgba(96,128,255,0.35)');
	blob(520, 320, 240, 'rgba(156,92,232,0.28)');
	blob(300, H - 160, 260, 'rgba(0,188,214,0.20)');

	ctx.setTextBaseline('middle');
	ctx.setFontSize(24);
	ctx.setFillStyle('rgba(127,214,255,0.9)');
	ctx.fillText('光遇每日任务', PAD + 6, 56);
	ctx.setFontSize(44);
	ctx.setFillStyle('#F2F4F8');
	ctx.fillText(L.dateText, PAD + 6, 104);
	ctx.setFontSize(24);
	ctx.setFillStyle('rgba(242,244,248,0.55)');
	ctx.fillText(L.week, PAD + 10 + ctx.measureText(L.dateText).width + 60, 104);

	const cardY = 150;
	const cardX = 24;
	const cardW = W - 48;
	const R = 24;
	ctx.beginPath();
	ctx.moveTo(cardX + R, cardY);
	ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, R);
	ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, R);
	ctx.arcTo(cardX, cardY + cardH, cardX, cardY, R);
	ctx.arcTo(cardX, cardY, cardX + cardW, cardY, R);
	ctx.closePath();
	ctx.setFillStyle('rgba(255,255,255,0.06)');
	ctx.fill();
	ctx.setStrokeStyle('rgba(255,255,255,0.16)');
	ctx.setLineWidth(1);
	ctx.stroke();

	let y = cardY + PAD + 15;
	L.tasks.forEach((t, i) => {
		const bx = cardX + PAD + 16;
		ctx.beginPath();
		ctx.arc(bx, y + 2, 15, 0, Math.PI * 2);
		ctx.setFillStyle('rgba(127,214,255,0.16)');
		ctx.fill();
		ctx.setFontSize(16);
		ctx.setFillStyle('#7FD6FF');
		ctx.setTextAlign('center');
		ctx.fillText(String(i + 1), bx, y + 2);
		ctx.setTextAlign('left');

		ctx.setFontSize(22);
		ctx.setFillStyle('rgba(242,244,248,0.92)');
		t.lines.forEach((ln, j) => {
			ctx.fillText(ln, cardX + PAD + 46, y + j * LAYOUT.LINE_H + 2);
		});
		y += Math.max(LAYOUT.LINE_H, t.lines.length * LAYOUT.LINE_H) + LAYOUT.ROW_GAP;
	});

	if (L.hasJl) {
		ctx.setFontSize(20);
		ctx.setFillStyle('#B49BFF');
		ctx.fillText('今日季蜡 · ' + jlToday, cardX + PAD + 6, y + 4);
	}

	ctx.setFontSize(22);
	ctx.setFillStyle('rgba(242,244,248,0.45)');
	ctx.setTextAlign('center');
	ctx.fillText('@冰块', W / 2, H - 34);
	ctx.setTextAlign('left');
}

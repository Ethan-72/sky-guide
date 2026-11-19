/**
 * 液态玻璃滑块的弹簧物理与文案联动
 * ------------------------------------------------------------------
 * 从 pages/index/index.vue 抽出：只做纯计算与 rAF 循环，不碰任何业务状态。
 */

/* 弹簧参数：k 越大回弹越快，c 越大越不容易来回晃 */
export const SPRING_K = 420;
export const SPRING_C = 27;

/** 掉帧时限制单步时长，防止数值发散 */
const MAX_DT = 0.04;

/** 速度 → 拉伸量（横向变长、纵向变薄） */
const STRETCH_FACTOR = 0.026;
const STRETCH_MAX = 0.14;

/** 边界阻尼：越界只保留 32% 位移，拉得动但出不去 */
export function dampIdx(raw, n) {
	if (raw < 0) return raw * 0.32;
	if (raw > n - 1) return (n - 1) + (raw - (n - 1)) * 0.32;
	return raw;
}

/** 文字激活度：距离滑块越近越亮（0~1） */
export function tabActivity(cur, i) {
	const d = Math.abs(cur - i);
	return d >= 1 ? 0 : 1 - d;
}

/** 把激活度翻译成颜色/字重样式（连续过渡，不用 class 硬切） */
export function mixTxtStyle(a) {
	return {
		opacity: String(0.5 + 0.5 * a),
		'font-weight': a > 0.5 ? '600' : '400',
		transform: `scale(${(0.94 + 0.06 * a).toFixed(3)})`
	};
}

/** 滑块位移：把弹簧状态翻译成 CSS 变量 */
export function thumbStyle(idx, stretch, press) {
	return {
		'--idx': String(idx),
		'--sx': String(1 + stretch),
		// 横向拉伸时纵向收一点，保持体积感
		'--sy': String(1 - stretch * 0.42),
		'--press': String(press || 1)
	};
}

/**
 * 弹簧单步积分
 * @param {{x:number, v:number, target:number}} st 弹簧状态
 * @param {number} dt 距上一帧的秒数
 * @returns {{ done: boolean, stretch: number }} done=true 表示已经停稳
 */
export function stepSpring(st, dt) {
	let d = dt;
	if (!(d > 0)) d = 1 / 60;
	if (d > MAX_DT) d = MAX_DT;

	const accel = -SPRING_K * (st.x - st.target) - SPRING_C * st.v;
	st.v += accel * d;
	st.x += st.v * d;

	const stretch = Math.min(Math.abs(st.v) * STRETCH_FACTOR, STRETCH_MAX);
	const done = Math.abs(st.v) < 0.03 && Math.abs(st.x - st.target) < 0.0015;
	return { done, stretch };
}

/**
 * 启动弹簧循环：每帧回调一次位置，停稳后回调 onDone 并结束。
 * rAF 不可用时直接用 CSS transition 落位。
 * @param {{x:number, v:number, raf:number, target:number}} st
 * @param {(x:number, stretch:number) => void} onFrame
 * @param {() => void} onDone
 */
export function runSpring(st, onFrame, onDone) {
	if (typeof requestAnimationFrame !== 'function') {
		st.x = st.target;
		st.v = 0;
		onDone();
		return;
	}
	if (st.raf) cancelAnimationFrame(st.raf);

	let last = 0;
	const loop = now => {
		if (!last) last = now;
		const dt = (now - last) / 1000;

		// 用每一帧的实际位置改变去更新 last 之前的步长
		last = now;
		const { done, stretch } = stepSpring(st, dt);
		onFrame(st.x, stretch);

		if (done) {
			st.x = st.target;
			st.v = 0;
			st.raf = 0;
			onDone();
			return;
		}
		st.raf = requestAnimationFrame(loop);
	};
	st.raf = requestAnimationFrame(loop);
}

/** 停掉正在跑的弹簧 */
export function stopSpring(st) {
	if (st && st.raf && typeof cancelAnimationFrame === 'function') {
		cancelAnimationFrame(st.raf);
	}
	if (st) st.raf = 0;
}

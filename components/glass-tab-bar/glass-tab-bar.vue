<template>
	<!--
		液态玻璃胶囊 Tab：跟手拖拽 + 松手吸附 + 点击弹簧切换
		------------------------------------------------------------
		结构：
		  .glt-track       胶囊外壳（毛玻璃 + 描边），负责接手势
		    .glt-ind       指示块「槽位」，宽度 = 一格，靠 translateX(calc(idx*100%)) 定位
		      .glt-ind-inner  真正的白色高亮块，只负责拉伸/缩放（不参与定位，避免互相干扰）
		    .glt-item × n  文字层，每个 Tab 里叠了两层同样的字：暗色底字 + 亮色粗体字（透明度联动）
	-->
	<view class="glt">
		<view
			class="glt-track"
			:class="{ 'is-drag': dragging }"
			@touchstart="onStart"
			@touchmove.stop.prevent="onMove"
			@touchend="onEnd"
			@touchcancel="onEnd"
		>
			<view class="glt-ind" :style="indStyle">
				<view class="glt-ind-inner" :style="indInnerStyle"></view>
			</view>

			<view class="glt-item" v-for="(t, i) in labels" :key="i" @click="onTap(i)">
				<view class="glt-label">
					<text class="glt-txt glt-txt-off">{{ t }}</text>
					<view class="glt-on-wrap">
						<text class="glt-txt glt-txt-on" :style="{ opacity: act[i], transform: 'scale(' + (0.96 + 0.04 * act[i]) + ')' }">{{ t }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
/* 弹簧参数：k 越大越"急"，c 越小越"Q弹"。这组数值阻尼比约 0.62，会轻微过冲再回弹 */
const SPRING_K = 380;
const SPRING_C = 24;
const RUBBER = 0.32; // 越界阻尼系数：滑出边界后，位移只按 32% 生效
const FLICK = 0.12; // 速度投影系数（秒）：松手时把速度折算成"还会往前冲多远"
const TAP_SLOP = 5; // 位移小于 5px 仍算点击，不算拖拽

export default {
	name: 'glass-tab-bar',
	props: {
		// 支持 ['a','b','c'] 或 [{ label:'a', value:'x' }]
		tabs: { type: Array, default: () => ['honffx', 'Terminal', 'czr'] },
		modelValue: { type: Number, default: 0 },
		// 胶囊内边距（px）。指示块左右各外扩 padX，做出"稍微放大"的视觉
		pad: { type: Number, default: 6 },
		padX: { type: Number, default: 3 }
	},

	emits: ['update:modelValue', 'change'],

	data() {
		return {
			// idx 是「第几格」的连续值：拖拽时会经过 1.37 这种小数
			idx: this.modelValue,
			stretch: 0, // 速度带来的横向拉伸
			lead: 0, // 高光偏移（%），制造液体流动的方向感
			dragging: false,
			act: [], // 每个 Tab 的"激活度" 0~1，驱动文字颜色/字重过渡
			itemW: 0 // 一格的像素宽度（拖动换算用，渲染不依赖它）
		};
	},

	computed: {
		labels() {
			return (this.tabs || []).map(t => (typeof t === 'string' ? t : (t && t.label) || ''));
		},
		n() {
			return this.labels.length || 1;
		},
		indStyle() {
			// 宽度 = 轨道内宽 / n；translateX 以自身宽度为单位 → 一格正好 100%
			const p = this.pad;
			return {
				width: `calc((100% - ${p * 2}px) / ${this.n})`,
				transform: `translate3d(calc(${this.idx} * 100%), 0, 0)`
			};
		},
		indInnerStyle() {
			return {
				left: -this.padX + 'px',
				right: -this.padX + 'px',
				'--sx': String(1 + this.stretch),
				// 横向拉长时纵向收一点，保持体积感
				'--sy': String(1 - this.stretch * 0.4),
				'--lead': this.lead + '%'
			};
		}
	},

	watch: {
		modelValue(v) {
			if (this.dragging) return;
			if (Math.abs(v - this.idx) < 0.001) return;
			this.snapTo(v, 0);
		},
		tabs() {
			this.$nextTick(this.measure);
		}
	},

	mounted() {
		this.applyFrame(this.idx, 0, 0);
		this.$nextTick(() => {
			this.measure();
			this.measureTimer = setTimeout(this.measure, 300); // 首屏布局完成后补测一次
		});
		// #ifdef H5
		if (typeof window !== 'undefined') {
			this.onResize = () => this.measure();
			window.addEventListener('resize', this.onResize);
		}
		// #endif
	},

	beforeUnmount() {
		this.stopSpring();
		clearTimeout(this.measureTimer);
		// #ifdef H5
		if (this.onResize) window.removeEventListener('resize', this.onResize);
		// #endif
	},

	methods: {
		/* ---------------- 量一格多宽 ---------------- */
		measure() {
			const fallback = () => {
				// 量不到就用屏宽粗估，保证手势不会因为 itemW=0 而失灵
				let w = 375;
				try {
					w = uni.getSystemInfoSync().windowWidth || 375;
				} catch (e) {}
				this.itemW = Math.max(1, ((w * 0.86) - this.pad * 2) / this.n);
			};
			try {
				uni.createSelectorQuery()
					.in(this)
					.select('.glt-track')
					.boundingClientRect(rect => {
						if (rect && rect.width > 0) {
							this.itemW = Math.max(1, (rect.width - this.pad * 2) / this.n);
						} else {
							fallback();
						}
					})
					.exec();
			} catch (e) {
				fallback();
			}
		},

		/* ---------------- 手势 ---------------- */
		onStart(e) {
			const t = e.touches && e.touches[0];
			if (!t) return;
			const x = t.clientX != null ? t.clientX : t.pageX;

			this.stopSpring(); // 抓住飞行中的指示块：立刻接管，不留惯性
			this.dragging = true;
			this._x0 = x;
			this._i0 = this.idx; // 起手时的格位
			this._t0 = Date.now();
			this._v = 0;
			this._moved = false;
			if (!this.itemW) this.measure();
		},

		onMove(e) {
			if (!this.dragging) return;
			const t = e.touches && e.touches[0];
			if (!t) return;
			const x = t.clientX != null ? t.clientX : t.pageX;
			const dx = x - this._x0;
			if (Math.abs(dx) > TAP_SLOP) this._moved = true;

			// ① 像素位移 → 格位：dx / 一格宽
			const raw = this._i0 + dx / this.itemW;
			// ② 边界阻尼：越界后只保留 32% 位移，滑不出去但手感"拉得动"
			const idx = this.damp(raw);
			// ③ 速度（格/秒）：用"从起手到现在的平均速度"做低通，比逐帧差分稳
			const dt = (Date.now() - this._t0) / 1000;
			const v = dt > 0.016 ? (idx - this._i0) / dt : 0;
			this._v = this._v * 0.72 + v * 0.28;

			const stretch = Math.min(Math.abs(this._v) * 0.03, 0.16);
			const lead = Math.max(-14, Math.min(14, this._v * 6));
			this.applyFrame(idx, stretch, lead);
		},

		onEnd() {
			if (!this.dragging) return;
			this.dragging = false;
			// 没怎么动 → 交给 click 处理（点击切换）
			if (!this._moved) return;

			// 松手吸附：先按速度做一次"惯性投影"，再四舍五入到最近一格
			const v = Math.max(-9, Math.min(9, this._v));
			const projected = this.idx + v * FLICK;
			let target = Math.round(projected);
			target = Math.max(0, Math.min(this.n - 1, target));
			this.snapTo(target, v); // 把速度当初始速度喂给弹簧 → 有"甩出去再吸住"的 Q 弹感
		},

		onTap(i) {
			if (this.dragging) return;
			if (i === Math.round(this.idx)) return;
			this.snapTo(i, 0);
		},

		/* ---------------- 数值计算 ---------------- */
		damp(raw) {
			const max = this.n - 1;
			if (raw < 0) return raw * RUBBER;
			if (raw > max) return max + (raw - max) * RUBBER;
			return raw;
		},

		/* 每帧写一次状态：位置 / 拉伸 / 高光 / 各 Tab 激活度 */
		applyFrame(idx, stretch, lead) {
			this.idx = idx;
			this.stretch = stretch;
			this.lead = Math.round(lead * 10) / 10;

			const act = new Array(this.n);
			for (let i = 0; i < this.n; i++) {
				const d = Math.abs(idx - i);
				// 距离 0 → 1（完全激活）；距离 ≥1 → 0（完全熄灭）；中间线性过渡
				act[i] = d >= 1 ? 0 : 1 - d;
			}
			this.act = act;
		},

		/* ---------------- 弹簧动画 ---------------- */
		snapTo(target, v0) {
			const from = this.idx;
			if (Math.abs(target - from) < 0.001 && Math.abs(v0) < 0.05) {
				this.applyFrame(target, 0, 0);
				this.commit(target);
				return;
			}
			this.commit(target); // 内容可以立刻切，指示块慢慢飞过去

			this.stopSpring();
			const st = (this._st = {
				x: from,
				v: v0 || 0,
				target,
				last: 0,
				raf: 0
			});

			const tick = () => {
				const now = Date.now();
				if (!st.last) st.last = now;
				let dt = (now - st.last) / 1000;
				st.last = now;
				if (!(dt > 0)) dt = 1 / 60;
				if (dt > 0.032) dt = 0.032; // 掉帧保护，防止积分发散

				const accel = -SPRING_K * (st.x - st.target) - SPRING_C * st.v;
				st.v += accel * dt;
				st.x += st.v * dt;

				const stretch = Math.min(Math.abs(st.v) * 0.03, 0.16);
				const lead = Math.max(-14, Math.min(14, st.v * 6));
				this.applyFrame(st.x, stretch, lead);

				if (Math.abs(st.v) < 0.02 && Math.abs(st.x - st.target) < 0.001) {
					this.applyFrame(st.target, 0, 0);
					st.raf = 0;
					return;
				}
				st.raf = this.raf(tick);
			};
			st.raf = this.raf(tick);
		},

		// rAF 在小程序里不存在，降级成 16ms 定时器，手感一致
		raf(fn) {
			if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
			return setTimeout(fn, 16);
		},

		caf(id) {
			if (!id) return;
			if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
			else clearTimeout(id);
		},

		stopSpring() {
			if (this._st && this._st.raf) this.caf(this._st.raf);
			if (this._st) this._st.raf = 0;
		},

		commit(target) {
			if (target === this._lastEmit) return;
			this._lastEmit = target;
			this.$emit('update:modelValue', target);
			this.$emit('change', target, this.labels[target]);
		}
	}
};
</script>

<style scoped>
/* ---------- 外壳：胶囊 + 毛玻璃 + 细描边 ---------- */
.glt {
	width: 100%;
}

.glt-track {
	position: relative;
	display: flex;
	align-items: stretch;
	width: 100%;
	height: 88rpx;
	padding: 6px;
	box-sizing: border-box;
	border-radius: 999rpx;
	overflow: hidden;
	/* 毛玻璃：半透明白 + 背景模糊 + 内外高光，和项目里的 .daytabs 同一套思路 */
	background-color: rgba(255, 255, 255, 0.55);
	border: 1rpx solid rgba(255, 255, 255, 0.72);
	-webkit-backdrop-filter: blur(22px) saturate(200%);
	backdrop-filter: blur(22px) saturate(200%);
	box-shadow:
		inset 0 1rpx 0 rgba(255, 255, 255, 0.85),
		inset 0 0 0 1rpx rgba(255, 255, 255, 0.35),
		0 6rpx 20rpx rgba(80, 70, 140, 0.10);
	/* 拖动时禁止浏览器接管横向手势 */
	touch-action: pan-y;
	user-select: none;
}

/* ---------- 指示块槽位：只负责 X 位移 ---------- */
.glt-ind {
	position: absolute;
	top: 6px;
	bottom: 6px;
	left: 6px;
	z-index: 0;
	pointer-events: none; /* 手势统一由外壳接管，避免 pointer 在块上来回切换 */
	will-change: transform;
}

/* ---------- 真正的白色高亮块：只负责拉伸/模糊/阴影 ---------- */
.glt-ind-inner {
	position: absolute;
	top: 0;
	bottom: 0;
	border-radius: 999rpx;
	background-image: linear-gradient(160deg, #ffffff 0%, rgba(255, 255, 255, 0.86) 100%);
	box-shadow:
		0 6rpx 18rpx rgba(90, 80, 150, 0.18),
		0 1rpx 2rpx rgba(90, 80, 150, 0.10),
		inset 0 1rpx 0 rgba(255, 255, 255, 0.95);
	-webkit-backdrop-filter: blur(14px) saturate(180%);
	backdrop-filter: blur(14px) saturate(180%);
	transform: scale(var(--sx, 1), var(--sy, 1));
	transform-origin: 50% 50%;
	will-change: transform;
	transition: box-shadow 0.18s ease;
}

/* 高光：跟着速度左右流动，制造"液体被推着走"的错觉 */
.glt-ind-inner::after {
	content: '';
	position: absolute;
	top: -60%;
	left: 50%;
	width: 160%;
	height: 220%;
	transform: translateX(calc(-50% + var(--lead, 0%)));
	background-image: radial-gradient(closest-side, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0) 100%);
	pointer-events: none;
}

/* 按住时轻微"鼓起"，告诉用户"这块可以拖" */
.is-drag .glt-ind-inner {
	box-shadow:
		0 10rpx 26rpx rgba(90, 80, 150, 0.24),
		0 1rpx 2rpx rgba(90, 80, 150, 0.12),
		inset 0 1rpx 0 rgba(255, 255, 255, 0.95);
}

/* ---------- 文字层 ---------- */
.glt-item {
	position: relative;
	z-index: 1;
	display: flex;
	flex: 1;
	align-items: center;
	justify-content: center;
	min-width: 0;
	border-radius: 999rpx;
}

.glt-label {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
}

.glt-txt {
	font-size: 28rpx;
	line-height: 1.2;
	letter-spacing: 0.5rpx;
	white-space: nowrap;
	transition: none; /* 每帧都在动，交给 JS 控制，避免 CSS 过渡打架 */
}

/* 底字：常态（暗 + 常规字重） */
.glt-txt-off {
	color: rgba(60, 60, 90, 0.72);
	font-weight: 500;
}

/* 亮字：叠在底字正上方，透明度由激活度驱动 → 颜色/字重"平滑过渡"
   用一层绝对定位的居中容器包住，避免 500 和 700 两种字重宽度不同产生重影 */
.glt-on-wrap {
	position: absolute;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
}

.glt-txt-on {
	color: #1d6bff;
	font-weight: 700;
	will-change: opacity, transform;
}
</style>

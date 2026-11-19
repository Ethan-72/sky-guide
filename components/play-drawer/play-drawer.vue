<template>
	<view class="play-root">
		<!-- 娱乐悬浮球：固定右下，悬在「一键复制」上方约 50rpx，不遮挡按钮 -->
		<view
			class="play-fab glass"
			hover-class="play-fab-active"
			:hover-stay-time="80"
			@click="openPlay"
		>
			<text class="play-fab-txt">玩</text>
		</view>

		<!-- 娱乐抽屉：底部滑出，内部复用四个子视图 -->
		<view class="play-mask" :class="{ 'play-mask-on': playOpen }" @click="closePlay">
			<view class="play-drawer glass" :class="{ 'play-drawer-on': playOpen }" @click.stop>
				<view class="play-grip"></view>

				<view class="play-head">
					<view class="play-back" v-if="playView !== 'list'" @click="playBack">
						<text class="play-back-txt">‹ 返回</text>
					</view>
					<text class="play-title" :class="{ 'play-title-indent': playView === 'list' }">{{ playTitle }}</text>
					<view class="play-close" @click="closePlay">
						<text class="play-close-txt">关闭</text>
					</view>
				</view>

				<!-- 四个入口 -->
				<view class="play-list" v-if="playView === 'list'">
					<view class="play-item" v-for="p in playItems" :key="p.key" @click="playTo(p.key)">
						<view class="play-icon"><text class="play-icon-txt">{{ p.icon }}</text></view>
						<view class="play-item-info">
							<text class="play-item-name">{{ p.name }}</text>
							<text class="play-item-desc">{{ p.desc }}</text>
						</view>
						<text class="play-arrow">›</text>
					</view>
				</view>

				<!-- 摸小猫 -->
				<view class="play-body" v-else-if="playView === 'cat'">
					<!-- 左上角：花色选择 -->
					<view class="cat-coatbar">
						<text class="cat-coat-label">花色</text>
						<view class="cat-coat-dots">
							<view
								class="cat-coat-dot"
								v-for="c in catCoats"
								:key="c.key"
								:class="['cat-dot-' + c.key, { 'cat-dot-on': catCoat === c.key }]"
								@click="pickCoat(c.key)"
							></view>
						</view>
						<text class="cat-coat-name">{{ catCoatName }}</text>
					</view>

					<view class="cat-stage" @click="patCat">
						<!-- 爱心粒子 -->
						<view
							class="cat-heart"
							v-for="h in catHearts"
							:key="h.id"
							:style="{
								left: 'calc(50% + ' + h.x + 'rpx)',
								top: h.y + 'rpx',
								width: h.size + 'rpx',
								height: h.size + 'rpx',
								animationDelay: h.delay + 'ms',
								'--hrot': h.rot + 'deg'
							}"
						></view>

						<view class="cat-halo" :class="{ 'cat-halo-on': catHit }"></view>

						<!-- 写实猫头照片：花色切换只换 src -->
						<image
							class="cat-photo"
							:class="{ 'cat-patted': catHit }"
							:src="catPhotoSrc"
							mode="widthFix"
							draggable="false"
						></image>

						<text class="cat-hint">轻轻摸摸它，爱心 +1</text>
					</view>
					<text class="cat-count">已收获 <text class="cat-num">{{ catCount }}</text> 颗爱心</text>
				</view>

				<!-- 光遇抽签 -->
				<view class="play-body" v-else-if="playView === 'sign'">
					<view class="sign-card" :class="{ 'sign-card-rolling': signRolling }">
						<text class="sign-level" :class="signResult && !signRolling ? 'sign-' + signResult.tone : 'sign-idle'">
							{{ signRolling ? '…' : signResult ? signResult.level : '？' }}
						</text>
						<text class="sign-text">{{ signRolling ? '正在摇签…' : signResult ? signResult.text : '摇一摇，看看今天的光遇运势' }}</text>
					</view>
					<view class="play-btn" hover-class="play-btn-active" :hover-stay-time="80" @click="drawSign">
						<text class="play-btn-txt">{{ signResult ? '再抽一签' : '抽 个 签' }}</text>
					</view>
				</view>

				<!-- 答案之书 -->
				<view class="play-body" v-else-if="playView === 'answer'">
					<view class="answer-card" :class="{ 'answer-card-rolling': answerRolling }">
						<text class="answer-hint">心里默念一个问题</text>
						<text class="answer-text">{{ answerRolling ? '……' : answerText || '然后翻开这一页' }}</text>
					</view>
					<view class="play-btn" hover-class="play-btn-active" :hover-stay-time="80" @click="drawAnswer">
						<text class="play-btn-txt">翻开答案之书</text>
					</view>
				</view>

				<!-- 计算器：纯本地，液态玻璃小键盘 -->
				<view class="play-body calc-body" v-else>
					<view class="calc-screen">
						<text class="calc-expr">{{ calcExpr }}</text>
						<text class="calc-out" :class="{ 'calc-out-err': calcErr }">{{ calcOut }}</text>
					</view>
					<view class="calc-pad">
						<view
							class="calc-key"
							v-for="k in calcKeys"
							:key="k.k"
							:class="k.cls"
							hover-class="calc-key-active"
							:hover-stay-time="60"
							@click="calcPress(k.k)"
						>
							<text class="calc-key-txt">{{ k.k }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * 娱乐抽屉：摸小猫 / 光遇抽签 / 答案之书 / 计算器
 * ------------------------------------------------------------------
 * 全部本地逻辑，不发任何网络请求；从 pages/index/index.vue 抽出以缩小主页面体积。
 */
export default {
	name: 'play-drawer',

	data() {
		return {
			playOpen: false,
			playView: 'list', // list 入口列表 / cat / sign / answer / calc
			catCount: 0, // 累计爱心
			catHearts: [], // 爱心粒子队列 { id, x, y, size, rot, delay }
			catSeq: 0, // 爱心唯一 id
			catHit: false, // 抚摸动画开关（点一下置 true，380ms 后复位）
			catCoat: 'orange', // 当前花色 key
			// 4 种花色：key 对应 static/cats/<key>.png，name 显示在左上角
			catCoats: [
				{ key: 'orange', name: '橘猫' },
				{ key: 'siamese', name: '暹罗猫' },
				{ key: 'calico', name: '三花猫' },
				{ key: 'cow', name: '奶牛猫' }
			],
			signResult: null, // { level, text, tone }
			signRolling: false,
			answerText: '',
			answerRolling: false,
			// 计算器状态：全本地，immediate-execution 计算
			calcInput: '0',
			calcAcc: null,
			calcOp: '',
			calcFresh: true,
			calcErr: false,
			calcExpr: '',
			calcKeys: [
				{ k: 'C', cls: 'calc-key-fn' },
				{ k: '⌫', cls: 'calc-key-fn' },
				{ k: '÷', cls: 'calc-key-op' },
				{ k: '×', cls: 'calc-key-op' },
				{ k: '7' },
				{ k: '8' },
				{ k: '9' },
				{ k: '−', cls: 'calc-key-op' },
				{ k: '4' },
				{ k: '5' },
				{ k: '6' },
				{ k: '+', cls: 'calc-key-op' },
				{ k: '1' },
				{ k: '2' },
				{ k: '3' },
				{ k: '=', cls: 'calc-key-eq calc-key-tall' },
				{ k: '0', cls: 'calc-key-wide' },
				{ k: '.' }
			],
			// 抽签文案：写死在本地，不请求任何接口
			signPool: [
				{ level: '大吉', text: '今日跑暴风眼必不掉翼 (๑˃̵ᴗ˂̵)', tone: 'best' },
				{ level: '大吉', text: '先祖见你都主动伸手，蜡烛自己往兜里跳 (✧∇✧)', tone: 'best' },
				{ level: '大吉', text: '暮土一次过，冥龙今天在打瞌睡 (´｡• ᵕ •｡`)', tone: 'best' },
				{ level: '中吉', text: '牵手好友必有回响，今日宜双人跑图 (๑•̀ㅂ•́)و✧', tone: 'good' },
				{ level: '中吉', text: '雨林隐藏图会给你一点小惊喜 (｡･ω･｡)ﾉ♡', tone: 'good' },
				{ level: '中吉', text: '今日蜡烛格外听话，跑两个图就够本了 (・∀・)', tone: 'good' },
				{ level: '平', text: '宜挂机，忌跑图 (￣▽￣)ノ', tone: 'flat' },
				{ level: '平', text: '适合在云野坐着看云，蜡烛不急 (￣ω￣)', tone: 'flat' },
				{ level: '平', text: '今日运势平平，但风景很好 (´ω｀)', tone: 'flat' },
				{ level: '小凶', text: '去暮土小心被皮皮虾盯上 (｡•́︿•̀｡)', tone: 'bad' },
				{ level: '小凶', text: '今日宜绕开螃蟹堆，被撞了别怪签文没提醒 (＞﹏＜)', tone: 'bad' },
				{ level: '小凶', text: '暴风眼今日风大，翼少的先别去 (´；ω；｀)', tone: 'bad' }
			],
			// 答案之书：全部本地写死，断网也能翻
			answerPool: [
				'别想了，去跑图吧 (๑•̀ㅂ•́)و✧',
				'是的 (´｡• ᵕ •｡`)',
				'再等等，蜡烛还没熟 (￣▽￣)',
				'绝对不行 (＞﹏＜)',
				'今天没戏，明天再来 (｡•́︿•̀｡)',
				'你心里其实已经有答案了 (￣ω￣)',
				'会有人牵你的手 (｡･ω･｡)ﾉ♡',
				'放手吧，前面还有更好的 (´；ω；｀)',
				'就现在，别犹豫 (๑˃̵ᴗ˂̵)',
				'换个方向试试，比如雨林 (・∀・)',
				'今天必炸大花！(๑•̀ㅂ•́)و✧',
				'去跑图吧，冥龙在等你 (￣^￣)',
				'答案在雨林隐藏图里哦 (｡•́︿•̀｡)',
				'先点了先祖再说 (✧∇✧)',
				'你需要的是朋友，不是答案 (๑•́ ₃ •̀๑)',
				'会掉的，但不会掉太多 (￣▽￣)ノ',
				'放心飞，风会接住你 (´ω｀)',
				'这件斗篷你值得拥有 (｡•̀ᴗ-)✧',
				'今天的运气藏在暮土 (・_・;)',
				'别问，问就是缘分 (￣ω￣)',
				'先挂机十分钟，答案自己会来 (￣▽￣)',
				'去吧，红石今天站在你这边 (๑•̀ㅂ•́)و✧',
				'你已经比昨天强了 (๑•̀ㅂ•́)✧',
				'别急，蜡烛会一直亮着 (｡･ω･｡)',
				'这次真的可以 (๑˃̵ᴗ˂̵)',
				'大概率会掉翼，但你不在乎 (´；ω；｀)',
				'问得太多了，先祖也有点累 (￣▽￣;)',
				'云野的风说：可以 (´｡• ᵕ •｡`)',
				'今晚的星空会给你提示 (✧∇✧)',
				'想清楚再点，确认键不贵 (・∀・)',
				'换个搭子，答案会不一样 (￣ω￣)',
				'如果你还在犹豫，那就是不行 (｡•́︿•̀｡)',
				'答案是肯定的，只是你不敢信 (๑•̀ㅂ•́)و✧',
				'再跑一张图，你就想通了 (￣▽￣)ノ',
				'今天的你值得一点小幸运 (｡･ω･｡)ﾉ♡'
			]
		};
	},

	computed: {
		playTitle() {
			if (this.playView === 'cat') return '摸小猫';
			if (this.playView === 'sign') return '光遇抽签';
			if (this.playView === 'answer') return '答案之书';
			if (this.playView === 'calc') return '计算器';
			return '歇一会儿';
		},

		playItems() {
			return [
				{ key: 'cat', icon: '猫', name: '摸小猫', desc: '轻轻一摸，爱心 +1' },
				{ key: 'sign', icon: '签', name: '光遇抽签', desc: '今日运势，玄学一把' },
				{ key: 'answer', icon: '书', name: '答案之书', desc: '心里默念问题，翻开一页' },
				{ key: 'calc', icon: '算', name: '计算器', desc: '加减乘除，随手算一算' }
			];
		},

		catPhotoSrc() {
			return '/static/cats/' + this.catCoat + '.png';
		},

		catCoatName() {
			const c = this.catCoats.find(x => x.key === this.catCoat);
			return c ? c.name : '橘猫';
		},

		/* 计算器显示：出错时给提示，否则就是当前输入串 */
		calcOut() {
			return this.calcErr ? '不能除以 0' : this.calcInput;
		}
	},

	methods: {
		/* ---------------- 抽屉开关 ---------------- */
		openPlay() {
			this.playView = 'list';
			this.playOpen = true;
		},

		closePlay() {
			this.playOpen = false;
		},

		playTo(view) {
			this.playView = view;
		},

		playBack() {
			this.playView = 'list';
		},

		/* ---------------- 摸小猫 ---------------- */
		/* 切换花色：点一下左上角色块，猫的毛色/斑纹跟着变 */
		pickCoat(key) {
			if (this.catCoat === key) return;
			this.catCoat = key;
			this.buzz();
		},

		/* 摸一下：本地累加 + 喷一把爱心 + 缩一下 + 震动 + 合成呼噜声，不发任何请求 */
		patCat() {
			this.catCount = this.catCount + 1;

			// 一次冒出 5~7 颗爱心，随机横向位置/大小/旋转/延迟，飘上去后自动回收
			const n = 5 + Math.floor(Math.random() * 3);
			for (let i = 0; i < n; i++) {
				const id = ++this.catSeq;
				this.catHearts.push({
					id,
					x: Math.round((Math.random() * 2 - 1) * 130),
					y: 120 + Math.round(Math.random() * 60),
					size: 26 + Math.round(Math.random() * 26),
					rot: Math.round((Math.random() * 2 - 1) * 34),
					delay: Math.round(Math.random() * 160)
				});
				setTimeout(() => {
					this.catHearts = this.catHearts.filter(h => h.id !== id);
				}, 1500 + Math.round(Math.random() * 300));
			}

			// 被摸反馈：缩一下再弹回，连点时先复位再重新触发动画
			this.catHit = false;
			this.$nextTick(() => {
				this.catHit = true;
				setTimeout(() => {
					this.catHit = false;
				}, 380);
			});

			this.purr();
			this.buzz();
		},

		// 首次触摸时建好 AudioContext（浏览器要求手势后才能出声），失败就静音
		ensureAudio() {
			try {
				if (typeof window === 'undefined') return;
				const AC = window.AudioContext || window.webkitAudioContext;
				if (!AC) return;
				if (!this._ac) this._ac = new AC();
				if (this._ac.state === 'suspended' && this._ac.resume) this._ac.resume();
			} catch (e) {
				// 被策略拦下 / 浏览器不支持：保持静音
			}
		},

		// 现场合成一记轻柔的「呼噜~」：低频三角波 + 缓慢颤音(LFO)
		purr() {
			try {
				this.ensureAudio();
				const ac = this._ac;
				if (!ac) return;
				if (ac.state === 'suspended' && ac.resume) ac.resume();
				const t = ac.currentTime;

				const osc = ac.createOscillator();
				osc.type = 'triangle';
				osc.frequency.setValueAtTime(240, t);
				osc.frequency.linearRampToValueAtTime(205, t + 0.4);
				const g = ac.createGain();
				g.gain.setValueAtTime(0.0001, t);
				g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
				g.gain.setValueAtTime(0.22, t + 0.22);
				g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);

				// 颤音 LFO：26Hz 调制音量，制造"呼噜噜"的颗粒感
				const lfo = ac.createOscillator();
				lfo.type = 'sine';
				lfo.frequency.value = 26;
				const lfoGain = ac.createGain();
				lfoGain.gain.value = 0.12;
				lfo.connect(lfoGain);
				lfoGain.connect(g.gain);

				osc.connect(g);
				g.connect(ac.destination);
				osc.start(t);
				lfo.start(t);
				osc.stop(t + 0.46);
				lfo.stop(t + 0.46);
			} catch (e) {
				// 不支持或被拦截时静音，不影响计数
			}
		},

		/* ---------------- 计算器（纯本地） ---------------- */
		calcPress(k) {
			if (k === 'C') {
				this.calcClear();
				return;
			}
			if (k === '⌫') {
				this.calcBack();
				return;
			}
			if (k === '=') {
				this.calcEqual();
				return;
			}
			if (k === '.' || /^[0-9]$/.test(k)) {
				this.calcDigit(k);
				return;
			}
			this.calcOperator(k);
		},

		calcDigit(k) {
			if (this.calcErr) this.calcClear();
			if (this.calcFresh) {
				this.calcInput = k === '.' ? '0.' : k;
				this.calcFresh = false;
				return;
			}
			if (k === '.') {
				if (this.calcInput.indexOf('.') >= 0) return;
				this.calcInput = this.calcInput + '.';
				return;
			}
			if (this.calcInput === '0') {
				this.calcInput = k;
				return;
			}
			if (this.calcInput.replace(/[-.]/g, '').length >= 12) return;
			this.calcInput = this.calcInput + k;
		},

		calcOperator(op) {
			if (this.calcErr) return;
			const cur = parseFloat(this.calcInput);
			const val = isNaN(cur) ? 0 : cur;

			// 已经有挂起运算符且输入了新数字 → 先算一步（连续按运算符则只换符号）
			if (this.calcOp && !this.calcFresh) {
				const r = this.calcApply(this.calcAcc, val, this.calcOp);
				if (r === null) return;
				this.calcAcc = r;
				this.calcInput = this.calcFmt(r);
			} else if (this.calcAcc === null) {
				this.calcAcc = val;
			}

			this.calcOp = op;
			this.calcFresh = true;
			this.calcExpr = this.calcFmt(this.calcAcc) + ' ' + op;
		},

		calcEqual() {
			if (this.calcErr || !this.calcOp) return;
			const cur = parseFloat(this.calcInput);
			const val = isNaN(cur) ? 0 : cur;
			const r = this.calcApply(this.calcAcc, val, this.calcOp);
			if (r === null) return;
			this.calcExpr = this.calcFmt(this.calcAcc) + ' ' + this.calcOp + ' ' + this.calcFmt(val) + ' =';
			this.calcInput = this.calcFmt(r);
			this.calcAcc = null;
			this.calcOp = '';
			this.calcFresh = true;
		},

		calcApply(a, b, op) {
			let r = 0;
			if (op === '+') r = a + b;
			else if (op === '−') r = a - b;
			else if (op === '×') r = a * b;
			else if (op === '÷') {
				if (b === 0) {
					this.calcErr = true;
					this.calcExpr = this.calcFmt(a) + ' ÷ 0';
					this.calcAcc = null;
					this.calcOp = '';
					this.calcFresh = true;
					return null;
				}
				r = a / b;
			}
			// 抹掉 0.1+0.2=0.30000000000000004 这种浮点尾巴
			return Math.round(r * 1e10) / 1e10;
		},

		calcFmt(v) {
			if (!isFinite(v)) return '0';
			const n = Math.round(v * 1e10) / 1e10;
			const s = String(n);
			if (s.replace(/[-.]/g, '').length > 12) return n.toExponential(6);
			return s;
		},

		calcClear() {
			this.calcInput = '0';
			this.calcAcc = null;
			this.calcOp = '';
			this.calcFresh = true;
			this.calcErr = false;
			this.calcExpr = '';
		},

		calcBack() {
			if (this.calcErr) {
				this.calcClear();
				return;
			}
			if (this.calcFresh) return;
			let s = this.calcInput.slice(0, -1);
			if (s === '' || s === '-') s = '0';
			this.calcInput = s;
		},

		/* 光遇抽签：从本地签池随机 */
		drawSign() {
			if (this.signRolling) return;
			this.signRolling = true;
			this.signResult = null;
			this.buzz();
			setTimeout(() => {
				const pool = this.signPool;
				this.signResult = pool[Math.floor(Math.random() * pool.length)];
				this.signRolling = false;
			}, 420);
		},

		/* 答案之书：从本地方案池随机 */
		drawAnswer() {
			if (this.answerRolling) return;
			this.answerRolling = true;
			this.answerText = '';
			setTimeout(() => {
				const pool = this.answerPool;
				this.answerText = pool[Math.floor(Math.random() * pool.length)];
				this.answerRolling = false;
			}, 460);
		},

		/* 轻震动：H5 需系统允许，失败就静默忽略，不影响任何逻辑 */
		buzz() {
			try {
				uni.vibrateShort({ type: 'light', fail: () => {} });
			} catch (e) {
				// 不支持震动的设备直接跳过
			}
		}
	}
};
</script>

<style>
/* 玻璃底：与页面 .glass 同一套观感，组件内自带一份，便于独立复用 */
.play-fab,
.play-drawer {
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
	background-image: linear-gradient(168deg, var(--glass-bg-2) 0%, rgba(255, 255, 255, 0) 48%);
	-webkit-backdrop-filter: blur(var(--blur)) saturate(200%);
	backdrop-filter: blur(var(--blur)) saturate(200%);
	box-shadow: var(--shadow),
		inset 0 1rpx 0 var(--glass-hl),
		inset 0 -1rpx 0 var(--glass-hl-btm),
		inset 0 0 0 1rpx var(--glass-rim);
}

/* ---------- 娱乐悬浮球 ---------- */
/* 位置：右侧固定，距底 244rpx。一键复制按钮在文档流里，页面滑到底时
   按钮占据距底 124rpx ~ 224rpx 这一段，所以球体（244 ~ 348rpx）落在
   按钮正上方，留 20rpx 空隙，既不遮按钮也不误触。z-index 低于所有弹层。 */
.play-fab {
	position: fixed;
	right: 28rpx;
	bottom: calc(env(safe-area-inset-bottom) + 244rpx);
	z-index: 70;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 104rpx;
	height: 104rpx;
	border-radius: 50%;
	transition: transform 0.16s ease, opacity 0.16s ease;
}

.play-fab-active {
	transform: scale(0.94);
	opacity: 0.9;
}

.play-fab-txt {
	font-size: 32rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: var(--text);
	transition: color 0.45s;
}

/* ---------- 娱乐抽屉 ---------- */
.play-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 90;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	background-color: rgba(0, 0, 0, 0.42);
	opacity: 0;
	pointer-events: none;
	transition: opacity 0.28s ease;
}

.play-mask-on {
	opacity: 1;
	pointer-events: auto;
}

.play-drawer {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-height: 86vh;
	overflow-y: auto;
	padding: 14rpx 32rpx calc(30rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
	border-radius: 44rpx 44rpx 0 0;
	/* 上滑带一点过冲，像被手指弹出来的液态玻璃 */
	transform: translate3d(0, 104%, 0) scale(0.98);
	transition: transform 0.46s cubic-bezier(0.22, 1.32, 0.36, 1);
	will-change: transform;
}

.play-drawer-on {
	transform: translate3d(0, 0, 0) scale(1);
}

.play-grip {
	width: 72rpx;
	height: 8rpx;
	margin: 0 auto 16rpx;
	border-radius: 999rpx;
	background-color: var(--text);
	opacity: 0.16;
}

.play-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	min-height: 56rpx;
	margin-bottom: 20rpx;
}

.play-back,
.play-close {
	flex-shrink: 0;
	width: 110rpx;
}

.play-close {
	text-align: right;
}

.play-back-txt {
	font-size: 24rpx;
	letter-spacing: 1rpx;
	color: var(--accent);
}

.play-close-txt {
	font-size: 24rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
}

.play-title {
	flex: 1;
	text-align: center;
	font-size: 30rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: var(--text);
	transition: color 0.45s;
}

/* 入口列表 */
.play-list {
	display: flex;
	flex-direction: column;
}

.play-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 16rpx;
	padding: 22rpx 24rpx;
	border-radius: 30rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: rgba(255, 255, 255, 0.10);
	transition: transform 0.18s ease, background-color 0.2s ease;
}

.play-item:active {
	transform: scale(0.988);
	background-color: rgba(255, 255, 255, 0.16);
}

.play-icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 76rpx;
	border-radius: 26rpx;
	background-image: linear-gradient(150deg, var(--btn-a) 0%, var(--btn-b) 100%);
	box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.45);
}

.play-icon-txt {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--btn-txt);
}

.play-item-info {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-width: 0;
	margin-left: 20rpx;
}

.play-item-name {
	font-size: 27rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.play-item-desc {
	margin-top: 6rpx;
	font-size: 21rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.play-arrow {
	margin-left: 12rpx;
	font-size: 34rpx;
	line-height: 1;
	color: var(--text-faint);
}

/* 子视图通用 */
.play-body {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 6rpx 0 4rpx;
}

.play-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 92rpx;
	margin-top: 32rpx;
	border-radius: 999rpx;
	background-image: linear-gradient(180deg, var(--btn-a) 0%, var(--btn-b) 100%);
	box-shadow: 0 8px 22px rgba(10, 60, 140, 0.18), inset 0 1rpx 0 rgba(255, 255, 255, 0.5);
	transition: transform 0.16s ease, opacity 0.16s ease;
}

.play-btn-active {
	transform: scale(0.975);
	opacity: 0.9;
}

.play-btn-txt {
	font-size: 28rpx;
	font-weight: 600;
	letter-spacing: 4rpx;
	color: var(--btn-txt);
}

/* ---------- 摸小猫：实拍照片 + 花色切换 + 爱心动画 ---------- */
.cat-stage {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 430rpx;
}

/* 左上角色选择器：毛玻璃小胶囊 */
.cat-coatbar {
	position: relative;
	z-index: 3;
	display: flex;
	align-items: center;
	align-self: flex-start;
	height: 54rpx;
	padding: 0 16rpx;
	margin-bottom: 6rpx;
	border-radius: 999rpx;
	background-color: rgba(255, 255, 255, 0.5);
	border: 1rpx solid var(--glass-bd);
	-webkit-backdrop-filter: blur(16px) saturate(190%);
	backdrop-filter: blur(16px) saturate(190%);
	box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.8), 0 3rpx 12rpx rgba(90, 80, 140, 0.10);
}

.cat-coat-label {
	font-size: 20rpx;
	color: var(--text-dim);
	letter-spacing: 1rpx;
	margin-right: 12rpx;
}

.cat-coat-dots {
	display: flex;
	align-items: center;
	gap: 10rpx;
}

.cat-coat-dot {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	box-sizing: border-box;
	border: 3rpx solid rgba(255, 255, 255, 0.85);
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.18);
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.cat-dot-orange  { background-image: linear-gradient(145deg, #FFC078 0%, #F08C3C 100%); }
.cat-dot-siamese { background-image: linear-gradient(145deg, #E8D5B7 0%, #5A4638 100%); }
.cat-dot-calico  { background-image: linear-gradient(135deg, #FFFFFF 0%, #F5A65B 50%, #4A4038 100%); }
.cat-dot-cow     { background-image: linear-gradient(145deg, #FFFFFF 0%, #2B2B30 100%); }

.cat-dot-on {
	transform: scale(1.28);
	box-shadow: 0 0 0 3rpx var(--cat-ink), 0 3rpx 10rpx rgba(0, 0, 0, 0.24);
}

.cat-coat-name {
	font-size: 20rpx;
	font-weight: 600;
	color: var(--cat-ink);
	letter-spacing: 1rpx;
	margin-left: 14rpx;
	min-width: 76rpx;
}

/* 抚摸瞬间从猫头身后荡开的柔光圈 */
.cat-halo {
	position: absolute;
	top: 48%;
	left: 50%;
	width: 380rpx;
	height: 380rpx;
	border-radius: 50%;
	background-image: radial-gradient(circle, var(--cat-halo) 0%, rgba(255, 255, 255, 0) 66%);
	opacity: 0;
	transform: translate(-50%, -50%) scale(0.72);
	transition: opacity 0.4s ease, transform 0.4s ease;
	pointer-events: none;
}

.cat-halo-on {
	opacity: 1;
	transform: translate(-50%, -50%) scale(1.06);
	transition: opacity 0.08s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 猫头照片：四角柔和遮罩，融入毛玻璃背景 */
.cat-photo {
	position: relative;
	z-index: 2;
	display: block;
	width: 340rpx;
	height: 340rpx;
	border-radius: 46%;
	object-fit: cover;
	filter: drop-shadow(0 16rpx 26rpx rgba(60, 50, 90, 0.22));
	-webkit-mask-image: radial-gradient(circle at 50% 46%, #000 0%, #000 62%, rgba(0, 0, 0, 0) 78%);
	mask-image: radial-gradient(circle at 50% 46%, #000 0%, #000 62%, rgba(0, 0, 0, 0) 78%);
	transform-origin: 50% 82%;
	will-change: transform;
	pointer-events: none;
}

/* 被摸：整个猫头缩一下再弹回 */
.cat-patted {
	animation: cat-squish 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cat-squish {
	0%   { transform: scale(1) translateY(0); }
	20%  { transform: scale(1.06, 0.9) translateY(12rpx); }
	55%  { transform: scale(0.95, 1.06) translateY(-6rpx); }
	78%  { transform: scale(1.02, 0.98) translateY(2rpx); }
	100% { transform: scale(1) translateY(0); }
}

/* ---------- 爱心粒子：向上飘 + 左右摆 + 旋转 + 淡出 ---------- */
.cat-heart {
	position: absolute;
	z-index: 5;
	background-image: linear-gradient(150deg, #FF9EC4 0%, #FF5E9C 55%, #E5347C 100%);
	clip-path: polygon(50% 100%, 8% 56%, 0 32%, 4% 12%, 22% 2%, 38% 6%, 50% 20%, 62% 6%, 78% 2%, 96% 12%, 100% 32%, 92% 56%);
	-webkit-clip-path: polygon(50% 100%, 8% 56%, 0 32%, 4% 12%, 22% 2%, 38% 6%, 50% 20%, 62% 6%, 78% 2%, 96% 12%, 100% 32%, 92% 56%);
	filter: drop-shadow(0 0 10rpx var(--cat-glow));
	opacity: 0;
	pointer-events: none;
	animation: cat-heart-float 1.5s cubic-bezier(0.22, 0.7, 0.3, 1) forwards;
	will-change: transform, opacity;
}

@keyframes cat-heart-float {
	0% {
		opacity: 0;
		transform: translate(-50%, 20rpx) scale(0.4) rotate(var(--hrot, 0deg));
	}
	18% {
		opacity: 1;
		transform: translate(-50%, -10rpx) scale(1.1) rotate(var(--hrot, 0deg));
	}
	60% {
		opacity: 1;
		transform: translate(calc(-50% + 16rpx), -110rpx) scale(1) rotate(calc(var(--hrot, 0deg) + 12deg));
	}
	100% {
		opacity: 0;
		transform: translate(calc(-50% - 12rpx), -230rpx) scale(1.15) rotate(calc(var(--hrot, 0deg) - 10deg));
	}
}

.cat-hint {
	position: relative;
	z-index: 3;
	margin-top: 24rpx;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.cat-count {
	margin-top: 10rpx;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-dim);
	transition: color 0.45s;
}

.cat-num {
	font-size: 27rpx;
	font-weight: 700;
	color: var(--cat-ink);
}

/* 抽签 */
.sign-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 300rpx;
	padding: 40rpx 30rpx;
	box-sizing: border-box;
	border-radius: 34rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: rgba(255, 255, 255, 0.10);
	transition: transform 0.32s cubic-bezier(0.2, 1.3, 0.4, 1), opacity 0.32s ease;
}

.sign-card-rolling {
	transform: scale(0.97) rotate(-1.2deg);
	opacity: 0.72;
}

.sign-level {
	font-size: 46rpx;
	font-weight: 700;
	letter-spacing: 8rpx;
	transition: color 0.3s ease;
}

.sign-idle {
	color: var(--text-faint);
}

.sign-best {
	color: #f5c451;
}

.sign-good {
	color: #5aa9ff;
}

.sign-flat {
	color: var(--text-dim);
}

.sign-bad {
	color: #ff7a7a;
}

.sign-text {
	margin-top: 22rpx;
	text-align: center;
	font-size: 26rpx;
	line-height: 1.55;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

/* 答案之书 */
.answer-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	min-height: 300rpx;
	padding: 40rpx 34rpx;
	box-sizing: border-box;
	border-radius: 34rpx;
	border: 1rpx solid var(--glass-bd);
	background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.05) 100%);
	transition: transform 0.32s cubic-bezier(0.2, 1.3, 0.4, 1), opacity 0.32s ease;
}

.answer-card-rolling {
	transform: scale(0.97);
	opacity: 0.68;
}

.answer-hint {
	font-size: 21rpx;
	letter-spacing: 3rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.answer-text {
	margin-top: 24rpx;
	text-align: center;
	font-size: 34rpx;
	font-weight: 600;
	line-height: 1.45;
	letter-spacing: 2rpx;
	color: var(--text);
	transition: color 0.45s;
}

/* ---------- 计算器：液态玻璃小键盘 ---------- */
.calc-body {
	width: 100%;
}

.calc-screen {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	justify-content: flex-end;
	width: 100%;
	min-height: 150rpx;
	padding: 20rpx 26rpx;
	box-sizing: border-box;
	border-radius: 30rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg-2);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm);
	overflow: hidden;
}

.calc-expr {
	min-height: 30rpx;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.calc-out {
	margin-top: 6rpx;
	max-width: 100%;
	font-size: 54rpx;
	font-weight: 600;
	line-height: 1.12;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.calc-out-err {
	font-size: 32rpx;
	font-weight: 500;
	color: #ff7a7a;
}

.calc-pad {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	grid-auto-rows: 86rpx;
	gap: 14rpx;
	width: 100%;
	margin-top: 20rpx;
}

.calc-key {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 24rpx;
	border: 1rpx solid var(--seg-thumb-bd);
	background-color: var(--seg-thumb);
	box-shadow: inset 0 1rpx 0 var(--glass-hl), 0 4rpx 10rpx rgba(0, 0, 0, 0.10);
	transition: transform 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease;
}

.calc-key-active {
	transform: scale(0.93);
	box-shadow: inset 0 1rpx 0 var(--glass-hl), 0 1rpx 4rpx rgba(0, 0, 0, 0.10);
}

.calc-key-txt {
	font-size: 32rpx;
	font-weight: 500;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.calc-key-fn .calc-key-txt {
	font-size: 28rpx;
	color: var(--text-dim);
}

.calc-key-op .calc-key-txt {
	font-size: 38rpx;
	font-weight: 600;
	color: var(--accent);
}

.calc-key-eq {
	border-color: transparent;
	background-image: linear-gradient(180deg, var(--btn-a) 0%, var(--btn-b) 100%);
	box-shadow: 0 8rpx 20rpx rgba(10, 60, 140, 0.18), inset 0 1rpx 0 rgba(255, 255, 255, 0.5);
}

.calc-key-eq .calc-key-txt {
	font-size: 40rpx;
	font-weight: 700;
	color: var(--btn-txt);
}

.calc-key-wide {
	grid-column: span 2;
}

.calc-key-tall {
	grid-row: span 2;
}
</style>

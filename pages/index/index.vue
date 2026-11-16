<template>
	<view class="page" :class="theme === 'dark' ? 'theme-dark' : 'theme-light'">

		<!-- 液态玻璃背后的彩色光斑 -->
		<view class="blob blob-1"></view>
		<view class="blob blob-2"></view>
		<view class="blob blob-3"></view>

		<view class="content">

			<!-- 顶栏 -->
			<view class="topbar">
				<view class="brand">
					<view class="brand-dot"></view>
					<text class="brand-text">每日云海</text>
				</view>

				<view class="seg" @click="toggleTheme" @longpress="resetThemeAuto">
					<view class="seg-thumb" :class="{ 'seg-thumb-right': theme === 'dark' }"></view>
					<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'light' }">日</text></view>
					<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'dark' }">夜</text></view>
				</view>
			</view>

			<!-- 标题 -->
			<view class="hero">
				<text class="hero-date">{{ viewDate }}</text>
				<text class="hero-title">{{ heroTitle }}</text>
				<text class="hero-source">数据来源：@今天游离翻车了吗</text>
				<text class="hero-updated" v-if="isToday && updatedAt">更新于 {{ updatedAt }}</text>
			</view>

			<!-- 日期切换：昨天 / 今天 / 明天 -->
			<view class="daytabs">
				<view class="daytab" :class="{ 'daytab-on': dayOffset === -1 }" @click="switchDay(-1)">
					<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === -1 }">昨天</text>
				</view>
				<view class="daytab" :class="{ 'daytab-on': dayOffset === 0 }" @click="switchDay(0)">
					<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 0 }">今天</text>
				</view>
				<view class="daytab" :class="{ 'daytab-on': dayOffset === 1 }" @click="switchDay(1)">
					<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 1 }">明天</text>
				</view>
			</view>

			<!-- 任务列表 -->
			<view class="glass list">
				<view class="task" v-for="(item, index) in displayTasks" :key="index">
					<view class="badge"><text class="badge-txt">{{ pad(index + 1) }}</text></view>
					<text class="task-text">{{ item.text }}</text>
				</view>
				<view class="task" v-if="isToday && loading">
					<text class="task-text task-dim">正在读取数据…</text>
				</view>
				<view class="task" v-if="!displayTasks.length && !(isToday && loading)">
					<text class="task-text task-dim">{{ emptyText }}</text>
				</view>
			</view>

			<!-- 攻略图（仅今天有实时图，昨天/明天不展示） -->
			<view class="section" v-if="isToday">
				<text class="section-title">今日攻略图</text>
				<text class="section-hint">点击放大</text>
			</view>

			<view class="glass poster-card" v-if="isToday" @click="previewPoster">
				<image
					v-if="posterUrl && !posterError"
					class="poster"
					:src="posterUrl"
					mode="widthFix"
					@load="onPosterLoad"
					@error="onPosterError"
				></image>
				<view class="poster-fallback" v-else>
					<text class="fallback-text">{{ posterFallbackText }}</text>
					<view class="retry-btn" v-if="posterError" @click.stop="retryPoster">
						<text class="retry-txt">重新加载</text>
					</view>
				</view>
			</view>

			<!-- 主按钮 -->
			<view class="primary-btn" hover-class="primary-btn-active" :hover-stay-time="80" @click="copyTasks">
				<text class="primary-txt">一键复制任务</text>
			</view>

			<text class="footer">仅供个人游戏参考</text>
		</view>
	</view>
</template>

<script>
/**
 * 每日云海 · 禁术暗黑主题
 * ------------------------------------------------------------------
 * 接口一（文字任务）：https://api.t1qq.com/api/sky/gyrw?key=xxx
 *   返回结构：{ code, msg, rw: [ { text: '任务文案' }, ... ] }
 * 接口二（攻略图片）：https://api.t1qq.com/api/sky/sc/scrw?key=xxx
 *   注意：该接口 Content-Type 为 image/png，直接返回图片二进制流，
 *   不返回 JSON。所以「真实图片地址」就是这条接口 URL 本身，
 *   直接赋给 posterUrl 交给 <image> 加载即可。
 * 接口三（明日任务）：https://api.qmkjcm.cn/api/gy_mr_rw/
 *   关键点：这条接口一次返回「今天 + 明天」两组任务，是「明天」页签的
 *   唯一真实数据来源。上面两条只返回今天，试过 date/day/t/type/offset
 *   等参数全部无效，服务端不支持按日期查询。
 *   返回结构：{ code:200, data:{ task_list:[ {date:'YYYY-MM-DD', quest_cn:'文案'} ] } }
 *   该接口带 Access-Control-Allow-Origin: *，纯静态托管也能直接请求。
 * ------------------------------------------------------------------
 */
const CACHE_KEY = 'sky_guide_theme'; // 手动选择的主题：dark / light
const MODE_KEY = 'sky_guide_theme_mode'; // auto=按时间自动 / manual=用户手动选过
// 按日期存档：{ 'YYYY-MM-DD': { tasks: [{text, from}], at: 'HH:mm' } }
// 接口只返回「今天」，所以昨天只能靠本地存档回看
const ARCHIVE_KEY = 'sky_guide_archive';
// 明天任务接口：一次返回今天+明天两组，静态托管也能直连（CORS: *）
const MR_API = 'https://api.qmkjcm.cn/api/gy_mr_rw/';
// 自动模式的时间分界：6:00-17:59 白色主题，18:00-5:59 黑色主题
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

// 接口基地址：
//  · 有反向代理的环境（Vercel 的 rewrites / 本地 vite proxy）→ 相对路径 /api
//  · 纯静态托管（GitHub Pages 没有代理）→ 构建时注入绝对地址 https://api.t1qq.com/api
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api';

export default {
	data() {
		return {
			// -------- 主题：dark / light；themeMode: auto 按时间 / manual 手动 --------
			theme: 'dark',
			themeMode: 'auto',

			// -------- 接口配置 --------
			// 统一走相对路径 /api，由部署平台转发到 https://api.t1qq.com/api
			// · Vercel：vercel.json 的 rewrites 负责转发
			// · 本地 H5：vite.config.js 的 server.proxy 负责转发
			// 这样写既能绕开跨域，也不用把域名硬编码进前端代码。
			useMock: false, // 置 true 可切回纯 Mock 演示
			apiUrl: API_BASE + '/sky/gyrw',
			apiKey: 'BGqiyBXO4v8CS4JdoH7oUCcoWh',

			// 攻略图片接口：直接返回图片流，URL 本身即图片地址
			scrwUrl: API_BASE + '/sky/sc/scrw',
			scrwKey: 'BGqiyBXO4v8CS4JdoH7oUCcoWh',

			// 明天任务接口（固定绝对地址，不参与 /api 代理）
			mrUrl: MR_API,

			// -------- 页面数据 --------
			loading: false,
			tasks: [],
			posterUrl: '',
			posterError: false,
			posterLoading: true,
			updatedAt: '',
			lastFetchAt: 0, // 上次成功拉取任务的时间戳（毫秒）
			lastFetchDay: '', // 上次拉取时的日期 YYYY-MM-DD，用于判断是否跨天

			// -------- 日期切换 --------
			dayOffset: 0, // -1 昨天 / 0 今天 / 1 明天
			archivedTasks: [], // 非今天时展示的历史存档任务
			tomorrowTasks: [], // 接口返回的明日任务（真实数据）
			tomorrowLoading: false,
			tomorrowFetchedDay: '', // 上次拉取明日任务时「今天」的日期，用于跨天重取

			// -------- Mock 数据（4 条任务 + 1 张网络长图） --------
			mockTasks: [
				{ id: 1, text: '在云野圆形水池边找到沉睡的蜡烛，点亮后跟随光圈飞行一圈', from: '云野' },
				{ id: 2, text: '与一位好友牵手进入霞谷冰面，完成一次完整滑行', from: '霞谷' },
				{ id: 3, text: '收集雨林深处的 3 根蜡烛，注意避开冥龙巡逻路线', from: '雨林' },
				{ id: 4, text: '在禁阁顶层向先祖鞠躬，领取今日的季节蜡烛', from: '禁阁' }
			],
			mockPoster: '' // 演示模式不放假图，避免把占位图误认成今日攻略
		};
	},

	computed: {
		posterFallbackText() {
			if (this.posterError) return '长图加载失败，请检查网络';
			if (this.posterLoading) return '长图加载中…';
			return '暂无今日长图';
		},

		/* -------- 日期切换相关 -------- */
		isToday() {
			return this.dayOffset === 0;
		},

		viewDate() {
			return this.dayText(this.dayOffset);
		},

		heroTitle() {
			if (this.dayOffset === 0) return '今日任务';
			return this.dayOffset === -1 ? '昨日任务' : '明日任务';
		},

		displayTasks() {
			if (this.dayOffset === 1) return this.tomorrowTasks;
			if (this.dayOffset === -1) return this.archivedTasks;
			return this.tasks;
		},

		emptyText() {
			if (this.dayOffset === 1) {
				return this.tomorrowLoading ? '正在获取明天的任务…' : '暂时没拿到明天的任务，点上方「明天」可重试';
			}
			if (this.dayOffset === -1) return '这一天没有本地存档（应用每天首次打开时会自动存档）';
			return '暂无数据';
		}
	},

	onLoad() {
		// 主题：用户手动切换过就尊重手动选择，否则按当前时间自动（白天白、夜里黑）
		const cachedMode = uni.getStorageSync(MODE_KEY);
		const cached = uni.getStorageSync(CACHE_KEY);
		if (cachedMode === 'manual' && (cached === 'dark' || cached === 'light')) {
			this.themeMode = 'manual';
			this.theme = cached;
		} else {
			this.themeMode = 'auto';
			this.theme = this.autoTheme();
		}
		this.applyThemeBackground();

		// 先用 Mock 渲染，保证首屏立刻可见
		this.applyMock();

		// useMock 为 false 时发起三个独立请求：文字任务 + 攻略图片 + 明日任务
		if (!this.useMock) {
			// 先记下时间，避免 onLoad 之后紧跟的 onShow 又触发一次重复请求
			this.lastFetchAt = Date.now();
			this.lastFetchDay = this.todayText();
			this.fetchTasks();
			this.fetchPoster();
			this.fetchTomorrow(); // 顺带把明天也拿到，点「明天」不用等
		}
	},

	// 回到前台：①自动模式按当前时间重新判定主题 ②数据过期则静默重拉
	onShow() {
		if (this.themeMode === 'auto') {
			const t = this.autoTheme();
			if (t !== this.theme) {
				this.theme = t;
				this.applyThemeBackground();
			}
		}

		// 数据新鲜度检查：从后台切回来时，只要「跨天」或「超过 5 分钟没更新」就静默重拉。
		// 否则手机挂后台一整夜，早上打开看到的还是昨天的任务。
		if (this.useMock) return;
		const dayChanged = this.todayText() !== this.lastFetchDay;
		// 明日任务跟着日期走：一旦跨天，旧的那份就过期了
		if (dayChanged) {
			this.tomorrowTasks = [];
			this.fetchTomorrow();
		}
		if (!this.isToday || this.loading) return; // 正在看昨天/明天时不重复打扰
		const tooOld = Date.now() - this.lastFetchAt > 5 * 60 * 1000;
		if (dayChanged || tooOld) {
			this.fetchTasks(false, true);
			this.fetchPoster(false, true);
		}
	},

	// 下拉刷新（需在 pages.json 中开启 enablePullDownRefresh）
	onPullDownRefresh() {
		// 看明天时重新拉明日任务；看昨天时只重读本地存档
		if (this.dayOffset === 1) {
			this.fetchTomorrow();
			uni.stopPullDownRefresh();
			return;
		}
		if (this.dayOffset === -1) {
			this.loadArchive();
			uni.stopPullDownRefresh();
			return;
		}
		this.refresh();
	},

	// 分享给好友（小程序右上角菜单 / 按钮触发）
	onShareAppMessage() {
		return {
			title: `今日任务 · ${this.todayText()}`,
			path: '/pages/index/index',
			imageUrl: this.posterUrl || ''
		};
	},

	// 分享到朋友圈
	onShareTimeline() {
		return {
			title: `今日任务 · ${this.todayText()}`
		};
	},

	methods: {
		pad(n) {
			return n < 10 ? '0' + n : '' + n;
		},

		/* ---------------- 日期切换与本地存档 ---------------- */
		/* 取相对今天偏移 N 天的日期字符串：0=今天，-1=昨天，1=明天 */
		dayText(offset) {
			const d = new Date();
			d.setDate(d.getDate() + offset);
			return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
		},

		switchDay(offset) {
			this.dayOffset = offset;
			if (offset === -1) this.loadArchive();
			if (offset === 1) {
				// 没拿到过、或已经跨天，就重新拉一次明日任务
				if (!this.tomorrowTasks.length || this.tomorrowFetchedDay !== this.todayText()) {
					this.fetchTomorrow();
				}
			}
		},

		/* 读取某一天的历史存档（没有就展示空态提示） */
		loadArchive() {
			let archive = {};
			try {
				archive = uni.getStorageSync(ARCHIVE_KEY) || {};
			} catch (e) {
				archive = {};
			}
			const rec = archive[this.viewDate];
			const list = rec && Array.isArray(rec.tasks) ? rec.tasks : [];
			this.archivedTasks = list.map((t, i) => ({
				id: i + 1,
				text: t.text || '',
				from: t.from || ''
			}));
		},

		/* 每次成功拿到今日任务就存一份档，供以后回看 */
		saveArchive() {
			if (this.tasks.length) this.saveArchiveFor(this.todayText(), this.tasks);
		},

		/* 把某一天的任务写入本地存档（保留最近 30 天） */
		saveArchiveFor(date, list) {
			if (!date || !list || !list.length) return;
			let archive = {};
			try {
				archive = uni.getStorageSync(ARCHIVE_KEY) || {};
			} catch (e) {
				archive = {};
			}
			archive[date] = {
				tasks: list.map(t => ({ text: t.text, from: t.from || '' })),
				at: this.nowText()
			};
			// 只保留最近 30 天，避免本地存储无限增长
			const days = Object.keys(archive).sort();
			while (days.length > 30) delete archive[days.shift()];
			try {
				uni.setStorageSync(ARCHIVE_KEY, archive);
			} catch (e) {
				// 存储写满时忽略，不影响主流程
			}
		},

		/* ---------------- 明日任务（真实数据） ----------------
		 * 这条接口一次返回「今天 + 明天」两组，所以：
		 *   · 抽出 date === 明天的写进 tomorrowTasks 供「明天」页签展示
		 *   · 顺手把今天那组也存档，等于多一条真实来源的备份
		 */
		fetchTomorrow() {
			if (this.useMock) return;
			const tomorrow = this.dayText(1);
			const today = this.todayText();
			this.tomorrowLoading = true;

			uni.request({
				url: this.mrUrl,
				method: 'GET',
				timeout: 12000,
				success: res => {
					let body = res && res.data;
					if (typeof body === 'string') {
						try {
							body = JSON.parse(body);
						} catch (e) {
							body = null;
						}
					}
					const list = body && body.data && body.data.task_list;
					this.tomorrowLoading = false;
					if (!Array.isArray(list) || !list.length) return;

					// 按日期分组
					const grouped = {};
					list.forEach(item => {
						if (!item || !item.date || !item.quest_cn) return;
						(grouped[item.date] = grouped[item.date] || []).push({ text: item.quest_cn, from: '' });
					});

					const tmr = grouped[tomorrow] || [];
					if (tmr.length) {
						this.tomorrowTasks = tmr.map((t, i) => ({ id: i + 1, text: t.text, from: '' }));
						this.saveArchiveFor(tomorrow, tmr);
					}
					this.tomorrowFetchedDay = today;
					// 今天那一组也存一份（真实来源，接口挂掉时还有得看）
					if (grouped[today] && grouped[today].length) {
						this.saveArchiveFor(today, grouped[today]);
					}
				},
				fail: () => {
					this.tomorrowLoading = false;
				}
			});
		},

		/* ---------------- 主题切换 ---------------- */
		toggleTheme() {
			this.theme = this.theme === 'dark' ? 'light' : 'dark';
			this.themeMode = 'manual'; // 用户手动选过，之后不再被时间覆盖
			uni.setStorageSync(CACHE_KEY, this.theme);
			uni.setStorageSync(MODE_KEY, 'manual');
			this.applyThemeBackground();
		},

		/* 按当前时间判定：6:00-17:59 白色，18:00-5:59 黑色 */
		autoTheme() {
			const hour = new Date().getHours();
			return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? 'light' : 'dark';
		},

		/* 长按切换控件：恢复「按时间自动」 */
		resetThemeAuto() {
			this.themeMode = 'auto';
			uni.setStorageSync(MODE_KEY, 'auto');
			uni.removeStorageSync(CACHE_KEY);
			this.theme = this.autoTheme();
			this.applyThemeBackground();
			uni.showToast({ title: '已恢复自动日夜', icon: 'none' });
		},

		/* 让页面根背景（下拉回弹 / 安全区露底处）跟随当前主题 */
		applyThemeBackground() {
			const dark = this.theme === 'dark';
			const bg = dark ? '#07090E' : '#EEF1F7';
			// #ifdef H5
			if (typeof document !== 'undefined') {
				document.body.style.backgroundColor = bg;
			}
			// #endif
			// #ifndef H5
			uni.setBackgroundColor({
				backgroundColor: bg,
				backgroundColorTop: bg,
				backgroundColorBottom: bg
			});
			// #endif
		},

		/* ---------------- Mock 渲染 ---------------- */
		applyMock() {
			this.tasks = this.mockTasks.map(item => Object.assign({}, item));
			if (this.useMock) {
				// 纯演示模式：没有真实接口，长图位显示占位文案
				this.posterUrl = this.mockPoster;
				this.posterError = false;
				this.posterLoading = false;
			}
		},

		/* ---------------- 下拉刷新 ---------------- */
		refresh() {
			if (this.useMock) {
				// 模拟网络延迟，方便观察下拉刷新效果
				setTimeout(() => {
					this.applyMock();
					uni.stopPullDownRefresh();
					uni.showToast({ title: '已刷新', icon: 'none' });
				}, 600);
				return;
			}
			// 下拉刷新：两个接口同时重新拉取
			this.fetchTasks(true);
			this.fetchPoster(true);
		},

		/* ---------------- 真实接口 ---------------- */
		fetchTasks(isPullDown, silent) {
			if (!isPullDown && !silent) this.loading = true;

			uni.request({
				url: this.apiUrl,
				method: 'GET',
				data: { key: this.apiKey },
				timeout: 10000,
				success: res => {
					// 记录拉取时间，供 onShow 判断数据是否过期
					this.lastFetchAt = Date.now();
					this.lastFetchDay = this.todayText();

					// 该接口 Content-Type 为 text/json，部分环境会当成字符串返回，
					// 这里统一解析一次，避免 body.rw 取不到而误回退 Mock。
					let body = res && res.data;
					if (typeof body === 'string') {
						try {
							body = JSON.parse(body);
						} catch (e) {
							body = null;
						}
					}
					const rw = body && body.rw;

					if (Array.isArray(rw) && rw.length) {
						// 返回数据在 rw 数组的 text 字段
						this.tasks = rw.map((item, i) => ({
							id: i + 1,
							text: item.text || '',
							from: item.type || '每日任务'
						}));
						this.updatedAt = this.nowText();
						// 存档一份，供以后「昨天」回看
						this.saveArchive();
						// 攻略图片由独立的 scrw 接口获取，这里不处理
					} else {
						uni.showToast({ title: '数据格式异常，已回退 Mock', icon: 'none' });
						this.applyMock();
					}
				},
				fail: () => {
					uni.showToast({ title: '网络异常，已回退 Mock', icon: 'none' });
					this.applyMock();
				},
				complete: () => {
					this.loading = false;
					if (isPullDown) uni.stopPullDownRefresh();
				}
			});
		},

		/* ---------------- 攻略图片接口（独立请求） ----------------
		 * scrw 返回的是 image/png 二进制流，不是 JSON，
		 * 所以「真实图片地址」就是这条接口 URL 本身。
		 * 这里单独发一次请求探测响应头：
		 *   · Content-Type 含 image → 直接把该 URL 赋给 posterUrl
		 *   · 若接口将来改成返回 JSON → 从 img / pic / url / data 里提取真实地址
		 */
		fetchPoster(isPullDown, silent) {
			const url = this.scrwUrl + '?key=' + this.scrwKey;
			// 静默刷新时不显示「长图加载中…」，避免切回前台闪一下占位文案
			if (!silent) this.posterLoading = true;
			this.posterError = false;

			uni.request({
				url: url,
				method: 'GET',
				responseType: 'arraybuffer', // 返回二进制图片，避免被当文本解析
				timeout: 20000,
				success: res => {
					const header = res.header || {};
					const ct = header['content-type'] || header['Content-Type'] || '';

					if (ct.indexOf('image') > -1) {
						// 图片流：接口地址本身就是可用图片地址
						this.posterUrl = url;
						this.posterError = false;
						return;
					}

					// 兼容返回 JSON 的情况
					let body = res.data;
					if (typeof body === 'string') {
						try {
							body = JSON.parse(body);
						} catch (e) {
							body = null;
						}
					}

					const real = this.pickImageUrl(body);
					if (real) {
						this.posterUrl = real;
						this.posterError = false;
					} else {
						this.posterError = true;
					}
				},
				fail: () => {
					// 请求失败时不覆盖已有图片，仅标记错误
					this.posterError = true;
				},
				complete: () => {
					this.posterLoading = false;
					if (isPullDown) uni.stopPullDownRefresh();
				}
			});
		},

		/* 长图加载失败后手动重试 */
		retryPoster() {
			this.posterError = false;
			this.fetchPoster();
		},

		/* 从任意 JSON 结构中取出第一个 http(s) 图片地址 */
		pickImageUrl(body) {
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
					const inner = this.pickImageUrl(v);
					if (inner) return inner;
				}
			}
			return '';
		},

		/* ---------------- 长图预览 ---------------- */
		previewPoster() {
			if (!this.posterUrl || this.posterError) {
				uni.showToast({ title: '暂无可用长图', icon: 'none' });
				return;
			}
			uni.previewImage({
				urls: [this.posterUrl],
				current: this.posterUrl
			});
		},

		onPosterLoad() {
			this.posterLoading = false;
			this.posterError = false;
		},

		onPosterError() {
			this.posterLoading = false;
			this.posterError = true;
		},

		/* ---------------- 一键复制 ---------------- */
		copyTasks() {
			// 复制的是当前正在看的这一天（今天 / 昨天 / 明天）
			const list = this.displayTasks;
			if (!list.length) {
				uni.showToast({ title: '这一天暂无任务', icon: 'none' });
				return;
			}

			const body = list.map((t, i) => `${i + 1}. ${t.text}`).join('\n');
			const content = `【${this.heroTitle}】${this.viewDate}\n${body}\n数据来源：@今天游离翻车了吗`;

			uni.setClipboardData({
				data: content,
				success: () => uni.showToast({ title: '任务文本已复制', icon: 'none' })
			});
		},

		nowText() {
			const d = new Date();
			return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
		},

		todayText() {
			const d = new Date();
			return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
		}
	}
};
</script>

<style>
/* ==========================================================
   iOS 液态玻璃主题
   ========================================================== */
.theme-dark {
	--bg: #07090E;
	--text: #F5F7FA;
	--text-dim: rgba(245, 247, 250, 0.60);
	--text-faint: rgba(245, 247, 250, 0.36);
	--glass-a: rgba(255, 255, 255, 0.105);
	--glass-b: rgba(255, 255, 255, 0.035);
	--glass-bd: rgba(255, 255, 255, 0.16);
	--line: rgba(255, 255, 255, 0.075);
	--accent: #7FD6FF;
	--accent-2: #B49BFF;
	--blob-a: rgba(90, 120, 255, 0.55);
	--blob-b: rgba(150, 90, 230, 0.42);
	--blob-c: rgba(0, 190, 220, 0.30);
	--shadow: 0 22rpx 54rpx rgba(0, 0, 0, 0.52);
	--btn-a: #7FD6FF;
	--btn-b: #B49BFF;
	--btn-txt: #06121B;
	--seg-bg: rgba(255, 255, 255, 0.10);
	--seg-thumb: rgba(255, 255, 255, 0.92);
}

.theme-light {
	--bg: #EEF1F7;
	--text: #0E1116;
	--text-dim: rgba(14, 17, 22, 0.58);
	--text-faint: rgba(14, 17, 22, 0.38);
	--glass-a: rgba(255, 255, 255, 0.82);
	--glass-b: rgba(255, 255, 255, 0.50);
	--glass-bd: rgba(255, 255, 255, 0.95);
	--line: rgba(14, 17, 22, 0.07);
	--accent: #0A84FF;
	--accent-2: #7B5CFF;
	--blob-a: rgba(120, 170, 255, 0.42);
	--blob-b: rgba(180, 140, 255, 0.34);
	--blob-c: rgba(110, 220, 220, 0.28);
	--shadow: 0 20rpx 44rpx rgba(22, 34, 56, 0.12);
	--btn-a: #0A84FF;
	--btn-b: #7B5CFF;
	--btn-txt: #FFFFFF;
	--seg-bg: rgba(255, 255, 255, 0.62);
	--seg-thumb: rgba(255, 255, 255, 1);
}

.page {
	position: relative;
	min-height: 100vh;
	background-color: var(--bg);
	color: var(--text);
	overflow: hidden;
	transition: background-color 0.45s ease, color 0.45s ease;
}

/* ---------- 背景光斑（玻璃折射的来源） ---------- */
.blob {
	position: fixed;
	border-radius: 50%;
	pointer-events: none;
	z-index: 0;
}

.blob-1 {
	top: -240rpx;
	left: -180rpx;
	width: 680rpx;
	height: 680rpx;
	background-image: radial-gradient(circle at 50% 50%, var(--blob-a) 0%, rgba(0, 0, 0, 0) 68%);
}

.blob-2 {
	top: 300rpx;
	right: -260rpx;
	width: 620rpx;
	height: 620rpx;
	background-image: radial-gradient(circle at 50% 50%, var(--blob-b) 0%, rgba(0, 0, 0, 0) 70%);
}

.blob-3 {
	bottom: -180rpx;
	left: 40rpx;
	width: 560rpx;
	height: 560rpx;
	background-image: radial-gradient(circle at 50% 50%, var(--blob-c) 0%, rgba(0, 0, 0, 0) 70%);
}

.content {
	position: relative;
	z-index: 1;
	padding-left: 32rpx;
	padding-right: 32rpx;
	padding-top: calc(var(--status-bar-height, 20px) + 16rpx);
	padding-bottom: calc(56rpx + env(safe-area-inset-bottom));
}

/* ---------- 玻璃基类 ---------- */
.glass {
	position: relative;
	overflow: hidden;
	border-radius: 40rpx;
	border: 1rpx solid var(--glass-bd);
	background-image: linear-gradient(158deg, var(--glass-a) 0%, var(--glass-b) 100%);
	box-shadow: var(--shadow), inset 0 1rpx 0 rgba(255, 255, 255, 0.26);
	transition: background-image 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
}

/* 顶部斜向高光：模拟玻璃边缘折射 */
.glass::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 46%;
	background-image: linear-gradient(176deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0) 100%);
	pointer-events: none;
}

/* ---------- 顶栏 ---------- */
.topbar {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	height: 96rpx;
	padding: 0 8rpx;
	/* #ifdef MP-WEIXIN */
	/* 小程序右上角是微信胶囊按钮，顶栏右侧必须让出安全区，避免日夜切换被遮挡 */
	padding-right: 220rpx;
	/* #endif */
}

.brand {
	display: flex;
	align-items: center;
}

.brand-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background-image: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
	box-shadow: 0 0 14rpx var(--accent);
}

.brand-text {
	margin-left: 14rpx;
	font-size: 27rpx;
	font-weight: 500;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

/* 日夜分段控件 */
.seg {
	position: relative;
	display: flex;
	flex-shrink: 0;
	margin-left: 20rpx;
	width: 136rpx;
	height: 60rpx;
	padding: 4rpx;
	box-sizing: border-box;
	border-radius: 999rpx;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
}

.seg-thumb {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	width: 62rpx;
	height: 48rpx;
	border-radius: 999rpx;
	background-color: var(--seg-thumb);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
	transition: transform 0.36s cubic-bezier(0.32, 1.3, 0.5, 1);
}

.seg-thumb-right {
	transform: translateX(62rpx);
}

.seg-item {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1;
}

.seg-txt {
	font-size: 22rpx;
	color: var(--text-dim);
	transition: color 0.3s ease;
}

.seg-txt-on {
	color: #0E1116;
	font-weight: 600;
}

/* ---------- 日期切换（昨天 / 今天 / 明天） ---------- */
.daytabs {
	display: flex;
	align-items: center;
	margin-bottom: 24rpx;
	padding: 5rpx;
	border-radius: 999rpx;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
}

.daytab {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 62rpx;
	border-radius: 999rpx;
	transition: background-color 0.3s ease;
}

.daytab-on {
	background-color: var(--seg-thumb);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.18);
}

.daytab-txt {
	font-size: 24rpx;
	letter-spacing: 1rpx;
	color: var(--text-dim);
	transition: color 0.3s ease;
}

.daytab-txt-on {
	color: #0E1116;
	font-weight: 600;
}

/* ---------- 标题 ---------- */
.hero {
	padding: 44rpx 8rpx 38rpx;
}

.hero-date {
	display: block;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.hero-title {
	display: block;
	margin-top: 14rpx;
	font-size: 64rpx;
	font-weight: 600;
	letter-spacing: 4rpx;
	line-height: 1.24;
	color: var(--text);
	transition: color 0.45s;
}

.hero-source {
	display: block;
	margin-top: 16rpx;
	font-size: 22rpx;
	color: var(--text-dim);
	transition: color 0.45s;
}

.hero-updated {
	display: block;
	margin-top: 8rpx;
	font-size: 20rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

/* ---------- 任务列表 ---------- */
.task {
	position: relative;
	display: flex;
	align-items: flex-start;
	padding: 32rpx 30rpx;
	border-bottom: 1rpx solid var(--line);
}

.task:last-child {
	border-bottom: none;
}

.badge {
	width: 44rpx;
	height: 44rpx;
	flex-shrink: 0;
	margin-top: 4rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-image: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
	box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.26);
}

.badge-txt {
	font-size: 20rpx;
	font-weight: 600;
	color: #06121B;
}

.task-text {
	flex: 1;
	margin-left: 22rpx;
	font-size: 30rpx;
	line-height: 1.62;
	letter-spacing: 0.3rpx;
	color: var(--text);
	transition: color 0.45s;
}

.task-dim {
	color: var(--text-dim);
}

/* ---------- 分区标题 ---------- */
.section {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin: 46rpx 8rpx 20rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.section-hint {
	font-size: 22rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

/* ---------- 攻略图 ---------- */
.poster-card {
	padding: 0;
}

.poster {
	display: block;
	width: 100%;
	height: auto;
	min-height: 360rpx;
}

.poster-fallback {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 360rpx;
}

.fallback-text {
	font-size: 24rpx;
	color: var(--text-dim);
}

.retry-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 60rpx;
	margin-top: 22rpx;
	padding: 0 30rpx;
	border-radius: 999rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: rgba(255, 255, 255, 0.10);
}

.retry-txt {
	font-size: 24rpx;
	color: var(--accent);
}

/* ---------- 主按钮 ---------- */
.primary-btn {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100rpx;
	margin-top: 48rpx;
	overflow: hidden;
	border-radius: 999rpx;
	background-image: linear-gradient(135deg, var(--btn-a) 0%, var(--btn-b) 100%);
	box-shadow: 0 16rpx 36rpx rgba(0, 0, 0, 0.28), inset 0 1rpx 0 rgba(255, 255, 255, 0.55);
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.primary-btn::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 50%;
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0) 100%);
	pointer-events: none;
}

.primary-btn-active {
	transform: scale(0.982);
	opacity: 0.88;
}

.primary-txt {
	position: relative;
	z-index: 1;
	font-size: 30rpx;
	font-weight: 600;
	letter-spacing: 3rpx;
	color: var(--btn-txt);
}

.footer {
	display: block;
	margin-top: 40rpx;
	text-align: center;
	font-size: 20rpx;
	letter-spacing: 2rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}
</style>

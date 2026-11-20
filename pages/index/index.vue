<template>
	<view class="page" :class="[theme === 'dark' ? 'theme-dark' : 'theme-light', 'phase-' + phase]">

		<!-- 液态玻璃背后的彩色光斑 -->
		<view class="blob blob-1"></view>
		<view class="blob blob-2"></view>
		<view class="blob blob-3"></view>

		<view class="content">

			<!-- 顶栏 -->
			<view class="topbar">
				<view class="brand">
					<view class="brand-dot"></view>
					<text class="brand-text">冰块</text>
				</view>

				<view class="topbar-right">
					<view class="seg"
						@touchstart="onDragStart($event, 'seg')"
						@touchmove.stop.prevent="onDragMove($event, 'seg')"
						@touchend="onDragEnd($event, 'seg')"
						@touchcancel="onDragEnd($event, 'seg')"
						@mousedown.prevent="onDragStart($event, 'seg')"
						@click="onSegClick"
						@longpress="resetThemeAuto">
						<view class="liq-thumb seg-thumb" :style="segThumbStyle"><view class="liq-lens" :class="{ 'liq-lens-on': segPress }"></view></view>
						<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'light' }" :style="segTxtStyle(0)">日</text></view>
						<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'dark' }" :style="segTxtStyle(1)">夜</text></view>
					</view>

					<view class="refresh-btn" @click="reloadPage">
						<text class="refresh-icon" :class="{ 'refresh-spin': reloading }">&#8635;</text>
					</view>
				</view>
			</view>

			<!-- 标题 -->
			<view class="hero">
				<view class="hero-row">
					<view class="hero-main">
						<text class="hero-date">{{ viewDate }}</text>
						<text class="hero-title">{{ heroTitle }}</text>
						<text class="hero-jl" v-if="jlLine">{{ jlLine }}</text>
					</view>

					<!-- 右侧信息组：12 小时制实时时钟 + 距刷新倒计时 -->
					<view class="hero-clock">
						<view class="clock-row">
							<text class="clock-mer">{{ clockMer }}</text>
							<text class="clock-time">{{ clockTime }}</text>
						</view>
						<text class="clock-tip" v-if="refreshTip">{{ refreshTip }}</text>
					</view>
				</view>

				<text class="hero-updated" v-if="isToday && updatedAt">更新于 {{ updatedAt }}</text>
			</view>

			<!-- 日期切换：昨天 / 今天 / 明天 -->
			<view class="daytabs-row">
				<view class="daytabs"
					@touchstart="onDragStart($event, 'day')"
					@touchmove.stop.prevent="onDragMove($event, 'day')"
					@touchend="onDragEnd($event, 'day')"
					@touchcancel="onDragEnd($event, 'day')"
					@mousedown.prevent="onDragStart($event, 'day')">
					<view class="liq-thumb daytabs-thumb" :style="dayThumbStyle"><view class="liq-lens" :class="{ 'liq-lens-on': dayPress }"></view></view>
					<view class="daytab" @click="switchDay(-1)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === -1 }" :style="dayTxtStyle(-1)">昨天</text>
					</view>
					<view class="daytab" @click="switchDay(0)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 0 }" :style="dayTxtStyle(0)">今天</text>
					</view>
					<view class="daytab" @click="switchDay(1)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 1 }" :style="dayTxtStyle(1)">明天</text>
					</view>
				</view>
			</view>

			<!-- 季蜡位置：整块提前到「每日任务」前面（数据/点击/样式与原「更多攻略」里的那张卡完全一致） -->
			<!-- #ifdef H5 -->
			<view class="section" v-if="isToday">
				<text class="section-title">季蜡位置</text>
				<text class="section-hint">点击查看</text>
			</view>

			<view v-if="isToday" class="guide-strip">
				<view
					class="guide-card"
					:class="'guide-' + jlGuide.status"
					:key="jlGuide.key"
					@click="openGuide(jlGuideIndex)"
				>
					<view class="guide-mark"><text class="guide-mark-txt">{{ jlGuide.mark }}</text></view>
					<text class="guide-name">{{ jlGuide.name }}</text>
					<text class="guide-desc">{{ guideCardDesc(jlGuide) }}</text>
				</view>
			</view>
			<!-- #endif -->

			<!-- 任务列表 -->
			<view class="glass list">
				<view
					class="task"
					:class="{ 'task-tap': hasShots }"
					v-for="(item, index) in displayTasks"
					:key="item.id || item.text"
					@click="hasShots && openTaskShot(index)"
				>
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

			<!-- 外层「保存图片」按钮已删除：保存入口保留在 攻略图弹层 与 任务单图弹层 里 -->

			<!-- 更多攻略：横向卡片 + 共用一个查看弹层（仅 H5） -->
			<!-- #ifdef H5 -->
			<view class="section" v-if="isToday">
				<text class="section-title">更多攻略</text>
				<text class="section-hint">左右滑动</text>
			</view>

			<view v-if="isToday" class="guide-strip">
				<!-- 季蜡位置已提前到「每日任务」上方单独展示，这里跳过，其余卡保持原索引 -->
				<template v-for="(g, i) in guides" :key="g.key">
					<view
						class="guide-card"
						:class="'guide-' + g.status"
						v-if="g.key !== 'jl'"
						@click="openGuide(i)"
					>
						<view class="guide-mark"><text class="guide-mark-txt">{{ g.mark }}</text></view>
						<text class="guide-name">{{ g.name }}</text>
						<text class="guide-desc">{{ guideCardDesc(g) }}</text>
					</view>
				</template>
			</view>

			<view class="sheet-mask" v-if="guideOpen" @click="closeGuide">
				<view class="sheet glass" @click.stop>
					<view class="sheet-head">
						<text class="sheet-title">{{ activeGuide.name }}</text>
						<view class="sheet-close" @click="closeGuide">
							<text class="sheet-close-txt">关闭</text>
						</view>
					</view>

					<view class="sheet-body">
						<image
							v-if="activeGuide.url && activeGuide.status !== 'error'"
							class="sheet-img"
							:src="activeGuide.url"
							mode="widthFix"
							@load="onGuideImgLoad(guideActive)"
							@click="previewGuide"
							@error="onGuideImgError(guideActive)"
						></image>
						<view class="sheet-fallback" v-else>
							<text class="fallback-text">{{ guideFallbackText }}</text>
							<view class="retry-btn" v-if="guideCanRetry" @click.stop="loadGuide(guideActive)">
								<text class="retry-txt">重新加载</text>
							</view>
						</view>

						<view class="save-bar save-bar-in" v-if="activeGuide.url && activeGuide.status === 'ok'">
							<view class="save-btn" hover-class="save-btn-active" :hover-stay-time="80" @click.stop="downloadImage(activeGuide.url, '冰块-' + activeGuide.name + '.png')">
								<text class="save-btn-txt">保存图片</text>
							</view>
						</view>

						<!-- 红石 / 黑石：今日降落时间，纯前端按「日期 + 星期」推算，不发请求 -->
						<view class="hs-drop" v-if="activeGuide.key === 'hs'">
							<view class="hs-drop-head">
								<text class="hs-drop-title">今日降落时间</text>
								<view
									class="hs-drop-tag"
									:class="hsDrop.type === '红石' ? 'hs-tag-red' : 'hs-tag-black'"
									v-if="hsDrop.type"
								>
									<text class="hs-drop-tag-txt">{{ hsDrop.type }}</text>
								</view>
							</view>

							<view class="hs-slots" v-if="hsDrop.slots.length">
								<view class="hs-slot" v-for="(s, i) in hsDrop.slots" :key="s">
									<text class="hs-slot-idx">第{{ i + 1 }}次</text>
									<text class="hs-slot-time">{{ s }}</text>
								</view>
							</view>

							<view class="hs-empty" v-else>
								<text class="hs-empty-txt">今日无红石/黑石</text>
							</view>
						</view>
					</view>

					<text class="sheet-tip" v-if="activeGuide.status === 'ok'">点击图片可全屏查看</text>
				</view>
			</view>
			<!-- #endif -->

			<!-- 主按钮：复制任务 + 生成分享图，两个并排 -->

			<view class="btn-row">
				<view class="primary-btn" hover-class="primary-btn-active" :hover-stay-time="80" @click="copyTasks">
					<text class="primary-txt">一键复制任务</text>
				</view>
				<view class="primary-btn" hover-class="primary-btn-active" :hover-stay-time="80" @click="makeSharePoster">
					<text class="primary-txt">{{ sharing ? '生成中…' : '生成分享图' }}</text>
				</view>
			</view>

			<!-- 分享图离屏画布：定位移出屏幕（不能用 display:none，否则 H5 画不出内容） -->
			<canvas
				class="share-canvas"
				canvas-id="shareCanvas"
				id="shareCanvas"
				:style="{ width: '600px', height: shareCanvasH + 'px' }"
			></canvas>

			<text class="footer">仅供个人游戏参考</text>
		</view>

		<!-- #ifdef H5 -->
			<!-- 单条任务大图：从四宫格攻略图里抠出对应那一格，全屏查看 -->
			<view
				class="shot-mask"
				:class="{ 'shot-mask-on': shotOpen }"
				@click="closeShot"
				@touchmove.stop.prevent
			>
				<view class="shot-panel" @click.stop>
					<view class="shot-head">
						<view class="shot-badge"><text class="shot-badge-txt">{{ pad(shotIdx + 1) }}</text></view>
						<text class="shot-title">{{ shotTaskText }}</text>
						<view class="shot-close" @click="closeShot"><text class="shot-close-txt">关闭</text></view>
					</view>

					<view
						class="shot-stage"
						:style="shotStageStyle"
						@touchstart="onShotTouchStart"
						@touchend="onShotTouchEnd"
					>
						<image class="shot-img" :src="posterUrl" mode="scaleToFill" :style="shotImgStyle(shotIdx)"></image>
					</view>

					<view class="shot-foot">
						<view class="shot-dots">
							<view
								class="shot-dot"
								v-for="n in Math.min(4, displayTasks.length)"
								:key="n"
								:class="{ 'shot-dot-on': shotIdx === n - 1 }"
								@click="shotIdx = n - 1"
							></view>
						</view>
						<view class="shot-acts">
							<view class="save-btn save-btn-dark" hover-class="save-btn-active" :hover-stay-time="80" @click.stop="downloadShot">
								<text class="save-btn-txt">保存图片</text>
							</view>
							<view class="shot-full" @click="showFullPoster"><text class="shot-full-txt">看整张攻略图</text></view>
						</view>
					</view>
					<text class="shot-hint">左右滑动切换其它任务</text>
				</view>
			</view>

			<!-- 娱乐模块（摸小猫 / 抽签 / 答案之书 / 计算器）已拆到 components/play-drawer -->
			<play-drawer />

		<!-- #endif -->
	</view>
</template>

<script>
import PlayDrawer from '../../components/play-drawer/play-drawer.vue';
import {
	withKey,
	safeJson,
	GUIDE_API,
	fetchTasks as apiFetchTasks,
	fetchPosterUrl,
	fetchTomorrow as apiFetchTomorrow,
	fetchJinLa as apiFetchJinLa,
	fetchGuideJson as apiFetchGuideJson,
	fetchGuideTexts as apiFetchGuideTexts
} from '../../api/sky.js';
import { getShotRects, getHsDrop, FALLBACK_POSTER_W, FALLBACK_POSTER_H } from '../../utils/guide-config.js';
import {
	thumbStyle as sliderThumbStyle,
	tabActivity as sliderTabActivity,
	mixTxtStyle as sliderMixTxtStyle,
	dampIdx as sliderDampIdx
} from '../../utils/liquid-slider.js';
import {
	measureShareLayout as measureShareLayoutImpl,
	drawSharePosterH5 as paintShareH5,
	drawSharePosterNative as paintShareNative
} from '../../utils/share-poster.js';

/* 本页只保留与 UI 直接相关的本地状态键；接口地址、密钥、控速队列都在 api/sky.js */
const CACHE_KEY = 'sky_guide_theme';
const MODE_KEY = 'sky_guide_theme_mode';
const ARCHIVE_KEY = 'sky_guide_archive'; // 接口只给今天，昨天回看靠本地存档
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

export default {
	components: { PlayDrawer },

	data() {
		return {
			// -------- 主题：dark / light；themeMode: auto 按时间 / manual 手动 --------
			theme: 'dark',
			themeMode: 'auto',
			// 动态背景时段：dawn 清晨 / day 白天 / dusk 傍晚 / night 夜晚
			phase: 'day',

			// -------- 接口配置 --------
			// 接口地址、密钥与控速队列统一收敛在 api/sky.js，页面不再持有任何接口常量

			// -------- 页面数据 --------
			loading: false,
			tasks: [],
			// 季蜡所在位置（来自 /sky/sc/lzwz 的 jlwz.text，如「雨林1」）
			// 该接口只支持 key 一个参数，没有明日数据，所以 jlTomorrow 预留但不填充
			jlToday: '',
			jlTomorrow: '',
			posterUrl: '',
			posterError: false,
			posterLoading: true,
			posterW: 0, // 攻略图原始宽高：用来算四宫格切割比例
			posterH: 0,
			shotOpen: false, // 单条任务大图弹层
			shotIdx: 0, // 当前看的是第几条（0 起）
			shotTouchX: 0,
			vpW: 0, // 浏览器可视区域（visualViewport）：iOS Safari 地址栏/工具栏会改变它
			vpH: 0,
			updatedAt: '',
			lastFetchAt: 0, // 上次成功拉取任务的时间戳（毫秒）
			lastFetchDay: '', // 上次拉取时的日期 YYYY-MM-DD，用于判断是否跨天

			// -------- 日期切换 --------
			dayOffset: 0, // -1 昨天 / 0 今天 / 1 明天
			archivedTasks: [], // 非今天时展示的历史存档任务
			tomorrowTasks: [], // 接口返回的明日任务（真实数据）
			tomorrowLoading: false,
			tomorrowFetchedDay: '', // 上次拉取明日任务时「今天」的日期，用于跨天重取

			// -------- 液态玻璃滑块（弹簧动画的实时状态） --------
			// idx 是「第几格」，允许小数：滑动过程中会经过 1.37 这种中间值
			dayTabIdx: 1, // 昨天=0 / 今天=1 / 明天=2
			dayTabStretch: 0, // 拖动速度带来的横向拉伸
			segIdx: 1, // 日=0 / 夜=1
			segStretch: 0,
			daySettle: false, // 吸附时加 CSS transition，rAF 被暂停也能到位
			segSettle: false,
			dayPress: false, // 按住时才放大
			segPress: false,

			reloading: false,

			// -------- 一键生成分享图（Canvas 离屏绘制） --------
			sharing: false, // 正在生成中，防重复点击
			shareCanvasH: 1060, // 离屏画布高度（px），按任务条数动态计算

			// -------- 更多攻略（季蜡 / 红石 / 复刻先祖 / 免费魔法）--------
			// status: idle 未加载 / loading 加载中 / ok 可看 / empty 今日无内容 /
			//         closed 本期已结束（不可点） / error 失败可重试
			guides: [
				{ key: 'jl', name: '季蜡位置', mark: '蜡', desc: '', status: 'idle', url: '', err: '' },
				{ key: 'hs', name: '红石天气', mark: '石', desc: '', status: 'idle', url: '', err: '' },
				{ key: 'fk', name: '复刻先祖', mark: '祖', desc: '', status: 'idle', url: '', err: '' },
				{ key: 'mf', name: '免费魔法', mark: '魔', desc: '', status: 'idle', url: '', err: '' }
			],
			guideActive: 0, // 弹层当前展示的项
			guideOpen: false, // 弹层开关

			// -------- 实时时钟（12 小时制）与距刷新倒计时 --------
			clockTime: '--:--:--',
			clockMer: '上午',
			clockLastSec: -1, // 上一次渲染到的整秒，用来避免每帧都触发更新
			refreshTip: '',
			clockTimer: 0, // 时钟定时器句柄（1s 一跳，替代常驻 rAF）
			visHandler: null // 页面重新可见时立刻对齐时间
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

		// 标题下方的季蜡提示：有数据才显示；明天接口给不了就自动隐藏，不报错
		jlLine() {
			if (this.dayOffset === 0 && this.jlToday) return '今日季蜡：' + this.jlToday;
			if (this.dayOffset === 1 && this.jlTomorrow) return '明日季蜡：' + this.jlTomorrow;
			return '';
		},

		displayTasks() {
			if (this.dayOffset === 1) return this.tomorrowTasks;
			if (this.dayOffset === -1) return this.archivedTasks;
			return this.tasks;
		},

		/* -------- 攻略图分格：一张长图里 4 个任务，按比例切出各自的格子 -------- */
		// 返回每格在原图中的相对矩形 { cx, cy, cw, ch }
		// 四宫格切割比例在 utils/guide-config.js 里配置，换图只需改配置
		shotRects() {
			return getShotRects(this.posterW, this.posterH);
		},

		// 只有「今天」有攻略图：昨天/明天不显示缩略图、也不允许点开
		hasShots() {
			return !!(this.isToday && this.posterUrl && !this.posterError && this.displayTasks.length);
		},

		shotTaskText() {
			const t = this.displayTasks[this.shotIdx];
			return t ? t.text : '';
		},

		// 当前格子的宽高比：容器按这个比例才能不变形
		shotAspect() {
			const r = this.shotRects[this.shotIdx] || this.shotRects[0];
			const w = this.posterW || FALLBACK_POSTER_W;
			const h = this.posterH || FALLBACK_POSTER_H;
			return (r.cw * w) / (r.ch * h);
		},

		// 弹层舞台尺寸：按格子比例把图装进当前可视区（用 visualViewport，避开 iOS Safari 地址栏误差）
		shotStageStyle() {
			const ar = this.shotAspect || 1.9;
			const vw = this.vpW || 375;
			const vh = this.vpH || 667;
			const maxW = Math.min(vw * 0.88, 560);
			const maxH = Math.max(120, Math.min(vh * 0.52, vh - 200));
			let w = maxW;
			let h = w / ar;
			if (h > maxH) {
				h = maxH;
				w = h * ar;
			}
			return { width: Math.round(w) + 'px', height: Math.round(h) + 'px' };
		},

		emptyText() {
			if (this.dayOffset === 1) {
				return this.tomorrowLoading ? '正在获取明天的任务…' : '暂时没拿到明天的任务，点上方「明天」可重试';
			}
			if (this.dayOffset === -1) return '这一天没有本地存档（应用每天首次打开时会自动存档）';
			return '暂无数据';
		},

		/* -------- 滑块位移：把弹簧状态翻译成 CSS 变量 -------- */
		/* 拉伸时横向变长、纵向变薄，像被手指带着走的一小团液体 */
		dayThumbStyle() {
			const st = this.thumbStyle(this.dayTabIdx, this.dayTabStretch, this.dayPress ? 1.06 : 1);
			if (this.daySettle) st.transition = 'transform 0.42s cubic-bezier(0.22, 1.2, 0.36, 1)';
			return st;
		},

		segThumbStyle() {
			const st = this.thumbStyle(this.segIdx, this.segStretch, this.segPress ? 1.06 : 1);
			if (this.segSettle) st.transition = 'transform 0.42s cubic-bezier(0.22, 1.2, 0.36, 1)';
			return st;
		},

		// #ifdef H5
		// 季蜡位置卡片：已提前到「每日任务」上方单独渲染，数据仍来自 guides 数组
		jlGuide() {
			return this.guides.find(g => g.key === 'jl') || { key: 'jl', name: '季蜡位置', mark: '蜡', desc: '', status: 'idle', url: '', err: '' };
		},

		// 季蜡在 guides 数组里的原始索引：点击仍走 openGuide(原索引)，弹层数据不受搬家影响
		jlGuideIndex() {
			const i = this.guides.findIndex(g => g.key === 'jl');
			return i < 0 ? 0 : i;
		},

		activeGuide() {
			return this.guides[this.guideActive] || { name: '', desc: '', status: 'idle', url: '', err: '' };
		},

		// 弹层里的兜底文案：按状态给不同提示，不让用户看到空白
		guideFallbackText() {
			const g = this.activeGuide;
			if (g.status === 'loading') return '正在加载…';
			if (g.status === 'closed') return '本期复刻已结束，等待下次新复刻';
			if (g.status === 'empty') return g.desc || '今日暂无内容';
			if (g.status === 'error') return g.err || '加载失败，请重试';
			return '点击查看';
		},

		guideCanRetry() {
			return this.activeGuide.status === 'error';
		},

		// 红石/黑石降落时间，本地推算：1-15 号周二黑石、周六周日红石；16 号起周三黑石、周五周日红石。没有的日子返回空数组。
		hsDrop() {
			// 黑石/红石时段表在 utils/guide-config.js
			return getHsDrop(new Date());
		}
		// #endif
	},

	onLoad() {
		// 活动日历功能已整体下线，清掉以前版本留下的缓存，避免占空间
		try {
			uni.removeStorageSync('sky_wiki_cal_v1');
		} catch (e) {
			// 没有旧缓存或存储不可用都无所谓
		}

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
		this.refreshPhase();
		this.applyThemeBackground();

		// 滑块初始位置直接对齐当前状态，首屏不播放动画
		this.dayTabIdx = this.dayOffset + 1;
		this.segIdx = this.theme === 'dark' ? 1 : 0;
		this.initSpring();

		// 首屏不再塞假任务：按「主任务 → 长图 → 明日 → 季蜡」排队拉，api 层已串行控速
		this.lastFetchAt = Date.now();
		this.lastFetchDay = this.todayText();
		this.fetchTasks()
			.then(() => this.fetchPoster())
			.then(() => this.fetchTomorrow()) // 顺带把明天也拿到，点「明天」不用等
			.then(() => this.fetchJinLa()) // 标题下方的「今日季蜡」
			.then(() => {
				// 攻略副标题与休赛判定不影响主流程，等主数据就位后再补，避免首屏并发被限流
				// #ifdef H5
				this.prefetchGuideTexts();
				this.precheckEndedGuide();
				// #endif
			});

		// 时钟 + 距刷新倒计时
		this.startClock();
	},

	onUnload() {
		this.stopClock();
		// 页面销毁时停掉弹簧循环，避免 rAF 泄漏
		this.stopSpring('day');
		this.stopSpring('seg');
	},

	// 回到前台：①立刻校准时钟 ②自动模式按当前时间重新判定主题 ③数据过期则静默重拉
	onShow() {
		this.tickClock(true);

		if (this.themeMode === 'auto') {
			const t = this.autoTheme();
			if (t !== this.theme) {
				this.theme = t;
				this.slideTo('seg', t === 'dark' ? 1 : 0);
				this.applyThemeBackground();
			}
		}

		// 数据新鲜度检查：从后台切回来时，只要「跨天」或「超过 5 分钟没更新」就静默重拉。
		// 否则手机挂后台一整夜，早上打开看到的还是昨天的任务。
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
			this.fetchJinLa();
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

		/* ---------------- 液态玻璃滑块 ---------------- */
		thumbStyle(idx, stretch, press) {
			return sliderThumbStyle(idx, stretch, press);
		},

		/* 初始化两套弹簧（不放进 data，避免每帧触发响应式 diff 之外的额外开销） */
		initSpring() {
			this._spring = {
				day: { x: this.dayOffset + 1, v: 0, raf: 0, target: this.dayOffset + 1 },
				seg: { x: this.theme === 'dark' ? 1 : 0, v: 0, raf: 0, target: this.theme === 'dark' ? 1 : 0 }
			};
		},

		// 弹簧动画：物理积分，速度可用于驱动滑块拉伸
		slideTo(kind, target) {
			const st = this._spring && this._spring[kind];
			if (!st) return;
			if (st.raf && st.target === target) return; // 已经在去同一格的路上
			if (typeof requestAnimationFrame !== 'function') {
				this.applySlide(kind, target, 0, true);
				st.x = target;
				return;
			}
			if (st.raf) cancelAnimationFrame(st.raf);
			st.target = target;

			let last = 0;
			const step = now => {
				if (!last) last = now;
				let dt = (now - last) / 1000;
				last = now;
				if (!(dt > 0)) dt = 1 / 60;
				if (dt > 0.04) dt = 0.04; // 掉帧时限制步长，防止数值发散

				const accel = -420 * (st.x - st.target) - 27 * st.v;
				st.v += accel * dt;
				st.x += st.v * dt;

				const stretch = Math.min(Math.abs(st.v) * 0.026, 0.14);
				this.applySlide(kind, st.x, stretch);

				if (Math.abs(st.v) < 0.03 && Math.abs(st.x - st.target) < 0.0015) {
					this.applySlide(kind, st.target, 0, true);
					st.x = st.target;
					st.v = 0;
					st.raf = 0;
					return;
				}
				st.raf = requestAnimationFrame(step);
			};
			st.raf = requestAnimationFrame(step);
		},

		applySlide(kind, idx, stretch, settle) {
			if (kind === 'day') {
				this.dayTabIdx = idx;
				this.dayTabStretch = stretch;
				if (settle !== undefined) this.daySettle = settle;
			} else {
				this.segIdx = idx;
				this.segStretch = stretch;
				if (settle !== undefined) this.segSettle = settle;
			}
		},

		stopSpring(kind) {
			const st = this._spring && this._spring[kind];
			if (st && st.raf) {
				cancelAnimationFrame(st.raf);
				st.raf = 0;
			}
		},

		/* ============ 跟手拖拽：按住滑块左右拖，实时跟手 + 松手 Q 弹吸附 ============ */
		// 字数（day=3, seg=2）与当前 idx
		tabMeta(kind) {
			if (kind === 'day') return { n: 3, idx: this.dayOffset + 1 };
			return { n: 2, idx: this.theme === 'dark' ? 1 : 0 };
		},

		// 文字联动样式（带参数的方法，必须放 methods 而不是 computed）
		dayTxtStyle(offset) {
			const i = offset + 1; // -1/0/1 → 0/1/2
			return this.mixTxtStyle(this.tabActivity(this.dayTabIdx, i));
		},
		segTxtStyle(i) {
			return this.mixTxtStyle(this.tabActivity(this.segIdx, i));
		},

		// 文字激活度：距离滑块越近越亮（0~1）
		tabActivity(cur, i) {
			return sliderTabActivity(cur, i);
		},

		// 把激活度翻译成颜色/字重样式（连续过渡，不用 class 硬切）
		mixTxtStyle(a) {
			return sliderMixTxtStyle(a);
		},

		// 边界阻尼：越界只保留 32% 位移，拉得动但出不去
		dampIdx(raw, n) {
			return sliderDampIdx(raw, n);
		},

		touchX(e) {
			// 兼容触屏（touches/changedTouches）与鼠标（clientX）
			const t = e.touches && e.touches[0];
			if (t) return t.clientX;
			const c = e.changedTouches && e.changedTouches[0];
			if (c) return c.clientX;
			return typeof e.clientX === 'number' ? e.clientX : 0;
		},

		// 鼠标拖拽时把 move/up 挂到 window，移出元素也能继续跟手
		_bindMouse(kind) {
			this._unbindMouse();
			const move = (ev) => this.onDragMove(ev, kind);
			const up = (ev) => this.onDragEnd(ev, kind);
			this._mouseMove = move;
			this._mouseUp = up;
			if (typeof window !== 'undefined' && window.addEventListener) {
				window.addEventListener('mousemove', move);
				window.addEventListener('mouseup', up);
			}
		},

		_unbindMouse() {
			if (typeof window !== 'undefined' && window.removeEventListener) {
				if (this._mouseMove) window.removeEventListener('mousemove', this._mouseMove);
				if (this._mouseUp) window.removeEventListener('mouseup', this._mouseUp);
			}
			this._mouseMove = null;
			this._mouseUp = null;
		},

		// 读取切换器轨道的真实几何（按下点 → 格位换算用）
		// 注意：uni-app 归一化后的 e.currentTarget 不是真实 DOM（只有 id/dataset/offsetLeft），
		// 所以这里直接从文档里取轨道节点读 getBoundingClientRect；拿不到就返回 null 走相对跟手兜底
		_trackRect(kind) {
			if (typeof document === 'undefined' || !document.querySelector) return null;
			try {
				const el = document.querySelector(kind === 'day' ? '.daytabs' : '.seg');
				if (el && typeof el.getBoundingClientRect === 'function') {
					const r = el.getBoundingClientRect();
					if (r && typeof r.left === 'number' && r.width > 0) return { left: r.left, width: r.width };
				}
			} catch (err) {
				// 几何信息不可用，走兜底
			}
			return null;
		},

		onDragStart(e, kind) {
			const m = this.tabMeta(kind);
			this.stopSpring(kind); // 抢过正在飞行的滑块
			this.applySlide(kind, this[kind === 'day' ? 'dayTabIdx' : 'segIdx'], 0, false);
			const x0 = this.touchX(e);
			// 严格绑定按下点：记录按下时轨道几何，拖动时滑块吸附在手指正下方 1:1 跟手
			// （无论滑块当前停在哪一格，从哪按就从哪跟手，不会从旧位置跳）
			this._drag = {
				kind,
				x0,
				rect: this._trackRect(kind),
				i0: m.idx, // 兜底：拿不到几何时按当前格做相对跟手
				t0: Date.now(),
				lastX: x0,
				lastT: Date.now(),
				v: 0,
				n: m.n,
				moved: false
			};
			// 鼠标按下：拖出元素也要跟手
			if (e && e.type === 'mousedown') this._bindMouse(kind);
			// 按下反馈：玻璃鼓一点
			this.setPress(kind, true);
		},

		// 按下一瞬间玻璃微放大，松手回到 1（配合 settle 的 CSS transition 会有回弹感）
		setPress(kind, v) {
			if (kind === 'day') this.dayPress = v;
			else this.segPress = v;
		},

		// 点击切换时也弹一下，跟按下的手感统一
		pulsePress(kind) {
			this.setPress(kind, true);
			setTimeout(() => this.setPress(kind, false), 130);
		},

		onDragMove(e, kind) {
			const d = this._drag;
			if (!d || d.kind !== kind) return;
			const x = this.touchX(e);
			const now = Date.now();
			const dx = x - d.x0;

			// 超过 6px 才算"拖"，避免轻微抖动误判
			if (!d.moved && Math.abs(dx) < 6) return;
			d.moved = true;

			// 一格宽度 = 轨道宽 / 格数（px 只在这里用于换算）
			const n = d.n;
			let w;
			if (d.rect && d.rect.width) {
				w = d.rect.width / n;
			} else {
				// 兜底：拿不到轨道几何时用视口宽近似
				const baseW = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 300;
				w = baseW / n;
			}

			// 严格绑定按下点：滑块位置 = 手指位置 - startOffset（按下点即抓取点，startOffset 归零）
			// thumb 的 CSS 位移是 translate3d(idx * 100%)（按自身宽度平移），所以减 0.5 对齐格心：
			// 手指按在「今天」格中心 → idx 正好 = 1，滑块吸附在手指正下方 1:1 跟手，不从旧位置起拖
			// 越界部分交给 dampIdx 做橡皮筋阻尼
			let idx;
			if (d.rect) {
				idx = this.dampIdx((x - d.rect.left) / w - 0.5, n);
			} else {
				// 兜底：拿不到轨道几何时按「当前格 + 手指位移」相对跟手
				idx = this.dampIdx(d.i0 + dx / w, n);
			}

			// 速度（格/秒），用最近一段位移估算
			const dt = Math.max(now - d.lastT, 8);
			const v = (x - d.lastX) / w / (dt / 1000);
			d.v = d.v * 0.7 + v * 0.3; // 平滑
			d.lastX = x; d.lastT = now;

			// 实时跟手：直接写 idx，不走弹簧
			const stretch = Math.min(Math.abs(d.v) * 0.02, 0.14);
			this.applySlide(kind, idx, stretch);
		},

		onDragEnd(e, kind) {
			const d = this._drag;
			if (!d || d.kind !== kind) return;
			this._drag = null;
			this._unbindMouse(); // 鼠标拖拽结束后解除全局监听
			this.setPress(kind, false);
			if (!d.moved) return; // 纯点击，交给 click 处理

			// 松手：速度投影 + 取整 → 吸附目标格
			const cur = (kind === 'day' ? this.dayTabIdx : this.segIdx);
			const v = Math.max(-8, Math.min(8, d.v));
			const projected = cur + v * 0.12;          // 惯性投影，轻扫可翻格
			const target = Math.max(0, Math.min(d.n - 1, Math.round(projected)));

			// 吸附到目标格：CSS cubic-bezier 做 Q 弹（比 rAF 更稳，rAF 在部分场景被暂停）
			const st = this._spring[kind];
			st.x = target; st.v = 0; st.target = target;
			if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
			this.applySlide(kind, target, 0, true);

			// 触发业务：只在目标格变化时切一次
			if (kind === 'day') {
				const offset = target - 1;
				if (offset !== this.dayOffset) this.switchDay(offset, true);
			} else {
				const nextTheme = target === 1 ? 'dark' : 'light';
				if (nextTheme !== this.theme) this.toggleTheme(true);
			}
			this._suppressClick = true; // 抑制随后到来的 click，避免重复切换
			setTimeout(() => { this._suppressClick = false; }, 350);
		},

		// seg 点击：拖完的 350ms 内抑制（避免拖拽后又触发 click 切回去）
		onSegClick() {
			if (this._suppressClick) return;
			this.toggleTheme();
		},

		/* ---------------- 日期切换与本地存档 ---------------- */
		/* 取相对今天偏移 N 天的日期字符串：0=今天，-1=昨天，1=明天 */
		dayText(offset) {
			const d = new Date();
			d.setDate(d.getDate() + offset);
			return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
		},

		switchDay(offset, fromDrag) {
			if (this.dayOffset === offset) return;
			if (!fromDrag) {
				this.pulsePress('day'); // 点击时玻璃先鼓一下再飞过去
				this.slideTo('day', offset + 1); // 纯点击才走弹簧；拖拽时吸附弹簧已接管
			}
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

		// 明日任务：接口一次返回今天+明天，抽出明天的存起来，今天的顺手存档备份
		fetchTomorrow() {
			const tomorrow = this.dayText(1);
			const today = this.todayText();
			this.tomorrowLoading = true;
			return apiFetchTomorrow()
				.then(r => {
					if (!r || !r.ok) return;
					const grouped = r.grouped || {};
					const tmr = grouped[tomorrow] || [];
					if (tmr.length) {
						this.tomorrowTasks = tmr.map((t, i) => ({ id: i + 1, text: t.text, from: '' }));
						this.saveArchiveFor(tomorrow, tmr);
					}
					this.tomorrowFetchedDay = today;
					// 主接口只给今天，这里顺手把今天那份也存档，昨天回看才有数据
					if (grouped[today] && grouped[today].length) this.saveArchiveFor(today, grouped[today]);
				})
				.catch(() => {})
				.then(() => {
					this.tomorrowLoading = false;
				});
		},

		/* ---------------- 主题切换 ---------------- */
		toggleTheme(fromDrag) {
			const next = this.theme === 'dark' ? 'light' : 'dark';
			if (!fromDrag) {
				this.pulsePress('seg');
				this.slideTo('seg', next === 'dark' ? 1 : 0);
			}
			this.theme = next;
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

		/* 动态背景：按小时划四个时段，像 iPhone 灵动壁纸那样自动变 */
		autoPhase() {
			const h = new Date().getHours();
			if (h >= 5 && h < 8) return 'dawn';
			if (h >= 8 && h < 16) return 'day';
			if (h >= 16 && h < 19) return 'dusk';
			return 'night';
		},
		refreshPhase() {
			const p = this.autoPhase();
			if (p !== this.phase) this.phase = p;
		},

		/* 长按切换控件：恢复「按时间自动」 */
		resetThemeAuto() {
			this.themeMode = 'auto';
			uni.setStorageSync(MODE_KEY, 'auto');
			uni.removeStorageSync(CACHE_KEY);
			this.theme = this.autoTheme();
			this.slideTo('seg', this.theme === 'dark' ? 1 : 0);
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

		/* ---------------- 整页刷新 ---------------- */
		reloadPage() {
			if (this.reloading) return;
			this.reloading = true;
			// #ifdef H5
			if (typeof window !== 'undefined' && window.location) {
				window.location.reload();
			}
			// #endif
			// #ifndef H5
			uni.reLaunch({ url: '/pages/index/index' });
			// #endif
		},

		/* ---------------- 下拉刷新 ---------------- */
		refresh() {
			// 下拉刷新：主数据依次重拉，由 api 层串行控速
			this.fetchTasks(true);
			this.fetchPoster(true);
			this.fetchJinLa();
		},

		/* ---------------- 真实接口（统一走 api/sky.js） ---------------- */
		// 文字任务：失败不再回退假数据，只提示并保留下拉刷新入口
		fetchTasks(isPullDown, silent) {
			if (!isPullDown && !silent) this.loading = true;
			return apiFetchTasks()
				.then(r => {
					if (r && r.ok) {
						this.tasks = r.tasks;
						this.lastFetchAt = Date.now();
						this.lastFetchDay = this.todayText();
						this.updatedAt = this.nowText();
						this.saveArchive();
					} else if (!silent) {
						uni.showToast({ title: (r && r.reason) || '任务获取失败，请下拉刷新', icon: 'none' });
					}
				})
				.catch(() => {})
				.then(() => {
					this.loading = false;
					if (isPullDown) uni.stopPullDownRefresh();
				});
		},

		// 季蜡位置：标题下方一行，失败就静默留空
		fetchJinLa() {
			return apiFetchJinLa()
				.then(r => {
					if (r && r.ok) this.jlToday = r.text;
				})
				.catch(() => {});
		},

		// 攻略长图：接口返回图片流时 URL 即图片地址
		fetchPoster(isPullDown, silent) {
			if (!silent) this.posterLoading = true;
			this.posterError = false;
			return fetchPosterUrl()
				.then(r => {
					if (r && r.ok && r.url) {
						this.posterUrl = r.url;
						this.posterError = false;
					} else {
						this.posterError = true;
					}
				})
				.catch(() => {
					this.posterError = true;
				})
				.then(() => {
					this.posterLoading = false;
					if (isPullDown) uni.stopPullDownRefresh();
				});
		},

		/* 长图加载失败后手动重试 */
		retryPoster() {
			this.posterError = false;
			this.fetchPoster();
		},

		/* ---------------- 长图预览 ---------------- */
		/* ---------------- 图片保存：所有图片共用这一套 ---------------- */
		// H5：先取 blob 再触发下载，避免跨域图片 <a download> 被浏览器忽略
		saveBlobUrl(src, name) {
			// #ifdef H5
			const fire = (href, revoke) => {
				const a = document.createElement('a');
				a.href = href;
				a.download = name || 'image.png';
				document.body.appendChild(a);
				a.click();
				a.remove();
				if (revoke) setTimeout(() => URL.revokeObjectURL(href), 5000);
			};
			if (/^data:/.test(src)) { fire(src, false); return Promise.resolve(true); }
			return fetch(src, { mode: 'cors' })
				.then(r => {
					if (!r.ok) throw new Error('HTTP ' + r.status);
					return r.blob();
				})
				.then(blob => { fire(URL.createObjectURL(blob), true); return true; });
			// #endif
			// #ifndef H5
			return Promise.resolve(false);
			// #endif
		},

		downloadImage(src, name) {
			if (!src) {
				uni.showToast({ title: '暂无可保存的图片', icon: 'none' });
				return;
			}
			// #ifdef H5
			this.saveBlobUrl(src, name).catch(() => {
				// 兜底：新标签打开原图，让用户长按保存
				window.open(src, '_blank');
				uni.showToast({ title: '请长按图片保存', icon: 'none' });
			});
			// #endif
			// #ifndef H5
			uni.downloadFile({
				url: src,
				success: res => {
					uni.saveImageToPhotosAlbum({
						filePath: res.tempFilePath,
						success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
						fail: () => uni.showToast({ title: '请长按图片保存', icon: 'none' })
					});
				},
				fail: () => uni.showToast({ title: '下载失败，请长按图片保存', icon: 'none' })
			});
			// #endif
		},

		// 任务单图：下载的是从攻略图里切出来的那一格，不是整张
		downloadShot() {
			const r = this.shotRects[this.shotIdx] || this.shotRects[0];
			const name = '冰块-' + this.pad(this.shotIdx + 1) + '.png';
			// #ifdef H5
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				const W = img.naturalWidth || this.posterW || 1200;
				const H = img.naturalHeight || this.posterH || 750;
				const sx = Math.round(r.cx * W);
				const sy = Math.round(r.cy * H);
				const sw = Math.round(r.cw * W);
				const sh = Math.round(r.ch * H);
				const c = document.createElement('canvas');
				c.width = sw;
				c.height = sh;
				c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
				const done = blob => {
					if (!blob) { uni.showToast({ title: '保存失败，请长按图片', icon: 'none' }); return; }
					const href = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = href;
					a.download = name;
					document.body.appendChild(a);
					a.click();
					a.remove();
					setTimeout(() => URL.revokeObjectURL(href), 5000);
				};
				if (c.toBlob) c.toBlob(done, 'image/png');
				else this.saveBlobUrl(c.toDataURL('image/png'), name);
			};
			img.onerror = () => uni.showToast({ title: '保存失败，请长按图片', icon: 'none' });
			img.src = this.posterUrl;
			// #endif
			// #ifndef H5
			this.downloadImage(this.posterUrl, name);
			// #endif
		},

		/* ---------------- 图片全屏查看（带保存按钮，和分享图一致） ---------------- */
		openImageViewer(src, name) {
			if (!src) {
				uni.showToast({ title: '暂无可查看的图片', icon: 'none' });
				return;
			}
			// #ifdef H5
			// 以 visualViewport 为准：iOS Safari 的地址栏/工具栏会让 100vh 偏大
			const vv = window.visualViewport;
			const vw = vv ? vv.width : window.innerWidth;
			const vh = vv ? vv.height : window.innerHeight;
			const vt = vv ? (vv.offsetTop || 0) : 0;
			const vl = vv ? (vv.offsetLeft || 0) : 0;
			const overlay = document.createElement('div');
			overlay.style.cssText = 'position:fixed;left:' + vl + 'px;top:' + vt + 'px;width:' + vw + 'px;height:' + vh + 'px;background:rgba(6,8,16,0.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;box-sizing:border-box;';
			const img = document.createElement('img');
			img.src = src;
			img.style.cssText = 'display:block;max-width:' + Math.round(vw * 0.86) + 'px;max-height:' + Math.round(vh * 0.72) + 'px;width:auto;height:auto;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.6);';
			const saveBtn = document.createElement('button');
			saveBtn.textContent = '保存图片';
			saveBtn.style.cssText = 'border:1px solid rgba(255,255,255,0.28);background:rgba(255,255,255,0.12);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#fff;font-size:15px;font-weight:600;letter-spacing:0.5px;padding:10px 36px;border-radius:999px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.35);';
			saveBtn.addEventListener('click', e => {
				e.stopPropagation();
				this.downloadImage(src, name || '冰块-图片.png');
				saveBtn.textContent = '已保存 ovO';
				setTimeout(() => { saveBtn.textContent = '保存图片'; }, 1800);
			});
			const tip = document.createElement('div');
			tip.textContent = '也可长按图片保存 · 点击空白处关闭';
			tip.style.cssText = 'color:rgba(255,255,255,0.55);font-size:12px;';
			overlay.appendChild(img);
			overlay.appendChild(saveBtn);
			overlay.appendChild(tip);
			overlay.addEventListener('click', () => overlay.remove());
			document.body.appendChild(overlay);
			// #endif
			// #ifndef H5
			uni.previewImage({ urls: [src], current: src });
			// #endif
		},

		previewPoster() {
			if (!this.posterUrl || this.posterError) {
				uni.showToast({ title: '暂无可用长图', icon: 'none' });
				return;
			}
			this.openImageViewer(this.posterUrl, '冰块-今日攻略图.png');
		},

		/* ============ 点任务行 → 看这一条对应的格子图 ============ */
		// 单格在大容器里怎么摆：容器宽高各放大 1/cw、1/ch，再按 cx/cy 往左上推
		shotImgStyle(i) {
			const r = this.shotRects[i] || this.shotRects[0];
			return {
				width: (100 / r.cw).toFixed(2) + '%',
				height: (100 / r.ch).toFixed(2) + '%',
				left: ((-r.cx * 100) / r.cw).toFixed(2) + '%',
				top: ((-r.cy * 100) / r.ch).toFixed(2) + '%'
			};
		},

		// 用 visualViewport 把弹层严格贴合「当前可见的那块屏幕」
		// iOS Safari 的地址栏/底部工具栏会让 100vh 和 fixed 的 top/bottom 偏移
		fitShotViewport() {
			// #ifdef H5
			this.$nextTick(() => {
				const vv = window.visualViewport;
				const w = vv ? vv.width : window.innerWidth;
				const h = vv ? vv.height : window.innerHeight;
				const top = vv ? (vv.offsetTop || 0) : 0;
				const left = vv ? (vv.offsetLeft || 0) : 0;
				this.vpW = w;
				this.vpH = h;
				const mask = document.querySelector('.shot-mask');
				if (mask) {
					mask.style.top = top + 'px';
					mask.style.left = left + 'px';
					mask.style.width = w + 'px';
					mask.style.height = h + 'px';
					mask.style.bottom = 'auto';
					mask.style.right = 'auto';
				}
			});
			// #endif
		},

		_onShotViewportChange() {
			this.fitShotViewport();
		},

		openTaskShot(i) {
			if (!this.isToday) return; // 昨天/明天没有攻略图
			if (!this.posterUrl || this.posterError) {
				uni.showToast({ title: '攻略图还没加载好', icon: 'none' });
				return;
			}
			if (i > 3) return; // 长图里只有 4 格
			// #ifdef H5
			this.shotIdx = i;
			this.shotOpen = true;
			this.fitShotViewport();
			if (window.visualViewport) {
				window.visualViewport.addEventListener('resize', this._onShotViewportChange);
				window.visualViewport.addEventListener('scroll', this._onShotViewportChange);
			}
			// #endif
			// #ifndef H5
			this.previewPoster();
			// #endif
		},

		closeShot() {
			this.shotOpen = false;
			// #ifdef H5
			if (window.visualViewport) {
				window.visualViewport.removeEventListener('resize', this._onShotViewportChange);
				window.visualViewport.removeEventListener('scroll', this._onShotViewportChange);
			}
			// #endif
		},

		showFullPoster() {
			this.shotOpen = false;
			this.previewPoster();
		},

		onShotTouchStart(e) {
			const t = e.touches && e.touches[0];
			this.shotTouchX = t ? t.clientX : 0;
		},

		// 左右滑：切上一条 / 下一条
		onShotTouchEnd(e) {
			const t = (e.changedTouches && e.changedTouches[0]) || null;
			if (!t) return;
			const dx = t.clientX - this.shotTouchX;
			if (Math.abs(dx) < 40) return;
			const n = Math.min(4, this.displayTasks.length);
			let i = this.shotIdx + (dx < 0 ? 1 : -1);
			if (i < 0) i = 0;
			if (i > n - 1) i = n - 1;
			this.shotIdx = i;
		},

		onPosterLoad(e) {
			this.posterLoading = false;
			this.posterError = false;
			// 记下原图尺寸：四宫格切割比例靠它算
			const d = (e && e.detail) || {};
			if (d.width && d.height) {
				this.posterW = d.width;
				this.posterH = d.height;
			} else if (this.posterUrl) {
				uni.getImageInfo({
					src: this.posterUrl,
					success: r => {
						this.posterW = r.width;
						this.posterH = r.height;
					}
				});
			}
		},

		onPosterError() {
			this.posterLoading = false;
			this.posterError = true;
		},

		/* ---------------- 一键复制（排版成适合分享的文案） ---------------- */
		copyTasks() {
			// 复制的是当前正在看的这一天（今天 / 昨天 / 明天）
			const list = this.displayTasks;
			if (!list.length) {
				uni.showToast({ title: '这一天暂无任务', icon: 'none' });
				return;
			}

			const d = new Date();
			d.setDate(d.getDate() + this.dayOffset);
			const dateStr = d.getMonth() + 1 + '月' + d.getDate() + '日';

			const lines = ['🌟光遇每日任务 | ' + dateStr];
			list.forEach((t, i) => lines.push(`${i + 1}. ${t.text}`));
			// 季蜡只有「今天」有数据，没有就整行不出现
			if (this.dayOffset === 0 && this.jlToday) {
				lines.push('🕯️今日季蜡位置：' + this.jlToday);
			}
			lines.push('—— 记得去方舟领免费魔法哦！');

			uni.setClipboardData({
				data: lines.join('\n'),
				success: () => uni.showToast({ title: '文案已复制，快去分享吧！', icon: 'none' })
			});
		},

		// 分享图：H5 走原生 Canvas 同步绘制导出，其它端用 uni canvas
		makeSharePoster() {
			if (this.sharing) return;
			const list = this.displayTasks;
			if (!list.length) {
				uni.showToast({ title: '这一天暂无任务', icon: 'none' });
				return;
			}
			this.sharing = true;
			// 兜底：任何环节卡住都能自动解锁，不会一直停在「生成中」
			clearTimeout(this._shareTimer);
			this._shareTimer = setTimeout(() => {
				if (this.sharing) {
					this.sharing = false;
					uni.showToast({ title: '生成超时，请重试', icon: 'none' });
				}
			}, 8000);
			// #ifdef H5
			this.$nextTick(() => {
				try {
					this.drawSharePosterH5(list);
				} catch (e) {
					this.shareFailed();
				}
			});
			// #endif
			// #ifndef H5
			this.$nextTick(() => {
				try {
					this._shareLayout = this.measureShareLayout(list);
					this.shareCanvasH = this._shareLayout.H;
					this.$nextTick(() => setTimeout(() => {
						try { this.drawSharePoster(); }
						catch (e) { this.shareFailed(); }
					}, 60));
				} catch (e) {
					this.shareFailed();
				}
			});
			// #endif
		},

		shareFailed() {
			this.sharing = false;
			clearTimeout(this._shareTimer);
			uni.showToast({ title: '生成失败，请重试', icon: 'none' });
		},

		// H5：原生 Canvas 2D 同步绘制 + toDataURL 导出，绕开 uni canvas 的异步回调
		drawSharePosterH5(list) {
			try {
				const dataUrl = paintShareH5(this.measureShareLayout(list), this.jlToday);
				clearTimeout(this._shareTimer);
				this.sharing = false;
				this.showPosterPreview(dataUrl);
			} catch (e) {
				this.shareFailed();
			}
		},

		// H5：原生全屏预览，base64 直接塞进 img，绕开 uni.previewImage 对 dataURL 的限制
		showPosterPreview(dataUrl) {
			const overlay = document.createElement('div');
			overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(6,8,16,0.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;';
			const img = document.createElement('img');
			img.src = dataUrl;
			img.style.cssText = 'display:block;width:86vw;max-width:600px;height:auto;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.6);';
			const saveBtn = document.createElement('button');
			saveBtn.textContent = '保存图片ovo';
			saveBtn.style.cssText = 'border:1px solid rgba(255,255,255,0.28);background:rgba(255,255,255,0.12);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);color:#fff;font-size:15px;font-weight:600;letter-spacing:0.5px;padding:10px 36px;border-radius:999px;cursor:pointer;box-shadow:0 4px 15px rgba(0,0,0,0.35);';
			saveBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				const a = document.createElement('a');
				a.href = dataUrl;
				a.download = '冰块-每日任务.png';
				document.body.appendChild(a);
				a.click();
				a.remove();
				saveBtn.textContent = '已保存 ovO';
				setTimeout(() => { saveBtn.textContent = '保存图片ovo'; }, 1800);
			});
			const tip = document.createElement('div');
			tip.textContent = '也可长按图片保存 · 点击空白处关闭';
			tip.style.cssText = 'color:rgba(255,255,255,0.55);font-size:12px;';
			overlay.appendChild(img);
			overlay.appendChild(saveBtn);
			overlay.appendChild(tip);
			overlay.addEventListener('click', () => overlay.remove());
			document.body.appendChild(overlay);
		},

		/* 量出每条任务要占几行，顺便把画布总高、日期文案一并算好 */
		measureShareLayout(list) {
			return measureShareLayoutImpl(list, { dayOffset: this.dayOffset, jlToday: this.jlToday });
		},

		/* 真正绘制并导出 */
		drawSharePoster() {
			const L = this._shareLayout;
			if (!L) {
				this.sharing = false;
				return;
			}
			const ctx = uni.createCanvasContext('shareCanvas', this);
			// 绘制细节在 utils/share-poster.js，页面只管取 canvas 与导出
			paintShareNative(ctx, L, this.jlToday);

			/* 导出：draw 完成后转临时文件，再复用现有的大图预览 */
			ctx.draw(false, () => {
				setTimeout(() => {
					uni.canvasToTempFilePath({
						canvasId: 'shareCanvas',
						fileType: 'png',
						quality: 1,
						success: (res) => {
							this.sharing = false;
							uni.previewImage({ urls: [res.tempFilePath], current: res.tempFilePath });
							setTimeout(() => uni.showToast({ title: '长按图片即可保存或分享', icon: 'none', duration: 2600 }), 400);
						},
						fail: () => {
							this.sharing = false;
							uni.showToast({ title: '生成失败，请重试', icon: 'none' });
						}
					}, this);
				}, 120);
			});
		},

		// 实时时钟：每拍取系统时间，rAF 驱动，切后台暂停、回前台自动对齐
		// 实时时钟：1s 定时器驱动，只在秒变化时刷新（rAF 常驻会白耗电）
		startClock() {
			this.stopClock();
			this.tickClock(true);
			this.clockTimer = setInterval(() => this.tickClock(), 1000);
			// #ifdef H5
			if (typeof document !== 'undefined' && document.addEventListener) {
				this.visHandler = () => {
					if (!document.hidden) this.tickClock(true);
				};
				document.addEventListener('visibilitychange', this.visHandler);
			}
			// #endif
		},

		stopClock() {
			if (this.clockTimer) {
				clearInterval(this.clockTimer);
				this.clockTimer = 0;
			}
			// #ifdef H5
			if (this.visHandler && typeof document !== 'undefined' && document.removeEventListener) {
				document.removeEventListener('visibilitychange', this.visHandler);
				this.visHandler = null;
			}
			// #endif
		},

		/* force = true 时强制重算（切前台、页面显示），平时只在整秒变化时才写数据，
		 * 避免 rAF 每帧都触发一次视图更新 */
		tickClock(force) {
			const d = new Date();
			const sec = d.getSeconds();
			if (!force && sec === this.clockLastSec) return; // 秒没变就不渲染
			this.clockLastSec = sec;
			const h24 = d.getHours();
			const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
			const p2 = n => (n < 10 ? '0' + n : '' + n);
			this.clockMer = h24 < 12 ? '上午' : '下午';
			this.clockTime = p2(h12) + ':' + p2(d.getMinutes()) + ':' + p2(sec);
			this.refreshPhase();
			this.tickRefresh();
		},

		/* ---------------- 距刷新倒计时（到今晚 24:00） ---------------- */
		tickRefresh() {
			const now = new Date();
			const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
			const left = Math.max(0, next.getTime() - now.getTime());
			const totalMin = Math.floor(left / 60000);
			const h = Math.floor(totalMin / 60);
			const m = totalMin % 60;
			this.refreshTip = h > 0 ? `距刷新 ${h}小时${m}分` : `距刷新 ${m}分`;
		},

		nowText() {
			const d = new Date();
			return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
		},

		todayText() {
			const d = new Date();
			return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
		},

		// #ifdef H5
		/* ---------------- 更多攻略：季蜡 / 红石天气 / 复刻先祖 / 免费魔法 ---------------- */
		/* 卡片底部小字：跟着状态走，失败和无内容都能一眼看出原因 */
		guideCardDesc(g) {
			if (g.status === 'closed') return '本期已结束';
			if (g.status === 'error') return '加载失败 · 点按重试';
			if (g.status === 'empty') return g.desc || '今日暂无';
			if (g.status === 'loading') return '加载中…';
			return g.desc || '点击查看';
		},

		/* 打开弹层；失败过的会重新拉起 */
		openGuide(i) {
			const g = this.guides[i];
			if (!g) return;
			if (g.status === 'closed') {
				uni.showToast({ title: '本期复刻已结束', icon: 'none' });
				return;
			}
			this.guideActive = i;
			this.guideOpen = true;
			if (g.status === 'idle' || g.status === 'error' || g.status === 'empty') this.loadGuide(i);
		},

		closeGuide() {
			this.guideOpen = false;
		},

		/* 加载第 i 项：图片类直接交给 <image>，JSON 类先取到图片地址 */
		loadGuide(i) {
			const g = this.guides[i];
			if (!g) return;
			const cfg = GUIDE_API[g.key];
			if (!cfg) return;

			g.err = '';
			g.url = '';
			g.loaded = false;
			g.status = 'loading';

			if (cfg.json) {
				this.fetchGuideJson(i, cfg.json);
				return;
			}

			const url = withKey(cfg.img);
			g.url = url;

			// 复刻先祖：休赛期返回「已结束」白底占位图，先判定再决定要不要展示
			if (g.key === 'fk') {
				g.gating = true;
				this.detectEndedPoster(url).then(ended => {
					g.gating = false;
					if (ended) {
						g.status = 'closed';
						g.url = '';
						g.desc = '本期已结束';
					} else {
						g.status = 'ok';
					}
				});
				return;
			}
			g.status = 'ok';
		},

		/* 红石天气：{ data: [jpg, gif] }，gif 是点赞贴纸，必须过滤 */
		fetchGuideJson(i, url) {
			const g = this.guides[i];
			if (!g) return Promise.resolve();
			if (g.status === 'closed') return Promise.resolve(); // 已判定本期结束，不再覆盖
			return apiFetchGuideJson(url)
				.then(r => {
					if (r && r.ok) {
						g.url = r.image;
						g.desc = '今日天气 + 红石碎片';
						g.status = 'ok';
						return;
					}
					if (r && r.empty) {
						// 只有贴纸图属于「今日暂无」，是正常状态不是报错
						g.status = 'empty';
						g.desc = '今日暂无红石/黑石';
						g.err = r.reason || '';
						return;
					}
					g.status = 'error';
					g.err = (r && r.reason) || '网络异常，请重试';
				})
				.catch(() => {
					g.status = 'error';
					g.err = '网络异常，请重试';
				});
		},

		onGuideImgLoad(i) {
			const g = this.guides[i];
			if (!g) return;
			g.loaded = true;
			if (g.gating) return; // 占位图判定还没回来，等判定结果再定状态
			g.status = 'ok';
			g.err = '';
		},

		onGuideImgError(i) {
			const g = this.guides[i];
			if (!g) return;
			g.status = 'error';
			g.err = '图片加载失败，请重试';
		},

		/* 全屏放大：沿用现有 previewImage 交互 */
		previewGuide() {
			const g = this.activeGuide;
			if (!g.url || g.status !== 'ok') {
				uni.showToast({ title: '暂无可查看的图片', icon: 'none' });
				return;
			}
			this.openImageViewer(g.url, '冰块-' + g.name + '.png');
		},

		// 判定休赛期占位图：采样 24×24，过亮且无彩色即视为已结束；取不到像素时当正常图
		detectEndedPoster(url) {
			return new Promise(resolve => {
				if (typeof document === 'undefined' || typeof Image === 'undefined') {
					resolve(false);
					return;
				}
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.onload = () => {
					try {
						const size = 24;
						const cv = document.createElement('canvas');
						cv.width = size;
						cv.height = size;
						const ctx = cv.getContext('2d');
						ctx.drawImage(img, 0, 0, size, size);
						const d = ctx.getImageData(0, 0, size, size).data;
						let lum = 0;
						let sat = 0;
						let n = 0;
						for (let p = 0; p < d.length; p += 4) {
							const r = d[p];
							const gg = d[p + 1];
							const b = d[p + 2];
							lum += 0.299 * r + 0.587 * gg + 0.114 * b;
							sat += Math.max(r, gg, b) - Math.min(r, gg, b);
							n++;
						}
						resolve(lum / n > 205 && sat / n < 12);
					} catch (e) {
						resolve(false);
					}
				};
				img.onerror = () => resolve(false);
				img.src = url;
			});
		},

		/* 副标题预取：文字接口只有几百字节，先拿到卡片上就能直接显示「雨林1」「烟花魔法」 */
		prefetchGuideTexts() {
			return apiFetchGuideTexts()
				.then(r => {
					if (!r) return;
					if (r.jl) this.setGuideDesc('jl', r.dl ? `季蜡 ${r.jl} · 大蜡 ${r.dl}` : `季蜡 ${r.jl}`);
					if (r.magic) this.setGuideDesc('mf', r.magic);
				})
				.catch(() => {});
		},

		setGuideDesc(key, desc) {
			const g = this.guides.find(x => x.key === key);
			// 已判定「已结束」的项不让副标题覆盖状态文案
			if (g && g.status !== 'closed') g.desc = desc;
		},

		// 提前判定复刻先祖是否休赛期，是则卡片标「本期已结束」并禁用点击
		precheckEndedGuide() {
			const g = this.guides.find(x => x.key === 'fk');
			if (!g) return;
			const url = withKey(GUIDE_API.fk.img);
			this.detectEndedPoster(url).then(ended => {
				if (!ended || g.status === 'ok') return;
				g.status = 'closed';
				g.desc = '本期已结束';
			});
		},

		/* 接口偶尔返回 text/json，统一解析一次 */
		// #endif
	}
};
</script>

<style>
/* ==========================================================
   iOS 液态玻璃主题
   ========================================================== */
.theme-dark {
	--bg: #08090C;
	--bg-grad: radial-gradient(120% 80% at 12% -10%, #171B2B 0%, rgba(8, 9, 12, 0) 55%),
		radial-gradient(100% 70% at 92% 8%, #1A1630 0%, rgba(8, 9, 12, 0) 52%),
		linear-gradient(180deg, #0A0B10 0%, #07080B 100%);
	--text: #F2F4F8;
	--text-dim: rgba(242, 244, 248, 0.62);
	--text-faint: rgba(242, 244, 248, 0.38);

	/* 玻璃：靠 backdrop-filter 折射背景，本体只留很淡的一层白
	   iOS 27 质感：本体更透、边缘镜面更亮、模糊更厚 */
	--glass-bg: rgba(255, 255, 255, 0.075);
	--glass-bg-2: rgba(255, 255, 255, 0.035);
	--glass-bd: rgba(255, 255, 255, 0.18);
	--glass-hl: rgba(255, 255, 255, 0.55);   /* 上边缘镜面高光 */
	--glass-hl-btm: rgba(255, 255, 255, 0.14); /* 下边缘反光 */
	--glass-rim: rgba(255, 255, 255, 0.06);  /* 整圈细分镜面描边 */
	--sheen: rgba(255, 255, 255, 0.16);       /* 左上柔光 */
	--blur: 36px;

	--line: rgba(255, 255, 255, 0.055);
	--accent: #7FD6FF;
	--accent-2: #B49BFF;
	--blob-a: rgba(96, 128, 255, 0.50);
	--blob-b: rgba(156, 92, 232, 0.42);
	--blob-c: rgba(0, 188, 214, 0.30);
	--shadow: 0 14px 38px rgba(0, 0, 0, 0.34), 0 3px 10px rgba(0, 0, 0, 0.20);
	--btn-a: #7FD6FF;
	--btn-b: #A9A0FF;
	--btn-txt: #06121B;

	--seg-bg: rgba(255, 255, 255, 0.07);
	--seg-thumb: rgba(255, 255, 255, 0.16);
	--seg-thumb-bd: rgba(255, 255, 255, 0.18);
	--seg-txt-on: #F2F4F8;

	/* 玻璃滑块：只调这两个，暗色底棱线要亮一点才看得见 */
	--lens-fill: rgba(255, 255, 255, 0.06);
	--lens-edge: rgba(255, 255, 255, 0.45);
	--lens-filter: blur(9rpx) saturate(180%);

	/* 摸小猫：粉色爱心 + 柔光，暗色底更显亮 */
	--cat-ink: #FFB3D1;
	--cat-glow: rgba(255, 130, 185, 0.85);
	--cat-halo: rgba(255, 150, 200, 0.28);

	/* 实时时钟：冷光字 + 轻微外发光 */
	--clock-ink: #F2F4F8;
	--clock-glow: rgba(127, 214, 255, 0.50);
}

.theme-light {
	--bg: #EDF1F7;
	--bg-grad: radial-gradient(120% 80% at 10% -12%, #DCE6FA 0%, rgba(237, 241, 247, 0) 58%),
		radial-gradient(100% 70% at 95% 6%, #EBE2FB 0%, rgba(237, 241, 247, 0) 55%),
		linear-gradient(180deg, #F3F6FB 0%, #E8EDF6 100%);
	--text: #0B0D12;
	--text-dim: rgba(11, 13, 18, 0.58);
	--text-faint: rgba(11, 13, 18, 0.38);

	/* 浅色下玻璃必须比背景「更白一点点」，靠模糊 + 高光区分层次
	   iOS 27 质感：奶白更透亮、镜面边缘更锐 */
	--glass-bg: rgba(255, 255, 255, 0.66);
	--glass-bg-2: rgba(255, 255, 255, 0.46);
	--glass-bd: rgba(255, 255, 255, 0.92);
	--glass-hl: rgba(255, 255, 255, 1);
	--glass-hl-btm: rgba(255, 255, 255, 0.55);
	--glass-rim: rgba(255, 255, 255, 0.65);  /* 整圈细分镜面描边 */
	--sheen: rgba(255, 255, 255, 0.55);
	--blur: 30px;

	--line: rgba(11, 13, 18, 0.055);
	--accent: #0A84FF;
	--accent-2: #7B5CFF;
	--blob-a: rgba(120, 170, 255, 0.42);
	--blob-b: rgba(178, 140, 255, 0.34);
	--blob-c: rgba(110, 214, 214, 0.28);
	--shadow: 0 14px 34px rgba(22, 34, 56, 0.10), 0 3px 8px rgba(22, 34, 56, 0.06);
	--btn-a: #0A84FF;
	--btn-b: #6E63FF;
	--btn-txt: #FFFFFF;

	--seg-bg: rgba(255, 255, 255, 0.55);
	--seg-thumb: rgba(255, 255, 255, 0.95);
	--seg-thumb-bd: rgba(255, 255, 255, 0.98);
	--seg-txt-on: #0B0D12;

	/* 玻璃滑块：浅色底铺更少白，棱线压一点避免发死 */
	--lens-fill: rgba(255, 255, 255, 0.03);
	--lens-edge: rgba(255, 255, 255, 0.85);
	--lens-filter: blur(9rpx) saturate(185%);

	/* 浅色下爱心改用深玫红，避免粉色在白底上看不清 */
	--cat-ink: #E5487F;
	--cat-glow: rgba(255, 105, 170, 0.45);
	--cat-halo: rgba(255, 140, 190, 0.24);

	--clock-ink: #0B0D12;
	--clock-glow: rgba(10, 132, 255, 0.30);
}

/* ==========================================================
   动态背景：随时间变化的分时天空（iPhone 灵动壁纸风格）
   只覆盖 --bg-grad，文字 / 玻璃配色仍由日夜主题控制。
   双主题 × 四时段各给一版，手动切主题时也不会穿帮。
   ========================================================== */
/* 清晨 5-8 点：地平线泛粉的天光 */
.phase-dawn.theme-dark {
	--bg-grad: radial-gradient(120% 70% at 50% 105%, #6E3E58 0%, rgba(20, 26, 48, 0) 60%),
		radial-gradient(110% 60% at 80% -8%, #2A2148 0%, rgba(14, 16, 30, 0) 55%),
		linear-gradient(180deg, #10142A 0%, #2B2144 62%, #5C3550 100%);
}
.phase-dawn.theme-light {
	--bg-grad: radial-gradient(120% 70% at 50% 108%, #FFD9C2 0%, rgba(246, 242, 250, 0) 62%),
		radial-gradient(110% 60% at 12% -8%, #C9D6F5 0%, rgba(246, 242, 250, 0) 55%),
		linear-gradient(180deg, #B9CFF2 0%, #E3CCEC 55%, #FBE7DB 100%);
}

/* 白天 8-16 点：蓝天白云 */
.phase-day.theme-light {
	--bg-grad: radial-gradient(130% 70% at 50% -12%, #7FB4EE 0%, rgba(158, 205, 245, 0) 58%),
		radial-gradient(90% 50% at 82% 6%, #A9D3F4 0%, rgba(158, 205, 245, 0) 60%),
		linear-gradient(180deg, #8FC4F5 0%, #BBDEF8 42%, #E8F2FB 78%, #F3F7FC 100%);
}
.phase-day.theme-dark {
	--bg-grad: radial-gradient(120% 80% at 12% -10%, #16407A 0%, rgba(8, 9, 12, 0) 55%),
		radial-gradient(100% 70% at 92% 8%, #1B4E86 0%, rgba(8, 9, 12, 0) 52%),
		linear-gradient(180deg, #0E2A50 0%, #122F55 60%, #16355C 100%);
}

/* 傍晚 16-19 点：橙紫晚霞 */
.phase-dusk.theme-light {
	--bg-grad: radial-gradient(120% 66% at 50% 108%, #FFC98B 0%, rgba(247, 240, 248, 0) 60%),
		radial-gradient(110% 58% at 15% -8%, #9BB5EC 0%, rgba(247, 240, 248, 0) 55%),
		linear-gradient(180deg, #8FA8E4 0%, #D9A2DC 45%, #F49C90 76%, #FFC48C 100%);
}
.phase-dusk.theme-dark {
	--bg-grad: radial-gradient(120% 66% at 50% 108%, #8A4A44 0%, rgba(19, 20, 40, 0) 60%),
		radial-gradient(110% 58% at 85% -8%, #2C2150 0%, rgba(19, 20, 40, 0) 55%),
		linear-gradient(180deg, #131428 0%, #2E2352 52%, #5B3364 82%, #7A4448 100%);
}

/* 夜晚 19-5 点：深空 + 星星（小白点是手摆的星子） */
.phase-night.theme-dark {
	--bg-grad:
		radial-gradient(1px 1px at 22% 14%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(1px 1px at 68% 9%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(2px 2px at 84% 22%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(1px 1px at 12% 34%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(1px 1px at 46% 6%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(1px 1px at 58% 28%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(1px 1px at 92% 42%, rgba(255, 255, 255, 0.55) 50%, rgba(255, 255, 255, 0) 55%),
		radial-gradient(120% 80% at 12% -10%, #171B2B 0%, rgba(8, 9, 12, 0) 55%),
		radial-gradient(100% 70% at 92% 8%, #1A1630 0%, rgba(8, 9, 12, 0) 52%),
		linear-gradient(180deg, #0A0B10 0%, #07080B 100%);
}
.phase-night.theme-light {
	--bg-grad: radial-gradient(120% 70% at 15% -10%, #6C7FB8 0%, rgba(226, 231, 243, 0) 55%),
		linear-gradient(180deg, #5F74AC 0%, #8FA0CE 48%, #C9D2EA 100%);
}

.page {
	position: relative;
	min-height: 100vh;
	background-color: var(--bg);
	background-image: var(--bg-grad);
	background-size: cover;
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
	filter: blur(70px);
	opacity: 0.9;
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
	animation: content-fade-in 0.4s ease both;
}

/* 只用 opacity，绝不在 .content 上留 transform：
   iOS Safari 会把带动画的祖先当成 fixed 包含块，导致弹层整体偏移 */
@keyframes content-fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}

/* ---------- 玻璃基类 ---------- */
/* 毛玻璃模糊 + 淡填充 + 内高光 + 投影 */
.glass {
	position: relative;
	overflow: hidden;
	border-radius: 48rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
	background-image: linear-gradient(168deg, var(--glass-bg-2) 0%, rgba(255, 255, 255, 0) 48%);
	-webkit-backdrop-filter: blur(var(--blur)) saturate(200%);
	backdrop-filter: blur(var(--blur)) saturate(200%);
	box-shadow: var(--shadow),
		inset 0 1rpx 0 var(--glass-hl),
		inset 0 -1rpx 0 var(--glass-hl-btm),
		inset 0 0 0 1rpx var(--glass-rim);
	transition: background-color 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
}

/* 左上角柔光 + 斜向高光条 */
.glass::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 70%;
	border-radius: inherit;
	background-image:
		linear-gradient(115deg, var(--sheen) 0%, rgba(255, 255, 255, 0) 34%),
		radial-gradient(115% 90% at 16% -10%, var(--sheen) 0%, rgba(255, 255, 255, 0) 62%);
	opacity: 0.7;
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

.topbar-right {
	display: flex;
	align-items: center;
	margin-left: auto;
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

/* ---------- 液态玻璃滑块（日期切换 / 日夜切换共用） ---------- */
/* 外层只管位移（--idx 可为小数），内层管拉伸和按压缩放，
   这样按压的过渡不会拖慢拖拽跟手 */
.liq-thumb {
	position: absolute;
	z-index: 0;
	pointer-events: none;
	transform: translate3d(calc(var(--idx, 0) * 100%), 0, 0) scale(var(--sx, 1), var(--sy, 1));
	transform-origin: 50% 50%;
	will-change: transform;
}

.liq-lens {
	position: absolute;
	inset: 0;
	border-radius: 999rpx;
	background-color: var(--lens-fill);
	/* 只模糊不加白：透过来的背景被磨平，像隔着镜片看 */
	-webkit-backdrop-filter: var(--lens-filter);
	backdrop-filter: var(--lens-filter);
	/* 边缘：一圈细亮棱线 + 上缘高光 + 下缘反光，就是镜片的口沿 */
	box-shadow:
		inset 0 0 0 1rpx var(--lens-edge),
		inset 0 1rpx 0 rgba(255, 255, 255, 0.85),
		inset 0 -1rpx 0 rgba(255, 255, 255, 0.28);
	transform: scale(var(--press, 1));
	transition: transform 0.18s cubic-bezier(0.34, 1.25, 0.64, 1), box-shadow 0.18s ease-out;
}

/* 按住：棱线更亮 + 落一点影，镜片被"拿起来"的感觉 */
.liq-lens-on {
	box-shadow:
		inset 0 0 0 1rpx rgba(255, 255, 255, 0.95),
		inset 0 1rpx 0 rgba(255, 255, 255, 1),
		inset 0 -1rpx 0 rgba(255, 255, 255, 0.34),
		0 3rpx 9rpx -3rpx rgba(16, 24, 40, 0.20);
}

/* 日夜分段控件 */
/* 刷新按钮：与日夜切换同款液态玻璃圆钮 */
.refresh-btn {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 60rpx;
	height: 60rpx;
	margin-left: 16rpx;
	border-radius: 999rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--seg-bg);
	-webkit-backdrop-filter: blur(20px) saturate(200%);
	backdrop-filter: blur(20px) saturate(200%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm), inset 0 0 0 1rpx var(--glass-rim), 0 2px 10px rgba(0, 0, 0, 0.10);
	transition: background-color 0.45s ease, border-color 0.45s ease, transform 0.15s ease;
}

.refresh-btn:active {
	transform: scale(0.9);
}

.refresh-icon {
	font-size: 32rpx;
	line-height: 1;
	color: var(--text);
	transition: color 0.45s;
}

.refresh-spin {
	animation: refresh-rotate 0.6s ease;
}

@keyframes refresh-rotate {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}

.seg {
	position: relative;
	display: flex;
	flex-shrink: 0;
	margin-left: 0;
	width: 136rpx;
	height: 60rpx;
	padding: 4rpx;
	box-sizing: border-box;
	/* 手势隔离：滑块上起手只做拖拽切换，不参与页面滚动/浏览器手势竞争 */
	touch-action: none;
	border-radius: 999rpx;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
	-webkit-backdrop-filter: blur(20px) saturate(200%);
	backdrop-filter: blur(20px) saturate(200%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm), inset 0 0 0 1rpx var(--glass-rim), 0 2px 10px rgba(0, 0, 0, 0.10);
}

/* 滑块上下外溢，比轨道高一圈 —— 透镜鼓出来的感觉 */
.seg-thumb {
	left: 4rpx;
	top: 4rpx;
	bottom: 4rpx;
	width: calc((100% - 8rpx) / 2);
}

.seg-item {
	position: relative;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1;
}

.seg-txt {
	font-size: 22rpx;
	color: var(--text-dim);
	transition: color 0.28s ease;
}

.seg-txt-on {
	color: var(--seg-txt-on);
	font-weight: 600;
}

/* ---------- 日期切换（昨天 / 今天 / 明天）+ 距刷新 ---------- */
.daytabs-row {
	display: flex;
	flex-direction: row;
	align-items: center;
	margin-bottom: 24rpx;
}

.daytabs {
	position: relative;
	display: flex;
	flex: 1;
	min-width: 0;
	align-items: center;
	padding: 5rpx;
	/* 手势隔离：滑块上起手只做拖拽切换，不参与页面滚动/浏览器手势竞争 */
	touch-action: none;
	border-radius: 999rpx;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
	-webkit-backdrop-filter: blur(20px) saturate(200%);
	backdrop-filter: blur(20px) saturate(200%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm), inset 0 0 0 1rpx var(--glass-rim);
}

/* 时钟下方：距刷新倒计时，与时钟右对齐成一组 */
.clock-tip {
	margin-top: 8rpx;
	font-size: 20rpx;
	letter-spacing: 1rpx;
	line-height: 1.2;
	white-space: nowrap;
	color: var(--text-faint);
	transition: color 0.45s;
}

.daytabs-thumb {
	left: 5rpx;
	top: 5rpx;
	bottom: 5rpx;
	width: calc((100% - 10rpx) / 3);
}

.daytab {
	position: relative;
	z-index: 1;
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 62rpx;
	border-radius: 999rpx;
}

.daytab-txt {
	font-size: 24rpx;
	letter-spacing: 1rpx;
	color: var(--text-dim);
	transition: color 0.28s ease, transform 0.28s ease;
}

.daytab-txt-on {
	color: var(--seg-txt-on);
	font-weight: 600;
}

/* ---------- 标题 ---------- */
.hero {
	padding: 44rpx 8rpx 38rpx;
}

/* 左：日期 + 大标题 + 季蜡；右：时钟 + 倒计时（同一行，底部对齐） */
.hero-row {
	display: flex;
	flex-direction: row;
	align-items: flex-end;
	justify-content: space-between;
}

.hero-main {
	flex: 1;
	min-width: 0;
}

.hero-clock {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	flex-shrink: 0;
	margin-left: 24rpx;
	padding-bottom: 6rpx;
}

.clock-row {
	display: flex;
	flex-direction: row;
	align-items: baseline;
}

.clock-mer {
	margin-right: 10rpx;
	font-size: 21rpx;
	letter-spacing: 1rpx;
	color: var(--text-dim);
	transition: color 0.45s;
}

/* 数字等宽，秒数跳动时不会左右抖 */
.clock-time {
	font-size: 42rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	line-height: 1.1;
	color: var(--clock-ink);
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum' 1;
	text-shadow: 0 0 18rpx var(--clock-glow);
	transition: color 0.45s;
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

/* 标题下方：今日季蜡一行（比标题小一号） */
.hero-jl {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	letter-spacing: 1rpx;
	line-height: 1.4;
	color: var(--text-soft, var(--text-faint));
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
/* 分隔线改成「内缩」的细线：从序号右侧开始，不顶到卡片边缘，
   这是 iOS 列表的标准做法，也让玻璃边缘保持完整。 */
.task {
	position: relative;
	display: flex;
	align-items: flex-start;
	padding: 30rpx 28rpx;
}

.task::after {
	content: '';
	position: absolute;
	left: 92rpx;
	right: 28rpx;
	bottom: 0;
	height: 1rpx;
	background-color: var(--line);
}

.task:last-child::after {
	display: none;
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
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.18), inset 0 1rpx 0 rgba(255, 255, 255, 0.45);
}

/* ---------- 任务行点击态 ---------- */
.task-tap {
	transition: background-color 0.18s ease;
}

.task-tap:active {
	background-color: rgba(127, 214, 255, 0.10);
}

/* ---------- 单条任务大图（全屏弹层） ---------- */
.shot-mask {
	position: fixed;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	/* Safari 16+ 支持 dvh；JS 里还会用 visualViewport 再校准一次 */
	height: 100vh;
	height: 100dvh;
	z-index: 900;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
	box-sizing: border-box;
	background-color: rgba(4, 6, 10, 0.94);
	-webkit-backdrop-filter: blur(18px);
	backdrop-filter: blur(18px);
	opacity: 0;
	visibility: hidden;
	transition: opacity 0.24s ease, visibility 0.24s ease;
}

.shot-mask-on {
	opacity: 1;
	visibility: visible;
}

/* 宽度交给内容决定（= 大图宽度），这样标题栏、按钮栏与图片左右对齐，
   整块在遮罩里水平+垂直居中，电脑和手机都居中 */
.shot-panel {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: auto;
	max-width: 100%;
	opacity: 0;
	transform: scale(0.94);
	transition: opacity 0.26s ease, transform 0.32s cubic-bezier(0.22, 1.2, 0.36, 1);
}

.shot-mask-on .shot-panel {
	opacity: 1;
	transform: scale(1);
}

.shot-head {
	display: flex;
	align-items: center;
	width: 100%;
	margin-bottom: 24rpx;
}

.shot-badge {
	flex-shrink: 0;
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-image: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
}

.shot-badge-txt {
	font-size: 22rpx;
	font-weight: 600;
	color: #FFFFFF;
}

.shot-title {
	flex: 1;
	margin-left: 18rpx;
	font-size: 28rpx;
	line-height: 1.4;
	color: rgba(255, 255, 255, 0.94);
}

.shot-close {
	flex-shrink: 0;
	margin-left: 16rpx;
	padding: 8rpx 20rpx;
	border-radius: 999rpx;
	background-color: rgba(255, 255, 255, 0.14);
}

.shot-close-txt {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.86);
}

.shot-stage {
	position: relative;
	overflow: hidden;
	border-radius: 20rpx;
	background-color: rgba(255, 255, 255, 0.06);
	box-shadow: 0 18rpx 50rpx rgba(0, 0, 0, 0.46);
}

.shot-img {
	position: absolute;
	display: block;
}

.shot-foot {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	margin-top: 26rpx;
}

.shot-dots {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.shot-dot {
	width: 14rpx;
	height: 14rpx;
	margin-right: 12rpx;
	border-radius: 50%;
	background-color: rgba(255, 255, 255, 0.28);
	transition: width 0.24s ease, background-color 0.24s ease;
}

.shot-dot-on {
	width: 34rpx;
	border-radius: 999rpx;
	background-color: #FFFFFF;
}

.shot-full {
	margin-left: 14rpx;
	padding: 10rpx 24rpx;
	border-radius: 999rpx;
	border: 1rpx solid rgba(255, 255, 255, 0.24);
}

.shot-full-txt {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.86);
}

.shot-hint {
	margin-top: 16rpx;
	font-size: 20rpx;
	color: rgba(255, 255, 255, 0.38);
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
	/* 长图底部自带的来源水印条：靠负 margin + 裁切整体藏掉 */
	overflow: hidden;
}

.poster {
	display: block;
	width: 100%;
	height: auto;
	min-height: 360rpx;
	/* 底部裁掉一条，遮住长图自带的「数据来源」水印字（只有 H5 静态图上会带） */
	margin-bottom: -32rpx;
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
	background-color: var(--seg-bg);
	-webkit-backdrop-filter: blur(16px) saturate(180%);
	backdrop-filter: blur(16px) saturate(180%);
}

.retry-txt {
	font-size: 24rpx;
	color: var(--accent);
}

/* ---------- 主按钮 ---------- */
/* 复制 + 分享图 两个按钮并排 */
.btn-row {
	display: flex;
	gap: 20rpx;
	margin-top: 46rpx;
}

.btn-row .primary-btn {
	flex: 1;
	margin-top: 0;
}

.primary-btn {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100rpx;
	margin-top: 46rpx;
	overflow: hidden;
	border-radius: 999rpx;
	background-image: linear-gradient(180deg, var(--btn-a) 0%, var(--btn-b) 100%);
	box-shadow: 0 8px 22px rgba(10, 60, 140, 0.18),
		inset 0 1rpx 0 rgba(255, 255, 255, 0.50),
		inset 0 -1rpx 0 rgba(0, 0, 0, 0.08);
	transition: transform 0.18s ease, opacity 0.18s ease;
}

.primary-btn::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 52%;
	background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0) 100%);
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

/* ---------- 分享图离屏画布 ----------
 * 定位移出屏幕而不是 display:none：
 * H5 端画布不可见时 getContext 拿不到内容，导出会是空白图 */
.share-canvas {
	position: fixed;
	left: -9999px;
	top: 0;
	width: 600px;
	height: 1060px;
	pointer-events: none;
}

/* ---------- 更多攻略：横滑卡片 ---------- */
/* 放在攻略图下方，只占一行高度；横向滚动，不挤压原有布局。
   H5 下直接用原生 overflow 滚动，比 scroll-view 更可控（本功能仅 H5）。 */
.guide-strip {
	display: flex;
	width: 100%;
	padding: 2rpx 8rpx 10rpx;
	box-sizing: border-box;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: none;
}

.guide-strip::-webkit-scrollbar {
	display: none;
	width: 0;
	height: 0;
}

.guide-card {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	flex-shrink: 0;
	width: 208rpx;
	margin-right: 16rpx;
	padding: 20rpx 18rpx 18rpx;
	box-sizing: border-box;
	border-radius: 26rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
	background-image: linear-gradient(158deg, var(--glass-bg-2) 0%, rgba(255, 255, 255, 0) 70%);
	box-shadow: 0 4rpx 14rpx rgba(0, 0, 0, 0.10), inset 0 1rpx 0 var(--glass-hl-btm);
	transition: opacity 0.24s ease, transform 0.18s ease;
}

.guide-card:last-child {
	margin-right: 0;
}

/* 已结束 / 加载失败：压暗，但仍然占位，避免列表跳动 */
.guide-closed {
	opacity: 0.42;
}

.guide-mark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 46rpx;
	height: 46rpx;
	border-radius: 50%;
	background-image: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
	box-shadow: 0 3rpx 10rpx rgba(0, 0, 0, 0.20);
}

.guide-mark-txt {
	font-size: 22rpx;
	font-weight: 600;
	color: #0B1116;
	line-height: 1;
}

.guide-name {
	margin-top: 16rpx;
	font-size: 26rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.guide-desc {
	max-width: 100%;
	margin-top: 8rpx;
	overflow: hidden;
	font-size: 20rpx;
	line-height: 1.35;
	color: var(--text-faint);
	text-overflow: ellipsis;
	white-space: nowrap;
	transition: color 0.45s;
}

/* ---------- 攻略弹层（四个入口共用一个） ---------- */
.sheet-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 80;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	box-sizing: border-box;
	background-color: rgba(0, 0, 0, 0.56);
}

.sheet {
	display: flex;
	flex-direction: column;
	width: 100%;
	max-height: 76vh;
	padding: 28rpx 26rpx 24rpx;
	box-sizing: border-box;
	border-radius: 34rpx;
}

.sheet-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
	margin-bottom: 20rpx;
}

.sheet-title {
	font-size: 30rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
}

.sheet-close {
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
}

.sheet-close-txt {
	font-size: 22rpx;
	color: var(--text-dim);
}

.sheet-body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
}

.sheet-img {
	display: block;
	width: 100%;
	border-radius: 18rpx;
}

.sheet-fallback {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 300rpx;
}

.sheet-tip {
	flex-shrink: 0;
	margin-top: 18rpx;
	text-align: center;
	font-size: 20rpx;
	color: var(--text-faint);
}

/* ---------- 图片下方的保存按钮：和「生成分享图」预览里那颗同一套 ---------- */
.save-bar {
	display: flex;
	justify-content: center;
	margin-top: 18rpx;
}

.save-bar-in {
	margin-top: 20rpx;
}

.save-btn {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	padding: 12rpx 40rpx;
	border-radius: 999rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
	-webkit-backdrop-filter: blur(20rpx) saturate(180%);
	backdrop-filter: blur(20rpx) saturate(180%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl), 0 4rpx 16rpx rgba(0, 0, 0, 0.10);
}

.save-btn-active {
	transform: scale(0.96);
	opacity: 0.86;
}

.save-btn-txt {
	font-size: 24rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
}

/* 深色弹层（任务单图）里换成浅色玻璃描边 */
.save-btn-dark {
	border-color: rgba(255, 255, 255, 0.28);
	background-color: rgba(255, 255, 255, 0.12);
	box-shadow: inset 0 1rpx 0 rgba(255, 255, 255, 0.32), 0 4rpx 15rpx rgba(0, 0, 0, 0.35);
}

.save-btn-dark .save-btn-txt {
	color: #FFFFFF;
}

.shot-acts {
	display: flex;
	flex-direction: row;
	align-items: center;
}

/* ---------- 红石/黑石：今日降落时间 ---------- */
.hs-drop {
	margin-top: 20rpx;
	padding: 22rpx 24rpx;
	border-radius: 26rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: rgba(255, 255, 255, 0.10);
}

.hs-drop-head {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.hs-drop-title {
	font-size: 24rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	color: var(--text);
	transition: color 0.45s;
}

.hs-drop-tag {
	padding: 6rpx 16rpx;
	border-radius: 999rpx;
}

.hs-tag-red {
	background-color: rgba(255, 96, 96, 0.22);
}

.hs-tag-black {
	background-color: rgba(176, 188, 210, 0.22);
}

.hs-drop-tag-txt {
	font-size: 20rpx;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.hs-slots {
	display: flex;
	flex-direction: column;
}

.hs-slot {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 11rpx 0;
}

.hs-slot-idx {
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.hs-slot-time {
	font-size: 27rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	color: var(--text);
	transition: color 0.45s;
}

.hs-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 0 4rpx;
}

.hs-empty-txt {
	font-size: 24rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

</style>

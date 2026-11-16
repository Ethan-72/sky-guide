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
					<view class="liq-thumb seg-thumb" :style="segThumbStyle"></view>
					<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'light' }">日</text></view>
					<view class="seg-item"><text class="seg-txt" :class="{ 'seg-txt-on': theme === 'dark' }">夜</text></view>
				</view>
			</view>

			<!-- 标题 -->
			<view class="hero">
				<text class="hero-date">{{ viewDate }}</text>
				<text class="hero-title">{{ heroTitle }}</text>
				<text class="hero-jl" v-if="jlLine">{{ jlLine }}</text>
				<text class="hero-source">数据来源：@今天游离翻车了吗</text>
				<text class="hero-updated" v-if="isToday && updatedAt">更新于 {{ updatedAt }}</text>
			</view>

			<!-- 日期切换：昨天 / 今天 / 明天 + 距刷新倒计时 -->
			<view class="daytabs-row">
				<view class="daytabs">
					<view class="liq-thumb daytabs-thumb" :style="dayThumbStyle"></view>
					<view class="daytab" @click="switchDay(-1)" @touchstart="switchDay(-1)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === -1 }">昨天</text>
					</view>
					<view class="daytab" @click="switchDay(0)" @touchstart="switchDay(0)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 0 }">今天</text>
					</view>
					<view class="daytab" @click="switchDay(1)" @touchstart="switchDay(1)">
						<text class="daytab-txt" :class="{ 'daytab-txt-on': dayOffset === 1 }">明天</text>
					</view>
				</view>
				<text class="refresh-tip">{{ refreshTip }}</text>
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

			<!-- 更多攻略：横向卡片 + 共用一个查看弹层（仅 H5） -->
			<!-- #ifdef H5 -->
			<view class="section" v-if="isToday">
				<text class="section-title">更多攻略</text>
				<text class="section-hint">左右滑动</text>
			</view>

			<view v-if="isToday" class="guide-strip">
				<view
					class="guide-card"
					:class="'guide-' + g.status"
					v-for="(g, i) in guides"
					:key="g.key"
					@click="openGuide(i)"
				>
					<view class="guide-mark"><text class="guide-mark-txt">{{ g.mark }}</text></view>
					<text class="guide-name">{{ g.name }}</text>
					<text class="guide-desc">{{ guideCardDesc(g) }}</text>
				</view>
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

			<!-- 主按钮 -->

			<view class="primary-btn" hover-class="primary-btn-active" :hover-stay-time="80" @click="copyTasks">
				<text class="primary-txt">一键复制任务</text>
			</view>

			<text class="footer">仅供个人游戏参考</text>

			<!-- #ifdef H5 -->
			<!-- 娱乐悬浮球：固定右下，悬在「一键复制」上方约 50rpx，不遮挡按钮 -->
			<view
				class="play-fab glass"
				hover-class="play-fab-active"
				:hover-stay-time="80"
				@click="openPlay"
			>
				<text class="play-fab-txt">玩</text>
			</view>

			<!-- 娱乐抽屉：底部滑出，内部单层复用三个子视图 -->
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

					<!-- 三个入口 -->
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

					<!-- 敲木鱼 -->
					<view class="play-body" v-else-if="playView === 'muyu'">
						<view class="muyu-stage" @click="tapMuyu">
							<text
								class="muyu-pop"
								v-for="p in muyuPops"
								:key="p.id"
								:style="{ left: 'calc(50% + ' + p.x + 'px)' }"
							>{{ p.text }}</text>
							<view class="muyu">
								<text class="muyu-txt">木</text>
							</view>
							<text class="muyu-hint">点一下木鱼，功德 +1</text>
						</view>
						<text class="muyu-count">已积累 {{ muyuCount }} 点功德</text>
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
					<view class="play-body" v-else>
						<view class="answer-card" :class="{ 'answer-card-rolling': answerRolling }">
							<text class="answer-hint">心里默念一个问题</text>
							<text class="answer-text">{{ answerRolling ? '……' : answerText || '然后翻开这一页' }}</text>
						</view>
						<view class="play-btn" hover-class="play-btn-active" :hover-stay-time="80" @click="drawAnswer">
							<text class="play-btn-txt">翻开答案之书</text>
						</view>
					</view>
				</view>
			</view>
			<!-- #endif -->
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

/**
 * 更多攻略（季蜡 / 红石天气 / 复刻先祖 / 免费魔法）
 * ------------------------------------------------------------------
 * 四个功能全部复用 t1qq 现有的 key，实测均可直接取：
 *  · jl（季蜡位置）  img: /sky/sc/scjl   → JPEG 1200x750 位置图
 *                    text:/sky/sc/lzwz   → { jlwz:{text:'雨林1'}, dlwz:{text:'霞谷1'} }
 *  · hs（红石天气）  json:/sky/gytq      → { data:[jpg, gif] } 第一张是天气表，gif 是贴纸（需过滤）
 *  · fk（复刻先祖）  img: /sky/sc/scfk   → JPEG 2340x1080；休赛期返回「已结束」白底占位图，
 *                    接口无状态字段，只能靠图片特征（近白且无色）判定，见 detectEndedPoster()
 *  · mf（免费魔法）  img: /sky/mf/magic  → JPEG 900x600 魔法图
 *                    text:/sky/mf/mf     → { mf:'今日免费魔法', magic:[{text:'烟花魔法'}] }
 */
const GUIDE_API = {
	jl: { img: API_BASE + '/sky/sc/scjl', text: API_BASE + '/sky/sc/lzwz' },
	hs: { json: API_BASE + '/sky/gytq' },
	fk: { img: API_BASE + '/sky/sc/scfk' },
	mf: { img: API_BASE + '/sky/mf/magic', text: API_BASE + '/sky/mf/mf' }
};

/**
 * 页面里除了任务/攻略接口，其余娱乐功能（敲木鱼 / 抽签 / 答案之书）
 * 全部使用本地写死的数组，不发任何请求，断网也能玩。
 */

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
			// 季蜡所在位置（来自 /sky/sc/lzwz 的 jlwz.text，如「雨林1」）
			// 该接口只支持 key 一个参数，没有明日数据，所以 jlTomorrow 预留但不填充
			jlToday: '',
			jlTomorrow: '',
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

			// -------- 液态玻璃滑块（弹簧动画的实时状态） --------
			// idx 是「第几格」，允许小数：滑动过程中会经过 1.37 这种中间值
			dayTabIdx: 1, // 昨天=0 / 今天=1 / 明天=2
			dayTabStretch: 0, // 速度带来的横向拉伸量
			dayTabLead: '0%', // 高光偏移，制造"液体流动"的方向感
			segIdx: 1, // 日=0 / 夜=1
			segStretch: 0,
			segLead: '0%',

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

			// -------- 距刷新倒计时（每天 24:00 重置） --------
			refreshTip: '',
			refreshTimer: 0, // setInterval 句柄，onUnload 里清掉

			// -------- 娱乐悬浮球：敲木鱼 / 抽签 / 答案之书（纯本地，无请求） --------
			playOpen: false,
			playView: 'list', // list 入口列表 / muyu 敲木鱼 / sign 抽签 / answer 答案之书
			muyuCount: 0, // 累计功德
			muyuPops: [], // 飘字动画队列 { id, text, x }
			muyuSeq: 0, // 飘字唯一 id
			signResult: null, // { level, text, tone }
			signRolling: false,
			answerText: '',
			answerRolling: false,
			// 抽签文案：写死在本地，不请求任何接口
			signPool: [
				{ level: '大吉', text: '今日跑暴风眼必不掉翼', tone: 'best' },
				{ level: '大吉', text: '先祖见你都主动伸手，蜡烛自己往兜里跳', tone: 'best' },
				{ level: '中吉', text: '暮土一次过，冥龙今天在打瞌睡', tone: 'good' },
				{ level: '中吉', text: '牵手好友必有回响，今日宜双人跑图', tone: 'good' },
				{ level: '平', text: '宜挂机，忌跑图', tone: 'flat' },
				{ level: '平', text: '适合在云野坐着看云，蜡烛不急', tone: 'flat' },
				{ level: '小凶', text: '去暮土小心被皮皮虾盯上', tone: 'bad' },
				{ level: '小凶', text: '今日宜绕开螃蟹堆，被撞了别怪签文没提醒', tone: 'bad' }
			],
			// 答案之书：万能答案，写死在本地
			answerPool: [
				'别想了，去跑图吧',
				'是的',
				'再等等',
				'绝对不行',
				'今天没戏，明天再来',
				'你心里其实已经有答案了',
				'会有人牵你的手',
				'放手吧，前面还有更好的',
				'就现在，别犹豫',
				'换个方向试试'
			],
			muyuWords: ['功德 +1', '烛火 +1', '心诚则灵 +1'],

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
			return this.thumbStyle(this.dayTabIdx, this.dayTabStretch, this.dayTabLead);
		},

		segThumbStyle() {
			return this.thumbStyle(this.segIdx, this.segStretch, this.segLead);
		},

		/* -------- 娱乐抽屉 -------- */
		playTitle() {
			if (this.playView === 'muyu') return '敲木鱼';
			if (this.playView === 'sign') return '光遇抽签';
			if (this.playView === 'answer') return '答案之书';
			return '歇一会儿';
		},

		playItems() {
			return [
				{ key: 'muyu', icon: '木', name: '敲木鱼', desc: '点一下，功德 +1' },
				{ key: 'sign', icon: '签', name: '光遇抽签', desc: '今日运势，玄学一把' },
				{ key: 'answer', icon: '书', name: '答案之书', desc: '心里默念问题，翻开一页' }
			];
		},

		// #ifdef H5
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

		/* 今日红石/黑石降落时间：完全本地推算，不请求任何接口
		 * ① 先按「日期落在 1-15 还是 16-月底」+ 星期，决定今天落红石还是黑石
		 *    1-15 号：周二黑石 / 周六红石 / 周日红石
		 *    16-月底：周三黑石 / 周五红石 / 周日红石
		 * ② 再按星期取固定的三档时间（每天 3 次，每次持续到下一个整点）
		 * ③ 没有红石/黑石的日子返回空数组，弹层里显示「今日无红石/黑石」 */
		hsDrop() {
			const now = new Date();
			const day = now.getDate();
			const wd = now.getDay(); // 0 = 周日
			let type = '';

			if (day <= 15) {
				if (wd === 2) type = '黑石';
				else if (wd === 6 || wd === 0) type = '红石';
			} else {
				if (wd === 3) type = '黑石';
				else if (wd === 5 || wd === 0) type = '红石';
			}

			const TABLE = {
				0: ['07:08-08:00', '13:08-14:00', '19:08-20:00'],
				1: ['07:08-08:00', '13:08-14:00', '19:08-20:00'],
				2: ['09:08-10:00', '14:08-15:00', '19:08-20:00'],
				3: ['09:08-10:00', '15:08-16:00', '21:08-22:00'],
				4: ['10:08-11:00', '16:08-17:00', '22:08-23:00'],
				5: ['11:08-12:00', '17:08-18:00', '23:08-24:00'],
				6: ['10:08-11:00', '14:08-15:00', '22:08-23:00']
			};

			const slots = type ? TABLE[wd] || [] : [];
			return { type, slots, line: slots.join(' / ') };
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
		this.applyThemeBackground();

		// 滑块初始位置直接对齐当前状态，首屏不播放动画
		this.dayTabIdx = this.dayOffset + 1;
		this.segIdx = this.theme === 'dark' ? 1 : 0;
		this.initSpring();

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
			this.fetchJinLa(); // 标题下方的「今日季蜡」
		}

		// #ifdef H5
		// 更多攻略的副标题（文字接口很小），静默预取，卡片上能直接显示内容
		this.prefetchGuideTexts();
		// 复刻先祖若处于休赛期，卡片直接标「本期已结束」
		this.precheckEndedGuide();
		// #endif

		// 距刷新倒计时：先算一次，之后每 20 秒刷新（跨整分钟才变，20 秒足够且不费电）
		this.tickRefresh();
		if (this.refreshTimer) clearInterval(this.refreshTimer);
		this.refreshTimer = setInterval(() => this.tickRefresh(), 20000);
	},

	onUnload() {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = 0;
		}
	},

	// 回到前台：①自动模式按当前时间重新判定主题 ②数据过期则静默重拉
	onShow() {
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
			this.fetchJinLa();
		}
	},

	// 页面销毁时停掉弹簧循环，避免 rAF 泄漏
	onUnload() {
		this.stopSpring('day');
		this.stopSpring('seg');
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

		/* ---------------- 液态玻璃滑块（弹簧驱动） ---------------- */
		/* 把「第几格 + 拉伸量 + 高光偏移」拼成 CSS 变量，模板里的滑块只认变量 */
		thumbStyle(idx, stretch, lead) {
			return {
				'--idx': String(idx),
				'--sx': String(1 + stretch),
				// 横向拉伸时纵向收一点，视觉上体积守恒，才像液体而不是橡皮筋
				'--sy': String(1 - stretch * 0.42),
				'--lead': lead
			};
		},

		/* 初始化两套弹簧（不放进 data，避免每帧触发响应式 diff 之外的额外开销） */
		initSpring() {
			this._spring = {
				day: { x: this.dayOffset + 1, v: 0, raf: 0, target: this.dayOffset + 1 },
				seg: { x: this.theme === 'dark' ? 1 : 0, v: 0, raf: 0, target: this.theme === 'dark' ? 1 : 0 }
			};
		},

		/* 阻尼弹簧：刚度 420 / 阻尼 27 ≈ 0.66 阻尼比，约 380ms 到位并轻微回弹 */
		/* 与 CSS transition 的区别在于它是物理积分，速度可以被读出来驱动拉伸 */
		slideTo(kind, target) {
			const st = this._spring && this._spring[kind];
			if (!st) return;
			if (st.raf && st.target === target) return; // 已经在去同一格的路上
			if (typeof requestAnimationFrame !== 'function') {
				this.applySlide(kind, target, 0, '0%');
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
				const lead = Math.max(-16, Math.min(16, st.v * 5)).toFixed(1) + '%';
				this.applySlide(kind, st.x, stretch, lead);

				if (Math.abs(st.v) < 0.03 && Math.abs(st.x - st.target) < 0.0015) {
					this.applySlide(kind, st.target, 0, '0%');
					st.x = st.target;
					st.v = 0;
					st.raf = 0;
					return;
				}
				st.raf = requestAnimationFrame(step);
			};
			st.raf = requestAnimationFrame(step);
		},

		applySlide(kind, idx, stretch, lead) {
			if (kind === 'day') {
				this.dayTabIdx = idx;
				this.dayTabStretch = stretch;
				this.dayTabLead = lead;
			} else {
				this.segIdx = idx;
				this.segStretch = stretch;
				this.segLead = lead;
			}
		},

		stopSpring(kind) {
			const st = this._spring && this._spring[kind];
			if (st && st.raf) {
				cancelAnimationFrame(st.raf);
				st.raf = 0;
			}
		},

		/* ---------------- 日期切换与本地存档 ---------------- */
		/* 取相对今天偏移 N 天的日期字符串：0=今天，-1=昨天，1=明天 */
		dayText(offset) {
			const d = new Date();
			d.setDate(d.getDate() + offset);
			return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
		},

		switchDay(offset) {
			// touchstart 与 click 都会触发，重复调用直接忽略
			if (this.dayOffset === offset) return;
			this.slideTo('day', offset + 1); // -1/0/1 → 0/1/2
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
						(grouped[item.date] = grouped[item.date] || []).push({
							text: this.cleanTaskText(item.quest_cn),
							from: ''
						});
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
			const next = this.theme === 'dark' ? 'light' : 'dark';
			this.slideTo('seg', next === 'dark' ? 1 : 0);
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
			this.fetchJinLa();
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
						// ① 抹掉 #r 等格式控制符 ② 第 5 项「今日季节蜡烛所在地图」改到标题下方单独展示
						this.tasks = rw
							.map((item, i) => ({
								id: i + 1,
								text: this.cleanTaskText(item.text),
								from: item.type || '每日任务'
							}))
							.filter(t => !/季节蜡烛|季蜡/.test(t.text));
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

		/* 清理任务文本：#r / #n 等格式控制符（接口的换行、颜色标记）和裸换行都会
		 * 原样显示成「收集30点烛火#r」这种尾巴，这里统一抹掉 */
		cleanTaskText(text) {
			return String(text || '')
				.replace(/#[a-zA-Z]/g, '')
				.replace(/[\r\n]+/g, ' ')
				.replace(/\s{2,}/g, ' ')
				.trim();
		},

		/* ---------------- 季蜡位置（标题下方一行小字） ----------------
		 * /sky/sc/lzwz → { jlwz:{ text:'雨林1' } }，格式化成「雨林（图1）」
		 * 文档里该接口只有 key 一个参数、没有明日数据，
		 * 所以只取今天；切到明天时 jlTomorrow 为空，标题下自动不显示，不报错。
		 */
		fetchJinLa() {
			uni.request({
				url: API_BASE + '/sky/sc/lzwz',
				method: 'GET',
				data: { key: this.apiKey, type: 'json' },
				timeout: 10000,
				success: res => {
					const body = this.safeJson(res && res.data) || {};
					const raw = body.jlwz && body.jlwz.text ? String(body.jlwz.text).trim() : '';
					this.jlToday = this.formatJl(raw);
				},
				fail: () => {
					// 静默失败：标题下不显示这一行，任务列表照常
				}
			});
		},

		formatJl(raw) {
			if (!raw) return '';
			const m = /^(.+?)(\d+)$/.exec(raw);
			if (m) return m[1].trim() + '（图' + m[2] + '）';
			return raw;
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

		/* ---------------- 娱乐抽屉：敲木鱼 / 抽签 / 答案之书 ---------------- */
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

		/* 敲木鱼：本地累加 + 飘字 + 震动，不发任何请求 */
		tapMuyu() {
			this.muyuCount = this.muyuCount + 1;
			const words = this.muyuWords;
			const id = ++this.muyuSeq;
			this.muyuPops.push({
				id,
				text: words[Math.floor(Math.random() * words.length)],
				x: Math.round((Math.random() * 2 - 1) * 44)
			});
			setTimeout(() => {
				this.muyuPops = this.muyuPops.filter(p => p.id !== id);
			}, 1100);
			this.buzz();
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

			const url = cfg.img + '?key=' + this.apiKey;
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
			uni.request({
				url,
				method: 'GET',
				data: { key: this.apiKey },
				timeout: 12000,
				success: res => {
					const body = this.safeJson(res && res.data) || {};
					const list = Array.isArray(body.data) ? body.data : [];
					const all = list.filter(u => typeof u === 'string' && /^https?:\/\//i.test(u));
					// 优先 jpg/png/webp；只剩 gif 说明当天只返回了表情贴纸
					const usable = all.filter(u => !/\.gif(\?|$)/i.test(u));

					if (usable.length) {
						g.url = usable[0];
						g.desc = '今日天气 + 红石碎片';
						g.status = 'ok';
						return;
					}
					if (all.length) {
						// 兜底：没有可用图 → 「今日暂无」，这是正常状态不是报错
						g.status = 'empty';
						g.desc = '今日暂无红石/黑石';
						g.err = '接口只返回了贴纸图';
						return;
					}
					g.status = 'error';
					g.err = '接口返回内容为空';
				},
				fail: () => {
					g.status = 'error';
					g.err = '网络异常，请重试';
				}
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
			uni.previewImage({ urls: [g.url], current: g.url });
		},

		/* 判定「已结束」占位图：白底黑字、几乎没有彩色。
		 * 采样 24×24，平均亮度 > 205 且平均饱和差 < 12 判为占位图。
		 * 拿不到像素（canvas 被污染 / 非浏览器环境）时一律当正常图，宁可多显示也不误伤。 */
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
			uni.request({
				url: GUIDE_API.jl.text,
				method: 'GET',
				data: { key: this.apiKey },
				timeout: 10000,
				success: res => {
					const b = this.safeJson(res && res.data) || {};
					const jl = b.jlwz && b.jlwz.text ? b.jlwz.text : '';
					const dl = b.dlwz && b.dlwz.text ? b.dlwz.text : '';
					if (jl) this.setGuideDesc('jl', dl ? `季蜡 ${jl} · 大蜡 ${dl}` : `季蜡 ${jl}`);
				}
			});
			uni.request({
				url: GUIDE_API.mf.text,
				method: 'GET',
				data: { key: this.apiKey },
				timeout: 10000,
				success: res => {
					const b = this.safeJson(res && res.data) || {};
					const m = b.magic && b.magic[0] && b.magic[0].text ? b.magic[0].text : '';
					if (m) this.setGuideDesc('mf', m);
				}
			});
		},

		setGuideDesc(key, desc) {
			const g = this.guides.find(x => x.key === key);
			// 已判定「已结束」的项不让副标题覆盖状态文案
			if (g && g.status !== 'closed') g.desc = desc;
		},

		/* 复刻先祖提前判定一次：休赛期直接在卡片上标「本期已结束」并禁用点击，
		 * 不让用户点进去才发现是白底占位图。判定失败（false）就维持原状。 */
		precheckEndedGuide() {
			const g = this.guides.find(x => x.key === 'fk');
			if (!g) return;
			const url = GUIDE_API.fk.img + '?key=' + this.apiKey;
			this.detectEndedPoster(url).then(ended => {
				if (!ended || g.status === 'ok') return;
				g.status = 'closed';
				g.desc = '本期已结束';
			});
		},

		/* 接口偶尔返回 text/json，统一解析一次 */
		safeJson(data) {
			if (!data) return null;
			if (typeof data === 'object') return data;
			if (typeof data === 'string') {
				try {
					return JSON.parse(data);
				} catch (e) {
					return null;
				}
			}
			return null;
		}
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

	/* 玻璃：靠 backdrop-filter 折射背景，本体只留很淡的一层白 */
	--glass-bg: rgba(255, 255, 255, 0.055);
	--glass-bg-2: rgba(255, 255, 255, 0.02);
	--glass-bd: rgba(255, 255, 255, 0.13);
	--glass-hl: rgba(255, 255, 255, 0.30);   /* 上边缘高光 */
	--glass-hl-btm: rgba(255, 255, 255, 0.05); /* 下边缘反光 */
	--sheen: rgba(255, 255, 255, 0.11);       /* 左上柔光 */
	--blur: 30px;

	--line: rgba(255, 255, 255, 0.055);
	--accent: #7FD6FF;
	--accent-2: #B49BFF;
	--blob-a: rgba(96, 128, 255, 0.40);
	--blob-b: rgba(156, 92, 232, 0.30);
	--blob-c: rgba(0, 188, 214, 0.22);
	--shadow: 0 10px 30px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.18);
	--btn-a: #7FD6FF;
	--btn-b: #A9A0FF;
	--btn-txt: #06121B;

	--seg-bg: rgba(255, 255, 255, 0.07);
	--seg-thumb: rgba(255, 255, 255, 0.16);
	--seg-thumb-bd: rgba(255, 255, 255, 0.18);
	--seg-txt-on: #F2F4F8;

	/* 液态滑块：比轨道亮一档，靠 blur + 上下内高光形成"厚度" */
	--liq-a: rgba(255, 255, 255, 0.24);
	--liq-b: rgba(255, 255, 255, 0.10);
	--liq-bd: rgba(255, 255, 255, 0.30);
	--liq-hl: rgba(255, 255, 255, 0.62);
	--liq-hl-btm: rgba(255, 255, 255, 0.10);
	--liq-sheen: rgba(255, 255, 255, 0.24);
}

.theme-light {
	--bg: #EDF1F7;
	--bg-grad: radial-gradient(120% 80% at 10% -12%, #DCE6FA 0%, rgba(237, 241, 247, 0) 58%),
		radial-gradient(100% 70% at 95% 6%, #EBE2FB 0%, rgba(237, 241, 247, 0) 55%),
		linear-gradient(180deg, #F3F6FB 0%, #E8EDF6 100%);
	--text: #0B0D12;
	--text-dim: rgba(11, 13, 18, 0.58);
	--text-faint: rgba(11, 13, 18, 0.38);

	/* 浅色下玻璃必须比背景「更白一点点」，靠模糊 + 高光区分层次 */
	--glass-bg: rgba(255, 255, 255, 0.58);
	--glass-bg-2: rgba(255, 255, 255, 0.42);
	--glass-bd: rgba(255, 255, 255, 0.85);
	--glass-hl: rgba(255, 255, 255, 0.95);
	--glass-hl-btm: rgba(255, 255, 255, 0.35);
	--sheen: rgba(255, 255, 255, 0.45);
	--blur: 26px;

	--line: rgba(11, 13, 18, 0.055);
	--accent: #0A84FF;
	--accent-2: #7B5CFF;
	--blob-a: rgba(120, 170, 255, 0.34);
	--blob-b: rgba(178, 140, 255, 0.26);
	--blob-c: rgba(110, 214, 214, 0.22);
	--shadow: 0 10px 26px rgba(22, 34, 56, 0.09), 0 2px 6px rgba(22, 34, 56, 0.05);
	--btn-a: #0A84FF;
	--btn-b: #6E63FF;
	--btn-txt: #FFFFFF;

	--seg-bg: rgba(255, 255, 255, 0.55);
	--seg-thumb: rgba(255, 255, 255, 0.95);
	--seg-thumb-bd: rgba(255, 255, 255, 0.98);
	--seg-txt-on: #0B0D12;

	--liq-a: rgba(255, 255, 255, 0.94);
	--liq-b: rgba(255, 255, 255, 0.72);
	--liq-bd: rgba(255, 255, 255, 0.98);
	--liq-hl: rgba(255, 255, 255, 1);
	--liq-hl-btm: rgba(255, 255, 255, 0.50);
	--liq-sheen: rgba(198, 216, 255, 0.55);
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
/* 液态玻璃能「看起来像玻璃」，前提是背后有东西可以被模糊。
   这里的光斑必须够大、够糊、够淡，否则会被糊成一团团色块。 */
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
}

/* ---------- 玻璃基类 ---------- */
/* 真·液态玻璃的四层结构：
   ① backdrop-filter 把背后光斑模糊+提饱和（这是「玻璃」的本体，之前完全没写）
   ② 一层极淡的白色填充（0.05~0.6，深色更淡、浅色更白）
   ③ 上下各一条 0.5px 内高光，制造边缘厚度
   ④ 柔和的大范围投影，让卡片离开背景 */
.glass {
	position: relative;
	overflow: hidden;
	border-radius: 44rpx;
	border: 1rpx solid var(--glass-bd);
	background-color: var(--glass-bg);
	background-image: linear-gradient(168deg, var(--glass-bg-2) 0%, rgba(255, 255, 255, 0) 48%);
	-webkit-backdrop-filter: blur(28px) saturate(180%);
	backdrop-filter: blur(28px) saturate(180%);
	box-shadow: var(--shadow),
		inset 0 1rpx 0 var(--glass-hl),
		inset 0 -1rpx 0 var(--glass-hl-btm);
	transition: background-color 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease;
}

/* 左上角柔光：模拟光源打过来的镜面反射，面积小、透明度低，不压内容 */
.glass::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 60%;
	border-radius: inherit;
	background-image: radial-gradient(115% 90% at 16% -10%, var(--sheen) 0%, rgba(255, 255, 255, 0) 62%);
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

/* ---------- 液态玻璃滑块（日期切换 / 日夜切换共用） ---------- */
/* 位置用 --idx（可为小数，弹簧中间态），拉伸用 --sx/--sy，高光用 --lead */
.liq-thumb {
	position: absolute;
	z-index: 0;
	pointer-events: none;
	overflow: hidden;
	box-sizing: border-box;
	border-radius: 999rpx;
	border: 1rpx solid var(--liq-bd);
	background-image: linear-gradient(158deg, var(--liq-a) 0%, var(--liq-b) 100%);
	box-shadow:
		0 3rpx 10rpx rgba(0, 0, 0, 0.14),
		inset 0 1rpx 0 var(--liq-hl),
		inset 0 -1rpx 0 var(--liq-hl-btm);
	-webkit-backdrop-filter: blur(14px) saturate(200%);
	backdrop-filter: blur(14px) saturate(200%);
	transform: translate3d(calc(var(--idx, 1) * 100%), 0, 0) scale(var(--sx, 1), var(--sy, 1));
	transform-origin: 50% 50%;
	will-change: transform;
}

/* 滑块里那点会流动的高光：跟着速度左右跑，像液体被推着走时的反光 */
.liq-thumb::after {
	content: '';
	position: absolute;
	top: -50%;
	left: 50%;
	width: 140%;
	height: 200%;
	transform: translateX(calc(-50% + var(--lead, 0%)));
	background-image: radial-gradient(closest-side, var(--liq-sheen) 0%, rgba(255, 255, 255, 0) 100%);
	pointer-events: none;
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
	overflow: hidden;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
	-webkit-backdrop-filter: blur(18px) saturate(180%);
	backdrop-filter: blur(18px) saturate(180%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm), 0 2px 8px rgba(0, 0, 0, 0.08);
}

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
	border-radius: 999rpx;
	overflow: hidden;
	background-color: var(--seg-bg);
	border: 1rpx solid var(--glass-bd);
	-webkit-backdrop-filter: blur(18px) saturate(180%);
	backdrop-filter: blur(18px) saturate(180%);
	box-shadow: inset 0 1rpx 0 var(--glass-hl-btm);
}

/* 胶囊右侧的倒计时：不参与弹性布局，压缩时也不换行 */
.refresh-tip {
	flex-shrink: 0;
	margin-left: 18rpx;
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
	background-color: var(--seg-bg);
	-webkit-backdrop-filter: blur(16px) saturate(180%);
	backdrop-filter: blur(16px) saturate(180%);
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
	max-height: 78vh;
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

/* 敲木鱼 */
.muyu-stage {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 360rpx;
}

.muyu {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 212rpx;
	height: 212rpx;
	border-radius: 50%;
	background-image: radial-gradient(circle at 34% 28%, #916740 0%, #5b3a1e 62%, #3d240e 100%);
	box-shadow: 0 18rpx 40rpx rgba(0, 0, 0, 0.34), inset 0 2rpx 0 rgba(255, 255, 255, 0.32);
	transition: transform 0.12s ease;
}

.muyu-stage:active .muyu {
	transform: scale(0.93);
}

.muyu-txt {
	font-size: 64rpx;
	font-weight: 600;
	letter-spacing: 4rpx;
	color: rgba(255, 255, 255, 0.86);
}

.muyu-hint {
	margin-top: 24rpx;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-faint);
	transition: color 0.45s;
}

.muyu-count {
	margin-top: 6rpx;
	font-size: 22rpx;
	letter-spacing: 1rpx;
	color: var(--text-dim);
	transition: color 0.45s;
}

.muyu-pop {
	position: absolute;
	top: 44%;
	transform: translate(-50%, 0);
	font-size: 24rpx;
	font-weight: 600;
	letter-spacing: 1rpx;
	white-space: nowrap;
	color: var(--accent);
	pointer-events: none;
	animation: muyu-pop 1.1s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}

@keyframes muyu-pop {
	0% {
		opacity: 0;
		transform: translate(-50%, 12rpx) scale(0.8);
	}
	18% {
		opacity: 1;
		transform: translate(-50%, -18rpx) scale(1);
	}
	100% {
		opacity: 0;
		transform: translate(-50%, -150rpx) scale(1.05);
	}
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
</style>

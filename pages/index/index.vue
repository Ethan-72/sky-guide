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

			<!-- 任务列表 -->
			<view class="glass list">
				<view
					class="task"
					:class="{ 'task-tap': hasShots }"
					v-for="(item, index) in displayTasks"
					:key="index"
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

			<!-- 图片下方的保存按钮：和「生成分享图」预览里的那颗一致 -->
			<view class="save-bar" v-if="isToday && posterUrl && !posterError">
				<view class="save-btn" hover-class="save-btn-active" :hover-stay-time="80" @click.stop="downloadImage(posterUrl, '冰块-今日攻略图.png')">
					<text class="save-btn-txt">保存图片</text>
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
			<!-- #endif -->
		</view>
	</view>
</template>

<script>
// 接口：
//  · /sky/gyrw          文字任务 → { code, msg, rw:[{text}] }
//  · /sky/sc/scrw       攻略图，返回 image/png 二进制流，URL 本身即图片地址
//  · api.qmkjcm.cn      明日任务 → { data:{ task_list:[{date, quest_cn}] } }，一次返回今天+明天
const CACHE_KEY = 'sky_guide_theme';
const MODE_KEY = 'sky_guide_theme_mode';
const ARCHIVE_KEY = 'sky_guide_archive'; // 接口只给今天，昨天回看靠本地存档
const MR_API = 'https://api.qmkjcm.cn/api/gy_mr_rw/'; // CORS: *
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

// 有代理时走 /api，纯静态托管构建时注入绝对地址
const API_BASE = (import.meta.env && import.meta.env.VITE_API_BASE) || '/api';

const GUIDE_API = {
	jl: { img: API_BASE + '/sky/sc/scjl', text: API_BASE + '/sky/sc/lzwz' },
	hs: { json: API_BASE + '/sky/gytq' },
	fk: { img: API_BASE + '/sky/sc/scfk' },
	mf: { img: API_BASE + '/sky/mf/magic', text: API_BASE + '/sky/mf/mf' }
};

export default {
	data() {
		return {
			// -------- 主题：dark / light；themeMode: auto 按时间 / manual 手动 --------
			theme: 'dark',
			themeMode: 'auto',
			// 动态背景时段：dawn 清晨 / day 白天 / dusk 傍晚 / night 夜晚
			phase: 'day',

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
			posterW: 0, // 攻略图原始宽高：用来算四宫格切割比例
			posterH: 0,
			shotOpen: false, // 单条任务大图弹层
			shotIdx: 0, // 当前看的是第几条（0 起）
			shotTouchX: 0,
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
			clockTimer: 0, // rAF 不可用时的降级定时器句柄

			// -------- 娱乐悬浮球：摸小猫 / 抽签 / 答案之书 / 计算器（纯本地，无请求） --------
			playOpen: false,
			playView: 'list', // list 入口列表 / cat / sign / answer / calc
			catCount: 0, // 累计爱心
			catHearts: [], // 爱心粒子队列 { id, x, y, size, rot, delay }
			catSeq: 0, // 爱心唯一 id
			catHit: false, // 抚摸动画开关（点一下置 true，360ms 后复位）
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
			calcInput: '0', // 当前输入串
			calcAcc: null, // 累积值
			calcOp: '', // 挂起运算符：+ − × ÷
			calcFresh: true, // 下一个数字键是否覆盖当前输入
			calcErr: false,
			calcExpr: '', // 屏幕上方算式小字
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
			// 答案之书：30+ 条光遇梗，全部本地写死，断网也能翻
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
			],

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

		/* -------- 攻略图分格：一张长图里 4 个任务，按比例切出各自的格子 -------- */
		// 返回每格在原图中的相对矩形 { cx, cy, cw, ch }
		shotRects() {
			const w = this.posterW || 1200;
			const h = this.posterH || 750;
			if (w / h >= 1.15) {
				// 横版四宫格：1 左上 / 2 右上 / 3 左下 / 4 右下（顶部是标题带，先让开）
				return [
					{ cx: 0.02, cy: 0.152, cw: 0.475, ch: 0.402 },
					{ cx: 0.505, cy: 0.152, cw: 0.475, ch: 0.402 },
					{ cx: 0.02, cy: 0.556, cw: 0.475, ch: 0.412 },
					{ cx: 0.505, cy: 0.556, cw: 0.475, ch: 0.412 }
				];
			}
			// 竖版长图：四条自上而下
			return [0, 1, 2, 3].map(i => ({ cx: 0.02, cy: 0.02 + i * 0.245, cw: 0.96, ch: 0.235 }));
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
			const w = this.posterW || 1200;
			const h = this.posterH || 750;
			return (r.cw * w) / (r.ch * h);
		},

		// 弹层舞台尺寸：按格子比例把图装进当前窗口（用 px，电脑/手机都按可视区算）
		shotStageStyle() {
			const ar = this.shotAspect || 1.9;
			const vw = typeof window !== 'undefined' && window.innerWidth ? window.innerWidth : 375;
			const vh = typeof window !== 'undefined' && window.innerHeight ? window.innerHeight : 667;
			const maxW = Math.min(vw * 0.88, 560);
			const maxH = Math.max(120, Math.min(vh * 0.52, vh - 240));
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


		// 当前花色的猫头照片路径
		catPhotoSrc() {
			return '/static/cats/' + this.catCoat + '.png';
		},
		// 左上角当前花色的中文名（computed，缓存）
		catCoatName() {
			const c = this.catCoats.find(x => x.key === this.catCoat);
			return c ? c.name : '橘猫';
		},

		/* -------- 娱乐抽屉 -------- */
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

		/* 计算器显示：出错时给提示，否则就是当前输入串 */
		calcOut() {
			if (this.calcErr) return '不能除以 0';
			return this.calcInput;
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

		// 红石/黑石降落时间，本地推算：1-15 号周二黑石、周六周日红石；16 号起周三黑石、周五周日红石。没有的日子返回空数组。
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
		this.refreshPhase();
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
		// 首次触摸/点击就解锁音频：摸小猫第一下即可出声（不支持的浏览器静默降级）
		if (typeof document !== 'undefined' && document.addEventListener) {
			const unlock = () => {
				this.ensureAudio();
				document.removeEventListener('pointerdown', unlock);
				document.removeEventListener('touchstart', unlock);
			};
			document.addEventListener('pointerdown', unlock);
			document.addEventListener('touchstart', unlock);
		}
		// #endif

		// 时钟 + 距刷新倒计时：rAF 驱动，每拍重新取系统时间（切后台回来也立刻准确）
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
			return {
				'--idx': String(idx),
				'--sx': String(1 + stretch),
				// 横向拉伸时纵向收一点，保持体积感
				'--sy': String(1 - stretch * 0.42),
				'--press': String(press || 1)
			};
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
			const d = Math.abs(cur - i);
			return d >= 1 ? 0 : 1 - d;
		},

		// 把激活度翻译成颜色/字重样式（连续过渡，不用 class 硬切）
		mixTxtStyle(a) {
			return {
				opacity: String(0.5 + 0.5 * a),
				'font-weight': a > 0.5 ? '600' : '400',
				transform: `scale(${(0.94 + 0.06 * a).toFixed(3)})`
			};
		},

		// 边界阻尼：越界只保留 32% 位移，拉得动但出不去
		dampIdx(raw, n) {
			if (raw < 0) return raw * 0.32;
			if (raw > n - 1) return (n - 1) + (raw - (n - 1)) * 0.32;
			return raw;
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

		onDragStart(e, kind) {
			const m = this.tabMeta(kind);
			this.stopSpring(kind); // 抢过正在飞行的滑块
			this.applySlide(kind, this[kind === 'day' ? 'dayTabIdx' : 'segIdx'], 0, false);
			const x0 = this.touchX(e);
			this._drag = {
				kind,
				x0,
				i0: m.idx,
				t0: Date.now(),
				lastX: x0,
				lastT: Date.now(),
				v: 0,
				n: m.n,
				moved: false,
				targetEl: e.currentTarget
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

			// 一格宽度 = 容器宽 / 格数（px 只在这里用于换算）
			const w = (d.targetEl && d.targetEl.clientWidth ? d.targetEl.clientWidth : 300) / d.n;
			const raw = d.i0 + dx / w;
			const idx = this.dampIdx(raw, d.n);

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

		// 带初速的弹簧吸附（复用 slideTo 的积分，但先注入初速）
		_snapWithVelocity(kind, target, v0) {
			const st = this._spring && this._spring[kind];
			if (!st) return;
			st.target = target;
			st.v = v0;
			if (typeof requestAnimationFrame !== 'function') {
				this.applySlide(kind, target, 0, true);
				st.x = target; st.v = 0;
				return;
			}
			if (st.raf) cancelAnimationFrame(st.raf);
			let last = 0;
			const step = now => {
				if (!last) last = now;
				let dt = (now - last) / 1000; last = now;
				if (!(dt > 0)) dt = 1 / 60;
				if (dt > 0.04) dt = 0.04;
				const accel = -420 * (st.x - st.target) - 27 * st.v;
				st.v += accel * dt;
				st.x += st.v * dt;
				const stretch = Math.min(Math.abs(st.v) * 0.026, 0.14);
				this.applySlide(kind, st.x, stretch);
				if (Math.abs(st.v) < 0.03 && Math.abs(st.x - st.target) < 0.0015) {
					this.applySlide(kind, st.target, 0, true);
					st.x = st.target; st.v = 0; st.raf = 0;
					return;
				}
				st.raf = requestAnimationFrame(step);
			};
			st.raf = requestAnimationFrame(step);
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
		refreshPhase(h24) {
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
						uni.showToast({ title: this.apiErrMsg(body) + '，已回退 Mock', icon: 'none' });
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

		/* 根据接口返回的 code / msg 生成更准确的错误提示，
		 * 避免把「密钥失效」「请求过频」都笼统报成「数据格式异常」 */
		apiErrMsg(body) {
			const code = body && body.code;
			const msg = String((body && body.msg) || '');
			if (code === 403 || /密钥|key/i.test(msg)) return '接口密钥失效，需更新 key';
			if (code === 429 || /频率|频繁/.test(msg)) return '请求太频繁，请稍后再试';
			return '数据格式异常';
		},

		// 清理任务文本里的 #r 等控制符和多余空白
		cleanTaskText(text) {
			return String(text || '')
				.replace(/#[a-zA-Z]/g, '')
				.replace(/[\r\n]+/g, ' ')
				.replace(/\s{2,}/g, ' ')
				.trim();
		},

		// 季蜡位置：/sky/sc/lzwz → { jlwz:{text} }，格式化成「雨林（图1）」；接口无明日数据
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

		// 攻略图：scrw 返回 image/png 流，URL 本身即图片地址；探测响应头，兼容将来改返回 JSON
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
			const overlay = document.createElement('div');
			overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(6,8,16,0.94);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;box-sizing:border-box;';
			const img = document.createElement('img');
			img.src = src;
			img.style.cssText = 'display:block;max-width:86vw;max-height:74vh;width:auto;height:auto;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.6);';
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
			// #endif
			// #ifndef H5
			this.previewPoster();
			// #endif
		},

		closeShot() {
			this.shotOpen = false;
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
			const L = this.measureShareLayout(list);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('canvas 2d unavailable');
			const W = L.W, H = L.H, PAD = L.PAD, cardH = L.cardH;
			canvas.width = W;
			canvas.height = H;

			const bg = ctx.createLinearGradient(0, 0, 0, H);
			bg.addColorStop(0, '#0B0E1A');
			bg.addColorStop(1, '#141B31');
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, W, H);

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

			const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
			const fs = n => { ctx.font = n + 'px ' + FONT; };
			ctx.textBaseline = 'middle';
			fs(24); ctx.fillStyle = 'rgba(127,214,255,0.9)';
			ctx.fillText('光遇每日任务', PAD + 6, 56);
			fs(44); ctx.fillStyle = '#F2F4F8';
			ctx.fillText(L.dateText, PAD + 6, 104);
			const dateW = ctx.measureText(L.dateText).width;
			fs(24); ctx.fillStyle = 'rgba(242,244,248,0.55)';
			ctx.fillText(L.week, PAD + 10 + dateW + 60, 104);

			const cardY = 150, cardX = 24, cardW = W - 48, R = 24;
			ctx.beginPath();
			ctx.moveTo(cardX + R, cardY);
			ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, R);
			ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, R);
			ctx.arcTo(cardX, cardY + cardH, cardX, cardY, R);
			ctx.arcTo(cardX, cardY, cardX + cardW, cardY, R);
			ctx.closePath();
			ctx.fillStyle = 'rgba(255,255,255,0.06)';
			ctx.fill();
			ctx.strokeStyle = 'rgba(255,255,255,0.16)';
			ctx.lineWidth = 1;
			ctx.stroke();

			let y = cardY + PAD + 15;
			L.tasks.forEach((t, i) => {
				const bx = cardX + PAD + 16;
				ctx.beginPath();
				ctx.arc(bx, y + 2, 15, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(127,214,255,0.16)';
				ctx.fill();
				fs(16); ctx.fillStyle = '#7FD6FF';
				ctx.textAlign = 'center';
				ctx.fillText(String(i + 1), bx, y + 2);
				ctx.textAlign = 'left';
				fs(22); ctx.fillStyle = 'rgba(242,244,248,0.92)';
				t.lines.forEach((ln, j) => {
					ctx.fillText(ln, cardX + PAD + 46, y + j * 30 + 2);
				});
				y += Math.max(30, t.lines.length * 30) + 20;
			});

			if (L.hasJl) {
				fs(20); ctx.fillStyle = '#B49BFF';
				ctx.fillText('今日季蜡 · ' + this.jlToday, cardX + PAD + 6, y + 4);
			}

			fs(22); ctx.fillStyle = 'rgba(242,244,248,0.45)';
			ctx.textAlign = 'center';
			ctx.fillText('@冰块', W / 2, H - 34);
			ctx.textAlign = 'left';

			const dataUrl = canvas.toDataURL('image/png');
			this.sharing = false;
			clearTimeout(this._shareTimer);
			this.showPosterPreview(dataUrl);
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
			let ctx;
			// #ifdef H5
			const _c = document.createElement('canvas');
			ctx = _c.getContext('2d');
			// #endif
			// #ifndef H5
			ctx = uni.createCanvasContext('shareCanvas', this);
			// #endif
			const W = 600, PAD = 26, TEXT_W = W - PAD * 2 - 46;
			// 量宽度：measureText 不可用时退化为「字数 × 字号」估算
			const measure = (text, size) => {
				try {
					if (!ctx) return String(text).length * size;
					if (typeof ctx.setFontSize === 'function') ctx.setFontSize(size);
					else ctx.font = size + 'px sans-serif';
					const w = ctx.measureText(String(text)).width;
					if (w > 0) return w;
				} catch (e) { /* 走估算 */ }
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
			d.setDate(d.getDate() + this.dayOffset);
			const hasJl = this.dayOffset === 0 && !!this.jlToday;
			const tasks = list.map(t => ({ text: t.text, lines: wrap(t.text, 22, TEXT_W) }));
			const tasksH = tasks.reduce((s, t) => s + Math.max(30, t.lines.length * 30) + 20, 0);
			const cardH = PAD * 2 + tasksH + (hasJl ? 44 : 0);
			const H = Math.round(150 + cardH + 36 + 60);
			return {
				W, H, PAD, cardH, tasks, hasJl,
				dateText: (d.getMonth() + 1) + '月' + d.getDate() + '日',
				week: '星期' + '日一二三四五六'[d.getDay()]
			};
		},

		/* 真正绘制并导出 */
		drawSharePoster() {
			const L = this._shareLayout;
			if (!L) {
				this.sharing = false;
				return;
			}
			const ctx = uni.createCanvasContext('shareCanvas', this);
			const { W, H, PAD, cardH } = L;

			/* 背景：深夜蓝渐变 */
			const bg = ctx.createLinearGradient(0, 0, 0, H);
			bg.addColorStop(0, '#0B0E1A');
			bg.addColorStop(1, '#141B31');
			ctx.setFillStyle(bg);
			ctx.fillRect(0, 0, W, H);

			/* 光斑：三团彩色径向渐变，对应页面里的 blob 光斑 */
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

			/* 顶部：小标 + 大日期 + 星期 */
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

			/* 玻璃卡片：半透明白 + 细描边，和页面里的 .glass 一个味道 */
			const cardY = 150, cardX = 24, cardW = W - 48, R = 24;
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

			/* 任务列表：序号徽章 + 自动换行文案 */
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
					ctx.fillText(ln, cardX + PAD + 46, y + j * 30 + 2);
				});
				y += Math.max(30, t.lines.length * 30) + 20;
			});

			/* 季蜡位置：只有今天有数据才画 */
			if (L.hasJl) {
				ctx.setFontSize(20);
				ctx.setFillStyle('#B49BFF');
				ctx.fillText('今日季蜡 · ' + this.jlToday, cardX + PAD + 6, y + 4);
			}

			/* 底部水印 */
			ctx.setFontSize(22);
			ctx.setFillStyle('rgba(242,244,248,0.45)');
			ctx.setTextAlign('center');
			ctx.fillText('@冰块', W / 2, H - 34);
			ctx.setTextAlign('left');

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
		startClock() {
			this.stopClock();
			this.tickClock(true);

			if (typeof requestAnimationFrame === 'function') {
				const loop = () => {
					this.tickClock();
					this._clockRaf = requestAnimationFrame(loop);
				};
				this._clockRaf = requestAnimationFrame(loop);
			} else {
				// 非浏览器环境（小程序 / App）退回 1s 定时器，逻辑同样是每次取真实时间
				this.clockTimer = setInterval(() => this.tickClock(true), 1000);
			}

			if (typeof document !== 'undefined' && document.addEventListener) {
				this._visHandler = () => {
					if (!document.hidden) this.tickClock(true);
				};
				document.addEventListener('visibilitychange', this._visHandler);
			}
		},

		stopClock() {
			if (this._clockRaf && typeof cancelAnimationFrame === 'function') {
				cancelAnimationFrame(this._clockRaf);
			}
			this._clockRaf = 0;
			if (this.clockTimer) {
				clearInterval(this.clockTimer);
				this.clockTimer = 0;
			}
			if (this._visHandler && typeof document !== 'undefined') {
				document.removeEventListener('visibilitychange', this._visHandler);
				this._visHandler = null;
			}
		},

		/* force = true 时强制重算（切前台、页面显示），平时只在整秒变化时才写数据，
		 * 避免 rAF 每帧都触发一次视图更新 */
		tickClock(force) {
			const now = new Date();
			const sec = Math.floor(now.getTime() / 1000);
			if (!force && sec === this.clockLastSec) return;
			this.clockLastSec = sec;

			const h24 = now.getHours();
			const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
			const p2 = n => (n < 10 ? '0' + n : '' + n);
			this.clockMer = h24 < 12 ? '上午' : '下午';
			this.clockTime = p2(h12) + ':' + p2(now.getMinutes()) + ':' + p2(now.getSeconds());

			// 背景时段随时钟切换
			this.refreshPhase(h24);

			// 倒计时与时钟同步更新
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

		/* ---------------- 娱乐抽屉：摸小猫 / 抽签 / 答案之书 ---------------- */
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

		/* 摸一下：本地累加 + 喷一把爱心 + 眯眼蹭蹭 + 震动 + 合成呼噜声，不发任何请求 */
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

			// 被摸反馈：眯眼 + 身体缩一下再弹回，连点时先复位再重新触发动画
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

		// 现场合成一记轻柔的「呼噜~」：低频三角波 + 缓慢颤音(LFO)，像猫被摸舒服了
		purr() {
			try {
				this.ensureAudio();
				const ac = this._ac;
				if (!ac) return;
				if (ac.state === 'suspended' && ac.resume) ac.resume();
				const t = ac.currentTime;

				// 基音：240Hz 三角波，柔和起落，400ms 结束
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

		// 提前判定复刻先祖是否休赛期，是则卡片标「本期已结束」并禁用点击
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

/* 收尾必须回到 transform: none——只要残留 transform，
   内部的 position:fixed 弹层就会以 .content 为定位基准，导致全屏弹层不居中 */
@keyframes content-fade-in {
	from { opacity: 0; transform: translateY(8rpx); }
	to { opacity: 1; transform: none; }
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

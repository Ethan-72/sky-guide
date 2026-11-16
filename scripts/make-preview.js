// 生成样式预览页：把编译后的真实 CSS 内联进一个静态 HTML，
// 深色 / 浅色并排，用来肉眼验收「液态玻璃」效果。
// 用法：node scripts/make-preview.js
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist', 'build', 'h5');
const assets = path.join(dist, 'assets');

const files = fs.readdirSync(assets);
const pageCss = files.filter(f => /^index-.*\.css$/.test(f));
const uniCss = files.filter(f => /^uni\..*\.css$/.test(f));

const css = [...uniCss, ...pageCss]
	.map(f => fs.readFileSync(path.join(assets, f), 'utf8'))
	.join('\n');

const scope = (css.match(/data-v-[a-f0-9]+/) || [''])[0];

const tasks = [
	'接受一位朋友的礼物',
	'和朋友击掌',
	'在荧光小菇旁回复能量',
	'收集30点烛火',
	'今日季节蜡烛所在地图：雨林'
];

// 更多攻略的四张卡片（静态示意，状态覆盖：正常 / 已结束）
const guides = [
	{ mark: '蜡', name: '季蜡位置', desc: '季蜡 雨林1 · 大蜡 霞谷1' },
	{ mark: '石', name: '红石天气', desc: '今日天气 + 红石碎片' },
	{ mark: '祖', name: '复刻先祖', desc: '本期已结束', off: true },
	{ mark: '魔', name: '免费魔法', desc: '烟花魔法' }
];

function card(theme, title, sub) {
	const list = tasks
		.map(
			(t, i) =>
				`<div class="task"><div class="badge"><span class="badge-txt">${String(i + 1).padStart(2, '0')}</span></div><span class="task-text">${t}</span></div>`
		)
		.join('');

	return `
	<div class="phone">
		<div class="page ${theme}">
			<div class="blob blob-1"></div>
			<div class="blob blob-2"></div>
			<div class="blob blob-3"></div>
			<div class="content">
				<div class="topbar">
					<div class="brand"><div class="brand-dot"></div><span class="brand-text">每日云海</span></div>
					<div class="seg">
						<div class="liq-thumb seg-thumb" style="--idx:${theme === 'theme-dark' ? 1 : 0};--sx:1;--sy:1;--lead:0%"></div>
						<div class="seg-item"><span class="seg-txt ${theme === 'theme-light' ? 'seg-txt-on' : ''}">日</span></div>
						<div class="seg-item"><span class="seg-txt ${theme === 'theme-dark' ? 'seg-txt-on' : ''}">夜</span></div>
					</div>
				</div>
				<div class="hero">
					<span class="hero-date">2026-11-16</span>
					<span class="hero-title">${title}</span>
					<span class="hero-source">数据来源：@今天游离翻车了吗</span>
					<span class="hero-updated">更新于 13:30</span>
				</div>
				<div class="daytabs" data-daytabs>
					<div class="liq-thumb daytabs-thumb" style="--idx:1;--sx:1;--sy:1;--lead:0%"></div>
					<div class="daytab" data-i="0"><span class="daytab-txt">昨天</span></div>
					<div class="daytab" data-i="1"><span class="daytab-txt daytab-txt-on">今天</span></div>
					<div class="daytab" data-i="2"><span class="daytab-txt">明天</span></div>
				</div>
				<div class="glass list">${list}</div>
				<div class="section"><span class="section-title">今日攻略图</span><span class="section-hint">点击放大</span></div>
				<div class="glass poster-card"><div class="poster-fallback"><span class="fallback-text">${sub}</span></div></div>
				<div class="section"><span class="section-title">更多攻略</span><span class="section-hint">左右滑动</span></div>
				<div class="guide-strip">
					${guides.map(g =>
						`<div class="guide-card ${g.off ? 'guide-closed' : ''}"><div class="guide-mark"><span class="guide-mark-txt">${g.mark}</span></div><span class="guide-name">${g.name}</span><span class="guide-desc">${g.desc}</span></div>`
					).join('')}
				</div>
				<div class="primary-btn"><span class="primary-txt">一键复制任务</span></div>
				<span class="footer">SKY · 每日任务</span>
			</div>
		</div>
		<div class="label">${theme === 'theme-dark' ? '夜间' : '日间'}主题</div>
	</div>`;
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>sky-guide 液态玻璃样式预览</title>
<style>
${css}
</style>
<style>
	/* 仅预览页使用：把两套主题并排摆出来 */
	body {
		margin: 0;
		padding: 28px 20px 44px;
		background: #14161c;
		font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
	}
	.wrap { display: flex; gap: 28px; justify-content: center; flex-wrap: wrap; }
	.phone {
		width: 375px;
		height: 1000px;
		border-radius: 40px;
		overflow: hidden;
		position: relative;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
	}
	/* 光斑原本是 fixed，预览里改成 absolute 才能被手机框裁住 */
	.phone .blob { position: absolute; }
	.phone .page { height: 100%; }
	.label {
		text-align: center;
		margin-top: 12px;
		font-size: 13px;
		letter-spacing: 2px;
		color: rgba(255, 255, 255, 0.42);
	}
	.cap {
		max-width: 800px;
		margin: 0 auto 22px;
		font-size: 13px;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.5);
		text-align: center;
	}
</style>
</head>
<body>
	<div class="cap">下面用的是构建产物里的真实 CSS（含 backdrop-filter 毛玻璃）。<br />点一下「昨天 / 今天 / 明天」，可以看滑块的弹簧滑动 + 拉伸效果。<br />页面底部新增「更多攻略」横滑卡片（第一屏右滑可见）。</div>
	<div class="wrap">
		${card('theme-dark', '今日任务', '长图加载中…')}
		${card('theme-light', '今日任务', '长图加载中…')}
	</div>
	<script>
		// 编译后的 CSS 带 data-v-xxx 作用域，这里统一补上
		const scope = '${scope}';
		if (scope) document.querySelectorAll('*').forEach(el => el.setAttribute(scope, ''));

		// 预览页复刻线上的弹簧动画，方便直接拖点感受「液态」手感
		document.querySelectorAll('[data-daytabs]').forEach(box => {
			const thumb = box.querySelector('.daytabs-thumb');
			const tabs = [...box.querySelectorAll('.daytab')];
			const st = { x: 1, v: 0, target: 1, raf: 0 };
			const paint = () => {
				const stretch = Math.min(Math.abs(st.v) * 0.026, 0.14);
				const lead = Math.max(-16, Math.min(16, st.v * 5)).toFixed(1) + '%';
				thumb.style.setProperty('--idx', st.x);
				thumb.style.setProperty('--sx', 1 + stretch);
				thumb.style.setProperty('--sy', 1 - stretch * 0.42);
				thumb.style.setProperty('--lead', lead);
			};
			tabs.forEach((tab, i) => tab.addEventListener('click', () => {
				st.target = i;
				tabs.forEach((t, j) => t.querySelector('.daytab-txt').classList.toggle('daytab-txt-on', i === j));
				if (st.raf) cancelAnimationFrame(st.raf);
				let last = 0;
				const step = now => {
					if (!last) last = now;
					let dt = (now - last) / 1000;
					last = now;
					if (!(dt > 0)) dt = 1 / 60;
					if (dt > 0.04) dt = 0.04;
					st.v += (-420 * (st.x - st.target) - 27 * st.v) * dt;
					st.x += st.v * dt;
					paint();
					if (Math.abs(st.v) < 0.03 && Math.abs(st.x - st.target) < 0.0015) {
						st.x = st.target; st.v = 0; st.raf = 0; paint(); return;
					}
					st.raf = requestAnimationFrame(step);
				};
				st.raf = requestAnimationFrame(step);
			}));
		});
	</script>
</body>
</html>`;

const out = path.join(__dirname, '..', '..', 'sky-guide-样式预览.html');
fs.writeFileSync(out, html, 'utf8');
console.log('预览已生成:', out);
console.log('内联 CSS 字节:', css.length, '作用域:', scope);

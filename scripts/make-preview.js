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
						<div class="seg-thumb ${theme === 'theme-dark' ? 'seg-thumb-right' : ''}"></div>
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
				<div class="daytabs">
					<div class="daytab"><span class="daytab-txt">昨天</span></div>
					<div class="daytab daytab-on"><span class="daytab-txt daytab-txt-on">今天</span></div>
					<div class="daytab"><span class="daytab-txt">明天</span></div>
				</div>
				<div class="glass list">${list}</div>
				<div class="section"><span class="section-title">今日攻略图</span><span class="section-hint">点击放大</span></div>
				<div class="glass poster-card"><div class="poster-fallback"><span class="fallback-text">${sub}</span></div></div>
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
		height: 760px;
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
	<div class="cap">下面用的是构建产物里的真实 CSS（含 backdrop-filter 毛玻璃）。<br />若卡片背后看不到模糊光斑，说明当前浏览器不支持 backdrop-filter。</div>
	<div class="wrap">
		${card('theme-dark', '今日任务', '长图加载中…')}
		${card('theme-light', '今日任务', '长图加载中…')}
	</div>
	<script>
		// 编译后的 CSS 带 data-v-xxx 作用域，这里统一补上
		const scope = '${scope}';
		if (scope) document.querySelectorAll('*').forEach(el => el.setAttribute(scope, ''));
	</script>
</body>
</html>`;

const out = path.join(__dirname, '..', '..', 'sky-guide-样式预览.html');
fs.writeFileSync(out, html, 'utf8');
console.log('预览已生成:', out);
console.log('内联 CSS 字节:', css.length, '作用域:', scope);

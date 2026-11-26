/**
 * sky-guide 外挂增强补丁（H5）
 * ------------------------------------------------------------------
 * 背景：线上发布基线是 11-24 的构建产物（源码未进 main 仓库），
 * 本补丁以增量方式叠加新功能，不改产物本身：
 *   1. 全屏图片查看器支持双指缩放 / 单指拖动 / 双击放大（所有看图入口通用）
 *   2. 「更多攻略」末尾新增「日程家具」卡片（读取每日快照 schedule.json）
 *
 * 由 index.html 引入，幂等（重复加载自动跳过）。
 */
(function () {
	if (window.__skyPatchLoaded) return;
	window.__skyPatchLoaded = true;

	var BASE = location.pathname.replace(/\/+$/, '');

	/* ==========================================================
	   一、全屏查看器：双指缩放
	   ========================================================== */

	var MIN_SCALE = 1, MAX_SCALE = 6, DBL_TAP_MS = 300, DBL_TAP_DIST = 40;

	function applyPinchZoom(img, layer) {
		var st = { s: 1, x: 0, y: 0 };
		var moved = false, closeTimer = 0;
		var lastTap = { t: 0, x: 0, y: 0 };
		var mode = 0, one = { x: 0, y: 0 }, pinchBase = { dist: 1, s: 1 };

		img.style.touchAction = 'none';
		img.style.willChange = 'transform';

		function render(anim) {
			img.style.transition = anim ? 'transform 0.2s ease-out' : 'none';
			img.style.transform = 'translate(' + st.x + 'px,' + st.y + 'px) scale(' + st.s + ')';
		}
		function limitPos() {
			var w = layer.clientWidth || 1, h = layer.clientHeight || 1;
			var mx = Math.max(0, (img.offsetWidth * st.s - w) / 2);
			var my = Math.max(0, (img.offsetHeight * st.s - h) / 2);
			st.x = Math.min(mx, Math.max(-mx, st.x));
			st.y = Math.min(my, Math.max(-my, st.y));
		}
		function anchorScale(sOld, sNew, px, py) {
			var r = img.getBoundingClientRect();
			var cx = (r.left + r.right) / 2 - st.x;
			var cy = (r.top + r.bottom) / 2 - st.y;
			var k = sNew / sOld;
			st.x = px - cx - k * (px - cx - st.x);
			st.y = py - cy - k * (py - cy - st.y);
			st.s = sNew;
		}
		function reset() { st.s = 1; st.x = 0; st.y = 0; render(true); }
		function twoDist(t) {
			var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
			return Math.sqrt(dx * dx + dy * dy) || 1;
		}
		function toggleZoom(px, py) {
			if (st.s > 1) reset();
			else { anchorScale(1, 2.5, px, py); limitPos(); render(true); }
		}

		img.addEventListener('touchstart', function (e) {
			if (e.touches.length === 2) {
				mode = 2;
				pinchBase.dist = twoDist(e.touches);
				pinchBase.s = st.s;
			} else if (e.touches.length === 1) {
				mode = 1;
				one.x = e.touches[0].clientX;
				one.y = e.touches[0].clientY;
			}
		}, { passive: true });

		img.addEventListener('touchmove', function (e) {
			e.preventDefault();
			if (mode === 2 && e.touches.length === 2) {
				var d = twoDist(e.touches);
				var ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchBase.s * d / pinchBase.dist));
				var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				var my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
				anchorScale(pinchBase.s, ns, mx, my);
				limitPos();
				render(false);
				moved = true;
			} else if (e.touches.length === 1 && st.s > 1) {
				st.x += e.touches[0].clientX - one.x;
				st.y += e.touches[0].clientY - one.y;
				one.x = e.touches[0].clientX;
				one.y = e.touches[0].clientY;
				limitPos();
				render(false);
				moved = true;
			}
		}, { passive: false });

		img.addEventListener('touchend', function (e) {
			if (e.touches.length === 0) {
				if (st.s <= 1.05) reset();
				else { limitPos(); render(true); }
				mode = 0;
				var t = e.changedTouches[0];
				var now = Date.now();
				var near = Math.abs(t.clientX - lastTap.x) < DBL_TAP_DIST && Math.abs(t.clientY - lastTap.y) < DBL_TAP_DIST;
				if (!moved && lastTap.t && now - lastTap.t < DBL_TAP_MS && near) {
					lastTap.t = 0;
					toggleZoom(t.clientX, t.clientY);
				} else {
					lastTap = { t: now, x: t.clientX, y: t.clientY };
				}
			} else if (e.touches.length === 1 && mode === 2) {
				mode = 1;
				one.x = e.touches[0].clientX;
				one.y = e.touches[0].clientY;
			}
		});
		img.addEventListener('touchcancel', function () {
			if (st.s <= 1.05) reset(); else { limitPos(); render(true); }
			mode = 0;
		});

		// 单击关闭（延迟一拍等双击判定）；拖动/双击/按钮不关
		layer.addEventListener('click', function (e) {
			if (/^(button|a|input)$/i.test(e.target.tagName)) return;
			if (moved) { moved = false; return; }
			if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; return; }
			closeTimer = setTimeout(function () { closeTimer = 0; layer.remove(); }, DBL_TAP_MS);
		});
	}

	/* 给新出现的全屏查看器套一层"隔离壳"：
	   原查看器的 click 直接关闭弹层，双击的第一次轻点会误关；
  	   把内容挪进 wrapper 后截断冒泡，关闭判定全部由补丁接管 */
	function attachViewerGestures(overlay) {
		var img = overlay.querySelector('img');
		if (!img || img.dataset.pz) return;

		var wrapper = document.createElement('div');
		wrapper.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;box-sizing:border-box;';
		while (overlay.firstChild) wrapper.appendChild(overlay.firstChild);
		overlay.style.overflow = 'hidden';
		overlay.style.position = getComputedStyle(overlay).position === 'fixed' ? 'fixed' : overlay.style.position;
		overlay.appendChild(wrapper);

		// 提示文案加上缩放说明
		Array.prototype.forEach.call(wrapper.querySelectorAll('div'), function (d) {
			if (d.textContent === '也可长按图片保存 · 点击空白处关闭') {
				d.textContent = '双指缩放 · 双击放大 · 长按图片保存 · 点击空白处关闭';
			}
		});

		img.dataset.pz = '1';
		applyPinchZoom(img, wrapper);
	}

	// 拦截动态创建的全屏图片层（body 直接子节点 + fixed + 含 img）
	new MutationObserver(function (muts) {
		for (var i = 0; i < muts.length; i++) {
			var added = muts[i].addedNodes;
			for (var j = 0; j < added.length; j++) {
				var n = added[j];
		if (n.nodeType !== 1 || n.parentElement !== document.body) continue;
		if (n.dataset && n.dataset.skyPatch) continue; // 补丁自己的弹层不碰
		if (String(n.className || '').indexOf('uni-') > -1) continue; // uni-app 内置层不碰
				if (!n.querySelector || !n.querySelector('img')) continue;
				if (getComputedStyle(n).position !== 'fixed') continue;
				attachViewerGestures(n);
			}
		}
	}).observe(document.body, { childList: true, subtree: false });

	/* ==========================================================
	   二、日程家具卡片
	   ========================================================== */

	var schedule = null;

	function pickFurnitureLine(text) {
		var lines = String(text || '').split(/\r?\n/);
		for (var i = 0; i < lines.length; i++) {
			if (lines[i].indexOf('本周家具') > -1) return lines[i].replace(/[（）]/g, '');
		}
		return '';
	}

	// 弹层样式（原生 DOM，不能用 rpx，按 750 设计稿折半换算成 px）
	var style = document.createElement('style');
	style.textContent =
		'.sky-patch-box{margin-top:9px;padding:10px 12px;border-radius:9px;border:1px solid var(--glass-bd);background-color:var(--glass-bg)}' +
		'.sky-patch-txt{display:block;font-size:13px;line-height:1.7;color:var(--text);white-space:pre-line}' +
		'.sky-patch-tip{margin-top:8px;text-align:center;font-size:11px;color:var(--text-faint)}';
	document.head.appendChild(style);

	/* 卡片样式取自编译产物（scoped CSS 对运行时 DOM 无效，必须内联） */
	var CARD_CSS = 'display:flex;flex-direction:column;align-items:flex-start;flex-shrink:0;width:6.5rem;margin-right:.5rem;' +
		'padding:.625rem .5625rem .5625rem;box-sizing:border-box;border-radius:.8125rem;border:.03125rem solid var(--glass-bd);' +
		'background-color:var(--glass-bg);background-image:linear-gradient(158deg,var(--glass-bg-2) 0%,rgba(255,255,255,0) 70%);' +
		'box-shadow:0 .125rem .4375rem rgba(0,0,0,.1),inset 0 .03125rem 0 var(--glass-hl-btm);transition:opacity .24s ease,transform .18s ease;cursor:pointer;';
	var MARK_CSS = 'display:flex;align-items:center;justify-content:center;width:1.4375rem;height:1.4375rem;border-radius:50%;' +
		'border:.0625rem solid var(--glass-bd);background-color:var(--glass-bg);box-shadow:0 .09375rem .3125rem rgba(0,0,0,.1);';
	var MARK_TXT_CSS = 'font-size:.6875rem;font-weight:600;color:var(--accent);line-height:1;';
	var NAME_CSS = 'margin-top:.5rem;font-size:.8125rem;font-weight:600;letter-spacing:.03125rem;color:var(--text);';
	var DESC_CSS = 'max-width:100%;margin-top:.25rem;overflow:hidden;font-size:.625rem;line-height:1.35;color:var(--text-faint);' +
		'text-overflow:ellipsis;white-space:nowrap;';
	var TITLE_CSS = 'font-size:.9375rem;font-weight:600;letter-spacing:.03125rem;color:var(--text);';
	var CLOSE_CSS = 'padding:.25rem .5625rem;border-radius:31.21875rem;border:.03125rem solid var(--glass-bd);' +
		'background-color:var(--glass-bg);font-size:.6875rem;color:var(--text-dim);cursor:pointer;';
	/* 面板样式取自编译产物 .glass/.sheet（scoped CSS 对运行时 DOM 无效，必须内联） */
	var MASK_CSS = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:80;display:flex;align-items:center;' +
		'justify-content:center;padding:1.25rem;box-sizing:border-box;background-color:rgba(0,0,0,.56);';
	var SHEET_CSS = 'position:relative;overflow:hidden;display:flex;flex-direction:column;width:100%;max-height:76vh;' +
		'padding:.875rem .8125rem .75rem;box-sizing:border-box;border-radius:1.0625rem;border:.03125rem solid var(--glass-bd);' +
		'background-color:var(--glass-bg);background-image:linear-gradient(168deg,var(--glass-bg-2) 0%,rgba(255,255,255,0) 48%);' +
		'-webkit-backdrop-filter:blur(var(--blur)) saturate(200%);backdrop-filter:blur(var(--blur)) saturate(200%);' +
		'box-shadow:var(--shadow),inset 0 .03125rem 0 var(--glass-hl),inset 0 -.03125rem 0 var(--glass-hl-btm),' +
		'inset 0 0 0 .03125rem var(--glass-rim);';
	var HEAD_CSS = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:.625rem;flex-shrink:0;';
	var BODY_CSS = 'flex:1;min-height:0;overflow-y:auto;';

	function el(tag, cls, text) {
		var node = document.createElement(tag);
		if (cls) node.className = cls;
		if (text != null) node.textContent = text;
		return node;
	}

	var scrollLocked = false;
	function lockScroll(on) {
		if (on === scrollLocked) return;
		scrollLocked = on;
		document.documentElement.style.overflow = on ? 'hidden' : '';
		document.body.style.overflow = on ? 'hidden' : '';
	}

	function openScheduleSheet() {
		if (!schedule) return;
		var mask = el('uni-view', 'sheet-mask');
		mask.style.cssText = MASK_CSS;
		mask.dataset.skyPatch = '1';
		var sheet = el('uni-view', 'sheet glass');
		sheet.style.cssText = SHEET_CSS;

		var head = el('uni-view', 'sheet-head');
		head.style.cssText = HEAD_CSS;
		var title = el('uni-text', 'sheet-title', '日程家具');
		title.style.cssText = TITLE_CSS;
		var close = el('uni-view', 'sheet-close', '关闭');
		close.style.cssText = CLOSE_CSS;
		head.appendChild(title);
		head.appendChild(close);

		var body = el('uni-view', 'sheet-body');
		body.style.cssText = BODY_CSS;
		if (schedule.image) {
			var img = el('img', 'sheet-img');
			img.src = schedule.image;
			img.style.cssText = 'display:block;width:100%;border-radius:9px;max-height:46vh;object-fit:contain;';
			img.addEventListener('click', function (e) { e.stopPropagation(); window.open(schedule.image, '_blank'); });
			body.appendChild(img);
			body.appendChild(el('uni-view', 'sky-patch-tip', '点击图片可新窗口打开，长按可保存'));
		}
		var box = el('uni-view', 'sky-patch-box');
		box.appendChild(el('uni-text', 'sky-patch-txt', schedule.text || '今日暂无日程'));
		body.appendChild(box);

		sheet.appendChild(head);
		sheet.appendChild(body);
		mask.appendChild(sheet);

		function closeSheet() { lockScroll(false); mask.remove(); }
		close.addEventListener('click', function (e) { e.stopPropagation(); closeSheet(); });
		mask.addEventListener('click', closeSheet);
		sheet.addEventListener('click', function (e) { e.stopPropagation(); });
		/* 锁背景滚动：面板内可滚区域放行，其余一律阻止触摸穿透 */
		mask.addEventListener('touchmove', function (e) {
			if (body.contains(e.target) && body.scrollHeight > body.clientHeight) return;
			e.preventDefault();
		}, { passive: false });

		lockScroll(true);
		document.body.appendChild(mask);
	}

	function ensureCard() {
		var strip = document.querySelector('.guide-strip');
		if (!strip) return;
		if (strip.querySelector('.sky-patch-rl')) return; // 已插入
		var card = el('uni-view', 'guide-card guide-idle sky-patch-rl');
		card.style.cssText = CARD_CSS;
		var mark = el('uni-view', 'guide-mark');
		mark.style.cssText = MARK_CSS;
		var markTxt = el('uni-text', 'guide-mark-txt', '具');
		markTxt.style.cssText = MARK_TXT_CSS;
		mark.appendChild(markTxt);
		card.appendChild(mark);
		var name = el('uni-text', 'guide-name', '日程家具');
		name.style.cssText = NAME_CSS;
		card.appendChild(name);
		var desc = el('uni-text', 'guide-desc', '点击查看');
		desc.style.cssText = DESC_CSS;
		card.appendChild(desc);
		card.addEventListener('click', function (e) {
			e.stopPropagation();
			openScheduleSheet();
		});
		strip.appendChild(card);
		if (schedule) {
			var line = pickFurnitureLine(schedule.text);
			if (line) desc.textContent = line.length > 22 ? line.slice(0, 22) + '…' : line;
		}
	}

	// 页面切换 / Vue 重渲染后卡片可能被移除，持续兜底
	setInterval(ensureCard, 1500);
	ensureCard();

	// 拉每日快照
	fetch(BASE + '/static/data/schedule.json')
		.then(function (r) { return r.ok ? r.json() : null; })
		.then(function (d) {
			if (!d || !d.text) return;
			schedule = d;
			ensureCard();
		})
		.catch(function () {});
})();

/**
 * sky-guide 外挂增强补丁（H5）
 * ------------------------------------------------------------------
 * 背景：线上发布基线是 11-24 的构建产物（源码未进 main 仓库），
 * 本补丁以增量方式叠加新功能，不改产物本身：
 *   1. 全屏图片查看器支持双指缩放 / 单指拖动 / 双击放大（所有看图入口通用）
 *   2. 「更多攻略」末尾新增「日程家具」卡片（读取每日快照 schedule.json）
 *   3. 复刻先祖：当天快照可用时覆盖滞后的接口数据
 *   4. 光翼查询：输入长 ID / 9 位角色 ID，调用倾慕公益接口展示收集进度
 *   5. 礼包查询：查询指引（小程序 + 原ID）+ 礼包清单自算（勾选统计花费，含物品图）
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

	/* 主题 CSS 变量定义在带 scoped 属性的元素上，挂在 body 下的弹层继承不到；
	   打开时从当前主题元素实时读值写进内联样式，日夜主题都跟随 */
	function themeStyle(css) {
		var host = document.querySelector('.theme-dark[data-v-4b805f10]') ||
			document.querySelector('.theme-light[data-v-4b805f10]') || document.body;
		var cs = getComputedStyle(host);
		return css.replace(/var\((--[a-z0-9-]+)\)/g, function (m, name) {
			return cs.getPropertyValue(name).trim() || 'transparent';
		});
	}

	var scrollLocked = false;
	function lockScroll(on) {
		if (on === scrollLocked) return;
		scrollLocked = on;
		document.documentElement.style.overflow = on ? 'hidden' : '';
		document.body.style.overflow = on ? 'hidden' : '';
	}

	function openSheet(titleText, imageUrl, bodyText) {
		var mask = el('uni-view', 'sheet-mask');
		mask.style.cssText = themeStyle(MASK_CSS);
		mask.dataset.skyPatch = '1';
		var sheet = el('uni-view', 'sheet glass');
		sheet.style.cssText = themeStyle(SHEET_CSS);

		var head = el('uni-view', 'sheet-head');
		head.style.cssText = HEAD_CSS;
		var title = el('uni-text', 'sheet-title', titleText);
		title.style.cssText = themeStyle(TITLE_CSS);
		var close = el('uni-view', 'sheet-close', '关闭');
		close.style.cssText = themeStyle(CLOSE_CSS);
		head.appendChild(title);
		head.appendChild(close);

		var body = el('uni-view', 'sheet-body');
		body.style.cssText = BODY_CSS;
		if (imageUrl) {
			var img = el('img', 'sheet-img');
			img.src = imageUrl;
			img.style.cssText = 'display:block;width:100%;border-radius:9px;max-height:46vh;object-fit:contain;';
			img.addEventListener('click', function (e) { e.stopPropagation(); window.open(imageUrl, '_blank'); });
			body.appendChild(img);
			body.appendChild(el('uni-view', 'sky-patch-tip', '点击图片可新窗口打开，长按可保存'));
		}
		var box = el('uni-view', 'sky-patch-box');
		box.appendChild(el('uni-text', 'sky-patch-txt', bodyText || '今日暂无内容'));
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

		style.textContent = themeStyle(
			'.sky-patch-box{margin-top:9px;padding:10px 12px;border-radius:9px;border:1px solid var(--glass-bd);background-color:var(--glass-bg)}' +
			'.sky-patch-txt{display:block;font-size:13px;line-height:1.7;color:var(--text);white-space:pre-line}' +
			'.sky-patch-tip{margin-top:8px;text-align:center;font-size:11px;color:var(--text-faint)}'
		);

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
			openSheet('日程家具', schedule.image, schedule.text);
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

	/* ==========================================================
	   三、复刻先祖：接口滞后兜底
	   t1qq /scfk 与倾慕 /rwt/fx 都滞后，只有当天的快照是准的；
	   快照 available=true 时覆盖卡片的「本期已结束」，点开显示真图 + 文字。
	   ========================================================== */
	var fuxian = null;

	function findFuxianCard() {
		var cards = document.querySelectorAll('.guide-card');
		for (var i = 0; i < cards.length; i++) {
			if (cards[i].textContent.indexOf('复刻先祖') > -1 && !cards[i].classList.contains('sky-patch-rl')) return cards[i];
		}
		return null;
	}

	function applyFuxianCard() {
		if (!fuxian || !fuxian.available) return;
		var card = findFuxianCard();
		if (!card || card.dataset.fuxianPatch) return;
		card.dataset.fuxianPatch = '1';
		// 新建一个相同的卡片替身，彻底接管点击（原卡片的 Vue 事件无法移除）
		var repl = card.cloneNode(true);
		repl.style.cssText = card.style.cssText || '';
		repl.addEventListener('click', function (e) {
			e.stopPropagation();
			openSheet('复刻先祖', fuxian.image, fuxian.text);
		}, true);
		card.parentNode.replaceChild(repl, card);
		var desc = repl.querySelector('.guide-desc');
		if (desc) desc.textContent = '今日有复刻 · 点击查看';
	}

	fetch(BASE + '/static/data/fuxian.json')
		.then(function (r) { return r.ok ? r.json() : null; })
		.then(function (d) {
			if (!d || !d.available || !d.image) return;
			fuxian = d;
			applyFuxianCard();
		})
		.catch(function () {});

	// Vue 重渲染可能换掉卡片，持续兜底
	setInterval(applyFuxianCard, 1500);

	/* ==========================================================
	   四、光翼查询
	   数据源：倾慕公益 API https://api.qmkjcm.cn/api/gy/gycs/
	   · 免密钥、CORS 全开，支持 32 位长 ID（必须带横杠）与 9 位角色 ID
	   · 纯增量 DOM，不改线上既有构建产物
	   ========================================================== */
	var WING_API = 'https://api.qmkjcm.cn/api/gy/gycs/';

	/* 32 位连写自动补横杠；9 位数字原样透传 */
	function normalizeWingId(raw) {
		var v = String(raw || '').trim().replace(/[\s-]/g, '');
		if (!v) return null;
		if (/^\d{9}$/.test(v)) return v;
		if (/^[0-9a-fA-F]{32}$/.test(v)) {
			v = v.toLowerCase();
			return v.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
		}
		return null;
	}

	function escWing(s) {
		return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	var WING_CSS =
		'.sky-wing-mask{position:fixed;top:0;left:0;right:0;bottom:0;z-index:95;display:none;' +
		'align-items:flex-end;background-color:rgba(0,0,0,.48)}' +
		'.sky-wing-mask.on{display:flex}' +
		'.sky-wing-panel{display:flex;flex-direction:column;width:100%;max-height:86vh;overflow-y:auto;' +
		'padding:10px 16px calc(20px + env(safe-area-inset-bottom));box-sizing:border-box;' +
		'border-radius:22px 22px 0 0;border:1px solid var(--glass-bd);background-color:var(--glass-bg);' +
		'background-image:linear-gradient(168deg,var(--glass-bg-2) 0%,rgba(255,255,255,0) 48%);' +
		'-webkit-backdrop-filter:blur(var(--blur)) saturate(200%);backdrop-filter:blur(var(--blur)) saturate(200%);' +
		'box-shadow:var(--shadow),inset 0 1px 0 var(--glass-hl);color:var(--text)}' +
		'.sky-wing-grip{width:36px;height:4px;margin:0 auto 10px;border-radius:99px;background-color:var(--text);opacity:.18}' +
		'.sky-wing-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}' +
		'.sky-wing-title{font-size:16px;font-weight:600;letter-spacing:1px;color:var(--text)}' +
		'.sky-wing-close{font-size:12px;color:var(--text-faint);padding:4px 8px;cursor:pointer}' +
		'.sky-wing-hint{font-size:11px;line-height:1.65;color:var(--text-faint);margin-bottom:10px;white-space:pre-line}' +
		'.sky-wing-hint b{color:var(--accent);font-weight:600}' +
		'.sky-wing-rowin{display:flex;gap:8px;align-items:center}' +
		'.sky-wing-input{flex:1;min-width:0;height:38px;padding:0 12px;box-sizing:border-box;' +
		'border-radius:12px;border:1px solid var(--glass-bd);background-color:var(--glass-bg-2);' +
		'color:var(--text);font-size:12px;outline:none}' +
		'.sky-wing-btn{flex-shrink:0;height:38px;padding:0 16px;border-radius:12px;border:0;cursor:pointer;' +
		'font-size:12px;font-weight:600;color:var(--btn-txt);background:linear-gradient(120deg,var(--btn-a),var(--btn-b))}' +
		'.sky-wing-btn:disabled{opacity:.55;cursor:default}' +
		'.sky-wing-msg{min-height:18px;margin:8px 2px 0;font-size:11px;line-height:1.6;color:var(--text-faint)}' +
		'.sky-wing-msg.err{color:#FF8A8A}' +
		'.sky-wing-result{display:none;margin-top:10px}' +
		'.sky-wing-result.on{display:block}' +
		'.sky-wing-hero{padding:14px;border-radius:16px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);text-align:center}' +
		'.sky-wing-lv{font-size:11px;color:var(--text-dim)}' +
		'.sky-wing-lvnum{font-size:34px;font-weight:700;line-height:1.25;color:var(--accent)}' +
		'.sky-wing-count{font-size:12px;color:var(--text-dim)}' +
		'.sky-wing-count b{font-size:19px;color:var(--text);font-weight:600}' +
		'.sky-wing-chips{display:flex;gap:8px;margin-top:10px}' +
		'.sky-wing-chip{flex:1;padding:9px 4px;border-radius:12px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);text-align:center}' +
		'.sky-wing-chipv{display:block;font-size:15px;font-weight:600;color:var(--text)}' +
		'.sky-wing-chipk{display:block;margin-top:2px;font-size:10px;color:var(--text-faint)}' +
		'.sky-wing-sec{margin-top:14px;font-size:12px;font-weight:600;color:var(--text)}' +
		'.sky-wing-line{display:flex;align-items:center;justify-content:space-between;margin-top:9px;font-size:11px;color:var(--text-dim)}' +
		'.sky-wing-bar{height:5px;margin-top:5px;border-radius:99px;overflow:hidden;background-color:var(--line)}' +
		'.sky-wing-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--btn-a),var(--btn-b))}' +
		'.sky-wing-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}' +
		'.sky-wing-tag{padding:3px 7px;border-radius:99px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);font-size:10px;color:var(--text-dim)}' +
		'.sky-wing-foot{margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:8px}' +
		'.sky-wing-time{font-size:10px;color:var(--text-faint)}' +
		'.sky-wing-copy{padding:5px 10px;border-radius:99px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);font-size:10px;color:var(--accent);cursor:pointer}';

	var wingStyle = document.createElement('style');
	wingStyle.textContent = themeStyle(WING_CSS);
	document.head.appendChild(wingStyle);

	var wingMask = el('div', 'sky-wing-mask');
	wingMask.dataset.skyPatch = '1';
	var wingPanel = el('div', 'sky-wing-panel');
	var wingGrip = el('div', 'sky-wing-grip');
	var wingHead = el('div', 'sky-wing-head');
	var wingTitle = el('div', 'sky-wing-title', '光翼查询');
	var wingClose = el('div', 'sky-wing-close', '关闭');
	wingHead.appendChild(wingTitle);
	wingHead.appendChild(wingClose);
	var wingHint = el('div', 'sky-wing-hint');
	wingHint.innerHTML =
		'<b>怎么找短 ID：</b>游戏内点右上角小精灵 → 问「查询id」或「角色ID」，' +
		'回复里的「短 ID」就是那 9 位数字，填它就行。\n' +
		'长 ID（32 位）目前多数查不到，请用短 ID。数据来自倾慕公益接口。';
	var wingRowIn = el('div', 'sky-wing-rowin');
	var wingInput = document.createElement('input');
	wingInput.className = 'sky-wing-input';
	wingInput.type = 'text';
	wingInput.placeholder = '填 9 位数字短 ID';
	wingInput.setAttribute('autocomplete', 'off');
	wingInput.setAttribute('spellcheck', 'false');
	var wingBtn = document.createElement('button');
	wingBtn.className = 'sky-wing-btn';
	wingBtn.type = 'button';
	wingBtn.textContent = '查询';
	wingRowIn.appendChild(wingInput);
	wingRowIn.appendChild(wingBtn);
	var wingMsg = el('div', 'sky-wing-msg', '');
	var wingResult = el('div', 'sky-wing-result');
	wingPanel.appendChild(wingGrip);
	wingPanel.appendChild(wingHead);
	wingPanel.appendChild(wingHint);
	wingPanel.appendChild(wingRowIn);
	wingPanel.appendChild(wingMsg);
	wingPanel.appendChild(wingResult);
	wingMask.appendChild(wingPanel);
	document.body.appendChild(wingMask);

	function openWing() {
		wingStyle.textContent = themeStyle(WING_CSS); // 主题可能已切换，重新取值
		wingMask.classList.add('on');
		lockScroll(true);
		try { wingInput.focus(); } catch (e) {}
	}
	function closeWing() {
		wingMask.classList.remove('on');
		lockScroll(false);
	}
	/* 入口卡片：插进「更多攻略」横条，和「日程家具」并排 */
	function ensureWingCard() {
		var strip = document.querySelector('.guide-strip');
		if (!strip || strip.querySelector('.sky-patch-wing')) return;
		var card = el('uni-view', 'guide-card guide-idle sky-patch-wing');
		card.style.cssText = CARD_CSS;
		var mark = el('uni-view', 'guide-mark');
		mark.style.cssText = MARK_CSS;
		var markTxt = el('uni-text', 'guide-mark-txt', '翼');
		markTxt.style.cssText = MARK_TXT_CSS;
		mark.appendChild(markTxt);
		card.appendChild(mark);
		var name = el('uni-text', 'guide-name', '光翼查询');
		name.style.cssText = NAME_CSS;
		card.appendChild(name);
		var desc = el('uni-text', 'guide-desc', '短 ID 查收集进度');
		desc.style.cssText = DESC_CSS;
		card.appendChild(desc);
		card.addEventListener('click', function (e) {
			e.stopPropagation();
			openWing();
		});
		strip.appendChild(card);
	}
	setInterval(ensureWingCard, 1500);
	ensureWingCard();

	wingClose.addEventListener('click', closeWing);
	wingMask.addEventListener('click', function (e) {
		if (e.target === wingMask) closeWing();
	});
	wingPanel.addEventListener('touchmove', function (e) {
		if (wingPanel.scrollHeight > wingPanel.clientHeight) return;
		e.preventDefault();
	}, { passive: false });

	function setWingMsg(text, isErr) {
		wingMsg.textContent = text || '';
		wingMsg.className = 'sky-wing-msg' + (isErr ? ' err' : '');
	}

	function renderWing(body, queryTime) {
		var stats = body.stats || {};
		var total = Number(stats.total_buffs) || 0;
		var got = Number(stats.collected) || 0;
		var maps = (body.categories && body.categories.map) || {};
		var spirits = (body.categories && body.categories.spirit) || [];
		var spiritGot = 0;
		for (var i = 0; i < spirits.length; i++) if (spirits[i] && spirits[i].collected) spiritGot++;

		var html = '<div class="sky-wing-hero">' +
			'<div class="sky-wing-lv">当前光翼等级</div>' +
			'<div class="sky-wing-lvnum">' + escWing(stats.wing_level || 0) + '</div>' +
			'<div class="sky-wing-count">已收集 <b>' + got + '</b> / ' + total + ' · 还差 ' + Math.max(0, total - got) + '</div></div>';

		html += '<div class="sky-wing-chips">' +
			'<div class="sky-wing-chip"><span class="sky-wing-chipv">' + (Number(stats.map_wings) || 0) + '</span><span class="sky-wing-chipk">地图光翼</span></div>' +
			'<div class="sky-wing-chip"><span class="sky-wing-chipv">' + spiritGot + '/' + spirits.length + '</span><span class="sky-wing-chipk">先祖光翼</span></div>' +
			'<div class="sky-wing-chip"><span class="sky-wing-chipv">' + (Number(stats.deposited) || 0) + '</span><span class="sky-wing-chipk">已存入</span></div>' +
			'</div>';

		html += '<div class="sky-wing-sec">各地图收集</div>';
		Object.keys(maps).forEach(function (name) {
			var m = maps[name] || {};
			var t = Number(m.total) || 0;
			var c = Number(m.collected) || 0;
			var pct = t ? Math.round(c / t * 100) : 0;
			var label = name === '其他地图' ? '永久翼' : name;
			html += '<div class="sky-wing-line"><span>' + escWing(label) + '</span><span>' + c + ' / ' + t + '</span></div>' +
				'<div class="sky-wing-bar"><i style="width:' + pct + '%"></i></div>';
		});

		html += '<div class="sky-wing-sec">先祖光翼（接口原始标识）</div>';
		var tags = [];
		for (var j = 0; j < spirits.length; j++) {
			if (spirits[j] && spirits[j].collected) {
				tags.push(escWing(String(spirits[j].name || '').replace(/^s_/, '')));
			}
		}
		html += '<div class="sky-wing-tags">' + (tags.length
			? tags.map(function (t) { return '<span class="sky-wing-tag">' + t + '</span>'; }).join('')
			: '<span class="sky-wing-tag">暂无已收集记录</span>') + '</div>';

		html += '<div class="sky-wing-foot"><span class="sky-wing-time">查询于 ' + escWing(queryTime || '') +
			'</span><span class="sky-wing-copy">复制摘要</span></div>';

		wingResult.innerHTML = html;
		wingResult.classList.add('on');
		var copy = wingResult.querySelector('.sky-wing-copy');
		if (copy) {
			copy.addEventListener('click', function () {
				var text = '光翼等级 ' + (stats.wing_level || 0) + ' · 已收集 ' + got + '/' + total +
					' · 先祖 ' + spiritGot + '/' + spirits.length;
				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(text).then(function () {
						copy.textContent = '已复制';
						setTimeout(function () { copy.textContent = '复制摘要'; }, 1600);
					}).catch(function () {});
				}
			});
		}
	}

	async function queryWing() {
		var id = normalizeWingId(wingInput.value);
		if (!id) {
			setWingMsg('ID 格式不对：请填 9 位数字短 ID（小精灵「查询id」里那个）', true);
			return;
		}
		wingBtn.disabled = true;
		wingBtn.textContent = '查询中';
		wingResult.classList.remove('on');
		setWingMsg('正在读取光翼数据…');
		try {
			var res = await fetch(WING_API + '?id=' + encodeURIComponent(id) + '&format=json', { cache: 'no-store' });
			if (!res.ok) throw new Error('http ' + res.status);
			var d = await res.json();
			var body = d && d.data;
			if (!body || !body.stats || !(Number(body.stats.total_buffs) > 0)) {
				setWingMsg(id.length > 9
					? '长 ID 大多查不到，请用 9 位短 ID（小精灵「查询id」里的那个）'
					: '没查到这个 ID 的数据，请确认短 ID 是否填对', true);
				return;
			}
			renderWing(body, d.query_time);
			setWingMsg('');
		} catch (e) {
			setWingMsg('网络异常或接口暂时不可用，请稍后再试', true);
		} finally {
			wingBtn.disabled = false;
			wingBtn.textContent = '查询';
		}
	}
	wingBtn.addEventListener('click', queryWing);
	wingInput.addEventListener('keydown', function (e) {
		if (e.key === 'Enter') queryWing();
	});
	/* ==========================================================
	   五、礼包查询
	   · 「查询指引」：礼包明细没有免费公开网页接口（数据在游戏服务器内），
	     引导用主流小程序（上游大神 / sky小白身高）+ 游戏「原ID」查询
	   · 「自己算礼包」：内置礼包价目清单（BWiki 礼包图鉴，2019-2026），
	     勾选已购实时统计花费与数量，勾选结果存 localStorage
	   ========================================================== */
	var GIFT_DATA = [["中国绊爱礼服套装礼包",128,"2026","t98k5ny2imjh5cqhr4wnerm6s09b67n.png"],["云音伴游耳机礼包",68,"2026","ok08oq7rlb6xd7c9tdlrq2tqos1nhoe.png"],["向日葵耳饰礼包",18,"2026","4phm8yrhwkav2wtdky96kurkxpkh4lw.png"],["向日葵花瓣裙礼包",68,"2026","oxw7gndt0096he2g3kruxx075l59efg.png"],["向阳花伞礼包",98,"2026","43y6r4yqapuiwbhclko4i44dieb450x.png"],["回归童真礼包",12,"2026","esk7v69aw72h3dn8fslrxn21q4yz190.png"],["墨镜头饰礼包",18,"2026","mmbysaxrtp8p1bqvemfotj0hfb78knb.png"],["夏日派对礼包",25,"2026","bm0bk32gubhjb4vtbj2fyts9lbn5dgm.png"],["夏日潜水套装礼包",68,"2026","su79eclh2rwhqlekgp8nj874c1haoeq.png"],["宝骏丹心马尾礼包",30,"2026","bn1c8yxxibje39i19teq2obh8uddsnl.png"],["寻宝搭档礼包",18,"2026","om2jy5u5jeijln3s856m5lkzqcr85fs.png"],["小恶魔斗篷礼包",98,"2026","bc1kw00tc1gziekzzxp7cmgincml7hm.png"],["小狗拖鞋礼包",30,"2026","7qb4x82jb89hz9xw9kckwni3jk19297.png"],["小黄鸭玩偶服礼包",68,"2026","c7l1t0ko44mv6b4uxvhrpbvdefo74a7.png"],["小黑鸭头饰礼包",6,"2026","r1f2l37j5owdg8ngb22eh29t4tc9l1k.png"],["幸运亨通眼镜礼包",12,"2026","b94nbe46cl12znp6xnvfvvzbabhoyfp.png"],["弦音抱月礼包",98,"2026","5lpjwsv6d2yzgbha732egn4880tp70e.png"],["彩虹阔腿裤礼包",68,"2026","n7k3sdkl8nzhseqnpotcvujnevv0kki.png"],["探宝翎羽帽礼包",68,"2026","cdm71o0fh8d68tlwd16tqvdg1uj3g3s.png"],["星夜伞礼包",98,"2026","d5hlrf0x36194qqiyel1otl44i1fy7l.png"],["星夜披风套装礼包",168,"2026","50ztxx975s5w08sena30av8neplfpxu.png"],["星月耳环礼包",30,"2026","k5aekgbpars7mwj63dhebbol8dqdpxv.png"],["星河烂漫礼包",68,"2026","0jwkis4cwcbu5ovg7bvtoqxrsa9lvbv.png"],["星流面具礼包",18,"2026","6t62gg4v0onomm5soh8soecomd4rubw.png"],["海灵套装礼包",98,"2026","8vyi1sfm41ise7kt5rownd9g0lu6lgl.png"],["潮流连帽斗篷礼包",98,"2026","qpjdexeeie9ekxwbgsgmiaon8d10sw1.png"],["琅骏启岁长裙礼包",68,"2026","0wc44328ol6w00ceut9d9doy6ahji7w.png"],["皮皮猫肩饰礼包",18,"2026","dpjwmdw9ssmn9w19kk2a5mi2j58ydel.png"],["秘宝坠饰斗篷礼包",98,"2026","3megilr8vju3xxw44mi7vjniji3oma6.png"],["粽香蒸笼礼包",45,"2026","9hrcr1rntmj7bn1iq5oipnlea04o12u.png"],["紫框眼镜礼包",18,"2026","k8fq55t3o9bu3nh7k9bgbxhjegalwvk.png"],["绘彩面具礼包",30,"2026","kyrqck3rkm2imaezi8vr8fdy8kntanb.png"],["绿茸茸卷耳发饰礼包",18,"2026","pv3wszbmoxcrbjzhodcwy6z5dwyyvlx.png"],["缀黄画笔发箍礼包",18,"2026","45gb8r687qtp0rv6jh8pmp1oubk6ggg.png"],["花钿素纱礼包",18,"2026","8pzh2dkba1rdamdpzwe2nhhy640wmom.png"],["莲华拂影礼包",68,"2026","00t0233fmanvsqzuguuwima1vieu5km.png"],["萌新玩偶礼包",30,"2026","0ejfveivwzaap8lqzcgt4lb9idpohcl.png"],["蓝色守护帽礼包",18,"2026","e866l8cw810upiecfjnxghc9j5bwiie.png"],["诡趣魔法帽礼包",68,"2026","k02gw222678k0168j4lbcsz5fyhd2d5.png"],["金穗披肩斗篷礼包",98,"2026","giuuoojlro5si6xvyj6jagptza7wcmv.png"],["鎏金魔法帽礼包",30,"2026","s30dkyemhh3u0d64ave3lnbrs4y8od6.png"],["锦标赛晶翼斗篷礼包",98,"2026","bprpvqgrtmgtso6orkvxf0h8uxmi3iw.png"],["锦标赛滑冰套装礼包",128,"2026","ilzs47rbc3yowfbwc0wf6283fzx6wqm.png"],["飞鸟肩带礼包",45,"2026","d8fcb1elnkatbp1rwyrsz5emcm1h40a.png"],["骐骥迎福礼包",128,"2026","cqj2b6hm6frre5d0m263xv9b8t5b6t7.png"],["鸦渡麦浪斗篷礼包",98,"2026","13djfmgbrwvgw79lqi63l2rmhum7x0h.png"],["光之生物礼服套装礼包",68,"2025","iqfidwhtlmiksmn5st68cxxu6soz5hh.png"],["冥龙套装礼包",78,"2025","77qamq1jvy3q6krx6e3cxqfdm4ks5iw.png"],["周年影院套餐礼包",30,"2025","k0icury97vqn6uowl48jbqsh703bgri.png"],["周年礼服斗篷礼包",98,"2025","qroac1shag3z0wdlxz6mwkey4l0q1zk.png"],["宝藏猎人礼包",98,"2025","3fd7szs2ghk26mlt1a433yde3ty3mp5.png"],["小海牛配饰礼包",25,"2025","j3es180vdns0erpzpzp0ptei3wgzavm.png"],["小黄鸭发饰礼包",6,"2025","i6s01z65ob6zmxqpidciu0goetqp9g1.png"],["小黄鸭雨衣套装礼包",98,"2025","phb5id0tjfea4gc0ngujpfry9gkabb0.png"],["心心相印发饰礼包",18,"2025","anodg061ysa16am7z1kj4luf0j2ad1o.png"],["必胜客联动分享披萨背饰礼包",45,"2025","mopi2nn3dbepzjg427q1k8yp8j72jaz.png"],["必胜客联动装扮礼包",68,"2025","05f10vri9b9t6z8en75cn6f3nxeo405.png"],["日光水母套装礼包",98,"2025","98e59p3kpc7yhdv2xlag6klpf99d752.png"],["暖冬围巾斗篷礼包",98,"2025","nke7g11svv32o56j65i98jquh61rt90.png"],["暖冬绒绒礼包",45,"2025","03li20q55f3dbumhbl5xtp7x392wo9z.png"],["暗陨斗篷礼包",98,"2025","bfx98p21xixuou6bdscnc3qew22f2vi.png"],["活力海牛礼包",68,"2025","b3gjb8q2msfvrz5e7sg701z68mj0ac4.png"],["海牛玩偶礼包",45,"2025","fl2os07vftk9rsmzevf3r5rru7kzdi3.png"],["渐变双马尾发型礼包",45,"2025","nygiyh0lqecmuno1pt3xpfpzl9u3s8u.png"],["潮汐套装礼包",168,"2025","7r3bmwoqfsvtz0cm8ju5wybrj2w4t5o.png"],["献瑞折扇礼包",30,"2025","iixcrzuoeo022t9nicaf38g09lmjlty.png"],["玫瑰褶边斗篷礼包",98,"2025","p9nwqm0p9kroiar3wgwme9wslqqe31v.png"],["皮皮猫套装礼包",78,"2025","ptbhb7cj00l4te2nxz4m2tvqr4y24gd.png"],["粽子发饰礼包",18,"2025","lrambhcrsap6zo16i5bs4kk9cp6mm79.png"],["纤云弄巧礼包",98,"2025","3zfxo9a1wtrmcmppfg3ymzrfynzgh2i.png"],["线框斗篷礼包",128,"2025","pdxtnixng1qnuymhznn5ccydzrcplim.png"],["缤纷飘带斗篷礼包",98,"2025","0wpmzdl76cngms84xekwn68oxqqgryi.png"],["蝴蝶与花发饰礼包",18,"2025","qgrx5ds8fi9oxdqd52ezdlok100ujjg.png"],["衔福献瑞礼包",128,"2025","5bdoq8ww4sf6cd58ope2csha8ov683c.png"],["记忆水晶礼包",168,"2025","g2ebihkp9gctrob4urdl5moxkq149d6.png"],["超凡风之旅人礼包",168,"2025","0g0llnpk6htwb0aiez3tbydufrp2v5e.png"],["雪人头饰礼包",12,"2025","d64o0sccc6u5mtx6skyz0ny6vwhe7h5.png"],["青衫落拓礼包",30,"2025","4aefy47o0tk141r8qxxhve41t0cxow6.png"],["鸦羽兜帽礼包",30,"2025","0eofuudx1e1vw8kmou8g3m0fr8txlzw.png"],["鹊桥相会礼包",98,"2025","27msntlu2i8y5s77nvn7v6aaijclxc8.png"],["仙境茶会门扉礼包",128,"2024","8wdcelt1q2nclk0zuh8nnty1gw7nbwm.png"],["优雅三件套礼包",98,"2024","080vro1aqu5gyebv6zzcrtz0dsmx090.png"],["史力奇套装礼包",68,"2024","omo1dw07fdmaix9q1ei1dwqgbjyei33.png"],["史力奇帽子礼包",30,"2024","4nfk1vpqa3r6j5mcog3uzerfruxv58q.png"],["向日葵连衣裙礼包",45,"2024","hgaiiozaiqesqkuz2jz9pzsf6ba22z1.png"],["周年线框斗篷礼包",128,"2024","kaelrt2s67uo62xjq8e6gz9izlv692j.png"],["大耳狗抱枕礼包",98,"2024","stn1rh9dixprlg6qzubvyw62wqx9ggo.png"],["大耳狗服饰礼包",98,"2024","dfy3psawf2ej3ug251aebsuk3806swk.png"],["大耳狗装扮礼包",98,"2024","7egow4umvg3ph8a2u4l92hlxmgxlzxw.png"],["姆明妈妈手作斗篷礼包",168,"2024","f4k1514ntxo4ihen6f5ntyddm5haww7.png"],["姆明饰品套装礼包",78,"2024","tl082boei7dtm1m0mw3cxqaodpxy4r3.png"],["小狗周年头饰礼包",30,"2024","giatbqw7uboegrwlcacfbtblizyufjw.png"],["异彩莲花斗篷礼包",128,"2024","ls6ncbytfecm09h00xdiznedk912oro.png"],["彩虹泡泡机礼包",98,"2024","tcuasqdxzsrjayn5ca5ngujsf5q39ju.png"],["恶作剧飞行扫帚礼包",128,"2024","7l8x1px9szfola1pjssbb946qcxsi34.png"],["恶作剧鸦羽斗篷礼包",118,"2024","q4sc77fslxlpngv2dwuo3lfsj8zzlxr.png"],["挂肩外袍礼包",68,"2024","tom09rshg5pa5b5zqk01obwuma4an4k.png"],["日光耳环礼包",18,"2024","t6dtwltsqi6k3wi1bi4hi9ai751hlf1.png"],["月华霓裳礼包",98,"2024","njtn97dgptn97feqs487vf8e7xb5740.png"],["树精肩饰礼包",18,"2024","j7io3zt1lhdn0l3cje9lhxo78f9d4dz.png"],["浪漫流星斗篷礼包",118,"2024","5o76m0dicpo6yjokuc9ack587cdvqpx.png"],["海蓝波浪发型礼包",45,"2024","mmexjd51xw7c30tp5pvkrrtkwh6rshx.png"],["满月耳坠礼包",18,"2024","139l9jbbokn237fucrpyxrgicj0zjxi.png"],["爱丽丝围裙套装礼包",78,"2024","khq3gvvjyegg716sk57jdmbj13c6a00.png"],["盘龙围巾斗篷礼包",98,"2024","58tizyfeiyd9jb51w3lau8ub6ckzg53.png"],["神鹿祝福头饰礼包",98,"2024","7d5qq8us3mvt0z9yvhwbuy1n8aemb26.png"],["立式钢琴礼包",30,"2024","qeb1wa7rljoyttbdv3e5rmcu8jb2vq2.png"],["肯德基联动礼包",128,"2024","f00ck57mzbbgwma0e43xtx1z5ycyiz8.png"],["荷叶伞礼包",98,"2024","m0ffxzsrylzhhwwjwrduymc1gjn42cx.png"],["进行曲制服礼包",68,"2024","hckvslvjkfun7w9rs10vn2si7j3oxcd.png"],["迷你大耳狗发饰礼包",45,"2024","919chonidqcyrbmryetvs36z0zwafkw.png"],["遥鲲披肩斗篷礼包",98,"2024","acxqyd69cvj8ntglv7y8gh4mhnusuxc.png"],["金鳞耳坠礼包",12,"2024","nop9958yppbu5id7th90d49m9tsoj5d.png"],["锦标赛桂冠礼包",30,"2024","bjhy0ur6hdca51pnsc61078bwpi8qxu.png"],["风之旅人礼包",168,"2024","1loseyyagrwpyjgvo05r3vduptkqduw.png"],["飞鸟纸伞礼包",98,"2024","dowpm7yzq0ic68yxrxujsjw103okbs6.png"],["龙鳞束身长袍礼包",68,"2024","5wwanwqviig03vsexi2jbvbai7elv23.png"],["优雅领巾礼包",30,"2023","4kyzc840rp6qx4epvhxkqx8d63l3hd7.png"],["凯旋手碟礼包",128,"2023","7d61cqvccjl440f056odancla6sii1d.png"],["凯旋提琴礼包",128,"2023","3w9gxxrh0u0978hg331hvhhnanhh9iw.png"],["古典音乐桌椅礼包",128,"2023","rum0ty2jsz51xn7d8bxjknf2gjurr6j.png"],["吸蟹伯爵斗篷礼包",98,"2023","jzg2hgcejjb1nsj29u4jh8kr07u3aao.png"],["吸蟹伯爵面具礼包",18,"2023","ohqf3t0fczgilva4z411qvllmdoh8fd.png"],["周年庆抱枕礼包",68,"2023","fpm800hoifjcjnsuxyi3et1vn0wiyhs.png"],["园丁装扮礼包",68,"2023","e2n5neo3ilzdzpkn6bu60p6b9mazu07.png"],["夏日冲浪礼包",98,"2023","qtk7of8v71pfexiimro1d36boo6knth.png"],["夏日凉鞋礼包",68,"2023","p229avnjacjv37jyktcjepbb4pt063x.png"],["夏日有友礼包",68,"2023","042f75btm3p39s1wpt13li1sr8nmg3k.png"],["惊喜手杖礼包",98,"2023","qar6dr1cs2gwhjniytk03a71pcc5dqx.png"],["文雀装扮礼包",68,"2023","3wlrp88uusff478iu4as4ojeo36uuvf.png"],["时尚火焰墨镜礼包",18,"2023","hh87s4nuj1v56hj10vmp3bcsk1s7y7u.png"],["时尚爱心墨镜礼包",30,"2023","75p2aztblyppq6ufepb81afzyvkbavb.png"],["暖冬夹棉斗篷礼包",98,"2023","st5hctmgomfmbf6wo6ewzi7f899s8e3.png"],["暗彩装扮礼包",98,"2023","5pnnld5qnc1gr01w1ease500fgptcpk.png"],["海龟斗篷礼包",98,"2023","fzlx13whh7r48vwwy8yrkatp48hk55h.png"],["灯笼礼包",98,"2023","hwwa8qutic5bbr4hsmxqje4sh3lys2n.png"],["玉兔拖鞋礼包",45,"2023","tmvlktqv5sp0z02sqow68qhpku94jva.png"],["玉兔礼包",18,"2023","p8sgmqmkmccpa3t36kxhyqdp5m671w1.png"],["祥云瑞气服饰礼包",68,"2023","mokbbvuoo95l169qiepofwfnxvcifoe.png"],["祥云瑞气纸伞礼包",98,"2023","034bdd2rk7msyjp2kaqmgz1oofbch6f.png"],["自然之声礼包",30,"2023","81igejsf9vrfgw7g691ojnybta4asek.png"],["蛛丝斗篷礼包",98,"2023","9q4h6orvnksv15zee7fisdisglkm013.png"],["跃动跑鞋礼包",45,"2023","o62cv8obf4yjcuh3n6vmhakhpizm7tu.png"],["野餐礼包",128,"2023","4gttca0gzgairp8ssiek6ztqiou9mka.png"],["阔腿牛仔裤礼包",68,"2023","qc0ne4vto3cg0f1wv80r4zsl34s3juz.png"],["雏鸟之琴礼包",30,"2023","fu5ssiikazhlwi8usdcwp0m5bpovyp8.png"],["雪人暖心靴礼包",45,"2023","6ncuccp7ykjyhx0yiluep7vj1q9zgz8.png"],["音韵吉他礼包",98,"2023","0aa2o338lf8nw6a66rub7kgeis1v5co.png"],["飞蛾装扮礼包",68,"2023","r4kw0bkmd7bjm47nkllx2c8kkn2ivzg.png"],["优雅小憩茶桌礼包",128,"2022","50xn1q06nhi95xi1d5gqpcmji5hf3ej.png"],["保暖雪人斗篷礼包",98,"2022","su5db650j13gk339ohu8u5p3nt55k34.png"],["周年庆电吉他礼包",198,"2022","8fe0gyk7n5aktuyqq9fhw71hyc2ftt6.png"],["奉献斗篷礼包",98,"2022","r5q0xvyi72jypt6f9c9ps9yzq3cgi2i.png"],["奔离远行发型礼包",18,"2022","tdhwt2z8o9agdvm6r5yl49kjtzcvh2f.png"],["奔离远行服饰礼包",68,"2022","8wok0qcswn8p3t2uist0s0hmel4inlc.png"],["年年有鱼礼包",128,"2022","molkllm797qub2tpzvf794crspb45wy.png"],["彩虹耳机礼包",68,"2022","0xku2mbsc6qv3ve47d6na8w3cektih7.png"],["彩虹耳饰礼包",18,"2022","gmriey7t46vrvprc87suawq39bzgkv5.png"],["情人小船礼包",128,"2022","6ddx32h8q03xp9b5mqqaji46nwt0624.png"],["星月头冠礼包",30,"2022","5v8v8eg32nkgdbvhuxdcwpqprnbarte.png"],["欧若拉之声礼包",98,"2022","hua52hnznpkb7iqy7gsds4l7dvlqtna.png"],["欧若拉之翼礼包",168,"2022","fsynhmfv365azmmrrwvqbg5j3cjayzx.png"],["球赛礼包",98,"2022","thnen713v2e905xrqdbtokx3p1dncik.png"],["皮皮猫礼包",68,"2022","egxxucfxzkh9bkb9je4c4yopl9bow70.png"],["皮皮猫装扮礼包",128,"2022","t8tuvs5hhkl6huhvxs07efujbir0bb6.png"],["致爱装扮礼包",68,"2022","lcvr1bz5iklic2ppcs5eal5dpvhnoad.png"],["鲤跃龙门礼包",12,"2022","90uid4est3kw0c2k521y2bq50cfszit.png"],["万圣节礼包",198,"2021","se0rvx1dr88tfpooe9lt9f3uuw36xd9.png"],["冥龙南瓜礼包",12,"2021","53c9c1r12ketc6oh0w60et1m20vh81z.png"],["夏日阳伞礼包",128,"2021","4e45illv0s5ohpfrap820nvunyun6ta.png"],["多彩绒绒帽礼包",68,"2021","1im0kly8ht5ywb7eovdtnjua4c0a92s.png"],["大桔大利礼包",6,"2021","0lc3nsd0b0zo58zjyxte2cmpqwmxn3w.png"],["女巫帽礼包",68,"2021","93u6t8wr28217g2lf2iv0j1cdgtvkfm.png"],["小王子围巾礼包",98,"2021","jubgeqdpbuufmfd46javhbrg4i0mu9o.png"],["小王子小行星斗篷礼包",168,"2021","pb7e3eenujugoxvpy3p6hzxtlgfpx1x.png"],["小王子狐狸礼包",68,"2021","2kgdwqwn8kahgfcw3x490ob2pxkkr7n.png"],["巫树犄角礼包",68,"2021","rmn3y2dyclqbxx7ala0br3zh1yg95sh.png"],["情人秋千礼包",128,"2021","ig9ftmlwn47r73h3cfyyq1slbgn44l3.png"],["情人跷跷板礼包",128,"2021","r3neimrrhs260hbf0ojllm24f7idhhs.png"],["新春福娃礼包",168,"2021","ow38rgt6jxcwbsvulz6ie6zrdun94y5.png"],["暖冬瑞雪礼包",98,"2021","m5bbno2hx6dkjrcvsh29e7ba74d53vu.png"],["清香粽叶礼包",98,"2021","apyx4k8yqpo0y5d5flt7nc4tmau5egi.png"],["温暖绒帽礼包",68,"2021","4am4fwus1xwywt8rryspiah2p2s860k.png"],["疯女巫长裙礼包",68,"2021","r963z72wrk7zl919bfqgr6a8xoizp7x.png"],["花憩茶桌礼包",128,"2021","2990aky3u1p0025f6db382wtq9btfz9.png"],["蛛网斗篷礼包",98,"2021","56djv6ok350r8aaxnh88ewkxuh0kvjp.png"],["蛛网朋克礼包",30,"2021","9ksrxgyzjeg3hj8fgeml7n22rl3net0.png"],["贝壳发夹礼包",6,"2021","fjvg5xgviutd4hco07htd3umibks7t2.png"],["中国绊爱大铁头礼包",98,"2020","59lmz6yx6uoubk7e23wvlluvvvuk1fv.png"],["中国绊爱套装礼包",128,"2020","b1kp8kul8axrp61wip69ja20h389653.png"],["创始人礼包",30,"2019","6lay6ppm0of7oo9u5nqfpi6ydjj3qh8.png"],["合伙人礼包",198,"2019","936p5uzzghnibdnsb9nsyrr3pz16qma.png"]];

	var GIFT_CSS = WING_CSS.replace(/sky-wing-/g, 'sky-gift-') +
		'.sky-gift-tabs{display:flex;gap:8px;margin-bottom:10px}' +
		'.sky-gift-tab{flex:1;height:34px;border-radius:12px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);font-size:12px;font-weight:600;color:var(--text-dim);cursor:pointer;padding:0}' +
		'.sky-gift-tab.on{color:var(--btn-txt);border-color:transparent;background:linear-gradient(120deg,var(--btn-a),var(--btn-b))}' +
		'.sky-gift-pane{display:none}.sky-gift-pane.on{display:block}' +
		'.sky-gift-stat{display:flex;gap:8px;margin-top:2px}' +
		'.sky-gift-list{margin-top:10px;border:1px solid var(--glass-bd);border-radius:14px;' +
		'background-color:var(--glass-bg-2);max-height:44vh;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
		'.sky-gift-item{display:flex;align-items:center;gap:8px;padding:8px 10px;' +
		'border-bottom:1px solid var(--line);font-size:12px;cursor:pointer}' +
		'.sky-gift-item:last-child{border-bottom:0}' +
		'.sky-gift-ck{width:16px;height:16px;flex-shrink:0;border-radius:5px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg);position:relative;box-sizing:border-box}' +
		'.sky-gift-ck:after{content:"";position:absolute;left:5px;top:2px;width:4px;height:8px;' +
		'border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg);opacity:0}' +
		'.sky-gift-item.on .sky-gift-ck{border-color:transparent;background:linear-gradient(120deg,var(--btn-a),var(--btn-b))}' +
		'.sky-gift-item.on .sky-gift-ck:after{opacity:1}' +
		'.sky-gift-nm{flex:1;min-width:0;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
		'.sky-gift-item.on .sky-gift-nm{color:var(--text);font-weight:600}' +
		'.sky-gift-pr{flex-shrink:0;font-size:11px;color:var(--text-faint)}' +
		'.sky-gift-yr{margin:10px 2px 2px;font-size:11px;font-weight:600;color:var(--accent)}' +
		'.sky-gift-step{font-size:11px;line-height:1.7;color:var(--text-dim);white-space:pre-line}' +
		'.sky-gift-step b{color:var(--accent);font-weight:600}' +
		'.sky-gift-tool{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;' +
		'padding:10px 12px;border-radius:14px;border:1px solid var(--glass-bd);background-color:var(--glass-bg-2)}' +
		'.sky-gift-tool .t{font-size:12px;font-weight:600;color:var(--text)}' +
		'.sky-gift-tool .d{font-size:10px;color:var(--text-faint);margin-top:2px}' +
		'.sky-gift-clear{margin-top:10px;width:100%;height:34px;border-radius:12px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);font-size:11px;color:#FF8A8A;cursor:pointer;padding:0}' +
		'.sky-gift-search{width:100%;height:36px;box-sizing:border-box;margin-top:10px;padding:0 12px;' +
		'border-radius:12px;border:1px solid var(--glass-bd);background-color:var(--glass-bg-2);' +
		'color:var(--text);font-size:12px;outline:none}' +
		'.sky-gift-im{width:36px;height:36px;flex-shrink:0;border-radius:10px;object-fit:cover;' +
		'background-color:var(--glass-bg);border:1px solid var(--glass-bd)}';

	var giftStyle = document.createElement('style');
	giftStyle.textContent = themeStyle(GIFT_CSS);
	document.head.appendChild(giftStyle);

	var giftMask = el('div', 'sky-gift-mask');
	giftMask.dataset.skyPatch = '1';
	var giftPanel = el('div', 'sky-gift-panel');
	var giftGrip = el('div', 'sky-gift-grip');
	var giftHead = el('div', 'sky-gift-head');
	var giftTitle = el('div', 'sky-gift-title', '礼包查询');
	var giftClose = el('div', 'sky-gift-close', '关闭');
	giftHead.appendChild(giftTitle);
	giftHead.appendChild(giftClose);

	var giftTabs = el('div', 'sky-gift-tabs');
	var tabGuide = document.createElement('button');
	tabGuide.type = 'button';
	tabGuide.className = 'sky-gift-tab on';
	tabGuide.textContent = '查询指引';
	var tabCalc = document.createElement('button');
	tabCalc.type = 'button';
	tabCalc.className = 'sky-gift-tab';
	tabCalc.textContent = '自己算礼包';
	giftTabs.appendChild(tabGuide);
	giftTabs.appendChild(tabCalc);

	var paneGuide = el('div', 'sky-gift-pane on');
	var paneCalc = el('div', 'sky-gift-pane');

	/* —— 页一：查询指引 —— */
	var guideStep = el('div', 'sky-gift-step');
	guideStep.innerHTML =
		'礼包明细数据在游戏服务器里，目前没有免费公开接口能在网页直接查。\n' +
		'<b>主流查法：</b>微信搜小程序「上游大神」或「sky小白身高」，粘贴<b>原 ID（长 ID）</b>' +
		'即可查已购礼包、花费与缺少明细。\n' +
		'<b>拿原 ID：</b>游戏内 设置 → 精灵 → 工具指南 → 查询ID → 复制「原ID」（带横杠的长 ID）。';

	function giftTool(name, desc) {
		var box = el('div', 'sky-gift-tool');
		var info = el('div');
		info.appendChild(el('div', 't', name));
		info.appendChild(el('div', 'd', desc));
		var btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'sky-wing-copy';
		btn.textContent = '复制名称';
		btn.style.cssText = 'flex-shrink:0;border:0';
		btn.addEventListener('click', function (e) {
			e.stopPropagation();
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(name).then(function () {
					btn.textContent = '已复制';
					setTimeout(function () { btn.textContent = '复制名称'; }, 1600);
				}).catch(function () {});
			}
		});
		box.appendChild(info);
		box.appendChild(btn);
		return box;
	}
	paneGuide.appendChild(guideStep);
	paneGuide.appendChild(giftTool('上游大神', '公众号 / 小程序 · 查已购礼包明细与花费'));
	paneGuide.appendChild(giftTool('sky小白身高', '小程序 · 国服 / 国际服礼包文字版与图片版'));

	/* —— 页二：自己算礼包 —— */
	var giftStat = el('div', 'sky-gift-stat');
	var chipB = el('div', 'sky-gift-chip');
	var statN = el('span', 'sky-gift-chipv', '0');
	chipB.appendChild(statN);
	chipB.appendChild(el('span', 'sky-gift-chipk', '已购 / 全部'));
	var chipS = el('div', 'sky-gift-chip');
	var statS = el('span', 'sky-gift-chipv', '¥0');
	chipS.appendChild(statS);
	chipS.appendChild(el('span', 'sky-gift-chipk', '已购花费'));
	var chipR = el('div', 'sky-gift-chip');
	var statR = el('span', 'sky-gift-chipv', '¥0');
	chipR.appendChild(statR);
	chipR.appendChild(el('span', 'sky-gift-chipk', '全收集还需'));
	giftStat.appendChild(chipB);
	giftStat.appendChild(chipS);
	giftStat.appendChild(chipR);

	var giftSearch = document.createElement('input');
	giftSearch.className = 'sky-gift-search';
	giftSearch.type = 'text';
	giftSearch.placeholder = '搜礼包名，如：斗篷 / 玉兔';
	giftSearch.setAttribute('autocomplete', 'off');

	var giftList = el('div', 'sky-gift-list');
	var giftClear = document.createElement('button');
	giftClear.type = 'button';
	giftClear.className = 'sky-gift-clear';
	giftClear.textContent = '清空已选';
	var calcNote = el('div', 'sky-gift-hint');
	calcNote.innerHTML = '清单与价格为参考值（BWiki 礼包图鉴，2019-2026 共 ' + GIFT_DATA.length +
		' 款），新礼包可能未收录；勾选结果保存在本机浏览器。';

	paneCalc.appendChild(giftStat);
	paneCalc.appendChild(giftSearch);
	paneCalc.appendChild(giftList);
	paneCalc.appendChild(giftClear);
	paneCalc.appendChild(calcNote);

	giftPanel.appendChild(giftGrip);
	giftPanel.appendChild(giftHead);
	giftPanel.appendChild(giftTabs);
	giftPanel.appendChild(paneGuide);
	giftPanel.appendChild(paneCalc);
	giftMask.appendChild(giftPanel);
	document.body.appendChild(giftMask);

	function openGift() {
		giftStyle.textContent = themeStyle(GIFT_CSS); // 主题可能已切换，重新取值
		giftMask.classList.add('on');
		lockScroll(true);
	}
	function closeGift() {
		giftMask.classList.remove('on');
		lockScroll(false);
	}
	giftClose.addEventListener('click', closeGift);
	giftMask.addEventListener('click', function (e) {
		if (e.target === giftMask) closeGift();
	});
	giftPanel.addEventListener('touchmove', function (e) {
		if (giftPanel.scrollHeight > giftPanel.clientHeight) return;
		e.preventDefault();
	});

	function setGiftTab(which) {
		var guide = which === 'guide';
		tabGuide.classList.toggle('on', guide);
		tabCalc.classList.toggle('on', !guide);
		paneGuide.classList.toggle('on', guide);
		paneCalc.classList.toggle('on', !guide);
	}
	tabGuide.addEventListener('click', function () { setGiftTab('guide'); });
	tabCalc.addEventListener('click', function () { setGiftTab('calc'); });

	var SEL_KEY = 'sky_guide_gift_sel_v1';
	var giftSel = {};
	try { giftSel = JSON.parse(localStorage.getItem(SEL_KEY) || '{}') || {}; } catch (e) { giftSel = {}; }

	function saveSel() {
		try { localStorage.setItem(SEL_KEY, JSON.stringify(giftSel)); } catch (e) {}
	}
	function updStat() {
		var n = 0, sum = 0;
		GIFT_DATA.forEach(function (g) {
			if (giftSel[g[0]]) { n++; sum += g[1]; }
		});
		statN.textContent = n + ' / ' + GIFT_DATA.length;
		statS.textContent = '¥' + sum;
		statR.textContent = '¥' + (GIFT_DATA.reduce(function (a, g) { return a + g[1]; }, 0) - sum);
	}
	function renderList() {
		var kw = (giftSearch.value || '').trim().toLowerCase();
		var html = '';
		var lastYr = '';
		GIFT_DATA.forEach(function (g) {
			if (kw && g[0].toLowerCase().indexOf(kw) < 0) return;
			if (g[2] !== lastYr) {
				lastYr = g[2];
				html += '<div class="sky-gift-yr">' + escWing(g[2]) + ' 年</div>';
			}
			html += '<div class="sky-gift-item' + (giftSel[g[0]] ? ' on' : '') +
				'" data-n="' + escWing(g[0]) + '">' +
				(g[3] ? '<img class="sky-gift-im" loading="lazy" src="' + BASE + '/img/gifts/' + escWing(g[3]) +
					'" data-fb="' + escWing(g[4] || '') +
					'" alt="" onerror="var f=this.dataset.fb;if(f){this.src=f;this.dataset.fb=\'\'}else{this.style.display=\'none\'}">' : '') +
				'<span class="sky-gift-ck"></span>' +
				'<span class="sky-gift-nm">' + escWing(g[0]) + '</span>' +
				'<span class="sky-gift-pr">¥' + g[1] + '</span></div>';
		});
		giftList.innerHTML = html ||
			'<div class="sky-gift-item" style="cursor:default"><span class="sky-gift-nm">没找到匹配的礼包</span></div>';
	}
	giftList.addEventListener('click', function (e) {
		var it = e.target.closest ? e.target.closest('.sky-gift-item') : null;
		if (!it || !it.dataset.n) return;
		var n = it.dataset.n;
		if (giftSel[n]) delete giftSel[n];
		else giftSel[n] = 1;
		it.classList.toggle('on', !!giftSel[n]);
		saveSel();
		updStat();
	});
	var searchTimer = 0;
	giftSearch.addEventListener('input', function () {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(renderList, 120);
	});
	var clearArm = 0;
	giftClear.addEventListener('click', function () {
		if (!Object.keys(giftSel).length) return;
		if (!clearArm) {
			clearArm = 1;
			giftClear.textContent = '再点一次确认清空';
			setTimeout(function () {
				clearArm = 0;
				giftClear.textContent = '清空已选';
			}, 2600);
			return;
		}
		clearArm = 0;
		giftSel = {};
		saveSel();
		giftClear.textContent = '清空已选';
		renderList();
		updStat();
	});

	/* 入口卡片：插进「更多攻略」横条，与光翼查询并排 */
	function ensureGiftCard() {
		var strip = document.querySelector('.guide-strip');
		if (!strip || strip.querySelector('.sky-patch-gift')) return;
		var card = el('uni-view', 'guide-card guide-idle sky-patch-gift');
		card.style.cssText = CARD_CSS;
		var mark = el('uni-view', 'guide-mark');
		mark.style.cssText = MARK_CSS;
		var markTxt = el('uni-text', 'guide-mark-txt', '礼');
		markTxt.style.cssText = MARK_TXT_CSS;
		mark.appendChild(markTxt);
		card.appendChild(mark);
		var name = el('uni-text', 'guide-name', '礼包查询');
		name.style.cssText = NAME_CSS;
		card.appendChild(name);
		var desc = el('uni-text', 'guide-desc', '清单自算 + 查询指引');
		desc.style.cssText = DESC_CSS;
		card.appendChild(desc);
		card.addEventListener('click', function (e) {
			e.stopPropagation();
			openGift();
		});
		strip.appendChild(card);
	}
	setInterval(ensureGiftCard, 1500);
	ensureGiftCard();

	renderList();
	updStat();
})();

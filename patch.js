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
	   零、i18n：默认英文，右下角可切换中文（词典 + 文本节点替换）
	   ========================================================== */
	var I18N = {" · 先祖 ":" · Spirit "," · 已收集 ":" · Collected "," · 还差 ":" · Left: "," 件":" items"," 年</div>":" yrs</div>"," 款），新礼包可能未收录；勾选结果保存在本机浏览器。":" packs in total); newer packs may be missing. Selections are saved in your browser."," 颗爱心":"","<b>主流查法：</b>微信搜小程序「上游大神」或「sky小白身高」，粘贴<b>原 ID（长 ID）</b>":"<b>Common way:</b> open WeChat and search mini-programs 「上游大神」or「sky小白身高」, paste your <b>Original ID (long ID)</b>","<b>怎么找短 ID：</b>游戏内点右上角小精灵 → 问「查询id」或「角色ID」，":"<b>How to find your Short ID:</b> in-game, tap the Guide sprite (top right) → ask \"查询id\" or \"角色ID\",","<b>拿原 ID：</b>游戏内 设置 → 精灵 → 工具指南 → 查询ID → 复制「原ID」（带横杠的长 ID）。":"<b>Get the Original ID:</b> in-game Settings → Guide → Tool Guides → 查询ID → copy \"原ID\" (the hyphenated long ID).","ID 格式不对：请填 9 位数字短 ID（小精灵「查询id」里那个）":"Invalid ID: enter the 9-digit Short ID (from the Guide sprite's \"查询id\" reply)","KFC披萨斗篷":"KFC Pizza Cape","KFC披萨盒":"KFC Pizza Box","PC端箭头":"PC Arrow","Switch红色斗篷":"Switch Red Cape","Switch蓝色斗篷":"Switch Blue Cape","TGC斗篷":"TGC Cape","TGC黑色帽衫斗篷":"TGC Black Hoodie Cape","T型个性面饰":"T-Style Face Accessory","Yellow毛巾":"Yellow Towel","sky小白身高":"sky小白身高","—— 记得去方舟领免费魔法哦！":"— Remember to claim free spells at the Ark!","‹ 返回":"‹ Back","一周年派对帽":"1st Anniversary Party Hat","一块蛋糕":"Cake Slice","一撮毛":"Cowlick","一级蹦床":"Trampoline I","一键复制任务":"Copy Quests","七周年奥利奥拖鞋":"7th Anniversary Oreo Slippers","七夕平底鞋":"Qixi Flats","七夕项链":"Qixi Necklace","七夕鸟":"Qixi Bird","七夕麻花":"Qixi Braids","万圣哥特斗篷":"Halloween Gothic Cape","万圣节猫尾巴":"Halloween Cat Tail","万圣节猫耳朵":"Halloween Cat Ears","万圣节礼包":"Halloween Pack","三级蹦床":"Trampoline III","三花猫":"Calico","三角斗篷":"Triangle Cape","上午":"AM","上游大神":"上游大神 (Shangyou Daren)","下午":"PM","不能除以 0":"Cannot divide by 0","丝巾斗篷":"Silk Scarf Cape","丝带斗篷":"Silk Ribbon Cape","丝带蝴蝶结斗篷":"Ribbon Bow Cape","丫鬟头":"Maid Bun","中吉":"Fair Luck","中国绊爱大铁头礼包":"Kizuna AI Big Iron Head Pack","中国绊爱套装礼包":"Kizuna AI Set Pack","中国结":"Chinese Knot","乌鸦":"Crow","乐器架":"Instrument Stand","乐队制服裤":"Band Uniform Pants","乐队夹克斗篷":"Band Jacket Cape","九色鹿季Beads发型":"Nine-Colored Deer Beads Hair","九色鹿季LongStraps鞋子":"Nine-Colored Deer Long-Strap Shoes","九色鹿季Maypole发型":"Nine-Colored Deer Maypole Hair","九色鹿季ShortStraps鞋子":"Nine-Colored Deer Short-Strap Shoes","九色鹿季花瓣斗":"Nine-Colored Deer Petal Cape","九色鹿季项链":"Nine-Colored Deer Necklace","九色鹿鹿角头饰":"Nine-Colored Deer Antler Headpiece","也可长按图片保存 · 点击空白处关闭":"Long-press image to save · tap blank area to close","书":"Book","书背饰":"Book Back Accessory","书虫":"Bookworm","二周年贝雷帽":"2nd Anniversary Beret","二级蹦床":"Trampoline II","二维码识别成功，正在解析…":"QR code detected, parsing…","二重奏季Designer裤子":"Duet Designer Pants","二重奏季Pigtail发型":"Duet Pigtail Hair","二重奏季WallSpiceRack背饰":"Duet Wall Spice Rack Back Accessory","二重奏季双人沙发":"Duet Loveseat","二重奏季台灯":"Duet Table Lamp","二重奏季壁挂画":"Duet Wall Painting","二重奏季壁挂画套装":"Duet Wall Painting Set","二重奏季悬挂花盆":"Duet Hanging Planter","二重奏季椅子":"Duet Chair","二重奏季毕业三角钢琴":"Duet Graduation Grand Piano","二重奏季浴缸":"Duet Bathtub","二重奏季脚踏凳":"Duet Footstool","二重奏季项链":"Duet Necklace","二重奏海报":"Duet Poster","云背饰":"Cloud Back Accessory","云野":"Daylight Prairie","云野的风说：可以 (´｡• ᵕ •｡`)":"The wind of Daylight Prairie says: yes (´｡• ᵕ •｡`)","云音伴游耳机礼包":"Cloud Melody Headphones Pack","五周年斗篷":"5th Anniversary Cape","五周年线框斗篷":"5th Anniversary Wireframe Cape","五朔彩带斗篷":"Maypole Ribbon Cape","亚麻围巾斗篷":"Linen Scarf Cape","亚麻覆盖斗篷":"Linen Drape Cape","人体模型":"Mannequin","仅供个人游戏参考":"For personal reference only","今天":"Today","今天必炸大花！(๑•̀ㅂ•́)و✧":"The grand bloom will burst today! (๑•̀ㅂ•́)و✧","今天没戏，明天再来 (｡•́︿•̀｡)":"No chance today, come back tomorrow (｡•́︿•̀｡)","今天的你值得一点小幸运 (｡･ω･｡)ﾉ♡":"You deserve a little luck today (｡･ω･｡)ﾉ♡","今天的运气藏在暮土 (・_・;)":"Today's luck hides in Golden Wasteland (・_・;)","今日任务":"Daily Quests","今日天气 + 红石碎片":"Today's weather + red shard","今日季蜡 · ":"Today's seasonal candles · ","今日季蜡位置：":"Today's seasonal candles: ","今日季蜡：":"Today's seasonal candles: ","今日宜绕开螃蟹堆，被撞了别怪签文没提醒 (＞﹏＜)":"Avoid crab piles today — don't blame the fortune if you get bumped (＞﹏＜)","今日攻略图":"Today's Guide Image","今日无红石/黑石":"No red/black shard today","今日暂无":"None today","今日暂无内容":"Nothing here today","今日暂无红石/黑石":"No red/black shard today","今日有复刻 · 点击查看":"Returning Spirit today · Tap to view","今日蜡烛格外听话，跑两个图就够本了 (・∀・)":"Candles are extra generous today — two maps pays off (・∀・)","今日跑暴风眼必不掉翼 (๑˃̵ᴗ˂̵)":"Run Eye of Eden today — guaranteed no wing loss (๑˃̵ᴗ˂̵)","今日运势平平，但风景很好 (´ω｀)":"Average luck today, but the scenery is lovely (´ω｀)","今日运势，玄学一把":"Today's fortune, give it a try","今日降落时间":"Today's landing times","今晚的星空会给你提示 (✧∇✧)":"Tonight's starry sky will give you a hint (✧∇✧)","仙境茶会门扉礼包":"Wonderland Tea Party Door Pack","任务获取失败，请下拉刷新":"Failed to load quests — pull down to refresh","伊甸":"Eye of Eden","优雅三件套礼包":"Elegant Three-Piece Set Pack","优雅小憩茶桌礼包":"Elegant Tea Break Table Pack","优雅领巾礼包":"Elegant Neck Scarf Pack","会掉的，但不会掉太多 (￣▽￣)ノ":"It will drop, but not too much (￣▽￣)ノ","会有人牵你的手 (｡･ω･｡)ﾉ♡":"Someone will hold your hand (｡･ω･｡)ﾉ♡","伞":"Umbrella","伞发型":"Umbrella Hair","伞背饰":"Umbrella Back Accessory","伤兵斗篷":"Wounded Soldier Cape","低双马尾":"Low Twin Tails","低音提琴":"Double Bass","体型比例":"Body Ratio","体型比例: ":"Body ratio: ","你已经比昨天强了 (๑•̀ㅂ•́)✧":"You are stronger than yesterday (๑•̀ㅂ•́)✧","你心里其实已经有答案了 (￣ω￣)":"You already know the answer deep down (￣ω￣)","你需要的是朋友，不是答案 (๑•́ ₃ •̀๑)":"What you need is a friend, not an answer (๑•́ ₃ •̀๑)","侧边红斗篷":"Red-Side Cape","保存图片":"Save Image","保存图片ovo":"Save Image ovO","保存失败，请长按图片":"Save failed — long-press the image instead","保暖雪人斗篷礼包":"Warm Snowman Cape Pack","偏矮型":"Shortish","偏高型":"Tallish","先挂机十分钟，答案自己会来 (￣▽￣)":"AFK for ten minutes — the answer will come to you (￣▽￣)","先点了先祖再说 (✧∇✧)":"Tap the ancestor first, then ask (✧∇✧)","先祖光翼":"Spirit Wings","先祖光翼（接口原始标识）":"Spirit Wings (raw API labels)","先祖见你都主动伸手，蜡烛自己往兜里跳 (✧∇✧)":"Ancestors reach out to you — candles jump straight into your pocket (✧∇✧)","光之生物礼服套装礼包":"Creatures of Light Formal Set Pack","光发型":"Light Hair","光头":"Bald","光球球门":"Orb Goal","光翼查询":"Wing Lookup","光翼等级 ":"Wing level ","光背饰":"Light Back Accessory","光袍裤子":"Light Robe Pants","光遇抽签":"Sky Fortune","光遇身高测量 · 冰块":"Sky Height Meter · IceBlock","光遇身高测量结果":"Sky Height Measurement Result","免费魔法":"Free Spells","兔子":"Bunny","兔子拖鞋":"Bunny Slippers","兔子面具面具":"Bunny Mask","全收集还需":"Full Collection Needs","公众号 / 小程序 · 查已购礼包明细与花费":"WeChat account / mini-program · owned packs and spending","六一矮人面具":"Children's Day Dwarf Mask","六周年地毯":"6th Anniversary Rug","六周年皇冠帽":"6th Anniversary Crown Hat","兰花斗篷":"Orchid Cape","关闭":"Close","关闭摄像头":"Close Camera","其他地图":"Other Realms","具":"Furn","冈易云耳机":"Wangyi Cloud Headphones","再抽一签":"Draw Again","再点一次确认清空":"Tap again to confirm","再等等，蜡烛还没熟 (￣▽￣)":"Wait a bit — the candles aren't ripe yet (￣▽￣)","再跑一张图，你就想通了 (￣▽￣)ノ":"Run one more map and it will all make sense (￣▽￣)ノ","军号":"Bugle","军大衣":"Army Coat","军帽":"Army Cap","农场画作":"Farm Painting","农民帽":"Farmer's Hat","冠发型":"Crown Hair","冥主":"Wasteland Lord","冥龙南瓜礼包":"Krill Pumpkin Pack","冥龙地毯":"Krill Rug","冥龙套装礼包":"Krill Set Pack","冥龙尾巴":"Krill Tail","冥龙斗篷":"Krill Cape","冥龙角":"Krill Horns","冥龙领带":"Krill Tie","冬季羽绒服斗篷":"Winter Down Cape","冰凳":"Ice Stool","冰块":"IceBlock","冰方块(横)":"Ice Block (Horizontal)","冰方块(竖)":"Ice Block (Vertical)","冰滑梯(凸)":"Ice Slide (Convex)","冰滑梯(凹)":"Ice Slide (Concave)","冲天辫":"Skyward Braid","冲浪板":"Surfboard","凤凰斗篷":"Phoenix Cape","凯旋手碟":"Triumph Handpan","凯旋手碟礼包":"Triumph Handpan Pack","凯旋提琴礼包":"Triumph Violin Pack","创始人礼包":"Founder Pack","初始":"Default","删":"Del","别急，蜡烛会一直亮着 (｡･ω･｡)":"No rush — the candles will keep glowing (｡･ω･｡)","别想了，去跑图吧 (๑•̀ㅂ•́)و✧":"Stop overthinking — go run some maps (๑•̀ㅂ•́)و✧","别问，问就是缘分 (￣ω￣)":"Don't ask — it's destiny (￣ω￣)","制服斗篷":"Uniform Cape","办公室":"Office","办公音乐贝壳":"Office Music Shell","加减乘除，随手算一算":"Quick math on the go","加载中…":"Loading…","加载失败 · 点按重试":"Load failed · tap to retry","加载失败，请重试":"Load failed, tap to retry","半地毯":"Half Rug","华丽大提琴":"Ornate Cello","华丽斗篷":"Ornate Cape","单座石凳":"Single Stone Stool","单片眼镜":"Monocle","南瓜":"Pumpkin","南瓜灯":"Jack-o'-Lantern","卡卡":"Kaka","卧室画作":"Bedroom Painting","印花斗篷":"Printed Cape","即可查已购礼包、花费与缺少明细。\n":"to see owned packs, spending and missing details.\n","卷双丸子":"Curly Double Buns","卷球发型":"Curly Ball Hair","历史记录":"History","去吧，红石今天站在你这边 (๑•̀ㅂ•́)و✧":"Go — the red shard is on your side today (๑•̀ㅂ•́)و✧","去暮土小心被皮皮虾盯上 (｡•́︿•̀｡)":"Watch out for krill in Golden Wasteland (｡•́︿•̀｡)","去跑图吧，冥龙在等你 (￣^￣)":"Go run the maps — the krill are waiting (￣^￣)","友情鸭沙发":"Friendship Duck Sofa","友情鸭车":"Friendship Duck Cart","双丸子头":"Double Buns","双层蛋糕":"Two-Tier Cake","双指缩放 · 双击放大 · 长按图片保存 · 点击空白处关闭":"Pinch to zoom · double-tap to zoom · long-press image to save · tap blank area to close","双星季Gown裤子":"Twin Stars Gown","双星季Lumberjack裤子":"Twin Stars Lumberjack Pants","双星季Plume面饰":"Twin Stars Plume Face Accessory","双星季Royal裤子":"Twin Stars Royal Pants","双星季毕业礼":"Twin Stars Graduation Gift","双星季项链":"Twin Stars Necklace","双缎带装饰":"Double Ribbon Decor","双色斗篷":"Two-Tone Cape","双马尾":"Twin Tails","发型":"Hairstyle","取消":"Cancel","口风琴":"Melodica","古典音乐桌椅礼包":"Classical Music Table & Chair Pack","台式钢琴":"Grand Piano","史力奇套装礼包":"Snorkeling Set Pack","史力奇帽子礼包":"Snorkel Hat Pack","叶帽头饰":"Leaf Hat Headwear","叶背饰":"Leaf Back Accessory","号角冠头饰":"Horn Crest Headwear","号角头饰":"Horn Headwear","号角帽头饰":"Horn Hat Headwear","号角暗背饰":"Dark Horn Back Accessory","号角眼镜面饰":"Horn Shades Face Accessory","号角缎带头饰":"Horn Ribbon Headwear","号角羽毛头饰":"Horn Feather Headwear","号角耳饰":"Horn Earrings","号角面饰":"Horn Face Accessory","各地图收集":"Collection by Realm","各色二级斗":"Tier-2 Capes (Various)","各色斗篷":"Capes (Various)","合伙人礼包":"Partner Pack","合服头饰":"Server-Merge Headpiece","吉他":"Guitar","吊床":"Hammock","同伴方块":"Companion Block","同心节抱枕":"Togetherness Cushion","向导帽":"Guide's Cap","向日葵伞":"Sunflower Umbrella","向日葵吧台":"Sunflower Bar","向日葵屏风":"Sunflower Screen","向日葵床":"Sunflower Bed","向日葵枕头":"Sunflower Pillow","向日葵梯子":"Sunflower Ladder","向日葵画作":"Sunflower Painting","向日葵耳饰礼包":"Sunflower Earrings Pack","向日葵花瓣裙礼包":"Sunflower Petal Skirt Pack","向日葵连衣裙礼包":"Sunflower Dress Pack","向阳花伞礼包":"Sunflower Umbrella Pack","向阳花花盆":"Sunflower Pot","吸蟹伯爵斗篷礼包":"Crab-Snacking Count Cape Pack","吸蟹伯爵面具礼包":"Crab-Snacking Count Mask Pack","吸血鬼伯爵斗篷":"Vampire Count Cape","呆菇":"Ditzy Mushroom","周年庆抱枕礼包":"Anniversary Cushion Pack","周年庆电吉他礼包":"Anniversary Electric Guitar Pack","周年影院套餐礼包":"Anniversary Cinema Combo Pack","周年影院座椅":"Anniversary Cinema Seat","周年礼服斗篷":"Anniversary Dress Cape","周年礼服斗篷礼包":"Anniversary Dress Cape Pack","周年线框斗篷礼包":"Anniversary Wireframe Cape Pack","周年音序器":"Anniversary Sequencer","咖喱":"Curry","哥特裤":"Gothic Pants","哥特靴":"Gothic Boots","嘘声斗篷":"Hush Cape","回复里的「短 ID」就是那 9 位数字，填它就行。\n":"the \"Short ID\" in the reply is that 9-digit number — just enter it.\n","回归童真礼包":"Childhood Return Pack","园丁装扮礼包":"Gardener Outfit Pack","园丁裤":"Gardener Pants","围巾面具面具":"Scarf Mask","围巾项链":"Scarf Necklace","国王":"King","国王斗篷":"King's Cape","图片加载失败":"Image failed to load","图片加载失败，请重试":"Image failed to load, tap to retry","圆罐":"Round Jar","圣岛季BunRound发型":"Sanctuary Round Bun Hair","圣岛季WizardHair发型":"Sanctuary Wizard Hair","圣岛季项链":"Sanctuary Necklace","圣诞围巾":"Christmas Scarf","圣诞帽":"Santa Hat","圣诞枕头":"Christmas Pillow","圣诞椅":"Christmas Chair","地中海":"Bald Spot","地图光翼":"Map Wings","地毯背饰":"Rug Back Accessory","场记板":"Clapperboard","填 9 位数字短 ID":"Enter 9-digit Short ID","墓土":"Golden Wasteland","墨镜头饰礼包":"Ink Headwear Pack","壁挂照片1":"Wall Photo 1","壁挂照片2":"Wall Photo 2","复制名称":"Copy Name","复制摘要":"Copy Summary","复制结果":"Copy Result","复刻先祖":"Returning Spirits","夏之日短裤":"Summer Days Shorts","夏日冲浪礼包":"Summer Surfing Pack","夏日凉鞋礼包":"Summer Sandals Pack","夏日有友礼包":"Summer with Friends Pack","夏日派对礼包":"Summer Party Pack","夏日潜水套装礼包":"Summer Diving Set Pack","夏日阳伞":"Summer Parasol","夏日阳伞礼包":"Summer Parasol Pack","多彩绒绒帽礼包":"Colorful Fluffy Hat Pack","夜":"Night","夜书":"Night Book","夜行季Apron裤子":"Nightlife Apron","夜行季BandanaBraid发型":"Nightlife Bandana Braid Hair","夜行季Chimes背饰":"Nightlife Chimes Back Accessory","夜行季Kettle背饰":"Nightlife Kettle Back Accessory","夜行季PaperboyCap发型":"Nightlife Paperboy Cap Hair","夜行季RaggedTunic裤子":"Nightlife Ragged Tunic","夜行季RaggedTunic鞋子":"Nightlife Ragged Tunic Shoes","夜行季Sash项链":"Nightlife Sash Necklace","夜行季植物":"Nightlife Plant","夜行季终极回忆书":"Nightlife Ultimate Memory Book","夜行季项链":"Nightlife Necklace","大吉":"Great Luck","大圆地毯":"Large Round Rug","大地壁画":"Earth Mural","大地毯":"Large Rug","大地裤":"Earth Pants","大提琴":"Cello","大提琴师小地毯":"Cellist Small Rug","大提琴师斗篷":"Cellist Cape","大提琴海报":"Cello Poster","大揪揪":"Big Bunches","大桔大利礼包":"Mandarin Good Fortune Pack","大概率会掉翼，但你不在乎 (´；ω；｀)":"You'll likely lose a wing, but you don't care (´；ω；｀)","大炮":"Cannon","大石浴缸":"Large Stone Bathtub","大篝火":"Large Campfire","大耳狗双人茶桌":"Cinnamoroll Tea Table for Two","大耳狗抱枕礼包":"Cinnamoroll Cushion Pack","大耳狗服饰礼包":"Cinnamoroll Outfit Pack","大耳狗装扮礼包":"Cinnamoroll Dress-Up Pack","大铁头":"Big Iron Head","大锅":"Cauldron","大鲲斗篷":"Great Ray Cape","天空气球":"Sky Balloon","失孤":"Lost Fawn","头饰":"Headwear","奉献斗篷礼包":"Devotion Cape Pack","奔离远行发型礼包":"Runaway Journey Hair Pack","奔离远行服饰礼包":"Runaway Journey Outfit Pack","奥利奥发箍":"Oreo Headband","奥利奥玩偶":"Oreo Plush","女巫":"Witch","女巫帽礼包":"Witch Hat Pack","女巫裙":"Witch Dress","女巫鞋":"Witch Shoes","奶牛猫":"Tuxedo","如果你还在犹豫，那就是不行 (｡•́︿•̀｡)":"If you're still hesitating, it's a no (｡•́︿•̀｡)","姆明围巾":"Moomin Scarf","姆明妈妈手作斗篷礼包":"Moominmamma Handmade Cape Pack","姆明季Bench背饰":"Moomin Bench Back Accessory","姆明季CellistBasic裤子":"Moomin Cellist Basic Pants","姆明季CellistBun发型":"Moomin Cellist Bun Hair","姆明季ClothDivider背饰":"Moomin Cloth Divider Back Accessory","姆明季Cup背饰":"Moomin Cup Back Accessory","姆明季Filigree面饰":"Moomin Filigree Face Accessory","姆明季PianistBasic裤子":"Moomin Pianist Basic Pants","姆明季PianistKnot发型":"Moomin Pianist Knot Hair","姆明季PianistSuit裤子":"Moomin Pianist Suit Pants","姆明季WallPosterConch背饰":"Moomin Wall Poster Conch Back Accessory","姆明季WrapSandals鞋子":"Moomin Wrap Sandals","姆明季红伞":"Moomin Red Umbrella","姆明季项链":"Moomin Necklace","姆明尾巴":"Moomin Tail","姆明帐篷":"Moomin Tent","姆明斗篷":"Moomin Cape","姆明玩偶":"Moomin Plush","姆明耳朵":"Moomin Ears","姆明饰品套装礼包":"Moomin Accessory Set Pack","嫦娥":"Chang'e","季节旗帜":"Seasonal Banner","季蜡位置":"Seasonal Candles","季蜡图还没加载好":"Seasonal candle map not loaded yet","学生头":"Student Cut","守卫斗篷":"Guard Cape","宜挂机，忌跑图 (￣▽￣)ノ":"Good for AFK, bad for grinding (￣▽￣)ノ","宝藏":"Treasure","宝藏猎人礼包":"Treasure Hunter Pack","宝骏丹心马尾礼包":"Fine Steed Ponytail Pack","宽石方块":"Wide Stone Block","寸头":"Buzz Cut","寻宝搭档礼包":"Treasure Buddy Pack","寻宝者旗帜":"Treasure Hunter Banner","封闭石箱":"Sealed Stone Chest","小兵":"Little Soldier","小凶":"Slight Jinx","小地毯":"Small Rug","小恶魔斗篷礼包":"Little Devil Cape Pack","小提琴":"Violin","小揪揪":"Small Bunches","小棉衣":"Padded Jacket","小橘子":"Little Tangerine","小浣熊斗篷":"Raccoon Cape","小海牛配饰礼包":"Manatee Accessories Pack","小狗周年头饰礼包":"Anniversary Puppy Headwear Pack","小狗拖鞋礼包":"Puppy Slippers Pack","小狗气球":"Puppy Balloon","小狗耳朵":"Puppy Ears","小王子发型":"Little Prince Hair","小王子围巾斗":"Little Prince Scarf Cape","小王子围巾礼包":"Little Prince Scarf Pack","小王子季Bandana发型":"Little Prince Bandana Hair","小王子季Brazier背饰":"Little Prince Brazier Back Accessory","小王子季Hoop背饰":"Little Prince Hoop Back Accessory","小王子季Jar背饰":"Little Prince Jar Back Accessory","小王子季Overalls鞋子":"Little Prince Overalls Shoes","小王子季PonytailDreads发型":"Little Prince Ponytail Dreads Hair","小王子季帐篷":"Little Prince Tent","小王子季火把":"Little Prince Torch","小王子季项链":"Little Prince Necklace","小王子小行星斗篷礼包":"Little Prince Asteroid Cape Pack","小王子星球斗篷":"Little Prince Planet Cape","小王子狐狸礼包":"Little Prince Fox Pack","小王子玫瑰":"Little Prince Rose","小石方块":"Small Stone Block","小石桌":"Small Stone Table","小石浴缸":"Small Stone Bathtub","小程序 · 国服 / 国际服礼包文字版与图片版":"Mini-program · CN / global pack lists (text & image)","小萌新玩偶":"Newbie Plush","小蝴蝶":"Little Butterfly","小锅盖":"Bowl Cut","小陈扇子":"Xiao Chen Fan","小飞象":"Dumbo","小鸟玩偶":"Birdie Plush","小黄鸭":"Duckling","小黄鸭发饰礼包":"Duckling Hairpiece Pack","小黄鸭玩偶服礼包":"Duckling Plush Costume Pack","小黄鸭雨衣":"Duckling Raincoat","小黄鸭雨衣套装礼包":"Duckling Raincoat Set Pack","小黑鸭头饰礼包":"Black Duckling Headwear Pack","尤克里里":"Ukulele","就现在，别犹豫 (๑˃̵ᴗ˂̵)":"Right now, don't hesitate (๑˃̵ᴗ˂̵)","展翅圆环":"Winged Halo","工装裤":"Cargo Pants","左右滑动":"Swipe left/right","左右滑动切换其它任务":"Swipe to switch quests","巫师":"Wizard","巫师帽":"Wizard Hat","巫树犄角礼包":"Witch Tree Antlers Pack","已保存 ovO":"Saved ovO","已复制":"Copied","已存入":"Deposited","已恢复自动日夜":"Auto day/night restored","已收获 ":"Hearts collected: ","已收集 ":"Collected ","已购 / 全部":"Owned / All","已购花费":"Owned Cost","希腊发型":"Greek Hair","帐篷":"Tent","帽发型":"Hat Hair","帽头饰":"Hat Headwear","帽毛绒头饰":"Hat Fluff Headwear","帽缎带头饰":"Hat Ribbon Headwear","帽羽毛发型":"Hat Feather Hair","帽羽毛头饰":"Hat Feather Headwear","平":"Neutral","年年有鱼礼包":"Fish of Fortune Pack","幸运亨通眼镜礼包":"Lucky Fortune Glasses Pack","幼鲲斗篷":"Young Ray Cape","幽兰斗篷":"Indigo Cape","床背饰":"Bed Back Accessory","开花尖刺发型":"Blooming Spikes Hair","异彩莲花斗篷礼包":"Iridescent Lotus Cape Pack","弦音抱月礼包":"Moonlute Serenade Pack","归属季Barrette发型":"Belonging Barrette Hair","归属季Samurai发型":"Belonging Samurai Hair","归属季Upstyle发型":"Belonging Upstyle Hair","归属季Victorian发型":"Belonging Victorian Hair","归属季项链":"Belonging Necklace","归巢季CargoShorts裤子":"Revival Cargo Shorts","归巢季CargoShorts鞋子":"Revival Cargo Shorts Shoes","归巢季DoubleBraidBack发型":"Revival Double Braid Back Hair","归巢季HeadTattoo发型":"Revival Head Tattoo Hair","归巢季Skull发型":"Revival Skull Hair","归巢季水晶罐":"Revival Crystal Jar","归巢季终极回忆书":"Revival Ultimate Memory Book","归巢季项链":"Revival Necklace","当前光翼等级":"Current Wing Level","当前穿搭":"Current Outfit","当前身高":"Current Height","当前身高: ":"Current height: ","彩旗烛台":"Bunting Candle Holder","彩染季Arms项链":"Dye Arms Necklace","彩染季Chandelier背饰":"Dye Chandelier Back Accessory","彩染季Invisible裤子":"Dye Invisible Pants","彩染季Onion发型":"Dye Onion Hair","彩染季Portrait背饰":"Dye Portrait Back Accessory","彩染季项链":"Dye Necklace","彩色丝球":"Colorful Silk Ball","彩色发带":"Colorful Headband","彩色发簇":"Colorful Hair Tufts","彩色披肩斗篷":"Colorful Shawl Cape","彩色风筝水母":"Kite Jellyfish","彩色风筝海牛":"Kite Manatee","彩色风筝海龟":"Kite Turtle","彩色风筝灯塔":"Kite Lighthouse","彩色风筝蝴蝶":"Kite Butterfly","彩色风筝金枪鱼王":"Kite Tuna King","彩色风筝鲲":"Kite Ray","彩虹":"Rainbow","彩虹帽":"Rainbow Cap","彩虹泡泡机礼包":"Rainbow Bubble Machine Pack","彩虹耳机":"Rainbow Headphones","彩虹耳机礼包":"Rainbow Headphones Pack","彩虹耳饰礼包":"Rainbow Earrings Pack","彩虹阔腿裤礼包":"Rainbow Wide-Leg Pants Pack","心心相印发饰礼包":"Linked Hearts Hairpiece Pack","心灵壁画":"Mind Mural","心里默念一个问题":"Think of a question","心里默念问题，翻开一页":"Think of a question, open a page","必胜客披萨面饰":"Pizza Hut Pizza Face Accessory","必胜客联动分享披萨背饰礼包":"Pizza Hut Sharing Pizza Back Accessory Pack","必胜客联动装扮礼包":"Pizza Hut Collab Outfit Pack","必胜客裤":"Pizza Hut Pants","必胜客项链":"Pizza Hut Necklace","总裁":"CEO","恶作剧飞行扫帚礼包":"Prank Flying Broom Pack","恶作剧鸦羽斗篷礼包":"Prank Crow Feather Cape Pack","悬挂面具":"Hanging Mask","情人小船礼包":"Lovers' Boat Pack","情人秋千礼包":"Lovers' Swing Pack","情人跷跷板礼包":"Lovers' Seesaw Pack","惊喜手杖礼包":"Surprise Cane Pack","想清楚再点，确认键不贵 (・∀・)":"Think before you tap — the confirm key is cheap (・∀・)","感恩季项链":"Gratitude Necklace","感恩斗篷":"Gratitude Cape","戳戳任务看大图 ovO":"Tap a quest to view it large ovO","手套":"Gloves","手拍":"Hand Clap","手持控制器":"Handheld Controller","手摇钟":"Hand Chime","手摇铃":"Hand Bell","手碟":"Handpan","打开光遇 → 右上角设置 → 精灵 → 身材分享二维码，扫码即可测出身高与穿搭":"Open Sky → Settings (top right) → Guide → Body Share QR code, then scan to get height and outfit","扫一扫，量身高":"Scan to measure your height","扫不了码？手动粘贴二维码内容":"Can't scan? Paste the QR code content manually","扫帚":"Broom","扫描中 ":"Scanning ","扫描失败：":"Scan failed: ","扫码测身高 · 看穿搭 · 存记录":"Scan to measure height · view outfits · keep records","折叠布":"Folded Cloth","护林员面饰":"Ranger Face Accessory","抽 个 签":"Draw","拇指琴":"Kalimba","拼图压力板":"Puzzle Pressure Plate","拼图盒":"Puzzle Box","拼图笼":"Puzzle Cage","拼图箱":"Puzzle Chest","拼图钥匙":"Puzzle Key","拾光季FluffyRuff项链":"Passage Fluffy Ruff Necklace","拾光季SideFade发型":"Passage Side Fade Hair","拾光季Spiky发型":"Passage Spiky Hair","拾光季球":"Passage Ball","拾光季项链":"Passage Necklace","挂肩外袍礼包":"Shoulder-Draped Robe Pack","指甲盖":"Fingernail","挑战代币":"Challenge Token","挑战球分配器":"Challenge Ball Dispenser","换个搭子，答案会不一样 (￣ω￣)":"Switch partners and the answer changes (￣ω￣)","换个方向试试，比如雨林 (・∀・)":"Try another direction — maybe Hidden Forest (・∀・)","排箫":"Pan Flute","探宝翎羽帽礼包":"Treasure Hunter Plume Hat Pack","接口只返回了贴纸图":"The API only returned a sticker image","接口返回内容为空":"The API returned empty content","搓澡巾":"Bath Mitt","搜礼包名，如：斗篷 / 玉兔":"Search pack name, e.g. cape / rabbit","摄像头启动失败：":"Camera failed to start: ","摄像头已开启，对准二维码扫描":"Camera on — aim at the QR code","摄像头扫码":"Camera Scan","摇一摇，看看今天的光遇运势":"Shake to see today's Sky fortune","摸小猫":"Pet the Cat","收起手动输入":"Hide Manual Input","攻略图还没加载好":"Guide image not loaded yet","放心飞，风会接住你 (´ω｀)":"Fly with ease — the wind will catch you (´ω｀)","放手吧，前面还有更好的 (´；ω；｀)":"Let it go — better things are ahead (´；ω；｀)","数值超出范围":"Value out of range","数据中未找到身高字段":"No height field found in data","数据为空":"Empty data","数据格式异常":"Unexpected data format","数据格式无法识别":"Unrecognized data format","文案已复制，快去分享吧！":"Text copied — go share it!","文雀装扮礼包":"Sparrow Outfit Pack","斗篷":"Cape","斗篷翅膀斗篷":"Cape Wings Cape","斜刘海":"Side Bangs","斜太":"Side-Swept Shota","斜毛":"Side Fluff","新春福娃礼包":"New Year Lucky Doll Pack","方舟":"Forgotten Ark","旁乔斗篷":"Pang Qiao Cape","旋转木马":"Carousel","无":"None","无人机相机":"Drone Camera","无法创建画布，请更换浏览器重试":"Canvas unavailable — try another browser","日一二三四五六":"SMTWTFS","日光坡道":"Sunlight Ramp","日光帽头饰":"Sun Hat Headwear","日光帽眼镜头饰":"Sun Hat & Shades Face Accessory","日光披肩斗篷":"Sunlight Shawl Cape","日光水母套装礼包":"Sunlight Jellyfish Set Pack","日光沙堡A":"Sunlight Sandcastle A","日光沙堡B":"Sunlight Sandcastle B","日光沙堡C":"Sunlight Sandcastle C","日光沙堡D":"Sunlight Sandcastle D","日光沙堡E":"Sunlight Sandcastle E","日光沙堡F":"Sunlight Sandcastle F","日光沙堡G":"Sunlight Sandcastle G","日光耳环礼包":"Sunlight Earrings Pack","日光背饰":"Sunlight Back Accessory","日光裙裤子":"Sunlight Skirt","日光裤子":"Sunlight Pants","日光面具面具":"Sun Mask","日光鞋子":"Sunlight Shoes","日号角耳饰":"Sun Horn Earrings","日帽头饰":"Sun Hat Headwear","日眼镜面具面饰":"Shades Mask Face Accessory","日程家具":"Daily Furniture","日背饰":"Sun Back Accessory","日落队斗篷":"Team Sunset Cape","日面具面饰":"Sun Mask Face Accessory","时光季毕业相机":"Moments Graduation Camera","时尚火焰墨镜礼包":"Trendy Flame Shades Pack","时尚爱心墨镜礼包":"Trendy Heart Shades Pack","时尚牛仔裤":"Fashion Jeans","时钟":"Clock","明制帽":"Ming-Dynasty Hat","明天":"Tomorrow","明日任务":"Tomorrow's Quests","明日季蜡：":"Tomorrow's seasonal candles: ","星光奖奖杯":"Starlight Trophy","星发型":"Star Hair","星号角耳饰":"Star Horn Earrings","星夜伞礼包":"Starry Night Umbrella Pack","星夜披风套装礼包":"Starry Night Cloak Set Pack","星日号角眼镜面饰":"Star Sun Horn Shades Face Accessory","星星灯":"Star Lamp","星月发饰":"Star & Moon Hairpiece","星月头冠礼包":"Star & Moon Crown Pack","星月耳环礼包":"Star & Moon Earrings Pack","星期":"Week","星河烂漫礼包":"Galaxy Romance Pack","星流面具礼包":"Stardust Mask Pack","星空斗篷":"Starry Cape","星背饰":"Star Back Accessory","星面具面具":"Star Mask","星项链":"Star Necklace","春联海报":"Spring Couplets Poster","春节扇子":"Spring Festival Fan","春节旋转木马":"Spring Festival Carousel","春节画师裤":"Spring Festival Painter Pants","昨天":"Yesterday","昨日任务":"Yesterday's Quests","是的 (´｡• ᵕ •｡`)":"Yes (´｡• ᵕ •｡`)","晃悠悠":"Wobble","晨岛":"Isle of Dawn","晨岛长老发型":"Isle Elder Hair","晶翼斗篷":"Crystal Wing Cape","暂无今日长图":"No image for today yet","暂无可保存的图片":"No image to save","暂无可查看的图片":"No image to view","暂无可用长图":"No image available","暂无季蜡图":"No seasonal candle map yet","暂无已收集记录":"No collection records yet","暂无数据":"No data","暂时没拿到明天的任务，点上方「明天」可重试":"Couldn't fetch tomorrow's quests — tap \"Tomorrow\" above to retry","暖冬围巾斗篷礼包":"Warm Winter Scarf Cape Pack","暖冬夹棉斗篷礼包":"Warm Winter Padded Cape Pack","暖冬瑞雪礼包":"Warm Winter Snow Pack","暖冬绒绒礼包":"Warm Winter Fluff Pack","暗壁画":"Dark Mural","暗彩装扮礼包":"Dark Color Outfit Pack","暗影斗篷":"Shadow Cape","暗植斗篷":"Shade Plant Cape","暗袍裤子":"Dark Robe Pants","暗裤子":"Dark Pants","暗陨斗篷礼包":"Fallen Dark Cape Pack","暗黑武士裤":"Dark Samurai Pants","暮土":"Golden Wasteland","暮土一次过，冥龙今天在打瞌睡 (´｡• ᵕ •｡`)":"Clear Golden Wasteland in one go — the krill are napping today (´｡• ᵕ •｡`)","暮土号角":"Wasteland Horn","暴风眼":"Eye of Eden","暴风眼今日风大，翼少的先别去 (´；ω；｀)":"Strong winds at Eye of Eden — low-winged players, stay away for now (´；ω；｀)","暹罗猫":"Siamese","更多攻略":"More Guides","更新于 ":"Updated at ","最矮可达":"Min possible","最矮身高: ":"Min height: ","最高可达":"Max possible","最高身高: ":"Max height: ","月光斗篷":"Moonlight Cape","月光背饰":"Moonlight Back Accessory","月光裙裤子":"Moonlight Skirt","月华霓裳礼包":"Moonlight Gown Pack","月灯笼光背饰":"Moon Lantern Back Accessory","木沙滩椅":"Wooden Beach Chair","木琴":"Xylophone","未知物品":"Unknown item","未知错误":"Unknown error","未识别到二维码，请确保图片清晰完整，或手动粘贴二维码内容":"No QR code found — make sure the image is clear and complete, or paste the code content manually","本周家具":"This Week's Furniture","本期复刻已结束":"This return visit has ended","本期复刻已结束，等待下次新复刻":"This return visit has ended — wait for the next one","本期已结束":"Ended","杏花":"Apricot Blossom","杏花斗篷":"Apricot Blossom Cape","条纹中地毯":"Striped Medium Rug","极矮型":"Extra Small","极高型":"Extra Tall","枕头":"Pillow","林克":"Link","枯萎斗篷":"Withered Cape","染色季斗篷":"Dye Season Cape","染色连体衣":"Dye Jumpsuit","查询":"Search","查询中":"Searching","查询于 ":"Checked at ","查询指引":"How to Check","标准型":"Standard","树拱门":"Tree Arch","树木画作":"Tree Painting","树杈杈":"Tree Branch","树精肩饰礼包":"Dryad Shoulder Piece Pack","树苗":"Sapling","栗子帽":"Chestnut Hat","桂冠":"Laurel","桂花发饰":"Osmanthus Hairpiece","桌子":"Table","桌背饰":"Table Back Accessory","梦想季Braid发型":"Dreams Braid Hair","梦想季Dundun背饰":"Dreams Dundun Back Accessory","梦想季项链":"Dreams Necklace","梳妆台":"Dressing Table","棉花糖":"Marshmallow","棉花糖棍":"Marshmallow Stick","椅背饰":"Chair Back Accessory","樱花":"Cherry Blossom","樱花斗篷":"Cherry Blossom Cape","橘猫":"Orange Tabby","橙色之爱斗篷":"Orange Love Cape","次":"","欧若拉之声":"Voice of AURORA","欧若拉之声礼包":"Voice of AURORA Pack","欧若拉之翼":"AURORA Wings","欧若拉之翼礼包":"AURORA Wings Pack","欧若拉季项链":"AURORA Necklace","欧若拉斗篷":"AURORA Cape","歇一会儿":"Take a Break","正在加载…":"Loading…","正在扫描二维码…":"Scanning QR code…","正在摇签…":"Shaking the stick…","正在获取明天的任务…":"Fetching tomorrow's quests…","正在解析…":"Parsing…","正在读取光翼数据…":"Reading wing data…","正在读取图片…":"Reading image…","正在读取数据…":"Reading data…","正太":"Shota","武士裤":"Samurai Pants","每日任务":"Daily Quests","比赛螃蟹石":"Race Crab Stone","毛绒斗篷":"Plush Cape","毛绒裤子":"Plush Pants","毛绒飞蛾鞋":"Plush Moth Shoes","毛领":"Fur Collar","气球":"Balloon","气球拱门":"Balloon Arch","水发型":"Water Hair","水壁画":"Water Mural","水帽面纱头饰":"Water Hat Veil Headwear","水晶心帽头饰":"Crystal Heart Hat Headwear","水晶裙裤子":"Crystal Skirt","水晶裤子":"Crystal Pants","水桶":"Bucket","水母头":"Jellyfish Head","水母斗篷":"Jellyfish Cape","水母气球":"Jellyfish Balloon","水母鱼项链":"Jellyfish Fish Necklace","水波斗篷":"Ripple Cape","水面具面具":"Water Mask","永久翼":"Permanent Wings","沙滩球":"Beach Ball","沙漏斗篷":"Hourglass Cape","没找到匹配的礼包":"No matching packs","没查到这个 ID 的数据，请确认短 ID 是否填对":"No data for this ID — double-check the Short ID","法师斗篷":"Mage Cape","泡泡机":"Bubble Machine","洛神":"Luo Goddess","活力海牛礼包":"Lively Manatee Pack","流动斗篷":"Flowing Cape","流星斗篷":"Meteor Cape","浪漫流星斗篷礼包":"Romantic Meteor Cape Pack","海沫鞋":"Seafoam Shoes","海洋":"Ocean","海洋斗":"Ocean Cape","海洋灯":"Ocean Lamp","海洋项链":"Ocean Necklace","海浪斗篷":"Wave Cape","海浪裤":"Wave Pants","海灵套装礼包":"Sea Spirit Set Pack","海牛":"Manatee","海牛尾巴":"Manatee Tail","海牛玩偶":"Manatee Plush","海牛玩偶礼包":"Manatee Plush Pack","海牛耳朵":"Manatee Ears","海牛雕像":"Manatee Statue","海盗":"Pirate","海蓝波浪发型礼包":"Sea-Blue Waves Hair Pack","海龟斗篷":"Turtle Cape","海龟斗篷礼包":"Turtle Cape Pack","海龟面具面具":"Turtle Mask","深渊斗篷":"Abyss Cape","清单与价格为参考值（BWiki 礼包图鉴，2019-2026 共 ":"Checklist and prices are for reference (BWiki pack catalog, 2019-2026, ","清单自算 + 查询指引":"Checklist + Guide","清空":"Clear","清空历史":"Clear History","清空已选":"Clear Selected","清香粽叶礼包":"Fresh Zongzi Leaf Pack","渐变双马尾发型礼包":"Gradient Twin Tails Pack","温暖绒帽礼包":"Warm Fluffy Hat Pack","游泳圈":"Swim Ring","游离斗篷":"Drifting Cape","满月耳坠礼包":"Full Moon Ear Pendants Pack","满月耳环":"Full Moon Earrings","潜海季GradientTunic裤子":"Voyage Gradient Tunic","潜海季RuffledLong发型":"Voyage Ruffled Long Hair","潜海季毕业斗篷":"Voyage Graduation Cape","潜海季流苏斗篷":"Voyage Fringe Cape","潜海季项链":"Voyage Necklace","潮汐套装礼包":"Tide Set Pack","潮流连帽斗篷礼包":"Trendy Hooded Cape Pack","火号角耳饰":"Fire Horn Earrings","火心背饰":"Fire Heart Back Accessory","火炬":"Torch","火焰墨镜":"Flame Sunglasses","火焰壁画":"Flame Mural","火焰法术":"Flame Spell","火焰裤":"Flame Pants","火盆":"Fire Pit","灯":"Lamp","灯光栅栏":"Lit Fence","灯笼":"Lantern","灯笼柱":"Lantern Post","灯笼礼包":"Lantern Pack","灯笼裤":"Lantern Pants","点击图片可全屏查看":"Tap image for fullscreen","点击图片可新窗口打开，长按可保存":"Tap image to open in a new tab, long-press to save","点击放大":"Tap to enlarge","点击查看":"Tap to view","烟花棒":"Sparkler","烟花节烟花棒":"Fireworks Festival Sparkler","然后翻开这一页":"then open this page","熊发型":"Bear Hair","熊号角耳饰":"Bear Horn Earrings","熊雪背饰":"Bear Snow Back Accessory","熊面具面具":"Bear Mask","燕尾斗篷":"Swallowtail Cape","爆炸头":"Afro","爆米花":"Popcorn","爱丽丝围裙套装礼包":"Alice Apron Set Pack","爱丽丝小门":"Alice's Little Door","爱之船":"Love Boat","爱哥":"Ai-kun","爱心墨镜":"Heart Sunglasses","爱神":"Cupid","爱酱":"Ai-chan","爱面饰":"Heart Face Accessory","牧羊杖":"Shepherd's Staff","牵手好友必有回响，今日宜双人跑图 (๑•̀ㅂ•́)و✧":"Hold a friend's hand and it echoes back — great day for duo runs (๑•̀ㅂ•́)و✧","狂欢季KnotBun发型":"Carnival Knot Bun Hair","狂欢季LongHood发型":"Carnival Long Hood Hair","狂欢季Piccolo背饰":"Carnival Piccolo Back Accessory","狂欢季Pleated裤子":"Carnival Pleated Pants","狂欢季ShortJacket裤子":"Carnival Short Jacket Pants","狂欢季项链":"Carnival Necklace","狐狸玩偶":"Fox Plush","狮子发型":"Lion Hair","狼人女巫斗篷":"Werewolf Witch Cape","狼尾":"Wolf Tail","猫":"Cat","猫猫":"Kitty","猫面具面具":"Cat Mask","献瑞折扇礼包":"Auspicious Folding Fan Pack","献祭":"Eden","玉兔头饰":"Jade Rabbit Headpiece","玉兔尾巴":"Jade Rabbit Tail","玉兔拖鞋礼包":"Jade Rabbit Slippers Pack","玉兔礼包":"Jade Rabbit Pack","玉桂狗斗篷":"Cinnamoroll Cape","玉桂狗玩偶":"Cinnamoroll Plush","玩":"Play","玫瑰":"Rose","玫瑰背饰":"Rose Back Accessory","玫瑰褶边斗篷礼包":"Rose Frill Cape Pack","玫瑰面具面具":"Rose Mask","珊瑚礁":"Coral Reef","球赛礼包":"Ball Game Pack","琅骏启岁长裙礼包":"Jade Steed New Year Gown Pack","琴师小地毯":"Musician Small Rug","琴师斗篷":"Musician Cape","琵琶":"Pipa","瑞雪斗篷":"Auspicious Snow Cape","生成中…":"Generating…","生成分享图":"Share Image","生成失败，请重试":"Generation failed, please retry","生成超时，请重试":"Timed out, please retry","生日彩旗":"Birthday Bunting","田野画作":"Field Painting","电吉他":"Electric Guitar","电贝斯":"Electric Bass","画灵":"Painted Spirit","画笔披肩斗篷":"Paintbrush Shawl Cape","留言板":"Message Board","疯女巫长裙礼包":"Mad Witch Gown Pack","疯帽":"Mad Hatter","白吉他":"White Guitar","白枭":"White Owl","白棉裤":"White Cotton Pants","白绒斗篷":"White Velvet Cape","白色裤子":"White Pants","白色风之旅人":"Journey (White)","白色龙项链":"White Dragon Necklace","白菇":"White Mushroom","白金":"White & Gold","白金棉":"White & Gold Cotton","白鸟":"Whitebird","白鸟斗篷":"Whitebird Cape","皇冠气球":"Crown Balloon","皮皮猫套装礼包":"Pipi Cat Set Pack","皮皮猫玩偶":"Pipi Cat Plush","皮皮猫礼包":"Pipi Cat Pack","皮皮猫肩饰礼包":"Pipi Cat Shoulder Piece Pack","皮皮猫装扮礼包":"Pipi Cat Outfit Pack","盘龙围巾斗篷礼包":"Coiled Dragon Scarf Cape Pack","相册图片识别":"Scan from Album","相机":"Camera","盾牌":"Shield","盾牌斗篷":"Shield Cape","看整张攻略图":"View full guide image","眼罩":"Eye Patch","眼镜面饰":"Glasses Face Accessory","短 ID 查收集进度":"Check progress by Short ID","短马尾":"Short Ponytail","矮 ":"Shorter by ","矮人型":"Small","石":"Shard","石人体模型":"Stone Mannequin","石凳":"Stone Stool","石厨房抽屉":"Stone Kitchen Drawer","石厨房柜":"Stone Kitchen Cabinet","石厨房炉灶":"Stone Kitchen Stove","石厨房烤箱":"Stone Kitchen Oven","石双人沙发":"Stone Loveseat","石壁杯架":"Stone Wall Cup Rack","石壁架":"Stone Wall Shelf","石壁毛巾架":"Stone Wall Towel Rack","石壁灯":"Stone Wall Lamp","石壁锅架":"Stone Wall Pot Rack","石壁镜":"Stone Wall Mirror","石控制台":"Stone Console","石桌":"Stone Table","石椅":"Stone Chair","石水槽":"Stone Sink","石沙发(侧)":"Stone Sofa (Side)","石沙发(角)":"Stone Sofa (Corner)","石花架":"Stone Flower Stand","石茶几":"Stone Coffee Table","石长凳":"Stone Bench","砖块":"Bricks","破晓季CurlyLong发型":"Shattering Curly Long Hair","破晓季DancerSkirt裤子":"Shattering Dancer Skirt","破晓季HeadWrap发型":"Shattering Head Wrap Hair","破晓季JesterHood发型":"Shattering Jester Hood Hair","破晓季ShadowHood发型":"Shattering Shadow Hood Hair","破晓季项链":"Shattering Necklace","破洞斗篷":"Ripped Cape","确定":"OK","确定清空全部历史记录吗？":"Clear all history records?","礼":"Pack","礼包明细数据在游戏服务器里，目前没有免费公开接口能在网页直接查。\n":"Gift purchase data lives on the game server — no free public API can query it on the web yet.\n","礼包查询":"Gift Packs","礼帽":"Top Hat","祖":"Spirit","神鹿祝福头饰礼包":"Sacred Deer Blessing Headwear Pack","祥云瑞气服饰礼包":"Auspicious Cloud Outfit Pack","祥云瑞气纸伞":"Auspicious Cloud Paper Umbrella","祥云瑞气纸伞礼包":"Auspicious Cloud Paper Umbrella Pack","禁阁":"Vault of Knowledge","禁阁及肩长发":"Vault Shoulder-Length Hair","禁阁长发":"Vault Long Hair","福运植物":"Fortune Plant","福运鼓":"Fortune Drum","秋千":"Swing","秘宝坠饰斗篷礼包":"Secret Treasure Pendant Cape Pack","空石箱":"Empty Stone Chest","窗帘":"Curtain","立式钢琴":"Upright Piano","立式钢琴礼包":"Upright Piano Pack","竖琴":"Harp","竞速门":"Race Gate","端午裤":"Dragon Boat Festival Pants","笔记本电脑":"Laptop","笛子":"Flute","第":"#","筑巢季Coat裤子":"Nesting Coat","筑巢季HunterBun发型":"Nesting Hunter Bun Hair","筑巢季RoyalBun发型":"Nesting Royal Bun Hair","筑巢季SilkRaiment裤子":"Nesting Silk Raiment","筑巢季Turban发型":"Nesting Turban Hair","筑巢季篮子":"Nesting Basket","筑巢季项链":"Nesting Necklace","答案之书":"Book of Answers","答案在雨林隐藏图里哦 (｡•́︿•̀｡)":"The answer lies in the Hidden Forest (｡•́︿•̀｡)","答案是肯定的，只是你不敢信 (๑•̀ㅂ•́)و✧":"The answer is yes — you just dare not believe it (๑•̀ㅂ•́)و✧","签":"Sign","算":"Calc","管道":"Pipe","箬笠":"Bamboo Hat","箱背饰":"Chest Back Accessory","篝火":"Campfire","簇羽":"Feather Cluster","粉色毛毯":"Pink Blanket","粗辫":"Thick Braid","粘贴 https://sky.thatg.co/o=... 或原始二维码字符串":"Paste a https://sky.thatg.co/o=... link or the raw QR string","粽叶吊床":"Zongzi-Leaf Hammock","粽子发饰礼包":"Zongzi Hairpiece Pack","粽香蒸笼礼包":"Zongzi Steamer Pack","精灵鸟斗篷":"Sprite Bird Cape","糕点短发":"Pastry Short Hair","系带斗篷":"Laced Cape","紧卷发":"Tight Curls","紫框眼镜礼包":"Purple Frame Glasses Pack","紫水晶":"Amethyst","紫色大伞":"Purple Parasol","紫色眼镜面饰":"Purple Glasses Face Accessory","紫藤花斗篷":"Wisteria Cape","紫藤茶桌":"Wisteria Tea Table","紫蝙斗篷":"Purple Bat Cape","紫金斗篷":"Purple & Gold Cape","红棉":"Red Cotton","红狐狸":"Red Fox","红石":"Red Shard","红石天气":"Shard Weather","红绒斗篷":"Red Velvet Cape","红耳机":"Red Headphones","红脸蛋":"Rosy Cheeks","红色发型":"Red Hair","红色号角羽毛头饰":"Red Horn Feather Headwear","红色帽蝴蝶结头饰":"Red Hat Bow Headwear","红色斗篷":"Red Cape","红色竖琴发型":"Red Harp Hair","红色背饰":"Red Back Accessory","红色芭蕾鞋":"Red Ballet Shoes","红色裙缎带裤子":"Red Skirt Ribbon Pants","红色裙裤子":"Red Skirt","红色裤子":"Red Pants","红色面具面具":"Red Mask","红金":"Red & Gold","红金斗篷":"Red & Gold Cape","纤云弄巧礼包":"Silken Clouds Pack","纸船":"Paper Boat","线框斗篷":"Wireframe Cape","线框斗篷礼包":"Wireframe Cape Pack","织光季AntlerHelm面饰":"Lightweave Antler Helm Face Accessory","织光季BlossomTea背饰":"Lightweave Blossom Tea Back Accessory","织光季Bonnet发型":"Lightweave Bonnet Hair","织光季Clogs鞋子":"Lightweave Clogs","织光季Father发型":"Lightweave Father Hair","织光季JellyShorts裤子":"Lightweave Jelly Shorts","织光季MigrationBell背饰":"Lightweave Migration Bell Back Accessory","织光季PaintingHouse背饰":"Lightweave Painted House Back Accessory","织光季PaintingPortrait背饰":"Lightweave Painted Portrait Back Accessory","织光季毕业礼":"Lightweave Graduation Gift","织光季项链":"Lightweave Necklace","绊爱":"Kizuna AI","经典光线斗篷":"Classic Lightbeam Cape","经典袜子":"Classic Socks","经典裙子":"Classic Skirt","经典裤子":"Classic Pants","经典钻石斗篷":"Classic Diamond Cape","经典项链":"Classic Necklace","绒毛斗篷":"Fluffy Cape","绒边斗篷":"Fur-Trim Cape","绘彩面具礼包":"Painted Mask Pack","绝对不行 (＞﹏＜)":"Absolutely not (＞﹏＜)","绷带耳饰":"Bandage Earrings","绿丝带":"Green Ribbon","绿色屏风":"Green Screen","绿色斗篷":"Green Cape","绿色袍裤子":"Green Robe Pants","绿色裤子":"Green Pants","绿芽斗篷":"Green Sprout Cape","绿茸茸卷耳发饰礼包":"Green Curly Ear Hairpiece Pack","缀黄画笔发箍礼包":"Yellow Paintbrush Headband Pack","缁衣斗篷":"Black Robe Cape","缎带发型":"Ribbon Hair","缎带斗篷":"Ribbon Cape","缎带背饰":"Ribbon Back Accessory","缎带裙斗篷":"Ribbon Skirt Cape","缎带裤子":"Ribbon Pants","缎带鞋子":"Ribbon Shoes","缎带项链":"Ribbon Necklace","缤纷飘带斗篷礼包":"Colorful Streamer Cape Pack","网络异常":"Network error","网络异常或接口暂时不可用，请稍后再试":"Network error or API unavailable — try again later","网络异常，请重试":"Network error, please retry","羊角辫":"Ram-Horn Braids","美术集":"Art Portfolio","美术集2":"Art Portfolio 2","翅膀斗篷":"Wing Cape","翅膀毛绒斗篷":"Wing Fluff Cape","翻开答案之书":"Open the Book of Answers","翼":"W","耳坠":"Ear Pendants","耳饰":"Earrings","肯德基爷爷裤":"KFC Colonel Pants","肯德基爷爷鞋":"KFC Colonel Shoes","肯德基爷爷项链":"KFC Colonel Necklace","肯德基联动礼包":"KFC Collab Pack","背带裤":"Overalls","背饰":"Back Accessory","胜利旗帜-雨":"Victory Banner - Rain","胜利旗帜-黄昏":"Victory Banner - Dusk","脏辫":"Dreadlocks","自己算礼包":"Self Checklist","自然之声礼包":"Voice of Nature Pack","自然旗帜":"Nature Banner","自然漂浮发型":"Nature Floating Hair","自然瀑布斗篷":"Nature Waterfall Cape","自然蛤壳":"Nature Clamshell","自然雕塑A":"Nature Sculpture A","自然雕塑B":"Nature Sculpture B","自然雕塑C":"Nature Sculpture C","致梵高ChallengePlatform背饰":"Van Gogh Challenge Platform Back Accessory","致梵高ChallengeTarget背饰":"Van Gogh Challenge Target Back Accessory","致梵高Romper裤子":"Van Gogh Romper","致梵高RuffledCollar项链":"Van Gogh Ruffled Collar Necklace","致梵高WaistCoat裤子":"Van Gogh Waistcoat","致梵高季项链":"Van Gogh Necklace","致爱装扮礼包":"Tribute to Love Outfit Pack","舞狮发型":"Lion Dance Hair","舰长斗篷":"Captain's Cape","节日外套":"Festival Coat","节日暖腿套":"Festival Leg Warmers","芭蕾平底鞋":"Ballet Flats","花号角头饰":"Flower Horn Headwear","花帽头饰":"Flower Hat Headwear","花憩茶桌礼包":"Flower Tea Table Pack","花拱门":"Flower Arch","花日发型":"Flower Day Hair","花日号角帽头饰":"Flower Day Horn Hat Headwear","花日号角耳饰":"Flower Day Horn Earrings","花日地毯背饰":"Flower Day Rug Back Accessory","花日帽头饰":"Flower Day Hat Headwear","花日翅膀斗篷":"Flower Day Wing Cape","花日背饰":"Flower Day Back Accessory","花日花瓶背饰":"Flower Day Vase Back Accessory","花日裙裤子":"Flower Day Skirt","花日裤子":"Flower Day Pants","花日项链":"Flower Day Necklace","花环":"Flower Wreath","花环长发":"Wreath Long Hair","花瓣斗篷":"Petal Cape","花瓣领斗":"Petal-Collar Cape","花瓶背饰":"Vase Back Accessory","花色":"Coat","花钿素纱礼包":"Floral Gauze Pack","茶杯":"Teacup","茶桌":"Tea Table","草原队斗篷":"Team Meadow Cape","荒原斗篷":"Wasteland Cape","荷叶伞礼包":"Lotus-Leaf Umbrella Pack","荷叶雨伞":"Lotus-Leaf Umbrella","莫西干发型":"Mohawk","莲华拂影礼包":"Lotus Shadow Pack","莲花号角头饰":"Lotus Horn Headwear","莲花浴缸":"Lotus Bathtub","萌新玩偶礼包":"Newbie Plush Pack","萨克斯":"Saxophone","蒸笼":"Steamer","蓝海龟斗":"Blue Turtle Cape","蓝色发型":"Blue Hair","蓝色围巾":"Blue Scarf","蓝色围巾项链":"Blue Scarf Necklace","蓝色守护帽礼包":"Blue Guardian Hat Pack","蓝色屏风":"Blue Screen","蓝色帽毛绒头饰":"Blue Hat Fluff Headwear","蓝色帽缎带头饰":"Blue Hat Ribbon Headwear","蓝色帽蝴蝶结头饰":"Blue Hat Bow Headwear","蓝色日眼镜面具面饰":"Blue Shades Mask Face Accessory","蓝色毛毯":"Blue Blanket","蓝色翅膀斗篷":"Blue Wing Cape","蓝色翅膀面饰":"Blue Wing Face Accessory","蓝色裤子":"Blue Pants","蓬松发型":"Fluffy Hair","蓬松裙":"Fluffy Dress","蔚蓝斗篷":"Azure Cape","蔡徐坤":"Cai Xukun","薄纱披肩斗篷":"Gauze Shawl Cape","虚空法术":"Void Spell","虚荣":"Vanity","蛇年福运发型":"Year of the Snake Fortune Hair","蛇年福运裤":"Year of the Snake Fortune Pants","蛊师":"Gu Sorcerer","蛋糕":"Cake","蛛丝斗篷礼包":"Spider Silk Cape Pack","蛛网":"Spider Web","蛛网斗篷礼包":"Spider Web Cape Pack","蛛网朋克礼包":"Spider Web Punk Pack","蜘蛛":"Spider","蜘蛛斗":"Spider Cape","蜘蛛精":"Spider Spirit","蜘蛛翅膀斗篷":"Spider Wing Cape","蜘蛛面具面具":"Spider Mask","蜡":"Candle","蜡烛光背饰":"Candlelight Back Accessory","蜡烛背饰":"Candle Back Accessory","蝙蝠斗":"Bat Cape","蝙蝠背饰":"Bat Back Accessory","蝙蝠面具面具":"Bat Mask","蝴蝶与花发饰礼包":"Butterfly & Flower Hairpiece Pack","蝴蝶号角头饰":"Butterfly Horn Headwear","蝴蝶斗篷":"Butterfly Cape","蝴蝶结":"Bowknot","蝴蝶结发型":"Bowknot Hair","蝴蝶结项链":"Bowknot Necklace","蝴蝶背饰":"Butterfly Back Accessory","蝴蝶鞋子":"Butterfly Shoes","螃蟹号角头饰":"Crab Horn Headwear","螃蟹号角面饰":"Crab Horn Face Accessory","螃蟹币":"Crab Coin","螃蟹气球":"Crab Balloon","螃蟹浮具":"Crab Float","螃蟹玩偶":"Crab Plush","螃蟹翅膀斗篷":"Crab Wing Cape","螃蟹背饰":"Crab Back Accessory","螃蟹蝴蝶结项链":"Crab Bow Necklace","螃蟹金背饰":"Golden Crab Back Accessory","螃蟹面具面具":"Crab Mask","螃蟹项链":"Crab Necklace","衔福献瑞礼包":"Bearing Fortune Pack","表演季LongBraids发型":"Performance Long Braids Hair","表演季TattooBraids发型":"Performance Tattoo Braids Hair","表演季Tunic裤子":"Performance Tunic","表演季项链":"Performance Necklace","衫裤子":"Shirt Pants","袍裤子":"Robe Pants","袍鞋子":"Robe Shoes","装饰杯":"Decorative Cup","装饰枕头A":"Decor Pillow A","装饰枕头B":"Decor Pillow B","裙背饰":"Skirt Back Accessory","裙裤子":"Skirt","裤子":"Pants","裤裤子":"Pants","西装裤":"Suit Pants","解析":"Parse","解析失败: ":"Parse failed: ","解析失败：":"Parse failed: ","解析成功！当前身高 ":"Parsed! Current height ","计算器":"Calculator","记忆水晶礼包":"Memory Crystal Pack","设计发型":"Designer Hair","诅咒贴纸":"Cursed Sticker","诡趣魔法帽礼包":"Whimsy Wizard Hat Pack","请先粘贴二维码内容":"Paste the QR code content first","请长按图片保存":"Long-press the image to save","贝壳发夹礼包":"Seashell Hair Clip Pack","贝壳发饰":"Seashell Hairpiece","贝雷帽":"Beret","贪吃蛇头":"Snake Head","贵族":"Noble","超凡风之旅人礼包":"Journey Deluxe Pack","足力健":"Grippy Slippers","跃动跑鞋礼包":"Bouncy Running Shoes Pack","距刷新":"Refresh in","跷跷板":"Seesaw","身高参数":"Height Parameter","身高参数: ":"Height parameter: ","身高测量":"Height Meter","躺椅":"Deck Chair","轻轻一摸，爱心 +1":"A gentle touch, +1 heart","轻轻摸摸它，爱心 +1":"Pet it gently, +1 heart","迁徒季项链":"Migration Necklace","迁徙季CaretakerHood发型":"Migration Caretaker Hood Hair","迁徙季Caretaker裤子":"Migration Caretaker Pants","迁徙季FluffyManatee发型":"Migration Fluffy Manatee Hair","迁徙季Guard裤子":"Migration Guard Pants","迁徙季Herder裤子":"Migration Herder Pants","迁徙季OldMan裤子":"Migration Old Man Pants","迁徙季PlantVine背饰":"Migration Plant Vine Back Accessory","迁徙季Poster背饰":"Migration Poster Back Accessory","迁徙季Projector背饰":"Migration Projector Back Accessory","迁徙季Spear背饰":"Migration Spear Back Accessory","迁徙季TeaStall背饰":"Migration Tea Stall Back Accessory","迁徙季圆框":"Migration Round Frame","这一天暂无任务":"No quests on this day","这一天没有本地存档（应用每天首次打开时会自动存档）":"No local archive for this day (the app auto-saves on first open each day)","这件斗篷你值得拥有 (｡•̀ᴗ-)✧":"That cape is worth having (｡•̀ᴗ-)✧","这次真的可以 (๑˃̵ᴗ˂̵)":"This time it really works (๑˃̵ᴗ˂̵)","这里是冰块呀ovo":"Sky Guide · IceBlock ovo","进行乐队发型":"Marching Band Hair","进行曲制服礼包":"Marching Band Uniform Pack","迪斯科灯":"Disco Light","迷你大耳狗发饰礼包":"Mini Cinnamoroll Hairpiece Pack","追光季Bhutan发型":"Lightseekers Bhutan Hair","追光季Cone发型":"Lightseekers Cone Hair","追光季Stupa发型":"Lightseekers Stupa Hair","追光季大伞":"Lightseekers Parasol","追光季项链":"Lightseekers Necklace","追忆季ClassicAurora发型":"Remembrance Classic AURORA Hair","追忆季RunawayBob发型":"Remembrance Runaway Bob Hair","追忆季SlateRunaway裤子":"Remembrance Slate Runaway Pants","追忆季项链":"Remembrance Necklace","适合在云野坐着看云，蜡烛不急 (￣ω￣)":"Perfect for cloud-watching in Daylight Prairie — candles can wait (￣ω￣)","逍遥":"Carefree","透明大伞":"Clear Parasol","遇境":"Home","道袍":"Taoist Robe","遥鲲披肩斗篷礼包":"Sky Ray Shawl Cape Pack","遥鲲斗篷":"Sky Ray Cape","遮阳帽":"Sun Hat","邮差裤":"Postman Pants","郁金香斗篷":"Tulip Cape","郡主头":"Princess Bun","重新加载":"Reload","野餐毯":"Picnic Blanket","野餐礼包":"Picnic Pack","量":"Measure","金穗披肩斗篷礼包":"Golden Wheat Shawl Cape Pack","金色桌":"Gold Table","金项链":"Gold Necklace","金鳞耳坠礼包":"Golden Scale Ear Pendants Pack","金麟":"Golden Scale","鎏金魔法帽礼包":"Gilded Wizard Hat Pack","钢琴":"Piano","钢琴海报":"Piano Poster","钢琴键海报":"Piano Keys Poster","铃铛斗篷":"Bell Cape","铙钹":"Cymbals","铜牌":"Bronze Medal","铜色桌":"Copper Table","铜钱":"Copper Coin","铲子":"Shovel","银色桌":"Silver Table","银项链":"Silver Necklace","锦标赛冰板":"Tournament Ice Rink","锦标赛冰鞋":"Tournament Ice Skates","锦标赛扫发":"Tournament Swept Hair","锦标赛旗帜-草原":"Tournament Banner - Meadow","锦标赛晶翼斗篷礼包":"Tournament Crystal Wing Cape Pack","锦标赛桂冠礼包":"Tournament Laurel Pack","锦标赛滑冰套装礼包":"Tournament Skating Set Pack","锦标赛滑冰服":"Tournament Skating Suit","锦标赛领奖台":"Tournament Podium","锦鲤":"Koi","锦鲤头":"Koi Head","长 ID 大多查不到，请用 9 位短 ID（小精灵「查询id」里的那个）":"Long IDs mostly fail — use the 9-digit Short ID (from the Guide sprite's \"查询id\" reply)","长 ID（32 位）目前多数查不到，请用短 ID。数据来自倾慕公益接口。":"Long IDs (32-digit) mostly fail for now — please use the Short ID. Data from the Qimu public API.","长发系带":"Long Laced Hair","长图加载中…":"Loading image…","长图加载失败，请检查网络":"Failed to load image, check your network","长按图片即可保存或分享":"Long-press image to save or share","长按或点「删」删除单条记录":"Long-press or tap \"Del\" to remove a record","长袍斗篷":"Robe Cape","问得太多了，先祖也有点累 (￣▽￣;)":"Too many questions — even the ancestors are tired (￣▽￣;)","阔腿牛仔裤礼包":"Wide-Leg Jeans Pack","阿努":"Anubis","陶笛":"Ocarina","隐形斗篷":"Invisible Cape","隔离壳":"isolation shell","集结季Uniform裤子":"Assembly Uniform Pants","集结季Yeti发型":"Assembly Yeti Hair","集结季Yeti裤子":"Assembly Yeti Pants","集结季项链":"Assembly Necklace","集结小号":"Assembly Trumpet","雏鸟之琴":"Fledgling Harp","雏鸟之琴礼包":"Fledgling Harp Pack","雨之队斗篷":"Team Rain Cape","雨号角暗蝴蝶结耳饰":"Rain Horn Dark Bow Earrings","雨号角蝴蝶结头饰":"Rain Horn Bow Headwear","雨号角蝴蝶结耳饰":"Rain Horn Bow Earrings","雨妈":"Rain Mom","雨暗蝴蝶结鞋子":"Rain Dark Bow Shoes","雨暗面具蝴蝶结面具":"Rain Dark Bow Mask","雨林":"Hidden Forest","雨林小鼓":"Forest Drum","雨林长发":"Forest Long Hair","雨林隐藏图会给你一点小惊喜 (｡･ω･｡)ﾉ♡":"The Hidden Forest has a little surprise for you (｡･ω･｡)ﾉ♡","雨蝴蝶结裤子":"Rain Bow Pants","雨面具面饰":"Rain Mask Face Accessory","雪人嘴巴":"Snowman Mouth","雪人围巾":"Snowman Scarf","雪人头饰礼包":"Snowman Headwear Pack","雪人手臂1":"Snowman Arm 1","雪人手臂2":"Snowman Arm 2","雪人暖心靴礼包":"Warm Snowman Boots Pack","雪人身体(中)":"Snowman Body (M)","雪人身体(大)":"Snowman Body (L)","雪人鼻子":"Snowman Nose","雪帽头饰":"Snow Hat Headwear","雪背饰":"Snow Back Accessory","雪花发饰":"Snowflake Hairpiece","雪花球":"Snow Globe","霞谷":"Valley of Triumph","青山落拓斗篷":"Greenhill Wanderer Cape","青蛙面具面具":"Frog Mask","青衫落拓礼包":"Blue Wanderer Pack","青鸟季Bob发型":"Blue Bird Bob Hair","青鸟季BootTall鞋子":"Blue Bird Tall Boots","青鸟季ClothDivider背饰":"Blue Bird Cloth Divider Back Accessory","青鸟季RolledSleeve裤子":"Blue Bird Rolled Sleeve Pants","青鸟季Tunic裤子":"Blue Bird Tunic","青鸟季Wrap裤子":"Blue Bird Wrap Pants","青鸟季项链":"Blue Bird Necklace","青鸟斗篷":"Blue Bird Cape","非官方工具 · 仅供学习交流 · 数据仅存本机":"Unofficial tool · for study only · data stays on your device","面具":"Mask","面具缎带面具":"Ribbon Mask","面具面具":"Mask","面具面纱面具":"Veil Mask","面具面饰":"Mask Face Accessory","面饰":"Face Accessory","靴鞋子":"Boots","鞋子":"Shoes","鞋鞋子":"Shoes","韩信":"Han Xin","音乐会":"Concert","音乐桌":"Music Table","音乐贝壳":"Music Shell","音序站":"Sequencer Station","音韵吉他礼包":"Rhythm Guitar Pack","音韵季":"Rhythm","音韵季Pumpkin发型":"Rhythm Pumpkin Hair","音韵季WavyBob发型":"Rhythm Wavy Bob Hair","音韵季项链":"Rhythm Necklace","韵律斗篷":"Rhythm Cape","项链":"Necklace","预言季Jumpsuits裤子":"Prophecy Jumpsuit","预言季项链":"Prophecy Necklace","领航":"Navigator","风之旅人":"Journey","风之旅人礼包":"Journey Pack","风壁画":"Wind Mural","风背饰":"Wind Back Accessory","风行季Ancestor裤子":"Flight Ancestor Pants","风行季Ascot项链":"Flight Ascot Necklace","风行季Messy发型":"Flight Messy Hair","风行季Sword裤子":"Flight Sword Pants","风行季项链":"Flight Necklace","风车":"Pinwheel","风面具面具":"Wind Mask","飞蛾斗篷":"Moth Cape","飞蛾装扮礼包":"Moth Outfit Pack","飞蛾飞行员眼镜":"Moth Aviator Glasses","飞鸟纸伞":"Bird Paper Umbrella","飞鸟纸伞礼包":"Bird Paper Umbrella Pack","飞鸟肩带礼包":"Bird Shoulder Strap Pack","香蕉":"Banana","马尾":"Ponytail","马年":"Year of the Horse","马蹄莲发型":"Calla Lily Hair","马蹄莲斗篷":"Calla Lily Cape","马面裙":"Horse-Face Skirt","驯鲲师斗篷":"Ray Tamer Cape","驯鸟师斗篷":"Bird Tamer Cape","骐骥迎福礼包":"Steed of Fortune Pack","高 ":"Taller by ","高个型":"Tall","高朋克发型":"Tall Punk Hair","高石方块":"Tall Stone Block","高石柜":"Tall Stone Cabinet","高罐":"Tall Jar","高音钢琴":"Upright Piano","高领斗篷":"High-Collar Cape","高马尾":"High Ponytail","魔":"Spell","魔fa季项链":"Enchantment Necklace","魔法季Brazier背饰":"Enchantment Brazier Back Accessory","魔法季杂技发型":"Enchantment Acrobat Hair","魔法季舞者发型":"Enchantment Dancer Hair","魔法季音乐家发型":"Enchantment Musician Hair","魔法斗篷":"Magic Cape","鱼号角头饰":"Fish Horn Headwear","鱼纹斗篷":"Fish-Pattern Cape","鱼鳍":"Fin","鱼鳞斗篷":"Fish-Scale Cape","鲤跃龙门礼包":"Koi Leaping the Gate Pack","鲲发型":"Ray Hair","鲲埙":"Ray Ocarina","鲲翼":"Ray Wings","鳐鲲气球":"Manta Balloon","鳐鲲玩偶":"Manta Plush","鳐鲲长袍":"Manta Robe","鸟背饰":"Bird Back Accessory","鸟裤子":"Bird Pants","鸟语":"Birdsong","鸟面具面具":"Bird Mask","鸢尾花瓶":"Iris Vase","鸦渡麦浪斗篷礼包":"Crow over Wheat Cape Pack","鸦羽兜帽礼包":"Crow Feather Hood Pack","鸭鸭":"Duckling","鸭鸭上衣":"Duckling Top","鹊桥相会礼包":"Magpie Bridge Pack","鹿头":"Deer Head","鹿角":"Antlers","鹿面具面具":"Deer Mask","麦穗斗篷":"Wheat Cape","麻花":"Twist Braids","麻雀斗篷":"Sparrow Cape","黄昏队斗篷":"Team Dusk Cape","黄色号角耳饰":"Yellow Horn Earrings","黄色屏风":"Yellow Screen","黄色斗篷":"Yellow Cape","黄色窗户":"Yellow Window","黄色背饰":"Yellow Back Accessory","黄色裤子":"Yellow Pants","黄色鞋子":"Yellow Shoes","黄蝴蝶结发带":"Yellow Bow Headband","黄鼠狼面具":"Weasel Mask","黑灰斗篷":"Black & Gray Cape","黑石":"Black Shard","黑脸面具":"Black-Face Mask","黑色绚彩斗":"Black Shimmer Cape","黑金":"Black & Gold","黑鸦斗篷":"Black Crow Cape","黑鸭":"Black Duck","龙号角耳饰":"Dragon Horn Earrings","龙舟":"Dragon Boat","龙舟斗篷":"Dragon Boat Cape","龙袍裤子":"Dragon Robe Pants","龙面具面具":"Dragon Mask","龙骨":"Dragonbone","龙鳞束身长袍礼包":"Dragon Scale Fitted Robe Pack","（图":"(Fig. ","（需 HTTPS 且授权摄像头）":"(HTTPS and camera permission required)","🌟光遇每日任务 | ":"🌟 Sky Daily Quests | ","🕯️今日季蜡位置：":"🕯️ Today's seasonal candles: "};
	var LANG_KEY = 'sky_guide_lang';
	var skyLang = 'en';
	try {
		var _savedLang = localStorage.getItem(LANG_KEY);
		if (_savedLang === 'zh' || _savedLang === 'en') skyLang = _savedLang;
	} catch (e) {}

	var SKY_WEEK = { '日': 'Sun', '一': 'Mon', '二': 'Tue', '三': 'Wed', '四': 'Thu', '五': 'Fri', '六': 'Sat' };
	var SKY_RX = [
		[/^今日任务 · (.+)$/, function (m) { return 'Daily Quests · ' + m[1]; }],
		[/^今日季蜡 · (.+)$/, function (m) { return "Today's seasonal candles · " + m[1]; }],
		[/^距刷新 (\d+)小时(\d+)分$/, function (m) { return 'Refresh in ' + m[1] + 'h ' + m[2] + 'm'; }],
		[/^距刷新 (\d+)分$/, function (m) { return 'Refresh in ' + m[1] + 'm'; }],
		[/^第(\d+)次$/, function (m) { return '#' + m[1]; }],
		[/^星期(.)$/, function (m) { return SKY_WEEK[m[1]] || null; }],
		[/^高 (.+)$/, function (m) { return 'Taller by ' + m[1]; }],
		[/^矮 (.+)$/, function (m) { return 'Shorter by ' + m[1]; }],
		[/^扫描中 (\d+)$/, function (m) { return 'Scanning ' + m[1]; }]
	];

	function skyIsUiText(n) {
		var p = n.parentElement;
		while (p) {
			var tag = p.tagName;
			if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'NOSCRIPT') return false;
			if (p.getAttribute && p.getAttribute('data-sky-lang-skip') === '1') return false;
			p = p.parentElement;
		}
		return true;
	}

	function skyTranslateTextNode(n) {
		if (!skyIsUiText(n)) return;
		var raw = n.nodeValue;
		if (!raw) return;
		var hasCJK = /[\u4e00-\u9fff]/.test(raw);
		if (!n.__skyOrig) {
			if (!hasCJK) return;
			n.__skyOrig = raw;
		} else if (raw !== n.__skyOrig && raw !== n.__skyTr && hasCJK) {
			/* Vue 原地改写了文案：以新文案为准 */
			n.__skyOrig = raw;
		}
		if (skyLang !== 'en') {
			if (n.nodeValue !== n.__skyOrig) n.nodeValue = n.__skyOrig;
			n.__skyTr = null;
			return;
		}
		var src = n.__skyOrig;
		var key = src.replace(/^\s+|\s+$/g, '');
		if (!key) return;
		var out = (I18N[src] != null) ? I18N[src] : I18N[key];
		if (out == null) {
			for (var i = 0; i < SKY_RX.length; i++) {
				var m = src.match(SKY_RX[i][0]);
				if (m) { out = SKY_RX[i][1](m); break; }
			}
		}
		/* 兜底：复合串里的 UI 碎片替换（如「第2次 · 高 5cm · 星期五」） */
		if (out == null) {
			var s2 = src, touched = false;
			s2 = s2.replace(/第(\d+)次/g, function (_, d) { touched = true; return '#' + d; });
			s2 = s2.replace(/星期([日一二三四五六])/g, function (_, c) { touched = true; return SKY_WEEK[c]; });
			s2 = s2.replace(/距刷新 (\d+)小时(\d+)分/g, function (_, a, b) { touched = true; return 'Refresh in ' + a + 'h ' + b + 'm'; });
			s2 = s2.replace(/距刷新 (\d+)分/g, function (_, a) { touched = true; return 'Refresh in ' + a + 'm'; });
			s2 = s2.replace(/今日任务 · /g, function () { touched = true; return 'Daily Quests · '; });
			s2 = s2.replace(/今日季蜡(位置)?：/g, function () { touched = true; return "Today's seasonal candles: "; });
			s2 = s2.replace(/^高 /, function () { touched = true; return 'Taller by '; });
			s2 = s2.replace(/^矮 /, function () { touched = true; return 'Shorter by '; });
			s2 = s2.replace(/高 (\d+(?:\.\d+)?)\s*cm/g, function (_, n) { touched = true; return 'Taller by ' + n + ' cm'; });
			s2 = s2.replace(/矮 (\d+(?:\.\d+)?)\s*cm/g, function (_, n) { touched = true; return 'Shorter by ' + n + ' cm'; });
			if (touched) out = s2;
		}
		if (out == null) return;
		var sp = src.match(/^(\s*)([\s\S]*?)(\s*)$/);
		n.nodeValue = sp[1] + out + sp[3];
		n.__skyTr = n.nodeValue;
	}

	function skyWalk(root) {
		if (!root) return;
		if (root.nodeType === 3) { skyTranslateTextNode(root); return; }
		if (root.nodeType !== 1) return;
		try {
			var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
			var n;
			while ((n = w.nextNode())) skyTranslateTextNode(n);
		} catch (e) {}
		var els;
		try { els = root.querySelectorAll('input[placeholder],textarea[placeholder]'); } catch (e) { els = []; }
		for (var i = 0; i < els.length; i++) {
			var el = els[i], ph = el.getAttribute('placeholder');
			if (!ph) continue;
			if (skyLang === 'en' && I18N[ph]) el.setAttribute('placeholder', I18N[ph]);
			else if (skyLang !== 'en' && I18N[ph]) el.setAttribute('placeholder', ph);
		}
	}

	var skyTitleOrig = '';
	function skyApplyAll() {
		document.documentElement.lang = skyLang === 'en' ? 'en' : 'zh-CN';
		if (!skyTitleOrig) skyTitleOrig = document.title;
		document.title = skyLang === 'en' ? (I18N[skyTitleOrig] || skyTitleOrig) : skyTitleOrig;
		if (document.body) skyWalk(document.body);
		skyUpdateLangPill();
	}

	function skyUpdateLangPill() {
		var pill = document.getElementById('sky-lang');
		if (!pill) return;
		var opts = pill.querySelectorAll('.sky-lg-opt');
		for (var i = 0; i < opts.length; i++) {
			if (opts[i].getAttribute('data-l') === skyLang) opts[i].classList.add('on');
			else opts[i].classList.remove('on');
		}
	}

	function ensureSkyLangPill() {
		if (document.getElementById('sky-lang')) { skyUpdateLangPill(); return; }
		var d = document.createElement('div');
		d.id = 'sky-lang';
		d.setAttribute('data-sky-lang-skip', '1');
		d.innerHTML = '<span class="sky-lg-opt" data-l="en">English</span><span class="sky-lg-sep">/</span><span class="sky-lg-opt" data-l="zh">中文</span>';
		d.addEventListener('click', function (e) {
			var t = e.target;
			while (t && t !== d && !(t.classList && t.classList.contains('sky-lg-opt'))) t = t.parentNode;
			if (!t || t === d) return;
			var l = t.getAttribute('data-l');
			if (!l || l === skyLang) return;
			skyLang = l;
			try { localStorage.setItem(LANG_KEY, l); } catch (err) {}
			skyApplyAll();
		});
		var st = document.createElement('style');
		st.textContent = '#sky-lang{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);right:12px;z-index:2147483000;font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:rgba(16,22,40,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:7px 12px;display:flex;gap:7px;align-items:center;user-select:none;-webkit-user-select:none;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}#sky-lang .sky-lg-opt{opacity:.55;letter-spacing:.02em}#sky-lang .sky-lg-opt.on{opacity:1;font-weight:600}#sky-lang .sky-lg-sep{opacity:.35}';
		document.head.appendChild(st);
		document.body.appendChild(d);
		skyUpdateLangPill();
	}

	/* SPA 动态渲染兜底：新增节点 / 原地改写都重新翻译 */
	var skyMo = new MutationObserver(function (muts) {
		if (skyLang !== 'en') return;
		for (var i = 0; i < muts.length; i++) {
			var mu = muts[i];
			if (mu.type === 'characterData') { skyTranslateTextNode(mu.target); continue; }
			var add = mu.addedNodes;
			for (var j = 0; j < add.length; j++) {
				var nn = add[j];
				if (nn.nodeType === 1 || nn.nodeType === 3) skyWalk(nn);
			}
		}
	});

	function skyI18nBoot() {
		ensureSkyLangPill();
		skyApplyAll();
		if (document.body) {
			try { skyMo.observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', skyI18nBoot);
	} else {
		skyI18nBoot();
	}




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
	var GIFT_DATA = [["中国绊爱礼服套装礼包",128,"2026","t98k5ny2imjh5cqhr4wnerm6s09b67n.png","https://patchwiki.biligame.com/images/sky/d/d5/t98k5ny2imjh5cqhr4wnerm6s09b67n.png"],["云音伴游耳机礼包",68,"2026","ok08oq7rlb6xd7c9tdlrq2tqos1nhoe.png","https://patchwiki.biligame.com/images/sky/6/67/ok08oq7rlb6xd7c9tdlrq2tqos1nhoe.png"],["向日葵耳饰礼包",18,"2026","4phm8yrhwkav2wtdky96kurkxpkh4lw.png","https://patchwiki.biligame.com/images/sky/a/a2/4phm8yrhwkav2wtdky96kurkxpkh4lw.png"],["向日葵花瓣裙礼包",68,"2026","oxw7gndt0096he2g3kruxx075l59efg.png","https://patchwiki.biligame.com/images/sky/2/26/oxw7gndt0096he2g3kruxx075l59efg.png"],["向阳花伞礼包",98,"2026","43y6r4yqapuiwbhclko4i44dieb450x.png","https://patchwiki.biligame.com/images/sky/e/e5/43y6r4yqapuiwbhclko4i44dieb450x.png"],["回归童真礼包",12,"2026","esk7v69aw72h3dn8fslrxn21q4yz190.png","https://patchwiki.biligame.com/images/sky/7/75/esk7v69aw72h3dn8fslrxn21q4yz190.png"],["墨镜头饰礼包",18,"2026","mmbysaxrtp8p1bqvemfotj0hfb78knb.png","https://patchwiki.biligame.com/images/sky/8/84/mmbysaxrtp8p1bqvemfotj0hfb78knb.png"],["夏日派对礼包",25,"2026","bm0bk32gubhjb4vtbj2fyts9lbn5dgm.png","https://patchwiki.biligame.com/images/sky/8/8c/bm0bk32gubhjb4vtbj2fyts9lbn5dgm.png"],["夏日潜水套装礼包",68,"2026","su79eclh2rwhqlekgp8nj874c1haoeq.png","https://patchwiki.biligame.com/images/sky/7/73/su79eclh2rwhqlekgp8nj874c1haoeq.png"],["宝骏丹心马尾礼包",30,"2026","bn1c8yxxibje39i19teq2obh8uddsnl.png","https://patchwiki.biligame.com/images/sky/5/5d/bn1c8yxxibje39i19teq2obh8uddsnl.png"],["寻宝搭档礼包",18,"2026","om2jy5u5jeijln3s856m5lkzqcr85fs.png","https://patchwiki.biligame.com/images/sky/e/e1/om2jy5u5jeijln3s856m5lkzqcr85fs.png"],["小恶魔斗篷礼包",98,"2026","bc1kw00tc1gziekzzxp7cmgincml7hm.png","https://patchwiki.biligame.com/images/sky/2/2e/bc1kw00tc1gziekzzxp7cmgincml7hm.png"],["小狗拖鞋礼包",30,"2026","7qb4x82jb89hz9xw9kckwni3jk19297.png","https://patchwiki.biligame.com/images/sky/6/6a/7qb4x82jb89hz9xw9kckwni3jk19297.png"],["小黄鸭玩偶服礼包",68,"2026","c7l1t0ko44mv6b4uxvhrpbvdefo74a7.png","https://patchwiki.biligame.com/images/sky/7/7b/c7l1t0ko44mv6b4uxvhrpbvdefo74a7.png"],["小黑鸭头饰礼包",6,"2026","r1f2l37j5owdg8ngb22eh29t4tc9l1k.png","https://patchwiki.biligame.com/images/sky/f/ff/r1f2l37j5owdg8ngb22eh29t4tc9l1k.png"],["幸运亨通眼镜礼包",12,"2026","b94nbe46cl12znp6xnvfvvzbabhoyfp.png","https://patchwiki.biligame.com/images/sky/5/55/b94nbe46cl12znp6xnvfvvzbabhoyfp.png"],["弦音抱月礼包",98,"2026","5lpjwsv6d2yzgbha732egn4880tp70e.png","https://patchwiki.biligame.com/images/sky/8/88/5lpjwsv6d2yzgbha732egn4880tp70e.png"],["彩虹阔腿裤礼包",68,"2026","n7k3sdkl8nzhseqnpotcvujnevv0kki.png","https://patchwiki.biligame.com/images/sky/a/a5/n7k3sdkl8nzhseqnpotcvujnevv0kki.png"],["探宝翎羽帽礼包",68,"2026","cdm71o0fh8d68tlwd16tqvdg1uj3g3s.png","https://patchwiki.biligame.com/images/sky/4/46/cdm71o0fh8d68tlwd16tqvdg1uj3g3s.png"],["星夜伞礼包",98,"2026","d5hlrf0x36194qqiyel1otl44i1fy7l.png","https://patchwiki.biligame.com/images/sky/2/22/d5hlrf0x36194qqiyel1otl44i1fy7l.png"],["星夜披风套装礼包",168,"2026","50ztxx975s5w08sena30av8neplfpxu.png","https://patchwiki.biligame.com/images/sky/2/2a/50ztxx975s5w08sena30av8neplfpxu.png"],["星月耳环礼包",30,"2026","k5aekgbpars7mwj63dhebbol8dqdpxv.png","https://patchwiki.biligame.com/images/sky/f/f1/k5aekgbpars7mwj63dhebbol8dqdpxv.png"],["星河烂漫礼包",68,"2026","0jwkis4cwcbu5ovg7bvtoqxrsa9lvbv.png","https://patchwiki.biligame.com/images/sky/0/09/0jwkis4cwcbu5ovg7bvtoqxrsa9lvbv.png"],["星流面具礼包",18,"2026","6t62gg4v0onomm5soh8soecomd4rubw.png","https://patchwiki.biligame.com/images/sky/6/69/6t62gg4v0onomm5soh8soecomd4rubw.png"],["海灵套装礼包",98,"2026","8vyi1sfm41ise7kt5rownd9g0lu6lgl.png","https://patchwiki.biligame.com/images/sky/a/a6/8vyi1sfm41ise7kt5rownd9g0lu6lgl.png"],["潮流连帽斗篷礼包",98,"2026","qpjdexeeie9ekxwbgsgmiaon8d10sw1.png","https://patchwiki.biligame.com/images/sky/e/e9/qpjdexeeie9ekxwbgsgmiaon8d10sw1.png"],["琅骏启岁长裙礼包",68,"2026","0wc44328ol6w00ceut9d9doy6ahji7w.png","https://patchwiki.biligame.com/images/sky/f/f9/0wc44328ol6w00ceut9d9doy6ahji7w.png"],["皮皮猫肩饰礼包",18,"2026","dpjwmdw9ssmn9w19kk2a5mi2j58ydel.png","https://patchwiki.biligame.com/images/sky/b/b0/dpjwmdw9ssmn9w19kk2a5mi2j58ydel.png"],["秘宝坠饰斗篷礼包",98,"2026","3megilr8vju3xxw44mi7vjniji3oma6.png","https://patchwiki.biligame.com/images/sky/e/e2/3megilr8vju3xxw44mi7vjniji3oma6.png"],["粽香蒸笼礼包",45,"2026","9hrcr1rntmj7bn1iq5oipnlea04o12u.png","https://patchwiki.biligame.com/images/sky/2/2c/9hrcr1rntmj7bn1iq5oipnlea04o12u.png"],["紫框眼镜礼包",18,"2026","k8fq55t3o9bu3nh7k9bgbxhjegalwvk.png","https://patchwiki.biligame.com/images/sky/6/67/k8fq55t3o9bu3nh7k9bgbxhjegalwvk.png"],["绘彩面具礼包",30,"2026","kyrqck3rkm2imaezi8vr8fdy8kntanb.png","https://patchwiki.biligame.com/images/sky/b/bf/kyrqck3rkm2imaezi8vr8fdy8kntanb.png"],["绿茸茸卷耳发饰礼包",18,"2026","pv3wszbmoxcrbjzhodcwy6z5dwyyvlx.png","https://patchwiki.biligame.com/images/sky/4/48/pv3wszbmoxcrbjzhodcwy6z5dwyyvlx.png"],["缀黄画笔发箍礼包",18,"2026","45gb8r687qtp0rv6jh8pmp1oubk6ggg.png","https://patchwiki.biligame.com/images/sky/8/8a/45gb8r687qtp0rv6jh8pmp1oubk6ggg.png"],["花钿素纱礼包",18,"2026","8pzh2dkba1rdamdpzwe2nhhy640wmom.png","https://patchwiki.biligame.com/images/sky/8/81/8pzh2dkba1rdamdpzwe2nhhy640wmom.png"],["莲华拂影礼包",68,"2026","00t0233fmanvsqzuguuwima1vieu5km.png","https://patchwiki.biligame.com/images/sky/c/c3/00t0233fmanvsqzuguuwima1vieu5km.png"],["萌新玩偶礼包",30,"2026","0ejfveivwzaap8lqzcgt4lb9idpohcl.png","https://patchwiki.biligame.com/images/sky/c/cf/0ejfveivwzaap8lqzcgt4lb9idpohcl.png"],["蓝色守护帽礼包",18,"2026","e866l8cw810upiecfjnxghc9j5bwiie.png","https://patchwiki.biligame.com/images/sky/b/ba/e866l8cw810upiecfjnxghc9j5bwiie.png"],["诡趣魔法帽礼包",68,"2026","k02gw222678k0168j4lbcsz5fyhd2d5.png","https://patchwiki.biligame.com/images/sky/4/41/k02gw222678k0168j4lbcsz5fyhd2d5.png"],["金穗披肩斗篷礼包",98,"2026","giuuoojlro5si6xvyj6jagptza7wcmv.png","https://patchwiki.biligame.com/images/sky/1/13/giuuoojlro5si6xvyj6jagptza7wcmv.png"],["鎏金魔法帽礼包",30,"2026","s30dkyemhh3u0d64ave3lnbrs4y8od6.png","https://patchwiki.biligame.com/images/sky/d/d6/s30dkyemhh3u0d64ave3lnbrs4y8od6.png"],["锦标赛晶翼斗篷礼包",98,"2026","bprpvqgrtmgtso6orkvxf0h8uxmi3iw.png","https://patchwiki.biligame.com/images/sky/3/31/bprpvqgrtmgtso6orkvxf0h8uxmi3iw.png"],["锦标赛滑冰套装礼包",128,"2026","ilzs47rbc3yowfbwc0wf6283fzx6wqm.png","https://patchwiki.biligame.com/images/sky/f/f1/ilzs47rbc3yowfbwc0wf6283fzx6wqm.png"],["飞鸟肩带礼包",45,"2026","d8fcb1elnkatbp1rwyrsz5emcm1h40a.png","https://patchwiki.biligame.com/images/sky/b/bf/d8fcb1elnkatbp1rwyrsz5emcm1h40a.png"],["骐骥迎福礼包",128,"2026","cqj2b6hm6frre5d0m263xv9b8t5b6t7.png","https://patchwiki.biligame.com/images/sky/3/32/cqj2b6hm6frre5d0m263xv9b8t5b6t7.png"],["鸦渡麦浪斗篷礼包",98,"2026","13djfmgbrwvgw79lqi63l2rmhum7x0h.png","https://patchwiki.biligame.com/images/sky/4/4c/13djfmgbrwvgw79lqi63l2rmhum7x0h.png"],["光之生物礼服套装礼包",68,"2025","iqfidwhtlmiksmn5st68cxxu6soz5hh.png","https://patchwiki.biligame.com/images/sky/5/52/iqfidwhtlmiksmn5st68cxxu6soz5hh.png"],["冥龙套装礼包",78,"2025","77qamq1jvy3q6krx6e3cxqfdm4ks5iw.png","https://patchwiki.biligame.com/images/sky/2/25/77qamq1jvy3q6krx6e3cxqfdm4ks5iw.png"],["周年影院套餐礼包",30,"2025","k0icury97vqn6uowl48jbqsh703bgri.png","https://patchwiki.biligame.com/images/sky/9/98/k0icury97vqn6uowl48jbqsh703bgri.png"],["周年礼服斗篷礼包",98,"2025","qroac1shag3z0wdlxz6mwkey4l0q1zk.png","https://patchwiki.biligame.com/images/sky/a/a6/qroac1shag3z0wdlxz6mwkey4l0q1zk.png"],["宝藏猎人礼包",98,"2025","3fd7szs2ghk26mlt1a433yde3ty3mp5.png","https://patchwiki.biligame.com/images/sky/b/bc/3fd7szs2ghk26mlt1a433yde3ty3mp5.png"],["小海牛配饰礼包",25,"2025","j3es180vdns0erpzpzp0ptei3wgzavm.png","https://patchwiki.biligame.com/images/sky/b/b8/j3es180vdns0erpzpzp0ptei3wgzavm.png"],["小黄鸭发饰礼包",6,"2025","i6s01z65ob6zmxqpidciu0goetqp9g1.png","https://patchwiki.biligame.com/images/sky/1/14/i6s01z65ob6zmxqpidciu0goetqp9g1.png"],["小黄鸭雨衣套装礼包",98,"2025","phb5id0tjfea4gc0ngujpfry9gkabb0.png","https://patchwiki.biligame.com/images/sky/2/2c/phb5id0tjfea4gc0ngujpfry9gkabb0.png"],["心心相印发饰礼包",18,"2025","anodg061ysa16am7z1kj4luf0j2ad1o.png","https://patchwiki.biligame.com/images/sky/a/a1/anodg061ysa16am7z1kj4luf0j2ad1o.png"],["必胜客联动分享披萨背饰礼包",45,"2025","mopi2nn3dbepzjg427q1k8yp8j72jaz.png","https://patchwiki.biligame.com/images/sky/7/76/mopi2nn3dbepzjg427q1k8yp8j72jaz.png"],["必胜客联动装扮礼包",68,"2025","05f10vri9b9t6z8en75cn6f3nxeo405.png","https://patchwiki.biligame.com/images/sky/f/f7/05f10vri9b9t6z8en75cn6f3nxeo405.png"],["日光水母套装礼包",98,"2025","98e59p3kpc7yhdv2xlag6klpf99d752.png","https://patchwiki.biligame.com/images/sky/4/41/98e59p3kpc7yhdv2xlag6klpf99d752.png"],["暖冬围巾斗篷礼包",98,"2025","nke7g11svv32o56j65i98jquh61rt90.png","https://patchwiki.biligame.com/images/sky/e/eb/nke7g11svv32o56j65i98jquh61rt90.png"],["暖冬绒绒礼包",45,"2025","03li20q55f3dbumhbl5xtp7x392wo9z.png","https://patchwiki.biligame.com/images/sky/8/87/03li20q55f3dbumhbl5xtp7x392wo9z.png"],["暗陨斗篷礼包",98,"2025","bfx98p21xixuou6bdscnc3qew22f2vi.png","https://patchwiki.biligame.com/images/sky/7/7e/bfx98p21xixuou6bdscnc3qew22f2vi.png"],["活力海牛礼包",68,"2025","b3gjb8q2msfvrz5e7sg701z68mj0ac4.png","https://patchwiki.biligame.com/images/sky/6/62/b3gjb8q2msfvrz5e7sg701z68mj0ac4.png"],["海牛玩偶礼包",45,"2025","fl2os07vftk9rsmzevf3r5rru7kzdi3.png","https://patchwiki.biligame.com/images/sky/4/45/fl2os07vftk9rsmzevf3r5rru7kzdi3.png"],["渐变双马尾发型礼包",45,"2025","nygiyh0lqecmuno1pt3xpfpzl9u3s8u.png","https://patchwiki.biligame.com/images/sky/6/6c/nygiyh0lqecmuno1pt3xpfpzl9u3s8u.png"],["潮汐套装礼包",168,"2025","7r3bmwoqfsvtz0cm8ju5wybrj2w4t5o.png","https://patchwiki.biligame.com/images/sky/6/6c/7r3bmwoqfsvtz0cm8ju5wybrj2w4t5o.png"],["献瑞折扇礼包",30,"2025","iixcrzuoeo022t9nicaf38g09lmjlty.png","https://patchwiki.biligame.com/images/sky/8/8c/iixcrzuoeo022t9nicaf38g09lmjlty.png"],["玫瑰褶边斗篷礼包",98,"2025","p9nwqm0p9kroiar3wgwme9wslqqe31v.png","https://patchwiki.biligame.com/images/sky/2/22/p9nwqm0p9kroiar3wgwme9wslqqe31v.png"],["皮皮猫套装礼包",78,"2025","ptbhb7cj00l4te2nxz4m2tvqr4y24gd.png","https://patchwiki.biligame.com/images/sky/8/8d/ptbhb7cj00l4te2nxz4m2tvqr4y24gd.png"],["粽子发饰礼包",18,"2025","lrambhcrsap6zo16i5bs4kk9cp6mm79.png","https://patchwiki.biligame.com/images/sky/c/cd/lrambhcrsap6zo16i5bs4kk9cp6mm79.png"],["纤云弄巧礼包",98,"2025","3zfxo9a1wtrmcmppfg3ymzrfynzgh2i.png","https://patchwiki.biligame.com/images/sky/3/37/3zfxo9a1wtrmcmppfg3ymzrfynzgh2i.png"],["线框斗篷礼包",128,"2025","pdxtnixng1qnuymhznn5ccydzrcplim.png","https://patchwiki.biligame.com/images/sky/f/f1/pdxtnixng1qnuymhznn5ccydzrcplim.png"],["缤纷飘带斗篷礼包",98,"2025","0wpmzdl76cngms84xekwn68oxqqgryi.png","https://patchwiki.biligame.com/images/sky/3/39/0wpmzdl76cngms84xekwn68oxqqgryi.png"],["蝴蝶与花发饰礼包",18,"2025","qgrx5ds8fi9oxdqd52ezdlok100ujjg.png","https://patchwiki.biligame.com/images/sky/0/07/qgrx5ds8fi9oxdqd52ezdlok100ujjg.png"],["衔福献瑞礼包",128,"2025","5bdoq8ww4sf6cd58ope2csha8ov683c.png","https://patchwiki.biligame.com/images/sky/e/ee/5bdoq8ww4sf6cd58ope2csha8ov683c.png"],["记忆水晶礼包",168,"2025","g2ebihkp9gctrob4urdl5moxkq149d6.png","https://patchwiki.biligame.com/images/sky/b/bd/g2ebihkp9gctrob4urdl5moxkq149d6.png"],["超凡风之旅人礼包",168,"2025","0g0llnpk6htwb0aiez3tbydufrp2v5e.png","https://patchwiki.biligame.com/images/sky/3/34/0g0llnpk6htwb0aiez3tbydufrp2v5e.png"],["雪人头饰礼包",12,"2025","d64o0sccc6u5mtx6skyz0ny6vwhe7h5.png","https://patchwiki.biligame.com/images/sky/a/a4/d64o0sccc6u5mtx6skyz0ny6vwhe7h5.png"],["青衫落拓礼包",30,"2025","4aefy47o0tk141r8qxxhve41t0cxow6.png","https://patchwiki.biligame.com/images/sky/6/61/4aefy47o0tk141r8qxxhve41t0cxow6.png"],["鸦羽兜帽礼包",30,"2025","0eofuudx1e1vw8kmou8g3m0fr8txlzw.png","https://patchwiki.biligame.com/images/sky/c/c2/0eofuudx1e1vw8kmou8g3m0fr8txlzw.png"],["鹊桥相会礼包",98,"2025","27msntlu2i8y5s77nvn7v6aaijclxc8.png","https://patchwiki.biligame.com/images/sky/a/a8/27msntlu2i8y5s77nvn7v6aaijclxc8.png"],["仙境茶会门扉礼包",128,"2024","8wdcelt1q2nclk0zuh8nnty1gw7nbwm.png","https://patchwiki.biligame.com/images/sky/7/71/8wdcelt1q2nclk0zuh8nnty1gw7nbwm.png"],["优雅三件套礼包",98,"2024","080vro1aqu5gyebv6zzcrtz0dsmx090.png","https://patchwiki.biligame.com/images/sky/7/7c/080vro1aqu5gyebv6zzcrtz0dsmx090.png"],["史力奇套装礼包",68,"2024","omo1dw07fdmaix9q1ei1dwqgbjyei33.png","https://patchwiki.biligame.com/images/sky/9/9e/omo1dw07fdmaix9q1ei1dwqgbjyei33.png"],["史力奇帽子礼包",30,"2024","4nfk1vpqa3r6j5mcog3uzerfruxv58q.png","https://patchwiki.biligame.com/images/sky/f/fe/4nfk1vpqa3r6j5mcog3uzerfruxv58q.png"],["向日葵连衣裙礼包",45,"2024","hgaiiozaiqesqkuz2jz9pzsf6ba22z1.png","https://patchwiki.biligame.com/images/sky/c/c2/hgaiiozaiqesqkuz2jz9pzsf6ba22z1.png"],["周年线框斗篷礼包",128,"2024","kaelrt2s67uo62xjq8e6gz9izlv692j.png","https://patchwiki.biligame.com/images/sky/2/26/kaelrt2s67uo62xjq8e6gz9izlv692j.png"],["大耳狗抱枕礼包",98,"2024","stn1rh9dixprlg6qzubvyw62wqx9ggo.png","https://patchwiki.biligame.com/images/sky/5/51/stn1rh9dixprlg6qzubvyw62wqx9ggo.png"],["大耳狗服饰礼包",98,"2024","dfy3psawf2ej3ug251aebsuk3806swk.png","https://patchwiki.biligame.com/images/sky/5/51/dfy3psawf2ej3ug251aebsuk3806swk.png"],["大耳狗装扮礼包",98,"2024","7egow4umvg3ph8a2u4l92hlxmgxlzxw.png","https://patchwiki.biligame.com/images/sky/f/ff/7egow4umvg3ph8a2u4l92hlxmgxlzxw.png"],["姆明妈妈手作斗篷礼包",168,"2024","f4k1514ntxo4ihen6f5ntyddm5haww7.png","https://patchwiki.biligame.com/images/sky/5/58/f4k1514ntxo4ihen6f5ntyddm5haww7.png"],["姆明饰品套装礼包",78,"2024","tl082boei7dtm1m0mw3cxqaodpxy4r3.png","https://patchwiki.biligame.com/images/sky/e/ed/tl082boei7dtm1m0mw3cxqaodpxy4r3.png"],["小狗周年头饰礼包",30,"2024","giatbqw7uboegrwlcacfbtblizyufjw.png","https://patchwiki.biligame.com/images/sky/f/f9/giatbqw7uboegrwlcacfbtblizyufjw.png"],["异彩莲花斗篷礼包",128,"2024","ls6ncbytfecm09h00xdiznedk912oro.png","https://patchwiki.biligame.com/images/sky/2/2b/ls6ncbytfecm09h00xdiznedk912oro.png"],["彩虹泡泡机礼包",98,"2024","tcuasqdxzsrjayn5ca5ngujsf5q39ju.png","https://patchwiki.biligame.com/images/sky/6/69/tcuasqdxzsrjayn5ca5ngujsf5q39ju.png"],["恶作剧飞行扫帚礼包",128,"2024","7l8x1px9szfola1pjssbb946qcxsi34.png","https://patchwiki.biligame.com/images/sky/c/cc/7l8x1px9szfola1pjssbb946qcxsi34.png"],["恶作剧鸦羽斗篷礼包",118,"2024","q4sc77fslxlpngv2dwuo3lfsj8zzlxr.png","https://patchwiki.biligame.com/images/sky/2/2a/q4sc77fslxlpngv2dwuo3lfsj8zzlxr.png"],["挂肩外袍礼包",68,"2024","tom09rshg5pa5b5zqk01obwuma4an4k.png","https://patchwiki.biligame.com/images/sky/a/a6/tom09rshg5pa5b5zqk01obwuma4an4k.png"],["日光耳环礼包",18,"2024","t6dtwltsqi6k3wi1bi4hi9ai751hlf1.png","https://patchwiki.biligame.com/images/sky/d/dd/t6dtwltsqi6k3wi1bi4hi9ai751hlf1.png"],["月华霓裳礼包",98,"2024","njtn97dgptn97feqs487vf8e7xb5740.png","https://patchwiki.biligame.com/images/sky/a/ac/njtn97dgptn97feqs487vf8e7xb5740.png"],["树精肩饰礼包",18,"2024","j7io3zt1lhdn0l3cje9lhxo78f9d4dz.png","https://patchwiki.biligame.com/images/sky/e/ec/j7io3zt1lhdn0l3cje9lhxo78f9d4dz.png"],["浪漫流星斗篷礼包",118,"2024","5o76m0dicpo6yjokuc9ack587cdvqpx.png","https://patchwiki.biligame.com/images/sky/a/ae/5o76m0dicpo6yjokuc9ack587cdvqpx.png"],["海蓝波浪发型礼包",45,"2024","mmexjd51xw7c30tp5pvkrrtkwh6rshx.png","https://patchwiki.biligame.com/images/sky/a/a0/mmexjd51xw7c30tp5pvkrrtkwh6rshx.png"],["满月耳坠礼包",18,"2024","139l9jbbokn237fucrpyxrgicj0zjxi.png","https://patchwiki.biligame.com/images/sky/4/45/139l9jbbokn237fucrpyxrgicj0zjxi.png"],["爱丽丝围裙套装礼包",78,"2024","khq3gvvjyegg716sk57jdmbj13c6a00.png","https://patchwiki.biligame.com/images/sky/b/bc/khq3gvvjyegg716sk57jdmbj13c6a00.png"],["盘龙围巾斗篷礼包",98,"2024","58tizyfeiyd9jb51w3lau8ub6ckzg53.png","https://patchwiki.biligame.com/images/sky/1/19/58tizyfeiyd9jb51w3lau8ub6ckzg53.png"],["神鹿祝福头饰礼包",98,"2024","7d5qq8us3mvt0z9yvhwbuy1n8aemb26.png","https://patchwiki.biligame.com/images/sky/d/d9/7d5qq8us3mvt0z9yvhwbuy1n8aemb26.png"],["立式钢琴礼包",30,"2024","qeb1wa7rljoyttbdv3e5rmcu8jb2vq2.png","https://patchwiki.biligame.com/images/sky/e/e8/qeb1wa7rljoyttbdv3e5rmcu8jb2vq2.png"],["肯德基联动礼包",128,"2024","f00ck57mzbbgwma0e43xtx1z5ycyiz8.png","https://patchwiki.biligame.com/images/sky/e/ee/f00ck57mzbbgwma0e43xtx1z5ycyiz8.png"],["荷叶伞礼包",98,"2024","m0ffxzsrylzhhwwjwrduymc1gjn42cx.png","https://patchwiki.biligame.com/images/sky/4/4e/m0ffxzsrylzhhwwjwrduymc1gjn42cx.png"],["进行曲制服礼包",68,"2024","hckvslvjkfun7w9rs10vn2si7j3oxcd.png","https://patchwiki.biligame.com/images/sky/e/eb/hckvslvjkfun7w9rs10vn2si7j3oxcd.png"],["迷你大耳狗发饰礼包",45,"2024","919chonidqcyrbmryetvs36z0zwafkw.png","https://patchwiki.biligame.com/images/sky/5/5f/919chonidqcyrbmryetvs36z0zwafkw.png"],["遥鲲披肩斗篷礼包",98,"2024","acxqyd69cvj8ntglv7y8gh4mhnusuxc.png","https://patchwiki.biligame.com/images/sky/0/0c/acxqyd69cvj8ntglv7y8gh4mhnusuxc.png"],["金鳞耳坠礼包",12,"2024","nop9958yppbu5id7th90d49m9tsoj5d.png","https://patchwiki.biligame.com/images/sky/7/7b/nop9958yppbu5id7th90d49m9tsoj5d.png"],["锦标赛桂冠礼包",30,"2024","bjhy0ur6hdca51pnsc61078bwpi8qxu.png","https://patchwiki.biligame.com/images/sky/f/f7/bjhy0ur6hdca51pnsc61078bwpi8qxu.png"],["风之旅人礼包",168,"2024","1loseyyagrwpyjgvo05r3vduptkqduw.png","https://patchwiki.biligame.com/images/sky/2/25/1loseyyagrwpyjgvo05r3vduptkqduw.png"],["飞鸟纸伞礼包",98,"2024","dowpm7yzq0ic68yxrxujsjw103okbs6.png","https://patchwiki.biligame.com/images/sky/a/aa/dowpm7yzq0ic68yxrxujsjw103okbs6.png"],["龙鳞束身长袍礼包",68,"2024","5wwanwqviig03vsexi2jbvbai7elv23.png","https://patchwiki.biligame.com/images/sky/2/2f/5wwanwqviig03vsexi2jbvbai7elv23.png"],["优雅领巾礼包",30,"2023","4kyzc840rp6qx4epvhxkqx8d63l3hd7.png","https://patchwiki.biligame.com/images/sky/a/a4/4kyzc840rp6qx4epvhxkqx8d63l3hd7.png"],["凯旋手碟礼包",128,"2023","7d61cqvccjl440f056odancla6sii1d.png","https://patchwiki.biligame.com/images/sky/6/60/7d61cqvccjl440f056odancla6sii1d.png"],["凯旋提琴礼包",128,"2023","3w9gxxrh0u0978hg331hvhhnanhh9iw.png","https://patchwiki.biligame.com/images/sky/b/b9/3w9gxxrh0u0978hg331hvhhnanhh9iw.png"],["古典音乐桌椅礼包",128,"2023","rum0ty2jsz51xn7d8bxjknf2gjurr6j.png","https://patchwiki.biligame.com/images/sky/0/01/rum0ty2jsz51xn7d8bxjknf2gjurr6j.png"],["吸蟹伯爵斗篷礼包",98,"2023","jzg2hgcejjb1nsj29u4jh8kr07u3aao.png","https://patchwiki.biligame.com/images/sky/7/72/jzg2hgcejjb1nsj29u4jh8kr07u3aao.png"],["吸蟹伯爵面具礼包",18,"2023","ohqf3t0fczgilva4z411qvllmdoh8fd.png","https://patchwiki.biligame.com/images/sky/2/29/ohqf3t0fczgilva4z411qvllmdoh8fd.png"],["周年庆抱枕礼包",68,"2023","fpm800hoifjcjnsuxyi3et1vn0wiyhs.png","https://patchwiki.biligame.com/images/sky/7/74/fpm800hoifjcjnsuxyi3et1vn0wiyhs.png"],["园丁装扮礼包",68,"2023","e2n5neo3ilzdzpkn6bu60p6b9mazu07.png","https://patchwiki.biligame.com/images/sky/4/47/e2n5neo3ilzdzpkn6bu60p6b9mazu07.png"],["夏日冲浪礼包",98,"2023","qtk7of8v71pfexiimro1d36boo6knth.png","https://patchwiki.biligame.com/images/sky/a/a3/qtk7of8v71pfexiimro1d36boo6knth.png"],["夏日凉鞋礼包",68,"2023","p229avnjacjv37jyktcjepbb4pt063x.png","https://patchwiki.biligame.com/images/sky/3/3c/p229avnjacjv37jyktcjepbb4pt063x.png"],["夏日有友礼包",68,"2023","042f75btm3p39s1wpt13li1sr8nmg3k.png","https://patchwiki.biligame.com/images/sky/3/3c/042f75btm3p39s1wpt13li1sr8nmg3k.png"],["惊喜手杖礼包",98,"2023","qar6dr1cs2gwhjniytk03a71pcc5dqx.png","https://patchwiki.biligame.com/images/sky/d/d8/qar6dr1cs2gwhjniytk03a71pcc5dqx.png"],["文雀装扮礼包",68,"2023","3wlrp88uusff478iu4as4ojeo36uuvf.png","https://patchwiki.biligame.com/images/sky/8/8d/3wlrp88uusff478iu4as4ojeo36uuvf.png"],["时尚火焰墨镜礼包",18,"2023","hh87s4nuj1v56hj10vmp3bcsk1s7y7u.png","https://patchwiki.biligame.com/images/sky/9/94/hh87s4nuj1v56hj10vmp3bcsk1s7y7u.png"],["时尚爱心墨镜礼包",30,"2023","75p2aztblyppq6ufepb81afzyvkbavb.png","https://patchwiki.biligame.com/images/sky/f/fd/75p2aztblyppq6ufepb81afzyvkbavb.png"],["暖冬夹棉斗篷礼包",98,"2023","st5hctmgomfmbf6wo6ewzi7f899s8e3.png","https://patchwiki.biligame.com/images/sky/2/20/st5hctmgomfmbf6wo6ewzi7f899s8e3.png"],["暗彩装扮礼包",98,"2023","5pnnld5qnc1gr01w1ease500fgptcpk.png","https://patchwiki.biligame.com/images/sky/4/47/5pnnld5qnc1gr01w1ease500fgptcpk.png"],["海龟斗篷礼包",98,"2023","fzlx13whh7r48vwwy8yrkatp48hk55h.png","https://patchwiki.biligame.com/images/sky/6/69/fzlx13whh7r48vwwy8yrkatp48hk55h.png"],["灯笼礼包",98,"2023","hwwa8qutic5bbr4hsmxqje4sh3lys2n.png","https://patchwiki.biligame.com/images/sky/9/95/hwwa8qutic5bbr4hsmxqje4sh3lys2n.png"],["玉兔拖鞋礼包",45,"2023","tmvlktqv5sp0z02sqow68qhpku94jva.png","https://patchwiki.biligame.com/images/sky/a/a9/tmvlktqv5sp0z02sqow68qhpku94jva.png"],["玉兔礼包",18,"2023","p8sgmqmkmccpa3t36kxhyqdp5m671w1.png","https://patchwiki.biligame.com/images/sky/b/b3/p8sgmqmkmccpa3t36kxhyqdp5m671w1.png"],["祥云瑞气服饰礼包",68,"2023","mokbbvuoo95l169qiepofwfnxvcifoe.png","https://patchwiki.biligame.com/images/sky/6/6d/mokbbvuoo95l169qiepofwfnxvcifoe.png"],["祥云瑞气纸伞礼包",98,"2023","034bdd2rk7msyjp2kaqmgz1oofbch6f.png","https://patchwiki.biligame.com/images/sky/a/ae/034bdd2rk7msyjp2kaqmgz1oofbch6f.png"],["自然之声礼包",30,"2023","81igejsf9vrfgw7g691ojnybta4asek.png","https://patchwiki.biligame.com/images/sky/7/7d/81igejsf9vrfgw7g691ojnybta4asek.png"],["蛛丝斗篷礼包",98,"2023","9q4h6orvnksv15zee7fisdisglkm013.png","https://patchwiki.biligame.com/images/sky/6/64/9q4h6orvnksv15zee7fisdisglkm013.png"],["跃动跑鞋礼包",45,"2023","o62cv8obf4yjcuh3n6vmhakhpizm7tu.png","https://patchwiki.biligame.com/images/sky/f/f0/o62cv8obf4yjcuh3n6vmhakhpizm7tu.png"],["野餐礼包",128,"2023","4gttca0gzgairp8ssiek6ztqiou9mka.png","https://patchwiki.biligame.com/images/sky/4/44/4gttca0gzgairp8ssiek6ztqiou9mka.png"],["阔腿牛仔裤礼包",68,"2023","qc0ne4vto3cg0f1wv80r4zsl34s3juz.png","https://patchwiki.biligame.com/images/sky/b/bf/qc0ne4vto3cg0f1wv80r4zsl34s3juz.png"],["雏鸟之琴礼包",30,"2023","fu5ssiikazhlwi8usdcwp0m5bpovyp8.png","https://patchwiki.biligame.com/images/sky/1/1f/fu5ssiikazhlwi8usdcwp0m5bpovyp8.png"],["雪人暖心靴礼包",45,"2023","6ncuccp7ykjyhx0yiluep7vj1q9zgz8.png","https://patchwiki.biligame.com/images/sky/6/62/6ncuccp7ykjyhx0yiluep7vj1q9zgz8.png"],["音韵吉他礼包",98,"2023","0aa2o338lf8nw6a66rub7kgeis1v5co.png","https://patchwiki.biligame.com/images/sky/a/a0/0aa2o338lf8nw6a66rub7kgeis1v5co.png"],["飞蛾装扮礼包",68,"2023","r4kw0bkmd7bjm47nkllx2c8kkn2ivzg.png","https://patchwiki.biligame.com/images/sky/8/84/r4kw0bkmd7bjm47nkllx2c8kkn2ivzg.png"],["优雅小憩茶桌礼包",128,"2022","50xn1q06nhi95xi1d5gqpcmji5hf3ej.png","https://patchwiki.biligame.com/images/sky/1/18/50xn1q06nhi95xi1d5gqpcmji5hf3ej.png"],["保暖雪人斗篷礼包",98,"2022","su5db650j13gk339ohu8u5p3nt55k34.png","https://patchwiki.biligame.com/images/sky/b/b4/su5db650j13gk339ohu8u5p3nt55k34.png"],["周年庆电吉他礼包",198,"2022","8fe0gyk7n5aktuyqq9fhw71hyc2ftt6.png","https://patchwiki.biligame.com/images/sky/7/7e/8fe0gyk7n5aktuyqq9fhw71hyc2ftt6.png"],["奉献斗篷礼包",98,"2022","r5q0xvyi72jypt6f9c9ps9yzq3cgi2i.png","https://patchwiki.biligame.com/images/sky/9/91/r5q0xvyi72jypt6f9c9ps9yzq3cgi2i.png"],["奔离远行发型礼包",18,"2022","tdhwt2z8o9agdvm6r5yl49kjtzcvh2f.png","https://patchwiki.biligame.com/images/sky/3/3c/tdhwt2z8o9agdvm6r5yl49kjtzcvh2f.png"],["奔离远行服饰礼包",68,"2022","8wok0qcswn8p3t2uist0s0hmel4inlc.png","https://patchwiki.biligame.com/images/sky/1/1f/8wok0qcswn8p3t2uist0s0hmel4inlc.png"],["年年有鱼礼包",128,"2022","molkllm797qub2tpzvf794crspb45wy.png","https://patchwiki.biligame.com/images/sky/b/bb/molkllm797qub2tpzvf794crspb45wy.png"],["彩虹耳机礼包",68,"2022","0xku2mbsc6qv3ve47d6na8w3cektih7.png","https://patchwiki.biligame.com/images/sky/e/e6/0xku2mbsc6qv3ve47d6na8w3cektih7.png"],["彩虹耳饰礼包",18,"2022","gmriey7t46vrvprc87suawq39bzgkv5.png","https://patchwiki.biligame.com/images/sky/2/2a/gmriey7t46vrvprc87suawq39bzgkv5.png"],["情人小船礼包",128,"2022","6ddx32h8q03xp9b5mqqaji46nwt0624.png","https://patchwiki.biligame.com/images/sky/5/5d/6ddx32h8q03xp9b5mqqaji46nwt0624.png"],["星月头冠礼包",30,"2022","5v8v8eg32nkgdbvhuxdcwpqprnbarte.png","https://patchwiki.biligame.com/images/sky/e/ef/5v8v8eg32nkgdbvhuxdcwpqprnbarte.png"],["欧若拉之声礼包",98,"2022","hua52hnznpkb7iqy7gsds4l7dvlqtna.png","https://patchwiki.biligame.com/images/sky/7/74/hua52hnznpkb7iqy7gsds4l7dvlqtna.png"],["欧若拉之翼礼包",168,"2022","fsynhmfv365azmmrrwvqbg5j3cjayzx.png","https://patchwiki.biligame.com/images/sky/f/fc/fsynhmfv365azmmrrwvqbg5j3cjayzx.png"],["球赛礼包",98,"2022","thnen713v2e905xrqdbtokx3p1dncik.png","https://patchwiki.biligame.com/images/sky/d/da/thnen713v2e905xrqdbtokx3p1dncik.png"],["皮皮猫礼包",68,"2022","egxxucfxzkh9bkb9je4c4yopl9bow70.png","https://patchwiki.biligame.com/images/sky/8/87/egxxucfxzkh9bkb9je4c4yopl9bow70.png"],["皮皮猫装扮礼包",128,"2022","t8tuvs5hhkl6huhvxs07efujbir0bb6.png","https://patchwiki.biligame.com/images/sky/a/a7/t8tuvs5hhkl6huhvxs07efujbir0bb6.png"],["致爱装扮礼包",68,"2022","lcvr1bz5iklic2ppcs5eal5dpvhnoad.png","https://patchwiki.biligame.com/images/sky/c/cf/lcvr1bz5iklic2ppcs5eal5dpvhnoad.png"],["鲤跃龙门礼包",12,"2022","90uid4est3kw0c2k521y2bq50cfszit.png","https://patchwiki.biligame.com/images/sky/8/84/90uid4est3kw0c2k521y2bq50cfszit.png"],["万圣节礼包",198,"2021","se0rvx1dr88tfpooe9lt9f3uuw36xd9.png","https://patchwiki.biligame.com/images/sky/2/2f/se0rvx1dr88tfpooe9lt9f3uuw36xd9.png"],["冥龙南瓜礼包",12,"2021","53c9c1r12ketc6oh0w60et1m20vh81z.png","https://patchwiki.biligame.com/images/sky/8/8f/53c9c1r12ketc6oh0w60et1m20vh81z.png"],["夏日阳伞礼包",128,"2021","4e45illv0s5ohpfrap820nvunyun6ta.png","https://patchwiki.biligame.com/images/sky/9/90/4e45illv0s5ohpfrap820nvunyun6ta.png"],["多彩绒绒帽礼包",68,"2021","1im0kly8ht5ywb7eovdtnjua4c0a92s.png","https://patchwiki.biligame.com/images/sky/f/f1/1im0kly8ht5ywb7eovdtnjua4c0a92s.png"],["大桔大利礼包",6,"2021","0lc3nsd0b0zo58zjyxte2cmpqwmxn3w.png","https://patchwiki.biligame.com/images/sky/1/17/0lc3nsd0b0zo58zjyxte2cmpqwmxn3w.png"],["女巫帽礼包",68,"2021","93u6t8wr28217g2lf2iv0j1cdgtvkfm.png","https://patchwiki.biligame.com/images/sky/7/71/93u6t8wr28217g2lf2iv0j1cdgtvkfm.png"],["小王子围巾礼包",98,"2021","jubgeqdpbuufmfd46javhbrg4i0mu9o.png","https://patchwiki.biligame.com/images/sky/f/f4/jubgeqdpbuufmfd46javhbrg4i0mu9o.png"],["小王子小行星斗篷礼包",168,"2021","pb7e3eenujugoxvpy3p6hzxtlgfpx1x.png","https://patchwiki.biligame.com/images/sky/f/f0/pb7e3eenujugoxvpy3p6hzxtlgfpx1x.png"],["小王子狐狸礼包",68,"2021","2kgdwqwn8kahgfcw3x490ob2pxkkr7n.png","https://patchwiki.biligame.com/images/sky/e/ef/2kgdwqwn8kahgfcw3x490ob2pxkkr7n.png"],["巫树犄角礼包",68,"2021","rmn3y2dyclqbxx7ala0br3zh1yg95sh.png","https://patchwiki.biligame.com/images/sky/8/87/rmn3y2dyclqbxx7ala0br3zh1yg95sh.png"],["情人秋千礼包",128,"2021","ig9ftmlwn47r73h3cfyyq1slbgn44l3.png","https://patchwiki.biligame.com/images/sky/2/26/ig9ftmlwn47r73h3cfyyq1slbgn44l3.png"],["情人跷跷板礼包",128,"2021","r3neimrrhs260hbf0ojllm24f7idhhs.png","https://patchwiki.biligame.com/images/sky/f/f5/r3neimrrhs260hbf0ojllm24f7idhhs.png"],["新春福娃礼包",168,"2021","ow38rgt6jxcwbsvulz6ie6zrdun94y5.png","https://patchwiki.biligame.com/images/sky/1/1e/ow38rgt6jxcwbsvulz6ie6zrdun94y5.png"],["暖冬瑞雪礼包",98,"2021","m5bbno2hx6dkjrcvsh29e7ba74d53vu.png","https://patchwiki.biligame.com/images/sky/6/6d/m5bbno2hx6dkjrcvsh29e7ba74d53vu.png"],["清香粽叶礼包",98,"2021","apyx4k8yqpo0y5d5flt7nc4tmau5egi.png","https://patchwiki.biligame.com/images/sky/f/ff/apyx4k8yqpo0y5d5flt7nc4tmau5egi.png"],["温暖绒帽礼包",68,"2021","4am4fwus1xwywt8rryspiah2p2s860k.png","https://patchwiki.biligame.com/images/sky/c/c9/4am4fwus1xwywt8rryspiah2p2s860k.png"],["疯女巫长裙礼包",68,"2021","r963z72wrk7zl919bfqgr6a8xoizp7x.png","https://patchwiki.biligame.com/images/sky/e/e4/r963z72wrk7zl919bfqgr6a8xoizp7x.png"],["花憩茶桌礼包",128,"2021","2990aky3u1p0025f6db382wtq9btfz9.png","https://patchwiki.biligame.com/images/sky/3/36/2990aky3u1p0025f6db382wtq9btfz9.png"],["蛛网斗篷礼包",98,"2021","56djv6ok350r8aaxnh88ewkxuh0kvjp.png","https://patchwiki.biligame.com/images/sky/1/11/56djv6ok350r8aaxnh88ewkxuh0kvjp.png"],["蛛网朋克礼包",30,"2021","9ksrxgyzjeg3hj8fgeml7n22rl3net0.png","https://patchwiki.biligame.com/images/sky/4/48/9ksrxgyzjeg3hj8fgeml7n22rl3net0.png"],["贝壳发夹礼包",6,"2021","fjvg5xgviutd4hco07htd3umibks7t2.png","https://patchwiki.biligame.com/images/sky/8/81/fjvg5xgviutd4hco07htd3umibks7t2.png"],["中国绊爱大铁头礼包",98,"2020","59lmz6yx6uoubk7e23wvlluvvvuk1fv.png","https://patchwiki.biligame.com/images/sky/4/41/59lmz6yx6uoubk7e23wvlluvvvuk1fv.png"],["中国绊爱套装礼包",128,"2020","b1kp8kul8axrp61wip69ja20h389653.png","https://patchwiki.biligame.com/images/sky/f/f8/b1kp8kul8axrp61wip69ja20h389653.png"],["创始人礼包",30,"2019","6lay6ppm0of7oo9u5nqfpi6ydjj3qh8.png","https://patchwiki.biligame.com/images/sky/e/e1/6lay6ppm0of7oo9u5nqfpi6ydjj3qh8.png"],["合伙人礼包",198,"2019","936p5uzzghnibdnsb9nsyrr3pz16qma.png","https://patchwiki.biligame.com/images/sky/d/d2/936p5uzzghnibdnsb9nsyrr3pz16qma.png"]];

	var GIFT_CSS = WING_CSS.replace(/sky-wing-/g, 'sky-gift-') +
		'.sky-gift-tabs{display:flex;gap:8px;margin-bottom:10px}' +
		'.sky-gift-tab{flex:1;height:34px;border-radius:12px;border:1px solid var(--glass-bd);' +
		'background-color:var(--glass-bg-2);font-size:12px;font-weight:600;color:var(--text-dim);cursor:pointer;padding:0}' +
		'.sky-gift-tab.on{color:var(--btn-txt);border-color:transparent;background:linear-gradient(120deg,var(--btn-a),var(--btn-b))}' +
		'.sky-gift-pane{display:none}.sky-gift-pane.on{display:block}' +
		'.sky-gift-stat{display:flex;gap:8px;margin-top:2px}' +
		'.sky-gift-list{margin-top:10px;border:1px solid var(--glass-bd);border-radius:14px;' +
		'background-color:var(--glass-bg-2);overscroll-behavior:contain}' +
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

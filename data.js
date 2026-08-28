// GUNFIGHT 遊戲資料庫 - 二次元鋼鐵機靈特別版 (男版科幻風)
const GUNFIGHT_DATA = {
  // 1. 醬料瓶槍械系統 (20種)
  weapons: [
    { id: "RECON_PIS", name: "番茄醬擠壓瓶 (Ketchup Pistol)", type: "firearm", subType: "pistol", dmg: 22, fr: 300, mag: 12, ammo: 48, price: 0, rarity: "Common", desc: "標配的紅番茄醬擠壓瓶，回充迅速，是新手防身的標配淋醬工具。", color: "#ff0000" },
    { id: "PULSE_PIS", name: "蜂蜜芥末醬瓶 (Mustard Pulse)", type: "firearm", subType: "pistol", dmg: 28, fr: 250, mag: 15, ammo: 60, price: 800, rarity: "Rare", desc: "發射高頻黃芥末脈衝的半自動噴醬罐，彈道在黑暗中留下金黃色能量軌跡。", color: "#ffcc00" },
    { id: "SILENT_PIS", name: "黑芝麻沙拉醬瓶 (Sesame Sauce)", type: "firearm", subType: "pistol", dmg: 25, fr: 200, mag: 10, ammo: 40, price: 1000, rarity: "Rare", desc: "配備微型噴嘴的匿蹤黑芝麻醬瓶，噴塗時聲響接近虛無，適合夜間突襲。", color: "#333333" },
    { id: "HEAVY_PIS", name: "超辣地獄辣油罐 (Hell Chili Oil)", type: "firearm", subType: "pistol", dmg: 55, fr: 600, mag: 6, ammo: 24, price: 1500, rarity: "Epic", desc: "手持式超載地獄紅椒辣油罐，單發威力驚人，後座力會讓未受訓練的右手辣得發麻！", color: "#cc0000" },
    { id: "LIGHT_SMG", name: "泰式酸辣醬噴壺 (Thai Chili Spray)", type: "firearm", subType: "smg", dmg: 18, fr: 80, mag: 30, ammo: 120, price: 1200, rarity: "Common", desc: "高射速、輕量化的微型速射酸辣醬噴瓶，能夠在極短時間內傾瀉大量紅油彈幕。", color: "#ff6600" },
    { id: "VECTOR_SMG", name: "日式照燒醬瓶 (Teriyaki Sauce)", type: "firearm", subType: "smg", dmg: 16, fr: 60, mag: 35, ammo: 140, price: 1800, rarity: "Rare", desc: "配備動能反饋核心的照燒醬瓶，近距離作戰時能爆發出毀滅性的甜鹹火力。", color: "#4a2c11" },
    { id: "PLASMA_SMG", name: "青醬羅勒油噴槍 (Pesto Oil Spray)", type: "firearm", subType: "smg", dmg: 22, fr: 90, mag: 25, ammo: 100, price: 2200, rarity: "Epic", desc: "發射高溫羅勒油的突擊噴槍，綠色彈道如雷光交錯，能對目標裝甲造成融熔效果。", color: "#228b22" },
    { id: "SHIFT_AR", name: "美式燒烤醬噴射槍 (BBQ Sauce)", type: "firearm", subType: "ar", dmg: 32, fr: 120, mag: 30, ammo: 90, price: 0, rarity: "Common", desc: "制式美式燒烤醬噴射步槍，中遠距離表現極佳，是星際聯盟軍隊的王牌裝備。", color: "#8b4513" },
    { id: "PHANTOM_AR", name: "松露沙拉醬噴槍 (Truffle Mayo)", type: "firearm", subType: "ar", dmg: 35, fr: 130, mag: 30, ammo: 90, price: 2000, rarity: "Rare", desc: "機甲特種部隊偏好的松露美乃滋步槍，射擊時能完全干擾敵方的熱能偵測儀。", color: "#f5f5dc" },
    { id: "CYBER_AR", name: "智能凱薩沙拉醬瓶 (Caesar Dressing)", type: "firearm", subType: "ar", dmg: 38, fr: 110, mag: 28, ammo: 84, price: 3000, rarity: "Epic", desc: "與大腦輔助計算晶片直接連結的智能凱薩醬瓶，精準度會隨戰鬥意志上升。", color: "#fff8dc" },
    { id: "TITAN_AR", name: "雷神濃縮煉乳炮 (Condensed Milk)", type: "firearm", subType: "ar", dmg: 45, fr: 150, mag: 25, ammo: 75, price: 5000, rarity: "Legendary", desc: "傳奇級超載甜香煉乳炮，開火時發射粘稠乳白彈，擊中時會產生連鎖電弧反應！", color: "#fffacd" },
    { id: "NEON_SHOTGUN", name: "千島醬爆裂發射器 (Thousand Island)", type: "firearm", subType: "shotgun", dmg: 80, fr: 800, mag: 6, ammo: 18, price: 1600, rarity: "Rare", desc: "近距離的霸者！一次發射 8 顆粉紅千島醬火球，能瞬間汽化敵方的物理防盾。", color: "#ffb6c1" },
    { id: "REAPER_SHOTGUN", name: "花生醬重力噴塗器 (Peanut Butter)", type: "firearm", subType: "shotgun", dmg: 105, fr: 1000, mag: 5, ammo: 15, price: 2400, rarity: "Epic", desc: "配備重力收束環的重型花生醬噴塗器，超大黏稠威力，近身駁火無人能敵。", color: "#d2b48c" },
    { id: "BURST_RIFLE", name: "黑胡椒醬三連發槍 (Black Pepper)", type: "firearm", subType: "ar", dmg: 26, fr: 180, mag: 30, ammo: 90, price: 1700, rarity: "Rare", desc: "利用超導磁軌進行高速三連發的黑胡椒醬槍，開火瞬間會留下一道深灰色的星軌。", color: "#555555" },
    { id: "SCOUT_DMR", name: "香醋沙拉汁狙擊瓶 (Vinaigrette)", type: "firearm", subType: "dmr", dmg: 50, fr: 400, mag: 10, ammo: 40, price: 2200, rarity: "Rare", desc: "精確噴射紫香醋沙拉汁的步槍，高射速與穩定的彈道非常適合中距離壓制。", color: "#4b0082" },
    { id: "LASER_DMR", name: "紅蓮辣醬聚能噴槍 (Hot Sriracha)", type: "firearm", subType: "dmr", dmg: 65, fr: 350, mag: 8, ammo: 32, price: 3500, rarity: "Epic", desc: "發射高聚能亮紅是拉差辣醬，彈道極其筆直，能直接射穿並融化多層合金牆。", color: "#e60000" },
    { id: "PULSE_SNIPER", name: "焦糖糖漿重力狙擊罐 (Caramel Syrup)", type: "firearm", subType: "sniper", dmg: 105, fr: 1200, mag: 5, ammo: 15, price: 4000, rarity: "Epic", desc: "栓動式重力扭曲焦糖糖漿狙擊罐，子彈飛行軌跡呈粘稠螺旋星雲狀。", color: "#d2691e" },
    { id: "GHOST_SNIPER", name: "超導芝士淋醬大炮 (Cheese Fondue)", type: "firearm", subType: "sniper", dmg: 150, fr: 1800, mag: 5, ammo: 15, price: 6500, rarity: "Legendary", desc: "傳奇級超導電磁軌道芝士淋醬大炮，金黃芝士一發貫穿，連機甲都能直接粘住狙穿！", color: "#ffa500" },
    { id: "NANO_LMG", name: "無限回充美乃滋機槍 (Infinite Mayo)", type: "firearm", subType: "lmg", dmg: 28, fr: 100, mag: 80, ammo: 160, price: 3800, rarity: "Epic", desc: "彈箱配備微型美乃滋重組模組，攜彈量巨大，是戰場壓制與掩護的利器。", color: "#fffff0" },
    { id: "APOCALYPSE_LMG", name: "終焉超載熔岩芝士槍 (Apocalypse Cheese)", type: "firearm", subType: "lmg", dmg: 33, fr: 90, mag: 100, ammo: 200, price: 6000, rarity: "Legendary", desc: "傳奇級終端熔岩芝士重機槍，開火時間越長，槍管噴出的金黃熱芝士流越猛！", color: "#ff8c00" }
  ],

  // 2. 麵包防護與生魚片近戰系統 (10種)
  defense: [
    { id: "LIGHT_VEST", name: "香脆切片土司背心 (Slice Toast)", type: "armor", armorValue: 50, price: 0, rarity: "Common", desc: "輕型機甲駕駛服，由香脆切片吐司製成，提供基礎防護與戰術掛載點。" },
    { id: "NANO_SHIELD", name: "硬皮牛角包防護盾 (Croissant Shield)", type: "armor", armorValue: 80, price: 800, rarity: "Rare", desc: "法式烘焙硬皮牛角包，表面堅硬香脆，能有效抵擋實體子彈的衝擊。" },
    { id: "BULWARK_VEST", name: "黑麥大圓麵包胸甲 (Rye Bread Plate)", type: "armor", armorValue: 120, price: 1800, rarity: "Epic", desc: "覆蓋上軀幹的重型德式黑麥雜糧麵包胸甲，防護力驚人，能吸收爆發性傷害。" },
    { id: "FORCE_FIELD", name: "全息黃金菠蘿包力場 (Pineapple Aegis)", type: "armor", armorValue: 180, price: 3500, rarity: "Legendary", desc: "傳奇防禦：扭曲局部空間召喚黃金脆皮菠蘿包，提供極高強度的外酥內軟防護罩！" },
    { id: "COMBAT_KNIFE", name: "鮮切挪威鮭魚生魚片 (Salmon Sashimi)", type: "melee", dmg: 45, fr: 400, price: 0, rarity: "Common", desc: "標準制式鮮切鮭魚，魚肉紋理清晰，利用油脂震動輕易切開金屬線纜。" },
    { id: "ENERGY_SABER", name: "黃金玉子燒壽司刃 (Tamago Saber)", type: "melee", dmg: 75, fr: 500, price: 1500, rarity: "Rare", desc: "金黃能量束玉子燒刀，啟動時刀身呈金黃色高溫流體，揮舞時產生甜甜的音爆。" },
    { id: "SHOCK_BATON", name: "北極甜蝦串刺刀 (Shrimp Baton)", type: "melee", dmg: 60, fr: 450, price: 1200, rarity: "Rare", desc: "高壓甜蝦串刺刀，擊中時釋放甜甜的短路電弧，干擾對方的機載電子儀器。" },
    { id: "PLASMA_BLADE", name: "雙生深海鮪魚生魚片 (Twin Tuna)", type: "melee", dmg: 90, fr: 350, price: 2800, rarity: "Epic", desc: "雙手持用的深紅鮪魚片，連擊速度極快，在空中留下密集的血紅軌跡。" },
    { id: "NANITE_GLOVE", name: "巨大厚切鱘魚肚拳套 (Sturgeon Glove)", type: "melee", dmg: 80, fr: 300, price: 2500, rarity: "Epic", desc: "手部鱘魚肚肉拳套，開拳時能激發小範圍油脂加速，一拳開山裂石！" },
    { id: "GHOST_SCYTHE", name: "極光帝王蟹腳長刀 (King Crab Leg)", type: "melee", dmg: 130, fr: 600, price: 5000, rarity: "Legendary", desc: "傳奇極限大蟹腳長鐮，蟹殼泛著橘紅色流光，大範圍橫掃，無堅不摧！" }
  ],

  // 3. 饅頭爆炸物系統 (5種)
  explosives: [
    { id: "GRENADE", name: "經典白糖大饅頭 (White Mantou)", type: "explosive", dmg: 120, area: 6, price: 0, rarity: "Common", desc: "投擲大饅頭後引爆局部麵粉粉塵爆炸，造成大範圍物質崩解傷害。" },
    { id: "EMP_BOMB", name: "養生黑糖雜糧饅頭 (Brown Sugar)", type: "explosive", dmg: 60, area: 8, price: 600, rarity: "Rare", desc: "釋放大量黑糖蒸汽的電磁干擾雜糧饅頭，對電子儀器造成癱瘓效果。" },
    { id: "INCENDIARY", name: "香甜芋泥包子 (Taro Bun)", type: "explosive", dmg: 90, area: 5, price: 900, rarity: "Rare", desc: "在爆心區域留下持續燃燒 5 秒的微型核聚變紫色芋泥烈焰，造成持續熔燒傷害。" },
    { id: "PLASMA_GRENADE", name: "超粘黑芝麻流沙包 (Sticky Sesame)", type: "explosive", dmg: 180, area: 4, price: 1500, rarity: "Epic", desc: "配備黑芝麻吸附底座的流沙包，能死死粘在任何機甲裝甲或牆壁表面。" },
    { id: "NANO_SWARM", name: "爆漿黃金流沙包 (Swarm Custard)", type: "explosive", dmg: 150, area: 7, price: 2800, rarity: "Legendary", desc: "傳奇流沙包，引爆後釋放數百個自動搜尋敵人的爆漿黃金粒子小導彈！" }
  ],  // 4. 特務造型 (20種)
  skins: [
    { id: "CADET", name: "波霸珍奶零號 (Bubble Tea Pilot)", rarity: "Common", price: 0, color: "#00e5ff", desc: "裝滿香濃黑糖珍珠與香醇奶茶的透明防暴杯，吸管斜插，甜度冰塊固定不可調整！", accent: "#00e5ff" },
    { id: "VANGUARD", name: "熱狗防衛軍上尉 (Hotdog Captain)", rarity: "Common", price: 500, color: "#a8c0cc", desc: "粗實的香烤紅椒香腸夾在金黃麵包中，淋上滿滿的黃芥末醬，是戰場上的能量來源。", accent: "#a8c0cc" },
    { id: "HACKER", name: "雙層起司牛肉堡駭客 (Burger Hacker)", rarity: "Rare", price: 1200, color: "#39ff14", desc: "兩片厚實多汁的火烤牛肉餅，夾著融化的切達起司與生菜，高熱量代碼的終極結晶。", accent: "#39ff14" },
    { id: "REBEL", name: "熱烈辣椒披薩少年 (Pizza Rebel)", rarity: "Rare", price: 1500, color: "#ff8c00", desc: "經典美式臘腸起司披薩切片，滿溢的芝士拉絲，熱辣的紅椒粉是他的反叛態度！", accent: "#ff8c00" },
    { id: "PREDATOR", name: "巧克力甜甜圈掠食者 (Donut Predator)", rarity: "Rare", price: 1800, color: "#ff2a2a", desc: "淋上濃郁黑巧克力醬與七彩糖針的甜甜圈，外酥內軟，具有極高殺傷力的糖分！", accent: "#ff2a2a" },
    { id: "INFILTRATOR", name: "鮭魚壽司特務 (Sushi Ninja)", rarity: "Rare", price: 2000, color: "#8b00ff", desc: "嚴選挪威冰鮮鮭魚排，鋪在香糯醋飯上，腰纏一條深綠色海苔緞帶，身手敏捷。", accent: "#8b00ff" },
    { id: "ENFORCER", name: "法治爆米花警官 (Popcorn Cop)", rarity: "Rare", price: 2200, color: "#1f75fe", desc: "紅白相間的奶油爆米花纸桶，滿溢的微焦奶油甜香，誓言打擊一切飢餓犯罪！", accent: "#1f75fe" },
    { id: "SHADOW", name: "深淵黑咖啡特警 (Coffee Shadow)", rarity: "Epic", price: 3000, color: "#1a1c23", desc: "無糖雙倍濃縮黑咖啡紙杯，提神醒腦的強效代劑，在陰影中提供不眠不休的警戒力。", accent: "#5c5e69" },
    { id: "CYCLONE", name: "流線霜淇淋少校 (Ice Cream Major)", rarity: "Epic", price: 3200, color: "#00e5ff", desc: "粉紅草莓與青藍薄荷雙色霜淇淋，頂部插著威化餅乾，融化速度極快，身手如風。", accent: "#00e5ff" },
    { id: "SPECTRE", name: "法式香蒜長棍遊俠 (Baguette Ranger)", rarity: "Epic", price: 3500, color: "#e0e0e0", desc: "外皮焦脆、內裡韌勁的經典法式長棍麵包，斜切數刀塗抹香蒜奶油，堅硬無比。", accent: "#ffffff" },
    { id: "CHRONO", name: "黃金焦糖馬卡龍 (Macaron Chrono)", rarity: "Epic", price: 3800, color: "#ffd700", desc: "精緻小巧的法式焦糖夾心馬卡龍，外殼帶有黃金蕾絲邊，時空能量藏在夾心之中。", accent: "#ffd700" },
    { id: "OVERLORD", name: "深淵火烤土雞霸王 (Turkey Overlord)", rarity: "Epic", price: 4000, color: "#4a0e17", desc: "烤至外皮金黃酥脆的整隻感恩節火雞，兩根滾圓的雞腿骨插在尾部，霸氣外露。", accent: "#ff4d6d" },
    { id: "ECLIPSE", name: "星蝕超載辣條使徒 (Spicy Strip Eclipse)", rarity: "Epic", price: 4200, color: "#ff4500", desc: "紅油發亮的香辣麵筋條，充滿了香辛料與孜然的致命誘惑力，超載了所有味蕾！", accent: "#ff4500" },
    { id: "VALKYRIE", name: "機甲草莓甜筒 (Strawberry Cone)", rarity: "Epic", price: 4500, color: "#ff007f", desc: "華夫餅甜筒插著三顆滾圓的草莓與香草冰淇淋球，背後展開一對粉色糖衣羽翼。", accent: "#ff007f" },
    { id: "NEON_ASSASSIN", name: "霓虹糖果包裝男孩 (Candy Boy)", rarity: "Epic", price: 4800, color: "#ff00ff", desc: "包裹在霓虹熒光粉與青色包裝紙內的水果軟糖，酸甜可口，街頭潮流的代名詞。", accent: "#ff00ff" },
    { id: "GHOST_RIDER", name: "星能熔岩烤布蕾 (Lava Creme Brulee)", rarity: "Legendary", price: 6000, color: "#00ffff", desc: "焦糖脆皮下流淌著滾燙熔岩奶黃的布蕾杯，散發出致命的甜香與高熱量火焰！", accent: "#00ffff" },
    { id: "TITAN", name: "重裝薯條學長 (French Fries Titan)", rarity: "Legendary", price: 6500, color: "#ff5500", desc: "經典紅色紙盒盛裝的酥脆黃金薯條，每一根都均勻撒鹽，是戰場上不可或缺的巨砲！", accent: "#ff5500" },
    { id: "ZEUS", name: "天罰爆漿章魚燒 (Takoyaki Zeus)", rarity: "Legendary", price: 7000, color: "#00aaff", desc: "三顆剛出爐的金黃章魚小丸子，淋上照燒醬、美乃滋與跳動的柴魚片，電弧四射！", accent: "#00aaff" },
    { id: "ONI", name: "修羅豚骨拉麵侍衛 (Ramen Samurai)", rarity: "Legendary", price: 8000, color: "#990000", desc: "經典日式豚骨拉麵大碗，盛滿了金黃麵條、叉燒與溏心蛋，湯頭極其濃郁！", accent: "#ff0000" },
    { id: "AMTERASU", name: "天照三層婚禮蛋糕 (Rainbow Cake)", rarity: "Legendary", price: 9000, color: "#ffffff", desc: "尊貴無比的三層虹彩鮮奶油生日蛋糕，頂端點綴著一顆飽滿多汁的紅艷草莓。", accent: "#ffffcc" }
  ],

  // 5. 戰鬥地圖 (15張)
  maps: [
    { id: "SLUMS", name: "新東京空島基地 (Neo Tokyo Sky Base)", risk: "戰區競賽 (High Risk)", desc: "漂浮在新東京上空的戰術防衛空島，金屬走廊、雷達天線錯落，是機甲實彈駁火的熱門區域！", theme: "#00e5ff", color: "#00e5ff" },
    { id: "NEXUS", name: "軌道太空樞紐 (Orbital Space Nexus)", risk: "太空廊道 (Zero Gravity)", desc: "星際太空港內部的圓柱走廊，具有超長視距通道與大型電磁冷卻管掩體。", theme: "#00bfff", color: "#00bfff" },
    { id: "OUTPOST", name: "機甲整備港口 (Mech Assembly Docks)", risk: "前哨基地 (High Tech)", desc: "整備巨大機甲的船塢月台，四周堆滿能量儲存罐與金屬裝卸箱，視野開闊適合作戰。", theme: "#ff9900", color: "#ff9900" },
    { id: "ABYSS", name: "星能水晶深淵 (Cosmic Energy Abyss)", risk: "深空水晶礦 (Mystery)", desc: "地表底部的發光星能礦場，由窄窄的鐵絲網吊橋與易爆水晶簇組成的危險礦坑區。", theme: "#8b00ff", color: "#8b00ff" },
    { id: "ICEFIELD", name: "極光冰原科考站 (Aurora Icefield Station)", risk: "極寒對戰 (Frosty)", desc: "極地科考站外部的冰川雪原，建有厚重半透光的加固玻璃牆障礙物，考驗槍法與站位。", theme: "#00e5ff", color: "#00e5ff" },
    { id: "DOWNTOWN", name: "秋葉原電器霓虹街 (Akihabara Neon Street)", risk: "二次元聖地 (Hyper Active)", desc: "二次元全息廣告牌、動漫痛車、扭蛋機林立的熱鬧街區，霓虹交錯、掩體多變！", theme: "#ff00ff", color: "#ff00ff" },
    { id: "FORTRESS", name: "風砂荒野防禦塔 (Desert Defense Fortress)", risk: "荒原防衛 (Windy)", desc: "風沙肆虐的廢棄荒漠要塞，聳立著重力防禦塔與防沙壕溝，是狙擊手大顯身手的舞台。", theme: "#ffd700", color: "#ffd700" },
    { id: "SPACEPORT", name: "廢棄太空駁船庫 (Abandoned Spaceport)", risk: "機甲墳場 (Danger)", desc: "停滿半毀護衛艦與機械殘骸的廢棄港口，有大量可破壞的鋼鐵機匣遮蔽物。", theme: "#8a9ea7", color: "#8a9ea7" },
    { id: "LAVA", name: "熔岩核心發電廠 (Lava Core Station)", risk: "高溫警報 (Extremely Dangerous)", desc: "熔岩冷卻管道縱橫交錯的地下重力發電廠，稍有不慎跌落會遭受高溫輻射熔融傷害！", theme: "#ff4500", color: "#ff4500" },
    { id: "GRID", name: "全息模擬數據沙盒 (Hologram Sandbox Grid)", risk: "全息矩陣 (Minimalist)", desc: "純數字向量晶格構成的戰術模擬沙盤，藍紫色極簡幾何障礙，純粹的槍法對決。", theme: "#33ccff", color: "#33ccff" },
    { id: "SUBBASE", name: "深海蔚藍科研所 (Deep Sea Research Sub)", risk: "水下要塞 (Submerged)", desc: "建在深海巨溝之中的加壓基地，隔著鋼化玻璃窗能觀察發光海底生物，轉角折角極多。", theme: "#1f75fe", color: "#1f75fe" },
    { id: "GARDEN", name: "浮空懸浮植物島 (Floating botanical Island)", risk: "高空溫室 (Aether)", desc: "懸浮於萬米高空的生態模擬溫室，玻璃幕牆碎裂，包含多個圓柱噴泉及植被掩體。", theme: "#ff007f", color: "#ff007f" },
    { id: "BIOLAB", name: "基因生化培養禁區 (Gene Bio-Lab Sector)", risk: "生化隔離 (Bio Hazard)", desc: "排列著綠色生化培養液艙的隔離實驗室，散落的儀器車和密封門可用作戰術掩護。", theme: "#00ff66", color: "#00ff66" },
    { id: "VAULT", name: "星能核心冷卻機房 (Vortex Core Vault)", risk: "超算冷卻 (Cooling)", desc: "存放巨量高能重組超算陣列的冷卻機房，四處散發著幽藍熒光，冷氣刺骨廊道深長。", theme: "#007fff", color: "#007fff" },
    { id: "TEMPLE", name: "遠古遺跡觀測台 (Ancient Ruins Observatory)", risk: "神殿遺跡 (Sacred)", desc: "古代超文明遺跡與現代觀測儀器融合的高台，高大石柱與雕像可作為厚重掩體。", theme: "#ffd700", color: "#ffd700" }
  ]
};

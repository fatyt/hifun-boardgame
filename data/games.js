/*
 * 範例桌遊資料（原型用）。
 * 正式上線時可改由 Google 試算表提供，見 app.js 的 CONFIG.SHEET_CSV_URL 與「說明.md」。
 *
 * 欄位說明：
 *  name 名稱 / en 英文名 / min,max 人數 / time 分鐘 / age 建議年齡 / weight 難度 1輕 2中 3重
 *  tags 類型 / play 店內可玩 / rent 租借狀態：'可租'、'已租出' 或 ''（不出租）
 *  due 預計歸還日 / rentFee 租金 / price 售價（0 = 不販售）/ stock 庫存（0 = 可預訂）
 *  isNew 新品 / hot 熱門 / pick 店長推薦語 / video 教學影片網址
 *  images 輪播圖片（第一張會當作目錄卡片的封面；沒有圖片則顯示色塊封面）
 */
const SAMPLE_IMAGES = ["images/games/sample/box.svg", "images/games/sample/parts.svg", "images/games/sample/play.svg", "images/games/sample/rules.svg"];

window.GAMES = [
  { name: "璀璨寶石", en: "Splendor", min: 2, max: 4, time: 30, age: 10, weight: 1, tags: ["策略", "家庭"], play: true, rent: "可租", rentFee: 80, price: 1280, stock: 3, hot: true, pick: "規則五分鐘講完，卻越玩越有深度的入門經典。", images: ["images/games/splendor/box.png", "images/games/splendor/setup.png"] },
  { name: "卡坦島", en: "Catan", min: 3, max: 4, time: 75, age: 10, weight: 2, tags: ["策略", "家庭"], play: true, rent: "已租出", due: "11/28", rentFee: 120, price: 1650, stock: 1, hot: true, pick: "交易、談判、搶地盤，朋友聚會的不敗選擇。", images: SAMPLE_IMAGES.slice(0, 3) },
  { name: "小小世界", en: "Small World", min: 2, max: 5, time: 80, age: 8, weight: 2, tags: ["策略"], play: true, rent: "可租", rentFee: 120, price: 0, pick: "種族加能力的隨機組合，每局都有新笑點。" },
  { name: "卡卡頌", en: "Carcassonne", min: 2, max: 5, time: 40, age: 7, weight: 1, tags: ["家庭", "策略"], play: true, rent: "可租", rentFee: 80, price: 990, stock: 2, pick: "拼出城堡和道路，大人小孩都能上手。" },
  { name: "花磚物語", en: "Azul", min: 2, max: 4, time: 40, age: 8, weight: 1, tags: ["家庭", "策略"], play: true, rent: "可租", rentFee: 100, price: 1380, stock: 2, hot: true, pick: "磁磚手感一流，好看又好玩。", images: [SAMPLE_IMAGES[0], SAMPLE_IMAGES[2]] },
  { name: "妙語說書人", en: "Dixit", min: 3, max: 8, time: 30, age: 8, weight: 1, tags: ["派對", "家庭"], play: true, rent: "可租", rentFee: 80, price: 1100, stock: 0, pick: "用一句話描述一張畫，最考驗默契。" },
  { name: "機密代號", en: "Codenames", min: 4, max: 8, time: 20, age: 14, weight: 1, tags: ["派對", "推理"], play: true, rent: "可租", rentFee: 60, price: 690, stock: 4, hot: true, pick: "分兩隊猜詞，人越多越熱鬧。" },
  { name: "鐵道任務", en: "Ticket to Ride", min: 2, max: 5, time: 60, age: 8, weight: 1, tags: ["家庭"], play: true, rent: "已租出", due: "11/26", rentFee: 120, price: 1590, stock: 1, pick: "蓋鐵路完成路線任務，家庭聚會首選。" },
  { name: "情書", en: "Love Letter", min: 2, max: 6, time: 20, age: 10, weight: 1, tags: ["卡牌", "推理"], play: true, rent: "", price: 450, stock: 5, pick: "16 張牌就能玩，等人時的最佳小品。" },
  { name: "心靈同步", en: "The Mind", min: 2, max: 4, time: 20, age: 8, weight: 1, tags: ["合作", "卡牌"], play: true, rent: "可租", rentFee: 50, price: 390, stock: 3, pick: "不能說話，只靠感覺出牌，神奇的默契遊戲。" },
  { name: "政變", en: "Coup", min: 2, max: 6, time: 15, age: 13, weight: 1, tags: ["派對", "推理", "卡牌"], play: true, rent: "", price: 450, stock: 2, pick: "虛張聲勢、互相拆穿，十五分鐘一局。" },
  { name: "沙丘：帝國", en: "Dune: Imperium", min: 1, max: 4, time: 120, age: 14, weight: 3, tags: ["策略"], play: true, rent: "", price: 2280, stock: 1, isNew: true, pick: "牌庫構築加工人放置，重策略玩家必試。" },
  { name: "方舟動物園", en: "Ark Nova", min: 1, max: 4, time: 150, age: 14, weight: 3, tags: ["策略"], play: true, rent: "", price: 2580, stock: 0, hot: true, pick: "打造自己的動物園，重度玩家口碑之作。" },
  { name: "展翅翱翔", en: "Wingspan", min: 1, max: 5, time: 70, age: 10, weight: 2, tags: ["策略", "家庭"], play: true, rent: "可租", rentFee: 150, price: 1980, stock: 1, pick: "上百種鳥類卡，美術與策略兼具。" },
  { name: "卡斯卡迪亞", en: "Cascadia", min: 1, max: 4, time: 40, age: 10, weight: 1, tags: ["家庭"], play: true, rent: "可租", rentFee: 100, price: 1350, stock: 2, isNew: true, pick: "拼地形、放動物，療癒系的輕策略。" },
  { name: "國王骨牌", en: "Kingdomino", min: 2, max: 4, time: 15, age: 8, weight: 1, tags: ["家庭", "親子"], play: true, rent: "可租", rentFee: 60, price: 790, stock: 3, pick: "像玩骨牌一樣建王國，親子入門推薦。" },
  { name: "壽司狂歡", en: "Sushi Go!", min: 2, max: 5, time: 15, age: 8, weight: 1, tags: ["卡牌", "家庭", "親子"], play: true, rent: "", price: 390, stock: 6, pick: "可愛壽司輪流挑，規則一分鐘就會。" },
  { name: "爆炸貓", en: "Exploding Kittens", min: 2, max: 5, time: 15, age: 7, weight: 1, tags: ["派對", "卡牌"], play: true, rent: "可租", rentFee: 50, price: 650, stock: 2, pick: "抽到爆炸貓就出局，尖叫保證。" },
  { name: "德國心臟病", en: "Halli Galli", min: 2, max: 6, time: 15, age: 6, weight: 1, tags: ["派對", "親子"], play: true, rent: "可租", rentFee: 50, price: 590, stock: 4, pick: "看到五個水果就拍鈴，反應力大考驗。" },
  { name: "誰是牛頭王", en: "6 nimmt!", min: 2, max: 10, time: 45, age: 8, weight: 1, tags: ["派對", "卡牌"], play: true, rent: "可租", rentFee: 50, price: 450, stock: 3, pick: "最多十人同樂，團體活動常備款。" },
  { name: "花火", en: "Hanabi", min: 2, max: 5, time: 25, age: 8, weight: 1, tags: ["合作", "卡牌"], play: true, rent: "", price: 390, stock: 2, pick: "看得到別人的牌卻看不到自己的，合作經典。" },
  { name: "殖民火星", en: "Terraforming Mars", min: 1, max: 5, time: 120, age: 12, weight: 3, tags: ["策略"], play: true, rent: "", price: 2380, stock: 1, pick: "改造火星的引擎構築大作。" },
  { name: "瘟疫危機", en: "Pandemic", min: 2, max: 4, time: 45, age: 8, weight: 2, tags: ["合作"], play: true, rent: "可租", rentFee: 100, price: 1480, stock: 1, pick: "一起拯救世界，合作遊戲入門首選。" },
  { name: "骰子街", en: "Machi Koro", min: 2, max: 4, time: 30, age: 10, weight: 1, tags: ["家庭"], play: true, rent: "可租", rentFee: 60, price: 690, stock: 2, pick: "擲骰子蓋城市，輕鬆又有點小心機。" },
  { name: "拼布對決", en: "Patchwork", min: 2, max: 2, time: 30, age: 8, weight: 1, tags: ["雙人"], play: true, rent: "可租", rentFee: 60, price: 890, stock: 2, pick: "情侶、好友兩人對決的首選。" },
  { name: "失落的城市", en: "Lost Cities", min: 2, max: 2, time: 30, age: 10, weight: 1, tags: ["雙人", "卡牌"], play: true, rent: "", price: 690, stock: 1, pick: "簡單卻充滿取捨的雙人卡牌。" },
  { name: "拉密", en: "Rummikub", min: 2, max: 4, time: 60, age: 8, weight: 1, tags: ["家庭", "親子"], play: true, rent: "已租出", due: "11/25", rentFee: 80, price: 990, stock: 3, pick: "長輩小孩都會玩，過年必備。" },
  { name: "阿瓦隆", en: "The Resistance: Avalon", min: 5, max: 10, time: 30, age: 13, weight: 1, tags: ["派對", "推理"], play: true, rent: "可租", rentFee: 60, price: 590, stock: 2, hot: true, pick: "誰是壞人？大團體的推理攻防。" },
  { name: "終極一夜狼人", en: "One Night Ultimate Werewolf", min: 3, max: 10, time: 10, age: 8, weight: 1, tags: ["派對", "推理"], play: true, rent: "可租", rentFee: 50, price: 590, stock: 2, pick: "一晚定勝負，十分鐘一局的狼人殺。" },
  { name: "達文西密碼", en: "Coda", min: 2, max: 4, time: 15, age: 8, weight: 1, tags: ["推理", "親子"], play: true, rent: "", price: 350, stock: 4, pick: "推理對手的數字，小朋友超愛。" },
  { name: "Minecraft 建造與生態域", en: "Minecraft: Builders & Biomes", min: 2, max: 4, time: 60, age: 10, weight: 2, tags: ["家庭"], play: true, rent: "可租", rentFee: 100, price: 1290, stock: 1, pick: "Minecraft 迷必玩，挖方塊蓋建築。" },
  { name: "茂林源記", en: "Root", min: 2, max: 4, time: 90, age: 10, weight: 3, tags: ["策略"], play: false, rent: "", price: 2180, stock: 1, isNew: true, pick: "非對稱陣營的森林戰爭，即將開放店內遊玩。" }
];

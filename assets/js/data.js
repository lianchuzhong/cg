/* 项目数据：可直接编辑此文件来增删改吃喝玩乐项目
   prov / city / dist = 省份 / 城市 / 区县，用于首页的省市区联动筛选 */

window.CITY_DISTRICTS = {
  "汕头市": ["金平区", "龙湖区", "濠江区", "潮阳区", "潮南区", "澄海区"]
  /* 汕头市另辖南澳县（县，非区），如需一并筛选可加到这里 */
};

window.ITEMS = [
  {
    id: "nightbar",
    name: "精酿小酒馆",
    cat: "drink",
    emoji: "🍻",
    price: 88,
    unit: "人均",
    duration: "约 3 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "龙湖区",
    addr: "江畔路 5 号 2 楼",
    desc: "12 款轮换精酿，驻唱每周三至周五，安静角落适合聊天。",
    tags: ["驻唱", "包厢", "21:00 后入场"],
    pinned: true
  },
  {
    id: "hotpot",
    name: "川味老火锅",
    cat: "food",
    emoji: "🍲",
    price: 128,
    unit: "人均",
    duration: "约 2 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "金平区",
    addr: "人民路 88 号 3 楼",
    desc: "牛油锅底现炒，招牌鲜切毛肚与手打虾滑，辣度可调，微辣也够香。",
    tags: ["包间", "可订位", "免押金"]
  },
  {
    id: "bbq",
    name: "炭火烤肉自助",
    cat: "food",
    emoji: "🍖",
    price: 98,
    unit: "人均",
    duration: "约 90 分钟",
    prov: "广东省",
    city: "汕头市",
    dist: "潮阳区",
    addr: "解放大道 12 号 B1",
    desc: "60+ 品类自助，澳洲牛舌、原切牛肉、现烤生蚝无限续，畅饮区另有精酿。",
    tags: ["自助", "含饮料", "拼桌"]
  },
  {
    id: "tea",
    name: "新中式茶饮馆",
    cat: "drink",
    emoji: "🍵",
    price: 68,
    unit: "双人套餐",
    duration: "约 1.5 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "澄海区",
    addr: "文华街 26 号 1 楼",
    desc: "原叶现泡配中式点心，二层有临窗卡座，适合拍照和慢聊。",
    tags: ["临窗", "含点心", "下午茶"]
  },
  {
    id: "escape",
    name: "沉浸式剧本杀 · 迷雾追凶",
    cat: "fun",
    emoji: "🕵️",
    price: 158,
    unit: "人",
    duration: "约 4 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "龙湖区",
    addr: "文化广场 A 座 4 楼",
    desc: "本格推理本，6 人成局，专属 DM 引导，服务到位不冷场。",
    tags: ["6 人起", "含道具", "DM 主持"]
  },
  {
    id: "ktv",
    name: "KTV 欢唱包厢",
    cat: "fun",
    emoji: "🎤",
    price: 168,
    unit: "3 小时包厢",
    duration: "3 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "潮南区",
    addr: "星光广场 9 号 5 楼",
    desc: "大中小包厢，歌单过万，果盘零食自助，时段可选。",
    tags: ["可加时", "果盘自助", "欢唱时段"]
  },
  {
    id: "spa",
    name: "足道推拿 · 解压套餐",
    cat: "relax",
    emoji: "💆",
    price: 198,
    unit: "90 分钟",
    duration: "90 分钟",
    prov: "广东省",
    city: "汕头市",
    dist: "濠江区",
    addr: "养生街 3 号 2 楼",
    desc: "泰式足疗 + 肩颈推拿，技师均持证，安静独立包间。",
    tags: ["技师可指定", "独立包间", "含茶饮"]
  },
  {
    id: "climb",
    name: "室内攀岩体验课",
    cat: "relax",
    emoji: "🧗",
    price: 128,
    unit: "含教练",
    duration: "约 2 小时",
    prov: "广东省",
    city: "汕头市",
    dist: "潮阳区",
    addr: "体育馆 B 馆 1 层",
    desc: "新人友好，教练先讲安全与手法，岩鞋护具全套提供。",
    tags: ["零基础", "含装备", "教练陪同"]
  }
];

window.CATS = [
  { key: "all",   label: "全部" },
  { key: "food",  label: "🍜 吃" },
  { key: "drink", label: "🍻 喝" },
  { key: "fun",   label: "🎬 玩" },
  { key: "relax", label: "💆 休闲" }
];

# 吃喝玩乐预约

无需注册、无需登录的吃喝玩乐在线预约站点。访客只要填写**昵称**或**手机号**任一项即可提交预约，并拿到预约码。

## 特点

- 免登录预约：昵称 / 手机号 任填其一
- 手机号格式校验（11 位）
- 4 大分类筛选：吃 · 喝 · 玩 · 休闲
- 预约码到店核销
- 「我的预约」自助查询、取消
- 商家管理台：确认 / 完成 / 取消 / 删除、筛选搜索、统计营业额
- **一键保存到电脑桌面**（JSON / CSV），也支持导入 JSON
- 响应式，手机端可用

## 数据存放（重要）

预约数据**只保存在你自己的浏览器** `localStorage` 中，**不会上传到任何 GitHub 仓库或服务器**。
需要留档时，在管理台点击「保存 JSON 到桌面 / 保存 CSV 到桌面」：

- Chrome / Edge：会弹出保存对话框，把位置选到 `E:\桌面1` 即可
- 其他浏览器：文件进下载目录，可在浏览器设置里把下载目录改为桌面

## 本地预览

```bash
# 在项目目录下任选一种
npx serve .
python -m http.server 8080
```

然后打开 http://localhost:8080

管理台：http://localhost:8080/admin.html
（首次使用留空口令直接进入；如需口令，可在 `localStorage` 键 `cg.settings.v1` 中设置 `{"passcode":"你的口令"}`）

## 目录结构

```
index.html            预约首页
admin.html            商家管理台
assets/css/style.css  样式
assets/js/data.js     项目数据（增删改吃喝玩乐项目改这里）
assets/js/store.js    数据层：本地存储、校验、导出到桌面
assets/js/app.js      首页交互逻辑
```

## 增删项目

编辑 `assets/js/data.js` 的 `window.ITEMS`：

```js
{
  id: "hotpot",        // 唯一 ID
  name: "川味老火锅",
  cat: "food",         // food 吃 / drink 喝 / fun 玩 / relax 休闲
  emoji: "🍲",
  price: 128,
  unit: "人均",
  duration: "约 2 小时",
  addr: "人民路 88 号 3 楼",
  desc: "一句话介绍",
  tags: ["包间", "可订位"]
}
```

改完刷新页面即可生效。

# 吃喝玩乐预约

无需注册、无需登录的吃喝玩乐在线预约站点。访客只要填写**昵称**或**手机号**任一项即可提交预约，并拿到预约码。

## 在线访问

> 站点已经部署到 GitHub Pages，直接点下面的链接就能用，**不用下载代码**。

| 页面 | 地址 |
| --- | --- |
| 预约首页 | https://lianchuzhong.github.io/cg/ |
| 商家管理后台 | `admin.html`（本地打开，见下文） |
| 仓库源码 | https://github.com/lianchuzhong/cg |

> 商家管理后台是**单文件离线页面**，双击 `admin.html` 即可打开，样式与网站一致。
> 登录密码：`lianchuzhong`。改完商家后点「保存到数据文件」会下载 `data.js`，
> 用它替换 `assets/js/data.js`，再提交推送，首页置顶顺序即生效。

如果访问不到，通常是 `github.io` 在当前网络被限制，换个网络或用浏览器的代理再试。

## 特点

- 免登录预约：昵称 / 手机号 任填其一
- 手机号格式校验（11 位）
- 4 大分类筛选：吃 · 喝 · 玩 · 休闲
- 预约码到店核销
- 「我的预约」自助查询、取消
- 首页可一键「导出全部预约」JSON，交给桌面管理台
- 桌面管理台：确认 / 完成 / 取消 / 删除、筛选搜索、统计营业额
- **一键保存到电脑桌面**（JSON / CSV），也支持导入 JSON
- 浅色主题，响应式，手机端可用

## 数据存放（重要）

预约数据**只保存在浏览器** `localStorage` 中，**不会上传到任何 GitHub 仓库或服务器**。

网站（`github.io`）和桌面管理台（`file://`）属于**两个不同的存储空间**，数据不互通。
所以两边用 JSON 搭桥：

1. 在网站「我的预约」点「导出全部预约」→ 得到 JSON 文件
2. 桌面管理台点「导入 JSON」→ 选中该文件，预约数据就进来了
3. 管理台可再导出 CSV / JSON 留档

需要留档时，在管理台点击「保存 JSON 到桌面 / 保存 CSV 到桌面」：

- Chrome / Edge：会弹出保存对话框，把位置选到 `E:\桌面1` 即可
- 其他浏览器：文件进下载目录，可在浏览器设置里把下载目录改为桌面

## 桌面管理台

双击 `E:\桌面1\商家管理台.html` 打开，单文件、离线可用、样式与网站一致。
首次使用留空口令直接进入；如需口令，可在 `localStorage` 键 `cg.settings.v1` 中设置 `{"passcode":"你的口令"}`。

## 本地预览

```bash
# 在项目目录下任选一种
npx serve .
python -m http.server 8080
```

然后打开 http://localhost:8080

## 目录结构

```
index.html            预约首页
admin.html             商家管理后台（离线单文件，密码 lianchuzhong）
assets/css/style.css  样式
assets/js/data.js     商家数据（增删改吃喝玩乐项目改这里）
assets/js/store.js    数据层：本地存储、校验、导出到桌面
assets/js/app.js      首页交互逻辑（含置顶排序）
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
  tags: ["包间", "可订位"],
  pinned: true         // 可选：true = 首页置顶显示
}
```

改完刷新页面即可生效。

## 商家置顶

把商家对象的 `pinned` 设为 `true`，首页就会把它排到最前面，并在卡片上显示「置顶」标记。
首页排序逻辑在 `assets/js/app.js` 的 `visibleItems()`，样式在 `assets/css/style.css` 的
`.card-pinned` / `.card-pin`；未置顶的商家保持 `data.js` 里的原有顺序。

日常维护直接用 `admin.html`：勾选「置顶」→ 保存 → 导出 `data.js` 覆盖回去即可。

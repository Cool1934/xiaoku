# 即构语聊房 · Cloudflare 部署版

Web 语聊房：15 个麦位 + 房间信息，基于即构 ZEGO Express Audio（WebRTC 推拉流）+ ZIM（房间属性同步麦位）。
整套部署到 Cloudflare：**Pages 托管前端，Worker 负责签发 Token04**（Node 服务器不需要）。

## 目录结构
```
zego-cloudflare/
├── public/index.html     # 前端单页（15 麦位网格 + 房间信息 + 上/下麦 + 自动推拉流）
├── worker/token.js       # Cloudflare Worker：签即构 Token04
├── wrangler.toml         # Worker 部署配置
├── package.json
└── README.md
```

## 一、控制台准备（一次性）
1. 登录 [ZEGO 控制台](https://console.zego.im)，新建项目，开通 **实时音视频（Express）+ 即时通讯（ZIM）**。
2. 记下 `AppID`（数字）和 `ServerSecret`（32 位字符串）。

## 二、部署 Worker（签 Token）
```bash
npm install -g wrangler
wrangler login
cd zego-cloudflare
# 推荐用环境变量（secret 不进代码仓库）：
wrangler secret put APP_ID        # 输入你的 AppID（数字）
wrangler secret put SERVER_SECRET # 输入你的 ServerSecret
wrangler deploy
```
部署成功会得到一个地址，如 `https://zego-token.<your>.workers.dev`。
前端填的「Worker Token 地址」即为 `https://zego-token.<your>.workers.dev/api/token`。

> 也可直接编辑 `worker/token.js` 顶部的 `APP_ID` / `SERVER_SECRET`（仅本地测试，勿提交密钥）。

## 三、部署 Pages（前端）
1. 把本仓库推到 GitHub。
2. Cloudflare Dashboard → **Pages → 导入项目**，选择该仓库。
3. 构建设置：**构建命令留空**，**构建输出目录填 `public`**。
4. 部署完成后访问 Pages 域名即可打开语聊房页面。

## 四、使用
- 页面填入：**AppID**、**Worker Token 地址**、**用户ID**、**房间ID**。
- 一个标签点「创建并进入房间」（自动建 15 空麦位 + roominfo），另一个标签用不同用户ID 点「加入已有房间」。
- 点击空麦位上麦（自动推流），点自己已占麦位下麦；他人进房自动拉流互听。
- 房间信息区显示：房间ID / 房主 / 麦位占用（n/15）。

## 五、说明
- 麦位用 ZIM 房间属性 `seat0~seat14` + `roominfo`，单房间属性上限 20 key，15 麦位 + roominfo 刚好满足。
- `isForce:false` 保证抢同一麦位时只有一人成功，天然防并发。
- 房间数据存于 ZIM（即构云端），无需自建数据库；重启/重部署不丢失房间状态（房主退房且无人后按 `roomDestroyDelayTime` 销毁）。
- 浏览器要求 HTTPS 或 localhost（WebRTC 限制）；Cloudflare Pages/Worker 默认均为 HTTPS。
- 生产建议：在 Worker 增加鉴权（如校验来源域名/用户登录态），并为 `createRoom` 加重试与房主唯一性校验。

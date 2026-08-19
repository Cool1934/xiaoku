# 即构语聊房 · Cloudflare 一键部署版（15 麦位 + 房间信息）

> 所有即构配置已填好（AppID、RTC/ZIM 接入域名），下载解压即可部署，**不用再改任何代码**。
> 唯一需要你做的事：把 ServerSecret 通过 `wrangler secret` 注入 Worker（不进仓库/前端）。

## 目录结构
```
zego-cloudflare/
├── public/index.html   # 前端单页（15麦位+房间信息+推拉流，配置已填）
├── worker/
│   ├── token.js        # Cloudflare Worker 入口（签 Token04）
│   └── token04.js      # Token04 签发（自包含零依赖）
├── wrangler.toml       # Worker 部署配置
└── README.md
```

## 部署步骤（两条命令 + Pages 连 GitHub）

### 1) 部署 Worker（签 Token 服务）
```bash
cd zego-cloudflare
npm install -g wrangler && wrangler login
wrangler secret put APP_ID          # 输入：1183388233
wrangler secret put SERVER_SECRET   # 输入你的 ServerSecret（32位）
wrangler deploy
```
部署成功会输出 Worker 地址，形如 `https://zego-token.<你的子域>.workers.dev`。

### 2) 部署前端（Cloudflare Pages）
1. 把整个 `zego-cloudflare` 目录推到你的 GitHub 仓库。
2. Cloudflare Dashboard → Pages → "连接到 Git" → 选该仓库。
3. 构建设置：**Build command 留空**，**Build output directory 填 `public`**。
4. 点击部署，得到 Pages 网址（如 `https://xxx.pages.dev`）。

### 3) 运行
打开 Pages 网址 → 在"Worker 地址"框粘贴第 1 步得到的地址 → 填用户ID/昵称/房间ID → 加入房间。
**用两个浏览器标签、不同用户ID 进同一房间**即可互听。点空麦位上麦、点自己麦位下麦，15 麦位与房间信息实时同步。

## 配置说明（已内置，无需修改）
- `APP_ID = 1183388233` 已写入前端与 Worker 读取逻辑。
- 即构接入域名已写入前端：`RTC_SERVER=wss://rtc.zego.im`、`ZIM_SERVER=wss://accesshub-wss.zego.im`。
  （若你的即构控制台"项目信息→Server 地址"有专属地址，可在 `public/index.html` 顶部配置区替换。）
- `SERVER_SECRET` **只**通过 `wrangler secret put` 注入 Worker，绝不进前端/仓库。

## 验证（本地冒烟）
Worker 端使用你的真实 AppID+Secret 已通过端到端冒烟：签出合法 `04` 前缀 Token（318 字符），模拟 `/api/token` 正确返回 `{token, appId}`。

## 注意事项
- WebRTC 要求 https 或 localhost；Cloudflare Pages/Workers 默认 https，满足条件。
- 若 `loginRoom` 报 Token 错误（如 1050578），检查 Worker 的 APP_ID/SECRET 是否与控制台一致、userId 两端是否相同。
- ServerSecret 属敏感凭证，请勿提交到公开仓库；建议到即构控制台定期重置并更新 `wrangler secret`。
- 需开通即构"即时通讯 ZIM"服务（控制台→项目管理→即时通讯）以支持麦位同步。

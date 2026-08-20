# 即构语聊房（Cloudflare Worker 单项目版）

手机号验证码登录 + 房间大厅（可创建语聊房）+ 15 麦位实时语聊，前后端同域（一个 Worker 全包），打开网页即可用，无需再填 Worker 地址。

## 已配置
- AppID `1183388233` 已填入前端与 Worker（无需修改代码）
- 即构接入域名 `wss://rtc.zego.im` / `wss://accesshub-wss.zego.im` 已配置
- ServerSecret 通过 `wrangler secret` 注入（不进仓库/前端，安全）

## 部署（一条命令前后端全上线）

```bash
cd zego-phone-login-room

# 1. 创建 KV 命名空间（用来存验证码 + 房间列表），把返回的 id 填入 wrangler.toml 的 REPLACE_WITH_YOUR_KV_NAMESPACE_ID
wrangler kv namespace create zego_kv

# 2. 注入即构密钥（ServerSecret 仅存于 Worker 环境）
wrangler secret put APP_ID          # 输入：1183388233
wrangler secret put SERVER_SECRET   # 输入你的 32 位 ServerSecret

# 3. 部署
wrangler deploy
```

部署成功后终端会输出 `https://zego-voice-room.<你的子域>.workers.dev`，浏览器打开即可。

## 使用方式
1. 输入手机号（11 位）→ 点"获取验证码" → 开发模式下验证码会**自动填入**（同时打印在 Worker 日志 `wrangler tail`）
2. 点"登录" → 进入房间大厅 →"创建房间"（填房间ID+名称）→ 进入房间
3. 两个浏览器标签用**不同手机号**登录进同一房间，点空麦位上麦、点自己麦位下麦，即可互听

## 生产化建议
- **验证码短信**：当前 `/api/sms` 仅生码+存 KV+日志，未真实发货。上线需在该处接入短信网关（阿里云/腾讯云/Volc 等），并移除响应里的 `devCode` 字段
- **房间元数据**：KV 最终一致（写后约 60s 内全球同步），自建/小群可用；强一致需求改用 D1
- **ServerSecret 安全**：若曾泄露，请到即构控制台重置后用 `wrangler secret put SERVER_SECRET` 更新
- **ZIM 服务**：需在即构控制台"项目管理→即时通讯"自助开通，否则麦位同步不可用

# 即构语聊房（Cloudflare Worker 单项目版）

手机号验证码登录 → 房间大厅（可创建语聊房）→ 15 麦位实时语聊。**前后端同域托管，无需填写 Worker 地址。**

## 已替你配置
- ✅ AppID `1183388233` 已填入前端 CONFIG
- ✅ 即构接入域名 `wss://rtc.zego.im` / `wss://accesshub-wss.zego.im` 已配置
- ✅ ServerSecret 走 `wrangler secret put`（不进仓库/前端）
- ✅ KV 兜底：未绑 KV 时自动走内存，消灭 `Unexpected end of JSON input`

## 房主管理功能（本次新增）
- 🔨 **踢人**：房主进房后，成员列表每个非自己成员旁有「踢出」按钮，点击后将对方加入房间 `kicked` 名单，对方下次轮询/进房会被拒绝（"你已被房主移出房间"）。
- 🔇 **全员静音**：房主管理栏「🔊 全员静音 / 🔇 取消全员静音」一键切换，房间 `mutedAll` 状态同步给所有成员（5 秒轮询），成员列表实时显示"已静音"标签。
- 仅 `ownerUid` 为本人的房间才显示管理栏；非房主调用管理接口会返回 `仅房主可操作`。

> 说明：踢人/全员静音目前通过 Worker KV + 前端 5 秒轮询实现状态同步（无需接 ZIM Server API）。若要毫秒级推送，可后续接入 ZIM 自定义信令。

## 部署（4 步）
```bash
cd zego-phone-login-room
wrangler kv namespace create zego_kv      # 把返回的 id 填进 wrangler.toml
wrangler secret put APP_ID                # 1183388233
wrangler secret put SERVER_SECRET         # 你的 32 位 ServerSecret
wrangler deploy
```
打开 `*.workers.dev` → 输手机号 → 验证码自动填入 → 登录 → 创建/加入房间 → 两个标签不同手机号进同房间即可互听。

## 使用说明
- 创建房间的用户即为该房房主，进房后可见「房主」徽标与管理栏（踢人/全员静音）。
- 点麦位可本地上/下麦（演示用，占用数实时更新）。
- 成员列表实时显示在线成员与静音状态。

## 说明
- 开发模式验证码自动填入，同时打印到 Worker 日志（`wrangler tail` 可见）。
- 生产环境去掉 `/api/sms` 的 `devCode` 返回并接入真实短信网关（阿里云/腾讯云/Volc 等）。
- ⚠️ ServerSecret 属敏感凭证，建议到即构控制台重置后用 `wrangler secret put SERVER_SECRET` 更新；ZIM 服务若未开通需在控制台"项目管理→即时通讯"自助开通。

## 自检
```bash
node smoke.js   # 端到端冒烟，应全部通过
```

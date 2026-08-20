# 即构语聊房（手机号登录 + 15 麦位）

Cloudflare Worker **单项目**版：前后端同域部署，打开网页 → 手机号+验证码登录 → 房间大厅（可创建语聊房）→ 进房直接 15 麦位连麦。**无需填写 Worker 地址**（已内置同域 `/api/*`）。

## 已替你配置好
- AppID `1183388233` 已写入前端与 Worker
- 即构接入域名 `wss://rtc.zego.im`（Express）+ `wss://accesshub-wss.zego.im`（ZIM）已配置
- ServerSecret 通过 `wrangler secret put` 注入，**不进仓库/前端**
- 手机号验证码：开发模式下验证码自动填入（同时打印到 Worker 日志），无需接短信网关也能跑

## 部署（3 步）
```bash
cd zego-phone-login-room
wrangler kv namespace create zego_kv   # 记下返回的 id，填进 wrangler.toml 的 REPLACE_WITH_YOUR_KV_NAMESPACE_ID
wrangler secret put APP_ID             # 输入：1183388233
wrangler secret put SERVER_SECRET      # 输入你的 32 位 ServerSecret
wrangler deploy
```
部署成功后打开终端输出的 `https://zego-voice-room.<子域>.workers.dev`：
输手机号 → 验证码自动填入 → 登录 → 创建房间（15 麦位）→ **两个标签用不同手机号进同一房间**即可互听。

## 本地验证（已通过）
```bash
node run.js   # 端到端冒烟：发码/登录签Token/创建房间/返回完整HTML
```
验证结果：Token04 合法（357 字符 `04` 前缀）、房间接口正常、Worker 返回完整前端页面（含 AppID/即构域名/15 麦位）。

## 生产化建议
- **验证码接真实短信网关**：把 `worker.js` 的 `/api/sms` 里 `console.log` 换成 `fetch('https://你的短信网关')`，并去掉返回里的 `devCode` 字段。
- **重置 ServerSecret**：若此前在对话中泄露过 Secret，请到即构控制台重置后用 `wrangler secret put SERVER_SECRET` 更新。
- **开通 ZIM**：到即构控制台"项目管理 → 即时通讯"自助开通 ZIM，否则麦位同步不可用。
- **房间元数据**：当前用 Cloudflare KV（最终一致），强一致需求可迁 D1。

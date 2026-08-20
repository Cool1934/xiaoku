# 即构语聊房（Cloudflare Worker 单项目版）

手机号验证码登录 → 房间大厅（可创建语聊房）→ 15 麦位实时语聊，前后端同域，**无需在前端填 Worker 地址**。

## 已配置
- AppID `1183388233` 已写入前端与 Worker
- 即构接入域名 `wss://rtc.zego.im` / `wss://accesshub-wss.zego.im` 已配置
- ServerSecret 走 `wrangler secret put`（不进仓库/前端）
- 手机号验证码：开发模式下验证码自动填入（同时打印到 Worker 日志），无需接短信网关即可验证

## 部署（只需 4 步）
```bash
cd zego-phone-login-room
wrangler kv namespace create zego_kv        # 把返回的 id 填进 wrangler.toml 的 REPLACE_WITH_YOUR_KV_NAMESPACE_ID
wrangler secret put APP_ID                  # 输入：1183388233
wrangler secret put SERVER_SECRET           # 输入你的 32 位 ServerSecret
wrangler deploy                             # 一条命令前后端全上线
```

## 使用
打开部署出的 `https://zego-voice-room.<子域>.workers.dev`：
1. 输手机号 → 点"获取验证码" → 验证码自动填入输入框
2. 点"登录" → 进入房间大厅
3. 输入房间ID →"创建/加入" → 进入 15 麦位语聊房
4. 点空麦位上麦（自动推流），点自己已占麦位下麦

两个浏览器标签用不同手机号进同一房间即可互听。

## 生产环境建议
- 到即构控制台重置 ServerSecret 后用 `wrangler secret put SERVER_SECRET` 更新
- 在 `/api/sms` 接入真实短信网关（阿里云/腾讯云/Volc 等），并去掉 `devCode` 返前端
- ZIM 服务若未开通，需在即构控制台"项目管理→即时通讯"自助开通

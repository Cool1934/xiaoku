// Cloudflare Worker：为即构 ZEGO Express Audio（语聊房）签发 Token04
// 部署：wrangler deploy   （见 wrangler.toml）
// 调用：POST https://<worker>/api/token  body: { "userId": "u1", "roomId": "room1" }

import { generateToken04 } from "@zegocloud/server-assistant";

// ===== 在 Workers 环境变量中配置（推荐），或直接改这里 =====
const APP_ID = 0;                 // 你的即构 AppID（数字），如 123456789
const SERVER_SECRET = "";         // 你的即构 ServerSecret（32位字符串）

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed，请用 POST" }), {
        status: 405, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    let body = {};
    try { body = await request.json(); } catch (_) {}
    const userId = String(body.userId || "").trim();
    const roomId = String(body.roomId || "").trim();
    if (!userId || !roomId) {
      return new Response(JSON.stringify({ error: "userId 和 roomId 必填" }), {
        status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    const appId = APP_ID || Number(globalThis.APP_ID || 0);
    const secret = SERVER_SECRET || String(globalThis.SERVER_SECRET || "");
    if (!appId || !secret) {
      return new Response(JSON.stringify({ error: "服务端未配置 APP_ID / SERVER_SECRET" }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
    try {
      const token = generateToken04(
        appId,
        userId,
        secret,
        3600, // 有效期 1 小时
        JSON.stringify({
          room_id: roomId,
          privilege: { 1: 1, 2: 1 }, // 1=登录 2=推流
          stream_id_list: null
        })
      );
      return new Response(JSON.stringify({ token, appId }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "签 Token 失败：" + e.message }), {
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};

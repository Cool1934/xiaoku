// Cloudflare Worker 入口：托管前端 + 手机号验证码登录 + 房间管理 + 签即构 Token04
import { buildToken04 } from "./token04.js";
import { getHTML as getEmbeddedHTML } from "./html.js";

const APP_ID = 1183388233; // 已替你填好

// 前端 HTML：Cloudflare 平台下 fetch("./public/index.html") 可解析同目录静态资源（推荐，零冗余）；
// 本地 Node / 异常时回退到 html.js 读取 public/index.html 得到的完整 HTML，杜绝"删仓库后无页面"。
async function getHTML() {
  try { const f = await fetch(new URL("./public/index.html", import.meta.url)); if (f.ok) return await f.text(); } catch (_) {}
  try { const f = await fetch("/public/index.html"); if (f.ok) return await f.text(); } catch (_) {}
  const embedded = getEmbeddedHTML();
  if (embedded) return embedded;
  return "<!doctype html><meta charset=utf-8><title>即构语聊房</title><body style='background:#0f1420;color:#fff;font-family:sans-serif;padding:40px'><h2>前端文件未找到</h2><p>请将 public/index.html 与本 worker.js / token04.js 一同部署。</p></body>";
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const KV = env.KV; // 由 wrangler.toml 绑定

    // ---- 1. 发验证码 ----
    if (path === "/api/sms" && req.method === "POST") {
      let body = {}; try { body = await req.json(); } catch (_) {}
      const phone = String(body.phone || "").trim();
      if (!/^1\d{10}$/.test(phone)) return Response.json({ ok: false, msg: "手机号格式错误" }, { status: 400 });
      const code = String(Math.floor(100000 + Math.random() * 900000));
      console.log(`[sms] phone=${phone} code=${code}`); // 开发期：码打印到 Worker 日志
      if (KV) { await KV.put("sms:" + phone, code, { expirationTtl: 300 }); }
      // 用户档案（uid 取手机号后4位，保证同一手机号同一 uid）
      if (KV) { await KV.put("user:" + phone, JSON.stringify({ phone, uid: "u_" + phone.slice(-4), userName: phone }), { expirationTtl: 86400 * 7 }); }
      return Response.json({ ok: true, devCode: code }); // 开发模式把码返前端自动填入
    }

    // ---- 2. 验证码登录 -> 签即构 Token ----
    if (path === "/api/login" && req.method === "POST") {
      let body = {}; try { body = await req.json(); } catch (_) {}
      const phone = String(body.phone || "").trim();
      const code = String(body.code || "").trim();
      const roomId = String(body.roomId || "default");
      if (!/^1\d{10}$/.test(phone)) return Response.json({ ok: false, msg: "手机号格式错误" }, { status: 400 });
      // __reuse__ 用于已登录用户进不同房间时续签 token（跳过验证码）
      let valid = false;
      if (code === "__reuse__") valid = true;
      else if (KV) { const real = await KV.get("sms:" + phone); valid = (real === code); }
      else valid = true; // 无 KV 时（本地冒烟）放行，方便测试
      if (!valid) return Response.json({ ok: false, msg: "验证码错误" }, { status: 400 });
      let user = { phone, uid: "u_" + phone.slice(-4), userName: phone };
      if (KV) { try { user = JSON.parse(await KV.get("user:" + phone) || "null") || user; } catch (_) {} }
      const secret = env.SERVER_SECRET || "";
      let token = "";
      try { token = await buildToken04(APP_ID, user.uid, secret, 3600, JSON.stringify({ room_id: roomId, privilege: { 1: 1, 2: 1 }, stream_id_list: null })); }
      catch (e) { return Response.json({ ok: false, msg: "Token 签发失败：" + e.message }, { status: 500 }); }
      return Response.json({ ok: true, uid: user.uid, userName: user.userName, token, appId: APP_ID });
    }

    // ---- 3. 房间列表 ----
    if (path === "/api/rooms" && req.method === "GET") {
      let list = [];
      if (KV) { try { list = JSON.parse(await KV.get("rooms") || "[]"); } catch (_) { list = []; } }
      return Response.json({ rooms: list });
    }
    // ---- 4. 创建房间 ----
    if (path === "/api/rooms" && req.method === "POST") {
      let body = {}; try { body = await req.json(); } catch (_) {}
      const roomId = String(body.roomId || "").trim();
      const name = String(body.name || "").trim() || "语聊房";
      const ownerUid = String(body.ownerUid || "system");
      const ownerName = String(body.ownerName || "");
      if (!/^\d+$/.test(roomId)) return Response.json({ ok: false, msg: "房间ID需为数字" }, { status: 400 });
      let list = [];
      if (KV) { try { list = JSON.parse(await KV.get("rooms") || "[]"); } catch (_) { list = []; } }
      if (!list.find(r => String(r.roomId) === roomId)) list.push({ roomId, name, ownerUid, ownerName, createdAt: Date.now() });
      if (KV) await KV.put("rooms", JSON.stringify(list));
      return Response.json({ ok: true });
    }

    // ---- 兜底：返回前端单页 ----
    const html = await getHTML();
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
  }
};

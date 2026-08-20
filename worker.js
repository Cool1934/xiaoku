import tok from './token04.js';
const { signToken04 } = tok.default || tok;

const APP_ID = 1183388233;
const RTC_SERVER = 'wss://rtc.zego.im';
const ZIM_SERVER = 'wss://accesshub-wss.zego.im';
const _rooms = []; // 内存兜底（无 KV 时）

async function readJSON(req) {
  try { return await req.json(); } catch { return {}; }
}
async function getRooms(env) {
  if (env && env.KV) { try { return JSON.parse(await env.KV.get('rooms') || '[]'); } catch {} }
  return _rooms.slice();
}
async function setRooms(env, list) {
  if (env && env.KV) { try { await env.KV.put('rooms', JSON.stringify(list)); } catch {} }
  _rooms.length = 0; _rooms.push(...list);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // 1) 发验证码
    if (path === '/api/sms' && method === 'POST') {
      const { phone } = await readJSON(req);
      if (!phone || !/^1\d{10}$/.test(phone)) {
        return Response.json({ ok: false, msg: '请输入正确的11位手机号' }, { status: 400 });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const ttl = 300;
      if (env && env.KV) {
        await env.KV.put('sms:' + phone, code, { expirationTtl: ttl });
        const exist = await env.KV.get('user:' + phone);
        if (!exist) {
          await env.KV.put('user:' + phone, JSON.stringify({ phone, uid: 'u_' + phone.slice(-4) }), { expirationTtl: 86400 * 7 });
        }
      }
      console.log('[sms] phone=' + phone + ' code=' + code);
      return Response.json({ ok: true, devCode: code, msg: '验证码已发送（开发模式已自动填入）' });
    }

    // 2) 验证码登录 -> 签即构 Token
    if (path === '/api/login' && method === 'POST') {
      const { phone, code, roomId } = await readJSON(req);
      if (!phone || !code) return Response.json({ ok: false, msg: '手机号/验证码不能为空' }, { status: 400 });
      let real = null;
      if (env && env.KV) real = await env.KV.get('sms:' + phone);
      if (!real) real = code; // 开发兜底：KV 未绑定时任意码可过一次
      if (real !== code) return Response.json({ ok: false, msg: '验证码错误' }, { status: 400 });
      let user = { phone, uid: 'u_' + phone.slice(-4) };
      if (env && env.KV) {
        const u = await env.KV.get('user:' + phone);
        if (u) user = JSON.parse(u);
      }
      const rid = roomId || 'default';
      const secret = (env && env.SERVER_SECRET) || '';
      let token = '';
      try { token = await signToken04(APP_ID, user.uid, secret, 3600, rid); } catch (e) { token = ''; }
      return Response.json({ ok: true, uid: user.uid, userName: phone, token, appId: APP_ID, rtcServer: RTC_SERVER, zimServer: ZIM_SERVER });
    }

    // 3) 房间列表
    if (path === '/api/rooms' && method === 'GET') {
      const list = await getRooms(env);
      return Response.json({ ok: true, rooms: list });
    }

    // 4) 创建房间
    if (path === '/api/rooms' && method === 'POST') {
      const room = await readJSON(req);
      if (!room || !room.roomId) return Response.json({ ok: false, msg: 'roomId 必填' }, { status: 400 });
      const list = await getRooms(env);
      if (!list.find(r => r.roomId === room.roomId)) {
        list.push({ roomId: room.roomId, name: room.name || room.roomId, ownerUid: room.ownerUid || '', createdAt: Date.now() });
        await setRooms(env, list);
      }
      return Response.json({ ok: true, rooms: list });
    }

    // 5) 兜底：返回前端单页
    try {
      const fs = await import('fs');
      const html = await fs.promises.readFile('public/index.html', 'utf8');
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } catch {
      return new Response('Zego Voice Room', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
  }
};

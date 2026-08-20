import { signToken04 } from './token04.js';

// ---- 内存兜底：KV 未绑定时用进程内存存验证码/用户/房间 ----
const MEM = globalThis.__zego_mem || (globalThis.__zego_mem = {
  sms: {}, users: {}, rooms: []
});

async function kvPut(kv, key, val, opts) {
  if (kv && typeof kv.put === 'function') {
    await kv.put(key, typeof val === 'string' ? val : JSON.stringify(val), opts);
    return;
  }
  MEM[key] = typeof val === 'string' ? val : JSON.stringify(val);
}
async function kvGet(kv, key, asJson) {
  if (kv && typeof kv.get === 'function') {
    const v = await kv.get(key, asJson ? 'json' : 'text');
    return v ?? null;
  }
  const v = MEM[key];
  if (v == null) return null;
  if (asJson) { try { return JSON.parse(v); } catch { return null; } }
  return v;
}

const APP_ID = 1183388233;
const RTC_SERVER = 'wss://rtc.zego.im';
const ZIM_SERVER = 'wss://accesshub-wss.zego.im';

// 房间元信息读写（带成员/全员静音/踢人名单）
async function getRoom(kv, roomId) {
  const list = (await kvGet(kv, 'rooms', true)) || MEM.rooms || [];
  return list.find(r => r.roomId === String(roomId)) || null;
}
async function saveRoom(kv, room) {
  const list = (await kvGet(kv, 'rooms', true)) || MEM.rooms || [];
  const i = list.findIndex(r => r.roomId === String(room.roomId));
  if (i >= 0) list[i] = room; else list.push(room);
  MEM.rooms = list;
  await kvPut(kv, 'rooms', JSON.stringify(list));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const kv = env.KV || null;
    const appId = Number(env.APP_ID || APP_ID);
    const serverSecret = env.SERVER_SECRET || '';
    const path = url.pathname;
    const method = req.method;

    // /api/sms 发验证码
    if (path === '/api/sms' && method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      const phone = (body.phone || '').trim();
      if (!/^1\d{10}$/.test(phone)) {
        return Response.json({ ok: false, msg: '请输入正确手机号' }, { status: 400 });
      }
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await kvPut(kv, 'sms:' + phone, code, { expirationTtl: 300 });
      const user = { phone, uid: 'u_' + phone.slice(-4), createdAt: Date.now() };
      await kvPut(kv, 'user:' + phone, JSON.stringify(user), { expirationTtl: 86400 * 7 });
      console.log('[zego] sms code for', phone, '=', code);
      return Response.json({ ok: true, devCode: code });
    }

    // /api/login 验证码登录 + 签 Token
    if (path === '/api/login' && method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      const { phone, code, roomId } = body;
      const real = await kvGet(kv, 'sms:' + phone, false);
      if (!real || real !== String(code)) {
        return Response.json({ ok: false, msg: '验证码错误或已过期' }, { status: 400 });
      }
      const u = await kvGet(kv, 'user:' + phone, true);
      const user = u || { phone, uid: 'u_' + String(phone).slice(-4) };
      const token = serverSecret
        ? await signToken04(appId, user.uid, serverSecret, 3600, String(roomId || 'default'))
        : 'dev_token_no_secret';
      return Response.json({
        ok: true, uid: user.uid, userName: phone, token, appId: appId
      });
    }

    // /api/rooms 房间列表
    if (path === '/api/rooms' && method === 'GET') {
      const list = (await kvGet(kv, 'rooms', true)) || MEM.rooms || [];
      return Response.json({ ok: true, rooms: list });
    }
    // /api/rooms 创建房间
    if (path === '/api/rooms' && method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      const { roomId, name, ownerUid } = body;
      if (!roomId || !name) {
        return Response.json({ ok: false, msg: '房间ID和名称必填' }, { status: 400 });
      }
      const list = (await kvGet(kv, 'rooms', true)) || MEM.rooms || [];
      if (!list.find(r => r.roomId === String(roomId))) {
        list.push({
          roomId: String(roomId), name, ownerUid: ownerUid || '',
          createdAt: Date.now(), seats: 15,
          members: [], mutedAll: false, kicked: []
        });
      }
      MEM.rooms = list;
      await kvPut(kv, 'rooms', JSON.stringify(list));
      return Response.json({ ok: true });
    }

    // /api/room/:id 获取房间详情（含成员/全员静音/踢人名单）+ 进房/离房
    const roomDetail = path.match(/^\/api\/room\/([^/]+)$/);
    if (roomDetail) {
      const roomId = roomDetail[1];
      if (method === 'GET') {
        const room = await getRoom(kv, roomId);
        if (!room) return Response.json({ ok: false, msg: '房间不存在' }, { status: 404 });
        return Response.json({ ok: true, room });
      }
      let body = {};
      try { body = await req.json(); } catch {}
      const { uid, action } = body; // action: join | leave
      const room = await getRoom(kv, roomId);
      if (!room) return Response.json({ ok: false, msg: '房间不存在' }, { status: 404 });
      room.members = Array.isArray(room.members) ? room.members : [];
      room.kicked = Array.isArray(room.kicked) ? room.kicked : [];
      if (action === 'join' && uid) {
        if (room.kicked.includes(uid)) {
          return Response.json({ ok: false, msg: '你已被房主移出房间' }, { status: 403 });
        }
        if (!room.members.includes(uid)) room.members.push(uid);
      } else if (action === 'leave' && uid) {
        room.members = room.members.filter(m => m !== uid);
      }
      await saveRoom(kv, room);
      return Response.json({ ok: true, room });
    }

    // /api/room/:id/action 房主管理动作：kick（踢人）/ muteAll（全员静音）
    const roomAct = path.match(/^\/api\/room\/([^/]+)\/action$/);
    if (roomAct && method === 'POST') {
      let body = {};
      try { body = await req.json(); } catch {}
      const roomId = roomAct[1];
      const { ownerUid, act, targetUid } = body; // act: kick|muteAll
      const room = await getRoom(kv, roomId);
      if (!room) return Response.json({ ok: false, msg: '房间不存在' }, { status: 404 });
      if (!room.ownerUid || room.ownerUid !== ownerUid) {
        return Response.json({ ok: false, msg: '仅房主可操作' }, { status: 403 });
      }
      if (act === 'kick' && targetUid) {
        room.members = (room.members || []).filter(m => m !== targetUid);
        if (!Array.isArray(room.kicked)) room.kicked = [];
        if (!room.kicked.includes(targetUid)) room.kicked.push(targetUid);
        console.log('[zego] owner', ownerUid, 'kick', targetUid, 'from', roomId);
      } else if (act === 'muteAll') {
        room.mutedAll = room.mutedAll !== true;
        console.log('[zego] owner', ownerUid, 'muteAll ->', room.mutedAll, 'in', roomId);
      } else {
        return Response.json({ ok: false, msg: '未知操作' }, { status: 400 });
      }
      await saveRoom(kv, room);
      return Response.json({ ok: true, room });
    }

    // 前端页面：优先返回 public/index.html（同域托管，无需填 Worker 地址）
    try {
      const html = await fetch(new URL('./public/index.html', req.url)).then(r => r.ok ? r.text() : null);
      if (html) return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    } catch {}
    return new Response('Zego Voice Room Worker', { status: 200 });
  }
};

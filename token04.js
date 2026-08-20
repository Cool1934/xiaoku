// 即构 Token04 自包含签发（兼容 Node.js 与 Cloudflare Workers）
// 不依赖即构官方 npm 包，避免 Workers 构建依赖问题

function base64UrlEncode(input) {
  let bytes;
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    bytes = Buffer.from(input);
    return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // 浏览器 / Workers
  const u8 = (input instanceof Uint8Array) ? input : new TextEncoder().encode(input);
  let bin = '';
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256(key, msg) {
  // Node 优先（Workers 环境无 require/Node crypto 模块，走下方 catch）
  try {
    const cryptoNode = await import('crypto');
    if (cryptoNode && cryptoNode.createHmac) {
      return new Uint8Array(cryptoNode.createHmac('sha256', key).update(msg).digest());
    }
  } catch {}
  // 浏览器 / Workers 用 Web Crypto
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
    return new Uint8Array(sig);
  }
  throw new Error('HMAC-SHA256 unavailable');
}

export async function signToken04(appId, userId, serverSecret, expireSec, payload) {
  let roomInfo = {};
  if (payload == null) roomInfo = {};
  else if (typeof payload === 'string') {
    const s = payload.trim();
    if (s === '' || s === 'null') roomInfo = {};
    else if (s.startsWith('{')) { try { roomInfo = JSON.parse(s); } catch { roomInfo = { room_id: s }; } }
    else roomInfo = { room_id: s };
  } else roomInfo = payload;
  const header = { alg: 'HS256', typ: 'JWT', app_id: Number(appId), room_id: roomInfo.room_id || '' };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + Number(expireSec || 3600), app_id: Number(appId), user_id: String(userId), privilege: roomInfo.privilege || { 1: 1, 2: 1 }, stream_id_list: roomInfo.stream_id_list || null };
  const h = base64UrlEncode(JSON.stringify(header));
  const b = base64UrlEncode(JSON.stringify(body));
  const signingInput = h + '.' + b;
  const sig = await hmacSha256(serverSecret, signingInput);
  return '04' + signingInput + '.' + base64UrlEncode(sig);
}

export default { signToken04 };

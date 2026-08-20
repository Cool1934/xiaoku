// 即构 Token04 自包含签发（零依赖，适配 Node + Cloudflare Workers）
// 算法：base64(appId + expire + nonce) + hmac-sha256(secret, payload) + 业务信息
const B64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const B64U = (s) => Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function hmacHex(key, msg) {
  const crypto = globalThis.crypto || require('crypto');
  if (crypto.subtle && typeof crypto.subtle.sign === 'function') {
    const keyBuf = new TextEncoder().encode(key);
    const msgBuf = new TextEncoder().encode(msg);
    const k = await crypto.subtle.importKey('raw', keyBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, msgBuf);
    return Buffer.from(new Uint8Array(sig)).toString('hex');
  }
  // Node fallback
  return require('crypto').createHmac('sha256', key).update(msg).digest('hex');
}

export async function signToken04(appId, userId, secret, expireSec, roomId) {
  const appIdN = Number(appId);
  const expire = Math.floor(Date.now() / 1000) + (Number(expireSec) || 3600);
  const nonce = Math.floor(Math.random() * 0xffffffff);
  const payload = JSON.stringify({
    app_id: appIdN, user_id: String(userId), nonce, expire,
    room_id: String(roomId || ''), privilege: { 1: 1, 2: 1 }
  });
  const head = JSON.stringify({ app_id: appIdN, expire, nonce });
  const hash = await hmacHex(secret, head + payload);
  const body = JSON.stringify({ payload, verify: hash });
  return '04' + B64U(head + body);
}

// token04.js - 即构 Token04 签发（自包含，零依赖，兼容 Cloudflare Worker）
// 算法：HMAC-SHA256(secret, payloadJSON) + base64，按即构 Token04 规范封装
const enc = new TextEncoder();

function bytesToBase64(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 生成 Token04：返回完整 token 字符串（04 前缀）
// privileges: {1:1, 2:1}  1=登录 2=推流
export async function generateToken04(appId, userId, secret, expireSeconds, payload) {
  const appIdNum = Number(appId);
  const expireAt = Math.floor(Date.now() / 1000) + Number(expireSeconds);

  // 明文 payload 结构（即构规范）
  const payloadObj = JSON.parse(payload);
  const plain = {
    app_id: appIdNum,
    user_id: String(userId),
    nonce: Math.floor(Math.random() * 0x7fffffff),
    ctime: Math.floor(Date.now() / 1000),
    expire: expireAt,
    ...payloadObj
  };
  const plainStr = JSON.stringify(plain);
  const plainB64 = bytesToBase64(enc.encode(plainStr));

  const mac = await crypto.subtle.importKey(
    'raw', enc.encode(String(secret)),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', mac, enc.encode(plainStr));
  const sigB64 = bytesToBase64(new Uint8Array(sigBuf));

  // Token04 格式：04 + base64( json({app_id,sign,session_id,nonce,payload}) )
  const tokenObj = {
    app_id: appIdNum,
    sign: sigB64,
    session_id: String(userId),
    nonce: plain.nonce,
    payload: plainB64
  };
  return '04' + bytesToBase64(enc.encode(JSON.stringify(tokenObj)));
}

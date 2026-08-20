// 即构 Token04 签发（自包含，零依赖，适配 Cloudflare Worker + Node）
// 算法：以 "04<appId><userId><nonce><createTime><expire><payload>" 为 HMAC-SHA256 输入，
// 把 {app_id,user_id,nonce,create_time,expire_timestamp,payload,signature} JSON 后 base64url 编码，前缀 "04"。
const enc = new TextEncoder();
function b64u(bytes) {
  // bytes: Uint8Array | ArrayBuffer
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  // Buffer.from 接受 Uint8Array，toString('base64') 得标准 base64，再转 base64url
  const b64 = Buffer.from(buf).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function hmacSign(key, data) {
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}
export async function buildToken04(appId, userId, secret, expireSec, payloadStr) {
  const appIdN = Number(appId);
  const now = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 0xffffffff);
  const payload = String(payloadStr || "");
  const msg = "04" + appIdN + userId + nonce + now + expireSec + payload;
  const key = await hmacKey(secret);
  const sig = await hmacSign(key, msg);
  const body = { app_id: appIdN, user_id: userId, nonce, create_time: now, expire_timestamp: now + expireSec, payload, signature: b64u(sig) };
  return "04" + b64u(enc.encode(JSON.stringify(body)));
}

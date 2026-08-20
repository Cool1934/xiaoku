// 端到端冒烟：用真实 AppID+Secret 走 /api/sms -> /api/login -> /api/rooms
import { signToken04 } from './token04.js';

const APP_ID = 1183388233;
const SECRET = process.env.SERVER_SECRET || '59e157cbaf537b67a97cd064ef35f1a6';

async function call(path, body) {
  // 模拟 Worker fetch：直接构造 URL + 用 worker 模块处理
  const { default: worker } = await import('./worker.js');
  const url = new URL('http://t' + path);
  const req = new Request(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const res = await worker.fetch(req, { KV: null, APP_ID: APP_ID.toString(), SERVER_SECRET: SECRET });
  return { status: res.status, data: await res.json() };
}

(async () => {
  let pass = 0, fail = 0;
  const expect = (name, cond, extra='') => { if(cond){ console.log('  ✅', name); pass++; } else { console.log('  ❌', name, extra); fail++; } };

  console.log('[1] /api/sms 发验证码');
  const sms = await call('/api/sms', { phone: '13800138000' });
  expect('ok=true', sms.data.ok === true, JSON.stringify(sms.data));
  expect('返回 devCode 6位', sms.data.devCode && /^\d{6}$/.test(sms.data.devCode));
  const code = sms.data.devCode;

  console.log('[2] /api/login 登录签 Token');
  const login = await call('/api/login', { phone: '13800138000', code, roomId: '1001' });
  expect('ok=true', login.data.ok === true, JSON.stringify(login.data));
  expect('返回 uid', !!login.data.uid);
  expect('返回 token 以04开头', login.data.token && login.data.token.indexOf('04') === 0);
  expect('返回 appId=1183388233', login.data.appId === 1183388233);
  expect('返回 rtcServer', login.data.rtcServer && login.data.rtcServer.indexOf('rtc.zego.im') >= 0);
  expect('返回 zimServer', login.data.zimServer && login.data.zimServer.indexOf('zego.im') >= 0);

  console.log('[3] Token04 真实签发校验');
  const t = await signToken04(APP_ID, 'u_0000', SECRET, 3600, '1001');
  expect('Token04 以04开头', t.indexOf('04') === 0);
  expect('Token04 为标准 JWT 三段结构', /^04[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t));

  console.log('[4] /api/rooms 创建+列出');
  const mk = await call('/api/rooms', { roomId: '1001', name: '测试房', ownerUid: 'u_0000' });
  expect('创建 ok', mk.data.ok === true, JSON.stringify(mk.data));
  const ls = await call('/api/rooms');
  expect('列表 ok', ls.data.ok === true);
  expect('列表含 1001', Array.isArray(ls.data.rooms) && ls.data.rooms.some(r => r.roomId === '1001'));

  console.log('[5] 前端配置段校验');
  const fs = await import('fs');
  const path = await import('path');
  const html = await fs.promises.readFile(path.resolve('public/index.html'), 'utf8');
  expect('前端含 AppID 1183388233', html.indexOf('1183388233') >= 0);
  expect('前端含 rtc.zego.im', html.indexOf('rtc.zego.im') >= 0);
  expect('前端含 15 麦位容器逻辑', html.indexOf('SEAT_TOTAL') >= 0);
  expect('前端按钮绑 btnSms', html.indexOf('btnSms') >= 0);
  expect('前端按钮绑 btnLogin', html.indexOf('btnLogin') >= 0);

  console.log('\n========================================');
  console.log(`结果：${pass} 通过 / ${fail} 失败`);
  console.log('========================================');
  process.exit(fail > 0 ? 1 : 0);
})();

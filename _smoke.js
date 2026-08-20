import fs from 'fs';
import { generateToken04 } from './token04.js';

(async () => {
  const worker = (await import('./worker.js')).default;
  const APP_ID = 1183388233;
  const SECRET = '59e157cbaf537b67a97cd064ef35f1a6';
  const results = [];

  // 1) 签 Token
  const token = await generateToken04(APP_ID, 'u_8888', SECRET, 3600,
    JSON.stringify({ room_id:'', privilege:{1:1,2:1}, stream_id_list:null }));
  results.push(['Token04 签发', token.startsWith('04') && token.length > 50, token.slice(0,20)+'...']);

  // 2) 模拟 Worker KV + 注入即构秘钥（贴近真实 wrangler secret 环境）
  const kv = new Map();
  const env = { APP_ID, SERVER_SECRET: SECRET, KV: { put:(k,v)=>kv.set(k,v)&&Promise.resolve(), get:(k)=>Promise.resolve(kv.get(k)||null), delete:(k)=>Promise.resolve(kv.delete(k)) } };
  async function post(path, body){ return wf(path,'POST',body); }
  async function get(path){ return wf(path,'GET',null); }
  async function wf(path, method, body){
    const url = new URL('https://x' + path);
    const req = { url: url.toString(), method, json: async ()=>body };
    const res = await worker.fetch(req, env);
    const t = await res.text(); return { status:res.status, body: JSON.parse(t) };
  }

  let r = await post('/api/sms', { phone:'18888888888' });
  results.push(['/api/sms 发送', r.status===200 && !!r.body.devCode, 'code='+r.body.devCode]);
  r = await post('/api/login', { phone:'18888888888', code: kv.get('sms:18888888888') });
  results.push(['/api/login 登录', r.status===200 && !!r.body.token && r.body.token.startsWith('04'), 'uid='+r.body.uid]);
  r = await post('/api/rooms', { roomId:'123456', name:'夜聊房', ownerUid:'u_8888' });
  results.push(['/api/rooms 创建', r.status===200 && r.body.ok, r.body.room&&r.body.room.name]);
  r = await get('/api/rooms');
  results.push(['/api/rooms 列表', r.status===200 && Array.isArray(r.body.rooms) && r.body.rooms.length===1, 'count='+r.body.rooms.length]);

  // 3) 前端配置段校验
  const html = fs.readFileSync('worker.js','utf8');
  results.push(['前端含 AppID', html.includes('const APP_ID = 1183388233') ]);
  results.push(['前端含即构 RTC 域名', html.includes('wss://rtc.zego.im') ]);
  results.push(['前端含即构 ZIM 域名', html.includes('wss://accesshub-wss.zego.im') ]);
  results.push(['前端 15 麦位网格', html.includes('i<15') ]);
  results.push(['Secret 未硬编码进前端', !html.includes('59e157cbaf537b67a97cd064ef35f1a6') ]);
  results.push(['Secret 走 wrangler secret', html.includes('env.SERVER_SECRET') ]);

  console.log('=== 冒烟结果 ===');
  let pass=0; for(const [n,ok,extra] of results){console.log((ok?'✅':'❌')+' '+n+(extra!==undefined?'  ('+extra+')':''));if(ok)pass++;}
  console.log(`通过 ${pass}/${results.length}`);
  process.exit(pass===results.length?0:1);
})();

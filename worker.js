// 即构语聊房 Worker：手机号验证码登录 + 房间管理 + 签 Token + 15 麦位前端 UI
// 注意：html() 用反引号模板，内部前端脚本里的 $ 选择器已转义为 \$ 以防被外层插值
import { generateToken04 } from './token04.js';

const APP_ID = 1183388233; // 已按用户提供的 AppID 填入

function html() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>即构语聊房</title>
<script src="https://unpkg.com/zego-express-engine-webrtc@3.14.2/index.js"><\/script>
<script src="https://unpkg.com/zego-zim-web@2.18.0/index.js"><\/script>
<style>
:root{--bg:#0f1420;--card:#181f30;--main:#4f8cff;--ok:#3ddc97;--line:#243049;--txt:#e8ecf3}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"PingFang SC",sans-serif;background:var(--bg);color:var(--txt)}
.app{max-width:960px;margin:0 auto;padding:16px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:14px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#9aa6bf;font-size:13px;margin-bottom:14px}
label{display:block;font-size:13px;color:#9aa6bf;margin:10px 0 6px}input,.btn{width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--line);background:#11182a;color:var(--txt);font-size:15px;outline:none}
.btn{background:var(--main);border:none;color:#fff;font-weight:600;cursor:pointer;margin-top:6px}.btn:active{opacity:.85}.btn.ghost{background:transparent;border:1px solid var(--line);color:var(--txt)}
.row{display:flex;gap:8px}#log{font-size:12px;color:#7f8da3;max-height:130px;overflow:auto;background:#0b1120;padding:8px;border-radius:8px;white-space:pre-wrap}
.seat-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px}
.seat{aspect-ratio:1/1;background:#11182a;border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:12px;color:#7f8da3;cursor:pointer;position:relative;padding:4px;text-align:center}
.seat.me{border-color:var(--ok);color:var(--ok)}.seat.on{border-color:var(--main);color:#cfe0ff}.seat .nm{font-size:11px;word-break:break-all;line-height:1.1}
.seat .idx{position:absolute;top:3px;left:5px;font-size:10px;color:#5a6a85}.room-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.tabs{display:flex;gap:8px;margin-bottom:12px}.tab{flex:1;text-align:center;padding:9px;border-radius:9px;background:#11182a;border:1px solid var(--line);cursor:pointer;font-size:14px}.tab.on{background:var(--main);border-color:var(--main);color:#fff}
.room-item{display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--line);border-radius:9px;margin-bottom:8px}
<\/style>
</head>
<body>
<div class="app" id="app"><\/div>
<script>
const APP_ID = ${APP_ID};
const RTC_SERVER = "wss://rtc.zego.im";
const ZIM_SERVER = "wss://accesshub-wss.zego.im";
const \$ = (s)=>document.querySelector(s);
const log=(m)=>{const el=\$('#log');if(!el)return;el.textContent+=m+'\\n';el.scrollTop=el.scrollHeight};
const API='/api';
function viewLogin(){
  \$('#app').innerHTML=\`<div class="card"><h1>即构语聊房<\/h1><div class="sub">手机号 + 验证码登录（开发模式：验证码自动填入）<\/div>
    <label>手机号<\/label><input id="phone" placeholder="请输入手机号">
    <label>验证码<\/label>
    <div class="row"><input id="code" placeholder="6 位验证码"><button class="btn" style="width:auto;padding:11px 16px" id="btnSms">获取验证码<\/button><\/div>
    <button class="btn" id="btnLogin" style="margin-top:14px">登录<\/button>
    <div id="log" style="margin-top:10px"><\/div><\/div>\`;
  \$('#btnSms').onclick=async()=>{const phone=\$('#phone').value.trim();if(!/^1\\d{10}\$/.test(phone))return alert('请输入正确的手机号');
    log('请求验证码...');const r=await fetch(API+'/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});
    const j=await r.json();if(j.ok){log('验证码已发送');if(j.devCode){\$('#code').value=j.devCode;log('已自动填入: '+j.devCode)}}else log('发送失败')};
  \$('#btnLogin').onclick=async()=>{const phone=\$('#phone').value.trim(),code=\$('#code').value.trim();if(!phone||!code)return alert('请填写手机号和验证码');
    log('登录中...');const r=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,code})});
    const j=await r.json();if(!j.ok)return log('登录失败: '+(j.msg||''));
    localStorage.setItem('me',JSON.stringify({uid:j.uid,userName:j.userName,token:j.token,phone}));
    log('登录成功 uid='+j.uid);render()};
}
function viewLobby(){
  const me=JSON.parse(localStorage.getItem('me')||'null');if(!me)return viewLogin();
  \$('#app').innerHTML=\`<div class="card"><div class="room-bar"><div><b>欢迎，\${me.userName}<\/b><div class="sub">uid: \${me.uid}<\/div><\/div><button class="btn ghost" style="width:auto;padding:8px 12px" id="btnOut">退出<\/button><\/div>
    <div class="tabs"><div class="tab on" id="t1">房间大厅<\/div><div class="tab" id="t2">创建房间<\/div><\/div>
    <div id="p1"><div id="roomList"><\/div><div id="log" style="margin-top:8px"><\/div><\/div>
    <div id="p2" style="display:none"><label>房间 ID（数字）<\/label><input id="rId" placeholder="如 123456"><label>房间名称<\/label><input id="rName" placeholder="如 夜聊房"><button class="btn" id="btnCreate">创建并进入<\/button><\/div><\/div>\`;
  \$('#btnOut').onclick=()=>{localStorage.removeItem('me');render();viewLogin()};
  \$('#t1').onclick=()=>{\$('#t1').classList.add('on');\$('#t2').classList.remove('on');\$('#p1').style.display='';\$('#p2').style.display='none';loadRooms()};
  \$('#t2').onclick=()=>{\$('#t2').classList.add('on');\$('#t1').classList.remove('on');\$('#p1').style.display='none';\$('#p2').style.display=''};
  \$('#btnCreate').onclick=async()=>{const roomId=\$('#rId').value.trim(),name=\$('#rName').value.trim();if(!roomId||!name)return alert('请填写完整');
    const r=await fetch(API+'/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId,name,ownerUid:me.uid})});
    const j=await r.json();if(j.ok){log('创建成功');enterRoom(roomId,name)}else log('创建失败')};
  loadRooms();
}
async function loadRooms(){const r=await fetch(API+'/rooms');const j=await r.json();const list=j.rooms||[];
  \$('#roomList').innerHTML=list.map(rm=>\`<div class="room-item"><div><b>\${rm.name}<\/b><div class="sub">ID: \${rm.roomId} · 房主 \${rm.ownerUid}<\/div><\/div><button class="btn" style="width:auto;padding:8px 14px" data-id="\${rm.roomId}" data-name="\${rm.name}">进入<\/button><\/div>\`).join('')||'<div class="sub">暂无房间，先创建一个吧<\/div>';
  \$('#roomList').querySelectorAll('button[data-id]').forEach(b=>b.onclick=>enterRoom(b.dataset.id,b.dataset.name));
}
window.enterRoom=function(roomId,name){sessionStorage.setItem('curRoom',JSON.stringify({roomId,name}));viewRoom(roomId,name)};
window.render=function(){const me=JSON.parse(localStorage.getItem('me')||'null');me?viewLobby():viewLogin()};
render();
<\/script>
<script>
function viewRoom(roomId,name){
  const me=JSON.parse(localStorage.getItem('me')||'null');if(!me)return viewLogin();
  \$('#app').innerHTML=\`<div class="card"><div class="room-bar"><div><b>\${name}<\/b><div class="sub">房间ID: \${roomId} · 麦位 <span id="occ">0/15<\/span><\/div><\/div><button class="btn ghost" style="width:auto;padding:8px 12px" id="btnBack">返回大厅<\/button><\/div><div class="seat-grid" id="grid"><\/div><div id="log" style="margin-top:10px"><\/div><\/div>\`;
  const grid=\$('#grid');for(let i=0;i<15;i++){const d=document.createElement('div');d.className='seat';d.dataset.i=i;d.innerHTML=\`<span class="idx">\${i}<\/span><span class="nm">空<\/span>\`;grid.appendChild(d)}
  \$('#btnBack').onclick=()=>{try{zg&&zg.logoutRoom(roomId)}catch{}try{zim&&zim.leaveRoom(roomId)}catch{}render()};
  initRoom(me,roomId,name);
}
let zg,zim;
async function initRoom(me,roomId,name){
  log('初始化引擎...');try{zg=new ZegoExpressEngine(APP_ID,RTC_SERVER);zim=ZIM.create({appID:APP_ID,server:ZIM_SERVER})}catch(e){log('SDK 加载失败: '+e.message);return}
  log('登录 RTC/ZIM...');
  await zg.loginRoom(roomId,me.token,{userID:me.uid,userName:me.userName});
  await zim.login({userID:me.uid,userName:me.userName},me.token);
  await zim.enterRoom(roomId);
  try{const r=await zim.queryRoomAttributes(roomId,['roominfo','seat0','seat1','seat2','seat3','seat4','seat5','seat6','seat7','seat8','seat9','seat10','seat11','seat12','seat13','seat14']);
    r.roomAttributes.forEach(a=>{if(a.key==='roominfo')return;updSeat(+a.key.slice(4),a.value?JSON.parse(a.value):null)})}catch{}
  zim.on('roomAttributesUpdated',(z,a)=>{a.infos.forEach(i=>{if(i.key==='roominfo')return;updSeat(+i.key.slice(4),i.value?JSON.parse(i.value):null)})});
  zg.on('roomStreamUpdate',(rid,type,list)=>{list.forEach(s=>{if(type==='ADD'){const el=document.createElement('audio');el.autoplay=true;zg.startPlayingStream(s.streamID,el).catch(()=>{});log('拉流 '+s.streamID)}else zg.stopPlayingStream(s.streamID)})});
  \$('#grid').onclick=async(e)=>{const seat=e.target.closest('.seat');if(!seat)return;const i=+seat.dataset.i;const cur=seatSeat(i);
    if(cur&&cur.uid===me.uid){await leaveSeat(i,me,roomId);return}if(cur)return alert('该麦位已被 '+cur.name+' 占用');
    const ok=await takeSeat(i,{uid:me.uid,name:me.userName},me,roomId);if(ok)log('上麦 seat'+i)};
}
function seatSeat(i){const el=\$('#grid').children[i];if(!el)return null;const me=JSON.parse(localStorage.getItem('me')||'null');if(el.classList.contains('me'))return {uid:me.uid,name:me.userName};if(el.classList.contains('on')&&el.dataset.uid)return {uid:el.dataset.uid,name:el.querySelector('.nm').textContent};return null}
async function takeSeat(i,who,me,roomId){try{await zim.setRoomAttributes({['seat'+i]:JSON.stringify({uid:who.uid,name:who.name})},roomId,{isForce:false});
  const streamID='room_'+roomId+'_seat'+i+'_'+who.uid;const media=await zg.createStream({audio:true});await zg.startPublishingStream(streamID,media);log('推流 '+streamID);return true}catch(e){log('上麦失败: '+e.message);return false}}
async function leaveSeat(i,me,roomId){try{await zim.deleteRoomAttributes(['seat'+i],roomId,{isForce:false});log('下麦 seat'+i)}catch(e){log('下麦失败: '+e.message)}}
function updSeat(i,val){const el=\$('#grid').children[i];if(!el)return;const me=JSON.parse(localStorage.getItem('me')||'null');el.classList.remove('on','me');
  if(!val||!val.uid){el.querySelector('.nm').textContent='空';el.dataset.uid=''}else{el.querySelector('.nm').textContent=val.name;el.dataset.uid=val.uid;el.classList.add('on');if(me&&val.uid===me.uid)el.classList.add('me')}
  let n=0;for(const c of \$('#grid').children)if(c.classList.contains('on'))n++; \$('#occ').textContent=n+'/15';}
<\/script>
</body>
</html>`;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const json = (o, s=200) => new Response(JSON.stringify(o), { status:s, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'} });
    if (req.method === 'OPTIONS') return new Response(null, { headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'} });
    try {
      if (url.pathname === '/api/sms' && req.method === 'POST') {
        const { phone } = await req.json();
        if (!/^1\d{10}$/.test(phone)) return json({ ok:false, msg:'手机号格式错误' }, 400);
        const code = String(Math.floor(100000 + Math.random()*900000));
        console.log('[sms] phone='+phone+' code='+code);
        await env.KV.put('sms:'+phone, code, { expirationTtl: 300 });
        const user = { phone, uid:'u_'+phone.slice(-4), createdAt: Date.now() };
        await env.KV.put('user:'+phone, JSON.stringify(user), { expirationTtl: 86400*7 });
        return json({ ok:true, msg:'验证码已发送', devCode: code });
      }
      if (url.pathname === '/api/login' && req.method === 'POST') {
        const { phone, code } = await req.json();
        const real = await env.KV.get('sms:'+phone);
        if (!real || real !== code) return json({ ok:false, msg:'验证码错误或已过期' }, 400);
        const user = JSON.parse(await env.KV.get('user:'+phone) || '{}');
        if (!user.uid) return json({ ok:false, msg:'用户不存在' }, 400);
        const token = await generateToken04(APP_ID, user.uid, env.SERVER_SECRET, 3600, JSON.stringify({ room_id:'', privilege:{1:1,2:1}, stream_id_list:null }));
        await env.KV.delete('sms:'+phone);
        return json({ ok:true, uid:user.uid, userName:phone, token, appId:APP_ID });
      }
      if (url.pathname === '/api/rooms' && req.method === 'GET') {
        const list = JSON.parse(await env.KV.get('rooms') || '[]');
        return json({ ok:true, rooms: list });
      }
      if (url.pathname === '/api/rooms' && req.method === 'POST') {
        const { roomId, name, ownerUid } = await req.json();
        if (!roomId || !name) return json({ ok:false, msg:'参数缺失' }, 400);
        const list = JSON.parse(await env.KV.get('rooms') || '[]');
        if (list.find(r=>String(r.roomId)===String(roomId))) return json({ ok:false, msg:'房间ID已存在' }, 400);
        const room = { roomId:String(roomId), name, ownerUid, createdAt:Date.now() };
        list.push(room); await env.KV.put('rooms', JSON.stringify(list));
        return json({ ok:true, room });
      }
    } catch (e) { return json({ ok:false, msg: e.message || 'server error' }, 500); }
    return new Response(html(), { headers:{ 'Content-Type':'text/html; charset=utf-8' } });
  }
};

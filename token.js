// token.js - Cloudflare Worker 入口（签即构 Token04）
// APP_ID / SERVER_SECRET 通过 `wrangler secret put` 注入，不进代码库
import { generateToken04 } from './token04.js';

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    let body = {};
    try { body = await request.json(); } catch (_) {}
    const userId = String(body.userId || '').trim();
    const roomId = String(body.roomId || '').trim();
    if (!userId || !roomId) {
      return new Response(JSON.stringify({ error: 'userId 和 roomId 必填' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    const appId = Number(env.APP_ID);
    const serverSecret = env.SERVER_SECRET;
    if (!appId || !serverSecret) {
      return new Response(JSON.stringify({ error: 'Worker 未配置 APP_ID/SERVER_SECRET' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    const payload = JSON.stringify({
      room_id: roomId,
      privilege: { 1: 1, 2: 1 },
      stream_id_list: null
    });

    try {
      const token = await generateToken04(appId, userId, serverSecret, 3600, payload);
      return new Response(JSON.stringify({ token, appId }), {
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: '签发失败: ' + e.message }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...cors }
      });
    }
  }
};

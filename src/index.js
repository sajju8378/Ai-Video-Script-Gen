import { handleApi, apiResponse } from './api.js';
import { parseScript } from './core/script-parser.js';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>AI Video Script Studio</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:1100px;margin:40px auto;padding:0 20px;background:#111;color:#eee}
  textarea,input{width:100%;box-sizing:border-box;background:#1d1d1d;color:#fff;border:1px solid #444;border-radius:8px;padding:12px}
  textarea{min-height:180px} button{padding:11px 16px;margin:10px 8px 10px 0;border:0;border-radius:8px;cursor:pointer}
  .card{background:#191919;border:1px solid #333;border-radius:12px;padding:18px;margin-top:18px} pre{white-space:pre-wrap;word-break:break-word}
</style>
</head>
<body>
<main>
  <h1>AI Video Script Studio</h1>
  <p>Script → characters → scenes → generation → timeline</p>

  <div class="card">
    <h2>1. Story Blueprint</h2>
    <textarea id="script" placeholder="Paste your script here...\n\nExample:\nSCENE 1: Village road\nRavi walks toward the house.\nRavi: Hello Sita.\nSita turns and smiles."></textarea>
    <button id="analyze">Create Story Blueprint</button>
  </div>

  <div class="card">
    <h2>2. Generate Video Scene</h2>
    <label>Scene image URL (optional)</label>
    <input id="image" placeholder="https://.../scene.jpg" />
    <label>Visual prompt</label>
    <input id="visualPrompt" placeholder="A cinematic South Indian village road at sunset" />
    <label>Motion prompt</label>
    <input id="motionPrompt" placeholder="Camera slowly moves forward while the character walks" />
    <label>Negative prompt</label>
    <input id="negativePrompt" placeholder="flicker, distorted face, extra limbs" />
    <button id="generate">Generate Scene Video</button>
  </div>

  <div class="card"><h2>Result</h2><pre id="result">Ready.</pre></div>
</main>
<script>
const result = document.querySelector('#result');

document.querySelector('#analyze').onclick = async () => {
  result.textContent = 'Building blueprint...';
  try {
    const script = document.querySelector('#script').value;
    const r = await fetch('/api/script/analyze', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({script}) });
    result.textContent = JSON.stringify(await r.json(), null, 2);
  } catch (e) { result.textContent = e.message; }
};

document.querySelector('#generate').onclick = async () => {
  result.textContent = 'Sending scene to video generator...';
  try {
    const r = await fetch('/api/generation/video', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({scene:{
        image:document.querySelector('#image').value || null,
        visualPrompt:document.querySelector('#visualPrompt').value,
        motionPrompt:document.querySelector('#motionPrompt').value,
        negativePrompt:document.querySelector('#negativePrompt').value
      }})
    });
    result.textContent = JSON.stringify(await r.json(), null, 2);
  } catch (e) { result.textContent = e.message; }
};
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type' } });
    if (request.method === 'GET' && url.pathname === '/') return new Response(html, { headers:{'content-type':'text/html; charset=utf-8'} });
    if (request.method === 'POST' && url.pathname === '/api/script/analyze') {
      try {
        const body = await request.json();
        return apiResponse({ ok:true, blueprint:parseScript(body.script) });
      } catch (error) { return apiResponse({ ok:false, error:error.message || 'Invalid JSON request.' },400); }
    }
    const apiResult = await handleApi(request, url.pathname, env);
    if (apiResult) return apiResult;
    if (request.method === 'GET' && url.pathname === '/api/health') return apiResponse({ ok:true, service:'ai-video-script-gen', version:'0.4.0', stages:['project','characters','scenes','generation','timeline'] });
    return apiResponse({ ok:false,error:'Not found' },404);
  }
};

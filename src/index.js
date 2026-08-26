import { handleApi, apiResponse } from './api.js';
import { parseScript } from './core/script-parser.js';

const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>AI Video Script Studio</title></head>
<body>
  <main>
    <h1>AI Video Script Studio</h1>
    <p>Framework: script → characters → scenes → generation → timeline.</p>
    <textarea id="script" rows="14" cols="90" placeholder="Paste your script here...\n\nExample:\nSCENE 1: Village road\nRavi walks toward the house.\nRavi: Hello Sita.\nSita turns and smiles."></textarea>
    <br /><button id="analyze">Create Story Blueprint</button>
    <pre id="result"></pre>
  </main>
  <script>
    const result = document.querySelector('#result');
    document.querySelector('#analyze').onclick = async () => {
      result.textContent = 'Building blueprint...';
      const script = document.querySelector('#script').value;
      const r = await fetch('/api/script/analyze', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({script}) });
      result.textContent = JSON.stringify(await r.json(), null, 2);
    };
  </script>
</body></html>`;

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type' } });
    if (request.method === 'GET' && url.pathname === '/') return new Response(html, { headers:{'content-type':'text/html; charset=utf-8'} });
    if (request.method === 'POST' && url.pathname === '/api/script/analyze') {
      try {
        const body = await request.json();
        return apiResponse({ ok:true, blueprint:parseScript(body.script) });
      } catch (error) { return apiResponse({ ok:false, error:error.message || 'Invalid JSON request.' },400); }
    }
    const apiResult = await handleApi(request, url.pathname);
    if (apiResult) return apiResult;
    if (request.method === 'GET' && url.pathname === '/api/health') return apiResponse({ ok:true, service:'ai-video-script-gen', version:'0.3.0', stages:['project','characters','scenes','generation','timeline'] });
    return apiResponse({ ok:false,error:'Not found' },404);
  }
};

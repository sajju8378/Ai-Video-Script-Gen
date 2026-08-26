import { handleApi, apiResponse } from './api.js';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Video Script Studio</title>
</head>
<body>
  <main>
    <h1>AI Video Script Studio</h1>
    <p>Framework: project → characters → scenes → generation → timeline.</p>
    <textarea id="script" rows="12" cols="80" placeholder="Paste your script here..."></textarea>
    <br />
    <button id="analyze">Create Story Blueprint</button>
    <pre id="result"></pre>
  </main>
  <script>
    const result = document.querySelector('#result');
    document.querySelector('#analyze').onclick = async () => {
      result.textContent = 'Building blueprint...';
      const script = document.querySelector('#script').value;
      const r = await fetch('/api/script/analyze', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ script })
      });
      result.textContent = JSON.stringify(await r.json(), null, 2);
    };
  </script>
</body>
</html>`;

function analyzeScript(script) {
  const text = String(script || '').trim();
  if (!text) return { characters: [], scenes: [] };
  const blocks = text.split(/\\n\\s*\\n/).map(x => x.trim()).filter(Boolean);
  return {
    characters: [],
    scenes: blocks.map((block, index) => ({
      title: `Scene ${index + 1}`,
      description: block,
      durationSeconds: 5,
      action: block,
      characters: [],
      dialogue: [],
      camera: '',
      visualPrompt: '',
      motionPrompt: ''
    }))
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } });
    }
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (request.method === 'POST' && url.pathname === '/api/script/analyze') {
      try {
        const body = await request.json();
        const blueprint = analyzeScript(body.script);
        return apiResponse({ ok: true, blueprint });
      } catch {
        return apiResponse({ ok: false, error: 'Invalid JSON request.' }, 400);
      }
    }
    const apiResult = await handleApi(request, url.pathname);
    if (apiResult) return apiResult;
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return apiResponse({ ok: true, service: 'ai-video-script-gen', version: '0.2.0', stages: ['project','characters','scenes','generation','timeline'] });
    }
    return apiResponse({ ok: false, error: 'Not found' }, 404);
  }
};

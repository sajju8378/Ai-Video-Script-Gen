const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

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
    <p>Framework ready: script → characters → scenes → scene generation.</p>
    <textarea id="script" rows="12" cols="80" placeholder="Paste your script here..."></textarea>
    <br />
    <button id="analyze">Analyze Script</button>
    <pre id="result"></pre>
  </main>
  <script>
    const result = document.querySelector('#result');
    document.querySelector('#analyze').onclick = async () => {
      result.textContent = 'Analyzing...';
      const script = document.querySelector('#script').value;
      const r = await fetch('/api/script/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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

  // Framework parser only. AI-assisted parsing will be added later.
  const lines = text.split(/\\n+/).map(x => x.trim()).filter(Boolean);
  return {
    characters: [],
    scenes: lines.map((line, index) => ({
      id: `scene-${index + 1}`,
      order: index + 1,
      description: line,
      durationSeconds: null,
      status: 'draft',
      generation: null
    }))
  };
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (request.method === 'POST' && url.pathname === '/api/script/analyze') {
      try {
        const body = await request.json();
        return json({ ok: true, project: analyzeScript(body.script) });
      } catch {
        return json({ ok: false, error: 'Invalid JSON request.' }, 400);
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/health') {
      return json({ ok: true, service: 'ai-video-script-gen', version: '0.1.0' });
    }

    return json({ ok: false, error: 'Not found' }, 404);
  }
};

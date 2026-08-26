const DEFAULT_NEGATIVE = "blurry, low quality, chaotic, deformed, watermark, bad anatomy, shaky camera view point";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
function spaceBase(env) {
  const id = env.HF_SPACE || "Saravutw/WAN2.2_I2V_LIGHTNING_4-8step_custom";
  const [owner, repo] = id.split("/");
  return `https://${owner.toLowerCase()}-${repo.toLowerCase().replace(/_/g, "-")}.hf.space`;
}
function authHeaders(env) { return env.HF_TOKEN ? { Authorization: `Bearer ${env.HF_TOKEN}` } : {}; }
async function uploadToSpace(file, env) {
  const body = new FormData(); body.append("files", file, file.name || "input.png");
  const response = await fetch(`${spaceBase(env)}/gradio_api/upload`, { method: "POST", headers: authHeaders(env), body });
  if (!response.ok) throw new Error(`Hugging Face upload failed (${response.status}): ${(await response.text()).slice(0,500)}`);
  const result = await response.json(); const path = Array.isArray(result) ? result[0] : result;
  if (!path) throw new Error("Hugging Face did not return an uploaded file path.");
  return { path, meta: { _type: "gradio.FileData" }, orig_name: file.name || "input.png" };
}
async function startWan(request, env) {
  const form = await request.formData(); const image = form.get("image");
  if (!(image instanceof File)) return json({ error: "Please provide an image file." }, 400);
  const lastImage = form.get("lastImage");
  const prompt = String(form.get("prompt") || "high quality, high resolution, cinematic motion, smooth animation");
  const duration = Number(form.get("duration") || 3.5); const steps = Number(form.get("steps") || 4);
  const inputImage = await uploadToSpace(image, env); let lastImageData = null;
  if (lastImage instanceof File && lastImage.size > 0) lastImageData = await uploadToSpace(lastImage, env);
  const data = [inputImage, lastImageData, prompt, steps, DEFAULT_NEGATIVE, duration, 1, 1, 42, true, 5, "UniPCMultistep", 3, 16, false, true];
  const response = await fetch(`${spaceBase(env)}/gradio_api/call/generate_video`, { method: "POST", headers: { ...authHeaders(env), "content-type": "application/json" }, body: JSON.stringify({ data }) });
  const text = await response.text(); if (!response.ok) throw new Error(`Wan request failed (${response.status}): ${text.slice(0,700)}`);
  let result; try { result = JSON.parse(text); } catch { result = null; }
  if (!result?.event_id) throw new Error(`Wan did not return an event id: ${text.slice(0,700)}`);
  return json({ ok: true, eventId: result.event_id, space: env.HF_SPACE });
}
function extractComplete(text) {
  const blocks = text.split(/\n\n+/);
  for (const block of blocks) {
    if (/event:\s*complete/.test(block)) {
      const dataLines = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim());
      if (dataLines.length) { const raw = dataLines.join("\n"); try { return { complete: true, data: JSON.parse(raw) }; } catch { return { complete: true, data: raw }; } }
    }
    if (/event:\s*error/.test(block)) { const line = block.split(/\r?\n/).find(x => x.startsWith("data:")); return { error: line ? line.slice(5).trim() : "Hugging Face returned an error." }; }
  }
  return null;
}
async function wanStatus(eventId, env) {
  if (!eventId) return json({ error: "Missing eventId." }, 400);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${spaceBase(env)}/gradio_api/call/generate_video/${encodeURIComponent(eventId)}`, { headers: authHeaders(env), signal: controller.signal });
    const text = await response.text(); const parsed = extractComplete(text);
    if (parsed?.complete) return json({ ok: true, status: "complete", data: parsed.data });
    if (parsed?.error) return json({ ok: false, status: "error", error: parsed.error }, 502);
    return json({ ok: true, status: "processing" });
  } catch (error) {
    if (error?.name === "AbortError") return json({ ok: true, status: "processing" });
    return json({ ok: false, status: "error", error: String(error?.message || error) }, 502);
  } finally { clearTimeout(timer); }
}
const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>AI Video Script Studio</title><style>
body{font-family:system-ui,sans-serif;margin:0;background:#0b1020;color:#eef2ff}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font-size:38px;margin:0 0 8px}.sub{color:#aeb9d6;margin-bottom:28px}.card{background:#131b31;border:1px solid #273454;border-radius:16px;padding:20px;margin-bottom:18px}label{display:block;font-weight:700;margin:0 0 8px}textarea,input{width:100%;box-sizing:border-box;background:#0d1427;color:#fff;border:1px solid #344262;border-radius:10px;padding:12px;font:inherit}textarea{min-height:180px;resize:vertical}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}.character{border:1px solid #344262;border-radius:12px;padding:14px;margin-top:12px}.scene{border-left:4px solid #6d5dfc;background:#0e162b;padding:14px;margin-top:12px;border-radius:8px}.btn{background:#6d5dfc;color:#fff;border:0;border-radius:10px;padding:13px 18px;font-weight:800;cursor:pointer}.btn:disabled{opacity:.5}.muted{color:#9aa8c9}.status{margin-top:12px;padding:12px;border-radius:10px;background:#0d1427}.video{max-width:100%;margin-top:14px;border-radius:12px}@media(max-width:700px){.row{grid-template-columns:1fr}}</style></head><body><main>
<h1>AI Video Script Studio</h1><div class="sub">Script → characters → scenes → Wan 2.2 image-to-video</div>
<div class="card"><label for="script">Your script</label><textarea id="script" placeholder="Paste your story or scene script here. Describe what each character does and when."></textarea><p class="muted">Character consistency can use either a reference image or a written description.</p><div id="characters"></div><button class="btn" onclick="addCharacter()">+ Add character</button></div>
<div class="card"><label>Quick scene test</label><div class="row"><div><label for="image">Starting image</label><input id="image" type="file" accept="image/*"></div><div><label for="duration">Duration</label><input id="duration" type="number" min="2" max="10" step="0.1" value="3.5"></div></div><label for="prompt" style="margin-top:16px">Motion prompt</label><textarea id="prompt" style="min-height:100px">high quality, high resolution, cinematic motion, smooth animation</textarea><button id="generate" class="btn" onclick="generate()">Generate Scene Video</button><div id="status" class="status">Ready.</div><div id="result"></div></div>
<div class="card"><b>Current framework</b><p class="muted">This first working layer connects the creator UI to the Cloudflare Worker and the Wan 2.2 ZeroGPU Space. The full script-to-scenes workflow will be added on top of this stable video engine.</p></div></main>
<script>
function addCharacter(){const n=document.querySelectorAll('.character').length+1;const el=document.createElement('div');el.className='character';el.innerHTML='<label>Character '+n+'</label><input placeholder="Character name"><textarea style="min-height:80px;margin-top:8px" placeholder="Describe appearance, personality and behavior, or upload a reference image below."></textarea><input type="file" accept="image/*" style="margin-top:8px">';document.getElementById('characters').appendChild(el)}
async function generate(){const file=document.getElementById('image').files[0];if(!file){alert('Choose a starting image first.');return}const btn=document.getElementById('generate'),status=document.getElementById('status'),result=document.getElementById('result');btn.disabled=true;result.innerHTML='';status.textContent='Uploading image and submitting Wan 2.2 job...';try{const fd=new FormData();fd.append('image',file);fd.append('prompt',document.getElementById('prompt').value);fd.append('duration',document.getElementById('duration').value);const start=await fetch('/api/wan/start',{method:'POST',body:fd});const s=await start.json();if(!start.ok)throw new Error(s.error||'Could not start generation');status.textContent='Job submitted. Waiting for the ZeroGPU result...';const id=s.eventId;for(;;){await new Promise(r=>setTimeout(r,7000));const r=await fetch('/api/wan/status?eventId='+encodeURIComponent(id));const j=await r.json();if(j.status==='error')throw new Error(j.error||'Generation failed');if(j.status==='complete'){status.textContent='Complete.';const url=findUrl(j.data);if(url)result.innerHTML='<video class="video" controls autoplay src="'+escapeHtml(url)+'"></video><p><a href="'+escapeHtml(url)+'" target="_blank">Open generated video</a></p>';else result.innerHTML='<pre>'+escapeHtml(JSON.stringify(j.data,null,2))+'</pre>';break}status.textContent='Wan 2.2 is generating...'}}catch(e){status.textContent='Error: '+e.message}finally{btn.disabled=false}}
function findUrl(x){if(!x)return null;if(typeof x==='string'&&/^https?:\/\//.test(x))return x;if(Array.isArray(x)){for(const v of x){const u=findUrl(v);if(u)return u}}if(typeof x==='object'){if(typeof x.url==='string')return x.url;if(typeof x.path==='string'&&/^https?:\/\//.test(x.path))return x.path;for(const v of Object.values(x)){const u=findUrl(v);if(u)return u}}return null}
function escapeHtml(s){return String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
</script></body></html>`;
export default { async fetch(request, env) { const url = new URL(request.url); try { if(url.pathname==='/api/health') return json({ok:true,worker:'ai-video-script-gen',hfSpace:env.HF_SPACE||null,tokenConfigured:Boolean(env.HF_TOKEN)}); if(url.pathname==='/api/wan/start'&&request.method==='POST') return await startWan(request,env); if(url.pathname==='/api/wan/status'&&request.method==='GET') return await wanStatus(url.searchParams.get('eventId'),env); return new Response(HTML,{headers:{'content-type':'text/html; charset=utf-8'}}); } catch(error) { return json({ok:false,error:String(error?.message||error)},500); } } };

const NEGATIVE="blurry, low quality, chaotic, deformed, watermark, bad anatomy, shaky camera viewpoint";
const json=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
function base(env){const id=env.HF_SPACE||"Saravutw/WAN2.2_I2V_LIGHTNING_4-8step_custom";const [o,r]=id.split("/");return `https://${o.toLowerCase()}-${r.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.hf.space`}
function headers(env){return env.HF_TOKEN?{Authorization:`Bearer ${env.HF_TOKEN}`}:{}}
async function upload(file,env){const f=new FormData();f.append("files",file,file.name||"input.png");const r=await fetch(base(env)+"/gradio_api/upload",{method:"POST",headers:headers(env),body:f});const t=await r.text();if(!r.ok)throw Error(`HF upload failed (${r.status}): ${t.slice(0,500)}`);let x;try{x=JSON.parse(t)}catch{throw Error("HF upload returned invalid JSON")};const p=Array.isArray(x)?x[0]:x;if(!p)throw Error("HF did not return an uploaded file path");return{path:p,meta:{_type:"gradio.FileData"},orig_name:file.name||"input.png"}}
async function start(req,env){const f=await req.formData(),img=f.get("image");if(!(img instanceof File))return json({error:"Please choose a starting image."},400);const prompt=String(f.get("prompt")||"high quality, high resolution, cinematic motion, smooth animation"),duration=Number(f.get("duration")||3.5);const image=await upload(img,env);const data=[image,null,prompt,4,NEGATIVE,duration,1,1,42,true,5,"UniPCMultistep",3,16,false,true];const r=await fetch(base(env)+"/gradio_api/call/generate_video",{method:"POST",headers:{...headers(env),"content-type":"application/json"},body:JSON.stringify({data})});const t=await r.text();if(!r.ok)throw Error(`Wan request failed (${r.status}): ${t.slice(0,700)}`);let x;try{x=JSON.parse(t)}catch{}if(!x?.event_id)throw Error(`Wan did not return an event id: ${t.slice(0,700)}`);return json({ok:true,eventId:x.event_id})}
async function stream(id,env){if(!id)return json({error:"Missing eventId"},400);const r=await fetch(base(env)+"/gradio_api/call/generate_video/"+encodeURIComponent(id),{headers:headers(env)});if(!r.ok)return new Response(await r.text(),{status:r.status,headers:{"content-type":"text/plain;charset=utf-8"}});return new Response(r.body,{headers:{"content-type":"text/event-stream;charset=utf-8","cache-control":"no-cache, no-store","connection":"keep-alive"}})}
const HTML=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Video Script Studio</title><style>body{font-family:system-ui;margin:0;background:#0b1020;color:#eef2ff}main{max-width:1000px;margin:auto;padding:32px 20px}h1{font-size:38px;margin:0 0 8px}.sub,.muted{color:#aeb9d6}.version{font-size:12px;color:#7f8eb5;margin:8px 0 20px}.card{background:#131b31;border:1px solid #273454;border-radius:16px;padding:20px;margin:18px 0}label{display:block;font-weight:700;margin:0 0 8px}textarea,input{width:100%;box-sizing:border-box;background:#0d1427;color:white;border:1px solid #344262;border-radius:10px;padding:12px;font:inherit}textarea{min-height:180px}.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}.character{border:1px solid #344262;border-radius:12px;padding:14px;margin:12px 0}.btn{background:#6d5dfc;color:white;border:0;border-radius:10px;padding:13px 18px;font-weight:800;cursor:pointer}.btn:disabled{opacity:.5;cursor:wait}.status{margin-top:12px;padding:12px;background:#0d1427;border-radius:10px;min-height:20px}.video{max-width:100%;margin-top:15px}@media(max-width:700px){.row{grid-template-columns:1fr}}</style></head><body><main><h1>AI Video Script Studio</h1><div class="sub">Script → characters → scenes → Wan 2.2 image-to-video</div><div class="version">Framework v6 • robust generation handler</div><div class="card"><label>Your script</label><textarea id="script" placeholder="Paste your story or scene script here. Describe what each character does and when."></textarea><p class="muted">Character consistency can use either a reference image or a written description.</p><div id="chars"></div><button type="button" class="btn" id="add">+ Add character</button></div><div class="card"><label>Quick scene test</label><div class="row"><div><label>Starting image</label><input id="image" type="file" accept="image/*"></div><div><label>Duration</label><input id="duration" type="number" min="2" max="10" step="0.1" value="3.5"></div></div><label style="margin-top:16px">Motion prompt</label><textarea id="prompt" style="min-height:100px">high quality, high resolution, cinematic motion, smooth animation</textarea><button type="button" class="btn" id="generate">Generate Scene Video</button><div id="status" class="status">Ready. Choose an image and press Generate Scene Video.</div><div id="result"></div></div><div class="card"><b>Current framework</b><p class="muted">Script → characters → scenes is being built on top of the Wan 2.2 video engine.</p></div></main><script>
(function(){
function el(id){return document.getElementById(id)}
function msg(s){el('status').textContent=s}
function videoUrl(x){if(!x)return null;if(typeof x==='string'&&x.indexOf('http')===0)return x;if(Array.isArray(x)){for(var i=0;i<x.length;i++){var u=videoUrl(x[i]);if(u)return u}}if(typeof x==='object'){for(var k in x){var u=videoUrl(x[k]);if(u)return u}}return null}
async function generate(){
 var btn=el('generate'),file=el('image').files[0];
 msg('CLICK RECEIVED ✓');
 if(!file){msg('Please choose a starting image first.');return}
 btn.disabled=true;el('result').innerHTML='';
 try{
  msg('Preparing upload: '+file.name+' ('+Math.round(file.size/1024)+' KB)...');
  var fd=new FormData();fd.append('image',file);fd.append('prompt',el('prompt').value);fd.append('duration',el('duration').value);
  msg('Uploading image to Hugging Face...');
  var r=await fetch('/api/wan/start?ts='+Date.now(),{method:'POST',body:fd,cache:'no-store'});
  var text=await r.text();var j;try{j=JSON.parse(text)}catch(e){throw Error('Worker returned non-JSON: '+text.slice(0,300))}
  if(!r.ok)throw Error(j.error||('Worker HTTP '+r.status));
  if(!j.eventId)throw Error('No Hugging Face job ID was returned');
  msg('Job submitted. Waiting for ZeroGPU...');
  var q=await fetch('/api/wan/stream?eventId='+encodeURIComponent(j.eventId)+'&ts='+Date.now(),{cache:'no-store'});
  if(!q.ok){var qt=await q.text();throw Error('Hugging Face stream HTTP '+q.status+': '+qt.slice(0,300))}
  if(!q.body)throw Error('Browser streaming is unavailable');
  var reader=q.body.getReader(),decoder=new TextDecoder(),buf='';
  while(true){
   var z=await reader.read();if(z.done)break;buf+=decoder.decode(z.value,{stream:true});
   var parts=buf.split(/\n\n+/);buf=parts.pop()||'';
   for(var i=0;i<parts.length;i++){
    var b=parts[i],em=((b.match(/^event:\s*(.+)$/m)||[])[1]||''),dm=((b.match(/^data:\s*(.+)$/m)||[])[1]||'');
    if(em==='heartbeat')continue;
    if(em==='generating'||em==='pending'||em==='start'){msg('Wan 2.2 is generating...');continue}
    if(em==='error')throw Error(dm||'Hugging Face returned an error');
    if(em==='complete'){
      var d;try{d=JSON.parse(dm)}catch(e){d=dm};var u=videoUrl(d);msg('Complete.');
      if(u)el('result').innerHTML='<video class="video" controls autoplay src="'+u+'"></video><p><a target="_blank" href="'+u+'">Open generated video</a></p>';
      else el('result').textContent=JSON.stringify(d,null,2);
      return;
    }
   }
  }
  throw Error('Hugging Face closed the stream before completion');
 }catch(e){msg('Error: '+(e&&e.message?e.message:String(e)))}finally{btn.disabled=false}
}
el('generate').addEventListener('click',generate);
el('add').addEventListener('click',function(){var n=document.querySelectorAll('.character').length+1,d=document.createElement('div');d.className='character';d.innerHTML='<label>Character '+n+'</label><input placeholder="Character name"><textarea style="min-height:80px;margin-top:8px" placeholder="Describe appearance, personality and behavior, or use a reference image."></textarea><input type="file" accept="image/*" style="margin-top:8px">';el('chars').appendChild(d)});
})();
</script></body></html>`;
export default{async fetch(req,env){const u=new URL(req.url);try{if(u.pathname==='/api/health')return json({ok:true,version:'v6',tokenConfigured:Boolean(env.HF_TOKEN),hfSpace:env.HF_SPACE||null});if(u.pathname==='/api/wan/start'&&req.method==='POST')return await start(req,env);if(u.pathname==='/api/wan/stream'&&req.method==='GET')return await stream(u.searchParams.get('eventId'),env);return new Response(HTML,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store, no-cache, must-revalidate','pragma':'no-cache','expires':'0','x-framework-version':'v6'}})}catch(e){return json({ok:false,error:e.message},500)}}};

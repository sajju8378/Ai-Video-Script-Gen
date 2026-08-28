const NEG='blurry, low quality, chaotic, deformed, watermark, bad anatomy, shaky camera';
const MIN=20;

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=utf-8','cache-control':'no-store'}})}
function hfBase(env){const id=env.HF_SPACE||'Saravutw/WAN2.2_I2V_LIGHTNING_4-8step_custom';const p=id.split('/');return 'https://'+p[0].toLowerCase()+'-'+p[1].toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.hf.space'}
function auth(env){return env.HF_TOKEN?{Authorization:'Bearer '+env.HF_TOKEN}:{}}

async function upload(file,env){const fd=new FormData();fd.append('files',file,file.name||'input.png');const r=await fetch(hfBase(env)+'/gradio_api/upload',{method:'POST',headers:auth(env),body:fd});const t=await r.text();if(!r.ok)throw Error('Hugging Face upload failed: '+t.slice(0,500));let x;try{x=JSON.parse(t)}catch{throw Error('Hugging Face returned invalid upload data')}const path=Array.isArray(x)?x[0]:x;if(!path)throw Error('Hugging Face returned no file path');return{path,meta:{_type:'gradio.FileData'},orig_name:file.name||'input.png'}}
async function startVideo(req,env){const fd=await req.formData();const image=fd.get('image');if(!(image instanceof File))return json({error:'Please choose a starting image.'},400);const prompt=String(fd.get('prompt')||'high quality, high resolution, cinematic motion, smooth animation');const duration=Number(fd.get('duration')||3.5);const input=await upload(image,env);const data=[input,null,prompt,4,NEG,duration,1,1,42,true,5,'UniPCMultistep',3,16,false,true];const r=await fetch(hfBase(env)+'/gradio_api/call/generate_video',{method:'POST',headers:{...auth(env),'content-type':'application/json'},body:JSON.stringify({data})});const t=await r.text();if(!r.ok)throw Error('Wan request failed: '+t.slice(0,600));let x;try{x=JSON.parse(t)}catch{throw Error('Wan returned invalid JSON: '+t.slice(0,300))}if(!x.event_id)throw Error('Wan returned no event id');return json({ok:true,eventId:x.event_id})}
async function streamVideo(id,env){if(!id)return json({error:'Missing eventId'},400);const r=await fetch(hfBase(env)+'/gradio_api/call/generate_video/'+encodeURIComponent(id),{headers:auth(env)});if(!r.ok)return new Response(await r.text(),{status:r.status});return new Response(r.body,{headers:{'content-type':'text/event-stream;charset=utf-8','cache-control':'no-cache,no-store','connection':'keep-alive'}})}
async function videoFile(req,env){const raw=new URL(req.url).searchParams.get('path');if(!raw)return json({error:'Missing video path'},400);let p;try{p=decodeURIComponent(raw)}catch{p=raw}let target;if(p.startsWith('https://')){if(new URL(p).host!==new URL(hfBase(env)).host)return json({error:'Invalid video host'},400);target=p}else if(p.startsWith('/gradio_api/file=')){target=hfBase(env)+p}else{return json({error:'Invalid video path'},400)}const r=await fetch(target,{headers:auth(env)});if(!r.ok)return new Response(await r.text(),{status:r.status});const h=new Headers(r.headers);h.set('content-disposition','inline');h.set('cache-control','no-store');if(!h.get('content-type')||h.get('content-type')==='application/octet-stream')h.set('content-type','video/mp4');return new Response(r.body,{status:r.status,headers:h})}

const HTML=String.raw`<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Video Script Studio</title>
<style>
body{font-family:system-ui;margin:0;background:#0b1020;color:#eef2ff}main{max-width:1050px;margin:auto;padding:30px 20px}.card{background:#131b31;border:1px solid #273454;border-radius:16px;padding:20px;margin:18px 0}h1{margin:0 0 8px}.muted{color:#aeb9d6}.version{font-size:12px;color:#7f8eb5;margin:8px 0 18px}label{display:block;font-weight:700;margin:0 0 8px}textarea,input,select{width:100%;box-sizing:border-box;background:#0d1427;color:white;border:1px solid #344262;border-radius:10px;padding:12px;font:inherit}textarea{min-height:170px}.row,.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.btn{background:#6d5dfc;color:white;border:0;border-radius:10px;padding:12px 18px;font-weight:800;cursor:pointer}.btn:disabled{opacity:.45;cursor:not-allowed}.status{margin-top:12px;padding:12px;background:#0d1427;border-radius:10px}.bad{color:#ff6975;font-weight:800}.good{color:#72e6a3;font-weight:800}.scene{border:1px solid #344262;border-radius:12px;padding:14px;margin:12px 0;background:#0d1427}.scene textarea{min-height:90px}.sceneHead{display:flex;justify-content:space-between}.badge{border:1px solid #47577d;border-radius:999px;padding:4px 9px;font-size:12px}.video{max-width:100%;margin-top:15px}.download{display:inline-block;margin-top:10px;background:#245c46;color:white;text-decoration:none;padding:10px 14px;border-radius:9px;font-weight:800}@media(max-width:700px){.row,.grid{grid-template-columns:1fr}}
</style></head>
<body><main>
<h1>AI Video Script Studio</h1><div class="muted">Script → scene development → characters → scene-by-scene Wan 2.2 image-to-video</div><div class="version">Framework v22 • single script reader • live word counter • stable scene development</div>
<div class="card">
<label for="script">1. Your script</label><textarea id="script" placeholder="Paste your complete story or script here."></textarea>
<div id="count" class="status bad">0 words — 20 required</div><div id="validation" class="status bad">Please enter at least 20 words before developing scenes.</div>
<div class="row" style="margin-top:14px"><div><label for="pace">Narration pace</label><select id="pace"><option value="130">Slow / cinematic — 130 words/min</option><option value="150" selected>Normal narration — 150 words/min</option><option value="170">Fast narration — 170 words/min</option></select></div><div><label for="minDuration">Minimum scene duration</label><input id="minDuration" type="number" min="2" max="10" step="0.5" value="3"></div></div>
<p class="muted">The browser reads this one script field directly. No second script reader is used.</p><button id="develop" type="button" class="btn" disabled>Develop Scenes</button><div id="devStatus" class="status">Type at least 20 words.</div>
</div>
<div id="sceneCard" class="card" style="display:none"><b>2. Developed scenes</b><div id="summary" class="muted" style="margin-top:5px"></div><div id="scenes"></div></div>
<div class="card"><label for="image">3. Quick Wan 2.2 scene test</label><input id="image" type="file" accept="image/*"><div id="imageStatus" class="status">No image selected.</div><label style="margin-top:12px" for="prompt">Motion prompt</label><textarea id="prompt" style="min-height:100px">high quality, high resolution, cinematic motion, smooth animation</textarea><div class="row"><div><label for="duration">Duration</label><input id="duration" type="number" min="2" max="10" step="0.1" value="3.5"></div><div style="display:flex;align-items:end"><button id="generate" type="button" class="btn" style="width:100%">Generate Scene Video</button></div></div><div id="status" class="status">Choose an image and press Generate Scene Video.</div><div id="result"></div></div>
</main>
<script>
(function(){
'use strict';
var MIN_WORDS=20;
var scriptEl=document.getElementById('script');
var countEl=document.getElementById('count');
var validationEl=document.getElementById('validation');
var developBtn=document.getElementById('develop');
var devStatus=document.getElementById('devStatus');
var scenesEl=document.getElementById('scenes');
var sceneCard=document.getElementById('sceneCard');
var summaryEl=document.getElementById('summary');

function wordCount(text){
  var value=String(text||'').trim();
  if(!value)return 0;
  return value.split(/\s+/).filter(Boolean).length;
}
function escapeHtml(text){return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function updateCounter(){
  var n=wordCount(scriptEl.value);
  var ready=n>=MIN_WORDS;
  countEl.textContent=n+' words — '+(ready?'minimum reached ✓':(MIN_WORDS-n)+' more required');
  countEl.className='status '+(ready?'good':'bad');
  validationEl.className='status '+(ready?'good':'bad');
  validationEl.textContent=ready?'Script ready ✓. Develop Scenes is enabled.':'Please enter at least 20 words before developing scenes. Current count: '+n+'.';
  developBtn.disabled=!ready;
  if(!ready)devStatus.textContent='Type at least '+(MIN_WORDS-n)+' more word'+(MIN_WORDS-n===1?'':'s')+'.';
  else if(!sceneCard.style.display||sceneCard.style.display==='none')devStatus.textContent='Script ready ✓. Press Develop Scenes.';
}
function splitScenes(text){
  var clean=String(text||'').replace(/\r/g,'').trim();
  if(!clean)return [];
  var blocks=clean.split(/\n\s*\n+/).map(function(x){return x.trim();}).filter(Boolean);
  if(blocks.length>1)return blocks;
  var sentences=clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean];
  var out=[],buffer='';
  var cue=/\b(suddenly|later|meanwhile|finally|then|afterwards|after that|next morning|that night|the next day|outside|inside|near)\b/i;
  function flush(){if(buffer.trim()){out.push(buffer.trim());buffer='';}}
  sentences.forEach(function(raw,index){
    var sentence=raw.trim();
    if(index>0&&cue.test(sentence)){flush();buffer=sentence;return;}
    var candidate=(buffer?buffer+' ':'')+sentence;
    if(wordCount(candidate)>45){flush();buffer=sentence;}else buffer=candidate;
  });
  flush();
  return out.length?out:[clean];
}
function sceneDuration(text){
  var pace=Number(document.getElementById('pace').value)||150;
  var minimum=Math.max(2,Number(document.getElementById('minDuration').value)||3);
  var seconds=Math.round((wordCount(text)/pace*60)*2)/2;
  return Math.max(minimum,Math.min(12,seconds));
}
function motionPrompt(text){
  var lower=text.toLowerCase(),parts=[];
  if(/fly|flying|run|walk|move|fight|jump|swim|land|drive|ride/.test(lower))parts.push('natural character movement');
  if(/look|looks|watch|turn|face/.test(lower))parts.push('subtle head and eye movement');
  if(/wind|ocean|wave|waves|rain|cloud|storm|fire|smoke/.test(lower))parts.push('natural environmental motion');
  parts.push('smooth cinematic camera movement','high quality','high resolution');
  return parts.join(', ');
}
function developScenes(){
  updateCounter();
  if(wordCount(scriptEl.value)<MIN_WORDS)return;
  developBtn.disabled=true;
  devStatus.textContent='Developing scenes...';
  setTimeout(function(){
    try{
      var parts=splitScenes(scriptEl.value),total=0;
      scenesEl.innerHTML='';
      parts.forEach(function(part,index){
        var d=sceneDuration(part),start=total;total+=d;
        var card=document.createElement('div');card.className='scene';
        card.innerHTML='<div class="sceneHead"><b>Scene '+(index+1)+'</b><span class="badge">'+d.toFixed(1)+' sec</span></div><div class="muted" style="margin:8px 0">Timeline: '+start.toFixed(1)+'s → '+total.toFixed(1)+'s</div><div class="grid"><div><label>Scene script / narration</label><textarea class="sceneScript">'+escapeHtml(part)+'</textarea></div><div><label>Visual description</label><textarea class="sceneVisual">Cinematic visual interpretation: '+escapeHtml(part)+'</textarea></div><div><label>Motion prompt</label><textarea class="sceneMotion">'+escapeHtml(motionPrompt(part))+'</textarea></div><div><label>Scene starting image</label><input class="sceneImage" type="file" accept="image/*"><div class="sceneImageStatus status">No image selected.</div></div></div><button type="button" class="btn sceneBtn" data-index="'+index+'" '+(index?'disabled':'')+'>Generate Scene '+(index+1)+' Video</button><div class="sceneStatus status">'+(index?'Locked until previous scene succeeds.':'Ready. Choose an image.')+'</div><div class="sceneResult"></div>';
        scenesEl.appendChild(card);
      });
      summaryEl.textContent=parts.length+' scenes • estimated total duration '+total.toFixed(1)+' seconds';
      sceneCard.style.display='block';
      scenesEl.querySelectorAll('.sceneImage').forEach(function(input){input.addEventListener('change',function(){var status=this.parentElement.querySelector('.sceneImageStatus');status.textContent=this.files[0]?'IMAGE LOADED ✓ '+this.files[0].name:'No image selected.';});});
      scenesEl.querySelectorAll('.sceneBtn').forEach(function(btn){btn.addEventListener('click',function(){generateScene(Number(this.dataset.index),this);});});
      devStatus.textContent='Scene development complete ✓';
      sceneCard.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(error){devStatus.textContent='Scene development error: '+error.message;}
    finally{updateCounter();}
  },30);
}
function findVideo(value){
  if(typeof value==='string'&&(value.indexOf('http')===0||value.indexOf('/gradio_api/file=')===0))return value;
  if(Array.isArray(value)){for(var i=0;i<value.length;i++){var a=findVideo(value[i]);if(a)return a;}}
  if(value&&typeof value==='object'){for(var key in value){var b=findVideo(value[key]);if(b)return b;}}
  return null;
}
async function generateScene(index,button){
  var card=document.querySelectorAll('.scene')[index];
  var image=card.querySelector('.sceneImage').files[0];
  var status=card.querySelector('.sceneStatus');
  var result=card.querySelector('.sceneResult');
  if(!image){status.textContent='STOPPED: choose a starting image for this scene.';return;}
  button.disabled=true;
  try{
    var fd=new FormData();
    fd.append('image',image,image.name);fd.append('prompt',card.querySelector('.sceneMotion').value+' '+card.querySelector('.sceneVisual').value);fd.append('duration',sceneDuration(card.querySelector('.sceneScript').value));
    status.textContent='Image loaded ✓. Sending image to Cloudflare → Hugging Face...';
    var response=await fetch('/api/wan/start?ts='+Date.now(),{method:'POST',body:fd,cache:'no-store'});
    var data=await response.json();
    if(!response.ok)throw Error(data.error||'Video request failed');
    status.textContent='Image uploaded ✓. Wan 2.2 job submitted ✓. Waiting for generation...';
    var stream=await fetch('/api/wan/stream?eventId='+encodeURIComponent(data.eventId)+'&ts='+Date.now(),{cache:'no-store'});
    if(!stream.ok)throw Error('Generation stream HTTP '+stream.status);
    var reader=stream.body.getReader(),decoder=new TextDecoder(),buffer='';
    while(true){
      var chunk=await reader.read();if(chunk.done)break;
      buffer+=decoder.decode(chunk.value,{stream:true});
      var pieces=buffer.split('\n\n');buffer=pieces.pop()||'';
      for(var p=0;p<pieces.length;p++){
        var event='',payload='';
        pieces[p].split('\n').forEach(function(line){if(line.indexOf('event:')===0)event=line.slice(6).trim();if(line.indexOf('data:')===0)payload=line.slice(5).trim();});
        if(event==='generating'||event==='pending')status.textContent='Wan 2.2 generating...';
        if(event==='error')throw Error(payload||'Wan generation failed');
        if(event==='complete'){
          var parsed;try{parsed=JSON.parse(payload);}catch{parsed=payload;}
          var video=findVideo(parsed);if(!video)throw Error('Generation completed but no video URL was returned.');
          var proxy='/api/wan/file?path='+encodeURIComponent(video);
          result.innerHTML='<video class="video" controls playsinline src="'+proxy+'"></video><br><a class="download" href="'+proxy+'" download="scene-'+(index+1)+'-video.mp4">Download Scene '+(index+1)+' Video</a>';
          status.textContent='Complete ✓ Download the video immediately before continuing.';
          var next=document.querySelector('.sceneBtn[data-index="'+(index+1)+'"]');
          if(next){next.disabled=false;next.parentElement.querySelector('.sceneStatus').textContent='Unlocked ✓ Ready for generation.';}
          return;
        }
      }
    }
    throw Error('Generation stream ended before completion.');
  }catch(error){status.textContent='Error: '+error.message;}finally{button.disabled=false;}
}

scriptEl.addEventListener('input',updateCounter);
scriptEl.addEventListener('keyup',updateCounter);
scriptEl.addEventListener('change',updateCounter);
document.getElementById('pace').addEventListener('change',updateCounter);
document.getElementById('minDuration').addEventListener('input',updateCounter);
developBtn.addEventListener('click',developScenes);
updateCounter();

document.getElementById('image').addEventListener('change',function(){document.getElementById('imageStatus').textContent=this.files[0]?'IMAGE LOADED ✓ '+this.files[0].name:'No image selected.';});
document.getElementById('generate').addEventListener('click',async function(){
  var image=document.getElementById('image').files[0],status=document.getElementById('status'),result=document.getElementById('result'),button=this;
  if(!image){status.textContent='STOPPED: no starting image is loaded.';return;}
  button.disabled=true;
  try{
    var fd=new FormData();fd.append('image',image,image.name);fd.append('prompt',document.getElementById('prompt').value);fd.append('duration',document.getElementById('duration').value);
    status.textContent='Image loaded ✓. Sending image to Cloudflare → Hugging Face...';
    var r=await fetch('/api/wan/start?ts='+Date.now(),{method:'POST',body:fd,cache:'no-store'}),j=await r.json();if(!r.ok)throw Error(j.error||'Video request failed');
    status.textContent='Image uploaded ✓. Wan 2.2 job submitted ✓. Waiting for generation...';
    var s=await fetch('/api/wan/stream?eventId='+encodeURIComponent(j.eventId)+'&ts='+Date.now(),{cache:'no-store'});if(!s.ok)throw Error('Stream HTTP '+s.status);
    var rd=s.body.getReader(),dec=new TextDecoder(),buf='';
    while(true){var z=await rd.read();if(z.done)break;buf+=dec.decode(z.value,{stream:true});var ps=buf.split('\n\n');buf=ps.pop()||'';for(var q=0;q<ps.length;q++){var ev='',da='';ps[q].split('\n').forEach(function(line){if(line.indexOf('event:')===0)ev=line.slice(6).trim();if(line.indexOf('data:')===0)da=line.slice(5).trim();});if(ev==='generating'||ev==='pending')status.textContent='Wan 2.2 generating...';if(ev==='error')throw Error(da||'Generation failed');if(ev==='complete'){var pv;try{pv=JSON.parse(da);}catch{pv=da;}var vu=findVideo(pv);if(!vu)throw Error('No video returned.');var pr='/api/wan/file?path='+encodeURIComponent(vu);result.innerHTML='<video class="video" controls playsinline src="'+pr+'"></video><br><a class="download" href="'+pr+'" download="wan-scene-video.mp4">Download Video</a>';status.textContent='Complete ✓ Video ready.';return;}}}
    throw Error('Generation stream ended before completion.');
  }catch(error){status.textContent='Error: '+error.message;}finally{button.disabled=false;}
});
})();
</script></body></html>`;

export default{async fetch(request,env){const url=new URL(request.url);try{if(url.pathname==='/api/health')return json({ok:true,version:'v22',tokenConfigured:!!env.HF_TOKEN,hfSpace:env.HF_SPACE||null});if(url.pathname==='/api/wan/start'&&request.method==='POST')return startVideo(request,env);if(url.pathname==='/api/wan/stream'&&request.method==='GET')return streamVideo(url.searchParams.get('eventId'),env);if(url.pathname==='/api/wan/file'&&request.method==='GET')return videoFile(request,env);return new Response(HTML,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store,no-cache,must-revalidate','pragma':'no-cache','expires':'0','x-framework-version':'v22'}})}catch(error){return json({error:error.message||'Server error'},500)}}};
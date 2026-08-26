import { createProject, addCharacter, addScene, projectSummary } from './models.js';
import { createGenerationJob, generationRequest } from './core/generation-engine.js';
import { huggingFaceWanProvider } from './providers/huggingface-wan.js';

export function apiResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }
  });
}

export async function handleApi(request, pathname, env = {}) {
  try {
    if (request.method === 'POST' && pathname === '/api/project') {
      const body = await request.json();
      const project = createProject(body);
      if (body.character) addCharacter(project, body.character);
      return apiResponse({ ok: true, project, summary: projectSummary(project) }, 201);
    }

    if (request.method === 'POST' && pathname === '/api/project/character') {
      const body = await request.json();
      const project = createProject({ title: body.projectTitle, script: body.script });
      const character = addCharacter(project, body.character || body);
      return apiResponse({ ok: true, character, project });
    }

    if (request.method === 'POST' && pathname === '/api/project/scene') {
      const body = await request.json();
      const project = createProject({ title: body.projectTitle, script: body.script });
      for (const character of body.characters || []) addCharacter(project, character);
      const scene = addScene(project, body.scene || body);
      return apiResponse({ ok: true, scene, project });
    }

    if (request.method === 'POST' && pathname === '/api/project/blueprint') {
      const body = await request.json();
      const project = createProject(body);
      for (const character of body.characters || []) addCharacter(project, character);
      for (const scene of body.scenes || []) addScene(project, scene);
      return apiResponse({ ok: true, project, summary: projectSummary(project) });
    }

    if (request.method === 'POST' && pathname === '/api/generation/video') {
      const body = await request.json();
      const scene = body.scene || body;
      if (!scene || (!scene.image && !scene.visualPrompt)) {
        return apiResponse({ ok: false, error: 'A scene image or visual prompt is required.' }, 400);
      }

      const job = createGenerationJob({
        type: 'video',
        provider: 'huggingface-wan',
        model: env.VIDEO_GENERATION_MODEL || 'wan',
        projectId: body.projectId || null,
        sceneId: scene.id || null,
        status: 'processing',
        input: generationRequest(scene, body.characterRefs || [])
      });

      try {
        const provider = huggingFaceWanProvider(env);
        const output = await provider.generateVideo(job.input);
        job.status = 'succeeded';
        job.output = output;
        job.updatedAt = new Date().toISOString();
        return apiResponse({ ok: true, job });
      } catch (error) {
        job.status = 'failed';
        job.error = error?.message || 'Video generation failed.';
        job.updatedAt = new Date().toISOString();
        return apiResponse({ ok: false, job }, 502);
      }
    }

    return null;
  } catch (error) {
    return apiResponse({ ok: false, error: error?.message || 'Invalid request.' }, 400);
  }
}

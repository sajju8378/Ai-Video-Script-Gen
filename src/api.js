import { createProject, addCharacter, addScene, projectSummary } from './models.js';

export function apiResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }
  });
}

export async function handleApi(request, pathname) {
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

    return null;
  } catch (error) {
    return apiResponse({ ok: false, error: error?.message || 'Invalid request.' }, 400);
  }
}

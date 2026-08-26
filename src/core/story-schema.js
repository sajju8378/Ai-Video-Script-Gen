export const PROJECT_VERSION = '0.3.0';

export function createProject(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || crypto.randomUUID(),
    version: PROJECT_VERSION,
    title: String(input.title || 'Untitled Film'),
    language: String(input.language || 'en'),
    aspectRatio: input.aspectRatio || '16:9',
    characters: Array.isArray(input.characters) ? input.characters : [],
    scenes: Array.isArray(input.scenes) ? input.scenes : [],
    timeline: Array.isArray(input.timeline) ? input.timeline : [],
    assets: Array.isArray(input.assets) ? input.assets : [],
    metadata: { createdAt: input.createdAt || now, updatedAt: now }
  };
}

export function createCharacter(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    name: String(input.name || 'Unnamed Character'),
    description: String(input.description || ''),
    appearance: String(input.appearance || ''),
    personality: String(input.personality || ''),
    wardrobe: String(input.wardrobe || ''),
    voice: input.voice || null,
    referenceImage: input.referenceImage || null,
    consistencyNotes: String(input.consistencyNotes || ''),
    createdAt: new Date().toISOString()
  };
}

export function createScene(input = {}, order = 1) {
  return {
    id: input.id || crypto.randomUUID(),
    order: Number(input.order || order),
    title: String(input.title || `Scene ${order}`),
    location: String(input.location || ''),
    timeOfDay: String(input.timeOfDay || ''),
    durationSeconds: input.durationSeconds ?? null,
    characters: Array.isArray(input.characters) ? input.characters : [],
    action: String(input.action || ''),
    emotion: String(input.emotion || ''),
    dialogue: Array.isArray(input.dialogue) ? input.dialogue : [],
    camera: String(input.camera || ''),
    visualPrompt: String(input.visualPrompt || ''),
    motionPrompt: String(input.motionPrompt || ''),
    negativePrompt: String(input.negativePrompt || ''),
    referenceImages: Array.isArray(input.referenceImages) ? input.referenceImages : [],
    image: input.image || null,
    video: input.video || null,
    status: input.status || 'draft',
    generation: input.generation || null
  };
}

export function createDialogue(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    characterId: input.characterId || null,
    characterName: String(input.characterName || ''),
    text: String(input.text || ''),
    emotion: String(input.emotion || ''),
    order: Number(input.order || 1)
  };
}

export function rebuildTimeline(project) {
  let cursor = 0;
  const timeline = [...(project.scenes || [])]
    .sort((a, b) => Number(a.order) - Number(b.order))
    .map(scene => {
      const duration = Number(scene.durationSeconds || 0);
      const item = {
        sceneId: scene.id,
        order: scene.order,
        startSeconds: cursor,
        endSeconds: cursor + duration,
        durationSeconds: duration,
        video: scene.video || null
      };
      cursor += duration;
      return item;
    });

  return { ...project, timeline, metadata: { ...project.metadata, updatedAt: new Date().toISOString() } };
}

export function projectDuration(project) {
  return (project.scenes || []).reduce((sum, scene) => sum + Number(scene.durationSeconds || 0), 0);
}

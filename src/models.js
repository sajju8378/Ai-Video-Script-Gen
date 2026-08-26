export function createProject(input = {}) {
  return {
    id: crypto.randomUUID(),
    title: String(input.title || 'Untitled Project'),
    script: String(input.script || ''),
    characters: [],
    scenes: [],
    settings: {
      aspectRatio: input.aspectRatio || '16:9',
      targetDurationSeconds: Number(input.targetDurationSeconds || 0),
      language: input.language || 'English'
    },
    timeline: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function addCharacter(project, input = {}) {
  const character = {
    id: crypto.randomUUID(),
    name: String(input.name || 'Character'),
    description: String(input.description || ''),
    personality: String(input.personality || ''),
    appearance: String(input.appearance || ''),
    referenceImage: input.referenceImage || null,
    voice: input.voice || null,
    notes: String(input.notes || '')
  };
  project.characters.push(character);
  project.updatedAt = new Date().toISOString();
  return character;
}

export function addScene(project, input = {}) {
  const scene = {
    id: crypto.randomUUID(),
    order: project.scenes.length + 1,
    title: String(input.title || `Scene ${project.scenes.length + 1}`),
    description: String(input.description || ''),
    location: String(input.location || ''),
    timeOfDay: String(input.timeOfDay || ''),
    characters: Array.isArray(input.characters) ? input.characters : [],
    action: String(input.action || ''),
    dialogue: Array.isArray(input.dialogue) ? input.dialogue : [],
    camera: String(input.camera || ''),
    visualPrompt: String(input.visualPrompt || ''),
    motionPrompt: String(input.motionPrompt || ''),
    durationSeconds: Number(input.durationSeconds || 5),
    image: null,
    video: null,
    status: 'draft'
  };
  project.scenes.push(scene);
  project.timeline = project.scenes.map(s => s.id);
  project.updatedAt = new Date().toISOString();
  return scene;
}

export function projectSummary(project) {
  return {
    id: project.id,
    title: project.title,
    characterCount: project.characters.length,
    sceneCount: project.scenes.length,
    durationSeconds: project.scenes.reduce((n, s) => n + (Number(s.durationSeconds) || 0), 0),
    status: project.status
  };
}

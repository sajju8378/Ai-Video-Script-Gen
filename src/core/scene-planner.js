import { attachCharacterToScene } from './character-bible.js';
import { createScene } from './story-schema.js';

export function planScenes(blueprint = {}, characters = []) {
  const characterIndex = new Map(characters.map(character => [normalize(character.name), character]));
  const sourceScenes = Array.isArray(blueprint.scenes) ? blueprint.scenes : [];

  return sourceScenes.map((raw, index) => {
    let scene = createScene({ ...raw, order: index + 1 }, index + 1);
    const names = extractCharacterNames(raw);

    for (const name of names) {
      const character = characterIndex.get(normalize(name));
      if (character) scene = attachCharacterToScene(scene, character);
    }

    scene.visualPrompt = buildVisualPrompt(scene, characters);
    scene.motionPrompt = buildMotionPrompt(scene);
    scene.status = 'ready';
    return scene;
  });
}

function extractCharacterNames(scene) {
  const names = Array.isArray(scene.characters) ? scene.characters : [];
  return names.map(item => typeof item === 'string' ? item : item?.name).filter(Boolean);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function buildVisualPrompt(scene, characters) {
  const used = new Set((scene.characters || []).map(normalize));
  const identity = characters
    .filter(character => used.has(normalize(character.id)) || used.has(normalize(character.name)))
    .map(character => character.identityPrompt || character.description)
    .filter(Boolean)
    .join(' ');

  return [
    scene.location && `Location: ${scene.location}.`,
    scene.timeOfDay && `Time: ${scene.timeOfDay}.`,
    scene.action && `Action: ${scene.action}.`,
    scene.emotion && `Emotion: ${scene.emotion}.`,
    identity,
    scene.camera && `Camera: ${scene.camera}.`
  ].filter(Boolean).join(' ');
}

function buildMotionPrompt(scene) {
  return [
    scene.action && `Animate this action naturally: ${scene.action}.`,
    scene.emotion && `Preserve the intended emotion: ${scene.emotion}.`,
    scene.camera && `Camera movement: ${scene.camera}.`,
    'Maintain character identity and scene continuity.'
  ].filter(Boolean).join(' ');
}

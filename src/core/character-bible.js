import { createCharacter } from './story-schema.js';

export const CHARACTER_INPUT_MODES = Object.freeze({
  REFERENCE: 'reference',
  DESCRIPTION: 'description',
  BOTH: 'both'
});

export function buildCharacter(input = {}) {
  const mode = input.mode || CHARACTER_INPUT_MODES.DESCRIPTION;
  const character = createCharacter(input);

  return {
    ...character,
    inputMode: mode,
    source: {
      referenceImage: mode === CHARACTER_INPUT_MODES.DESCRIPTION ? null : (input.referenceImage || null),
      description: String(input.description || ''),
      generatedMasterImage: input.generatedMasterImage || null
    },
    identityPrompt: buildIdentityPrompt(character),
    consistencyRules: buildConsistencyRules(character)
  };
}

export function buildIdentityPrompt(character) {
  return [
    `Character: ${character.name}.`,
    character.appearance && `Appearance: ${character.appearance}.`,
    character.wardrobe && `Wardrobe: ${character.wardrobe}.`,
    character.personality && `Personality: ${character.personality}.`,
    character.description && `Creator description: ${character.description}.`,
    character.consistencyNotes && `Consistency: ${character.consistencyNotes}.`
  ].filter(Boolean).join(' ');
}

export function buildConsistencyRules(character) {
  return [
    'Preserve facial identity and recognizable physical traits.',
    'Preserve the defined wardrobe unless the scene explicitly changes it.',
    'Do not invent major appearance changes.',
    character.consistencyNotes || ''
  ].filter(Boolean);
}

export function attachCharacterToScene(scene, character) {
  const characters = Array.isArray(scene.characters) ? [...scene.characters] : [];
  if (!characters.includes(character.id)) characters.push(character.id);

  const references = Array.isArray(scene.referenceImages) ? [...scene.referenceImages] : [];
  if (character.source?.referenceImage && !references.includes(character.source.referenceImage)) {
    references.push(character.source.referenceImage);
  }

  return { ...scene, characters, referenceImages: references };
}

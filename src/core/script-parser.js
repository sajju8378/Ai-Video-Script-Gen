import { createCharacter, createDialogue, createScene } from './story-schema.js';

const SCENE_MARKERS = /^(scene|shot|sequence)\s*(\d+)?\s*[:\-]?\s*(.*)$/i;
const CHARACTER_MARKER = /^(?:character|characters)\s*[:\-]\s*(.+)$/i;
const LOCATION_MARKER = /^(?:location|setting|place)\s*[:\-]\s*(.+)$/i;
const TIME_MARKER = /^(?:time|time of day)\s*[:\-]\s*(.+)$/i;
const DIALOGUE = /^([A-Za-z][A-Za-z0-9 _.'-]{1,40})\s*[:\-]\s+["“]?(.+?)["”]?$/;

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractCharacterNames(text) {
  const names = new Set();
  const patterns = [
    /\b([A-Z][a-z]{2,20})\s+(?:enters|walks|runs|looks|turns|stands|sits|leaves|speaks|says|asks|replies|smiles|cries|shouts)\b/g,
    /\b([A-Z][a-z]{2,20})\s*:/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) names.add(match[1]);
  }
  return [...names];
}

function splitBlocks(script) {
  const lines = String(script || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let current = [];

  for (const raw of lines) {
    const line = raw.trim();
    const marker = line.match(SCENE_MARKERS);
    if (marker && current.length) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);

  // If explicit scene markers are absent, paragraph breaks become scene candidates.
  if (blocks.length === 1 && !SCENE_MARKERS.test(blocks[0][0] || '')) {
    return String(script || '').split(/\n\s*\n/).map(x => x.split('\n').map(y => y.trim()).filter(Boolean)).filter(Boolean);
  }
  return blocks.filter(block => block.some(Boolean));
}

function parseScene(lines, order) {
  const first = lines[0] || '';
  const marker = first.match(SCENE_MARKERS);
  const title = clean(marker?.[3] || '') || `Scene ${order}`;
  let location = '';
  let timeOfDay = '';
  const dialogue = [];
  const actions = [];
  const characters = new Set();

  for (const line of lines) {
    if (!line || SCENE_MARKERS.test(line)) continue;

    const locationMatch = line.match(LOCATION_MARKER);
    if (locationMatch) { location = clean(locationMatch[1]); continue; }
    const timeMatch = line.match(TIME_MARKER);
    if (timeMatch) { timeOfDay = clean(timeMatch[1]); continue; }
    const charMatch = line.match(CHARACTER_MARKER);
    if (charMatch) {
      charMatch[1].split(/,|&| and /i).map(clean).filter(Boolean).forEach(x => characters.add(x));
      continue;
    }

    const speech = line.match(DIALOGUE);
    if (speech && !/^(location|setting|place|time|scene|shot|sequence)$/i.test(speech[1])) {
      const name = clean(speech[1]);
      characters.add(name);
      dialogue.push(createDialogue({ characterName: name, text: clean(speech[2]), order: dialogue.length + 1 }));
    } else {
      const discovered = extractCharacterNames(line);
      discovered.forEach(x => characters.add(x));
      actions.push(line);
    }
  }

  const action = actions.join(' ');
  const visualPrompt = [location, timeOfDay, action].filter(Boolean).join('. ');
  const motionPrompt = action || `Natural cinematic movement for ${title}.`;

  return createScene({
    order,
    title,
    location,
    timeOfDay,
    characters: [...characters],
    action,
    dialogue,
    visualPrompt,
    motionPrompt,
    status: 'draft'
  }, order);
}

export function parseScript(script) {
  const text = String(script || '').trim();
  if (!text) return { characters: [], scenes: [], warnings: ['Script is empty.'] };

  const blocks = splitBlocks(text);
  const scenes = blocks.map((lines, index) => parseScene(lines, index + 1));
  const names = new Set(scenes.flatMap(scene => scene.characters));
  const characters = [...names].map(name => createCharacter({ name }));
  const warnings = [];

  scenes.forEach(scene => {
    if (!scene.action && !scene.dialogue.length) warnings.push(`${scene.title}: no action or dialogue detected.`);
    if (!scene.location) warnings.push(`${scene.title}: location not detected.`);
  });

  return { characters, scenes, warnings };
}

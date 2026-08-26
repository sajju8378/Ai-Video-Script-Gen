export const PROVIDERS = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video'
});

export const JOB_STATUS = Object.freeze({
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed'
});

export function createGenerationJob(input = {}) {
  return {
    id: input.id || crypto.randomUUID(),
    type: input.type || PROVIDERS.VIDEO,
    provider: input.provider || 'unconfigured',
    model: input.model || null,
    projectId: input.projectId || null,
    sceneId: input.sceneId || null,
    status: input.status || JOB_STATUS.QUEUED,
    input: input.input || {},
    output: input.output || null,
    error: input.error || null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function generationRequest(scene, characterRefs = []) {
  return {
    sceneId: scene.id,
    image: scene.image || null,
    referenceImages: [
      ...(scene.referenceImages || []),
      ...characterRefs.filter(Boolean)
    ],
    visualPrompt: scene.visualPrompt || '',
    motionPrompt: scene.motionPrompt || '',
    negativePrompt: scene.negativePrompt || '',
    durationSeconds: scene.durationSeconds || null
  };
}

/**
 * Provider adapter contract. Concrete providers are plugged in later.
 * Keeping this interface stable lets us switch models without rewriting the app.
 */
export function createProvider(name, handlers = {}) {
  return {
    name,
    generateImage: handlers.generateImage || (async () => {
      throw new Error(`Image provider '${name}' is not configured.`);
    }),
    generateVideo: handlers.generateVideo || (async () => {
      throw new Error(`Video provider '${name}' is not configured.`);
    }),
    getJob: handlers.getJob || (async job => job)
  };
}

export function createProviderRegistry(providers = {}) {
  return {
    image: providers.image || null,
    video: providers.video || null,
    get(type) {
      return this[type] || null;
    }
  };
}

import { createProvider } from '../core/generation-engine.js';

function requireEndpoint(env) {
  const endpoint = env?.VIDEO_GENERATION_ENDPOINT;
  if (!endpoint) throw new Error('VIDEO_GENERATION_ENDPOINT is not configured.');
  return endpoint;
}

export function huggingFaceWanProvider(env) {
  return createProvider('huggingface-wan', {
    async generateVideo(input) {
      const endpoint = requireEndpoint(env);
      const headers = { 'content-type': 'application/json' };
      if (env?.VIDEO_GENERATION_TOKEN) {
        headers.authorization = `Bearer ${env.VIDEO_GENERATION_TOKEN}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: input.image,
          reference_images: input.referenceImages || [],
          prompt: input.motionPrompt || input.visualPrompt || '',
          negative_prompt: input.negativePrompt || '',
          duration: input.durationSeconds || undefined
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        const detail = contentType.includes('application/json')
          ? JSON.stringify(await response.json())
          : await response.text();
        throw new Error(`Video provider failed (${response.status}): ${detail}`);
      }

      if (contentType.includes('application/json')) return await response.json();

      return {
        contentType,
        body: await response.arrayBuffer()
      };
    }
  });
}

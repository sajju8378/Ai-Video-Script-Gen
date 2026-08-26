import { createProvider } from '../core/generation-engine.js';

export function imagePlaceholderProvider() {
  return createProvider('image-placeholder', {
    async generateImage(input) {
      return {
        status: 'provider-not-connected',
        message: 'Image generation provider will be connected in a later step.',
        prompt: input.visualPrompt || '',
        referenceImages: input.referenceImages || []
      };
    }
  });
}

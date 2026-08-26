# AI Video Script Gen

Framework for a scene-based AI video workflow.

## Planned pipeline

1. User submits a script.
2. Extract characters and their persistent descriptions.
3. Upload or generate character reference images.
4. Break the script into ordered scenes.
5. Each scene stores action, dialogue, camera/motion instructions, duration, references, and generation status.
6. Generate individual scenes on demand.
7. Regenerate a single scene without rebuilding the whole project.
8. Assemble generated scenes into the final long video.

## Current status

The first Cloudflare Worker framework is in place. The UI is intentionally minimal for now; visual design will be added later.

## API foundation

- `GET /api/health` — service health
- `POST /api/script/analyze` — initial script-to-scene parser

Future adapters will connect the scene generation pipeline to image/video models without coupling the project model to a specific provider.

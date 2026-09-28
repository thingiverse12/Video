// Netlify function: Skogsprataren's server-side AI endpoint.
//
// The published game calls /api/ai from the browser. The provider key is read
// from environment variables (Netlify UI, `netlify env:set`, or the Netlify AI
// Gateway) and never leaves the server. Configure with:
//   AI_API_KEY   provider key (or OPENAI_API_KEY / ANTHROPIC_API_KEY)
//   AI_PROVIDER  "openai" (default) or "anthropic"
//   AI_MODEL     optional model override
//   AI_API_URL   optional base URL for OpenAI-compatible services
//
// This handler is served ONLY at /api/ai, so it takes precedence over the
// single-page-app rewrite in public/_redirects.
import { handleAiRequest, jsonResponse } from '../../server/ai-core.mjs';

export const config = {
  path: ['/api/ai'],
  method: ['GET', 'HEAD', 'POST'],
  // Modest per-IP limit so a published site cannot be used to burn someone
  // else's provider credits. Requires a claimed Netlify site.
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: 'ip',
    windowSize: 60,
    windowLimit: 20,
  },
};

export default async function handler(request) {
  let body;
  if (request.method === 'POST') {
    try {
      body = await request.text();
    } catch {
      body = '';
    }
  }
  const result = await handleAiRequest({ method: request.method, body, env: process.env });
  return jsonResponse(result);
}

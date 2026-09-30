// Vercel function: the same /api/ai endpoint as the Netlify function, for the
// Vercel project already connected to this repository. Set AI_API_KEY (and
// optionally AI_PROVIDER / AI_MODEL / AI_API_URL) under
// Project → Settings → Environment Variables, then redeploy.
import { clientAddress, handleAiRequest } from '../server/ai-core.mjs';

export default async function handler(request, response) {
  let body;
  if (request.method === 'POST') {
    // Vercel parses JSON bodies for us, but a raw string still works.
    body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body ?? {});
  }
  const result = await handleAiRequest({ method: request.method, body, env: process.env, clientIp: clientAddress(request.headers, request.socket?.remoteAddress) });
  for (const [key, value] of Object.entries(result.headers)) response.setHeader(key, value);
  response.status(result.status).send(JSON.stringify(result.json));
}

import { getStore, connectLambda } from '@netlify/blobs';

export const STORE_NAME = 'messages';
export const MESSAGES_KEY = 'messages';

function base64Decode(input) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf8');
  }
  if (typeof atob === 'function') {
    return atob(input);
  }
  return '';
}

/**
 * Decode the Netlify Blobs context that the platform injects as a base64
 * JSON string in process.env.NETLIFY_BLOBS_CONTEXT.
 */
function getContextFromProcessEnv() {
  const raw = process?.env?.NETLIFY_BLOBS_CONTEXT;
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(base64Decode(raw));
  } catch {
    return null;
  }
}

/**
 * Returns a Netlify Blobs store that works across function runtimes:
 * 1. Lambda compatibility mode: `req.blobs` carries the context, so we call
 *    `connectLambda(req)` first.
 * 2. Standard (v2) functions: the context is normally auto-injected, but we
 *    read it directly from process.env first to avoid lookup gaps when a
 *    `Netlify.env` global exists without the Blobs context.
 * 3. Fallback: let @netlify/blobs resolve the environment itself.
 */
export function getMessagesStore(req, _context) {
  if (req && typeof req === 'object' && typeof req.blobs === 'string') {
    connectLambda(req);
  }

  const ctx = getContextFromProcessEnv();
  if (ctx && ctx.siteID && ctx.token) {
    return getStore({
      name: STORE_NAME,
      siteID: ctx.siteID,
      token: ctx.token,
      apiURL: ctx.apiURL,
      edgeURL: ctx.edgeURL,
      uncachedEdgeURL: ctx.uncachedEdgeURL,
    });
  }

  return getStore({ name: STORE_NAME });
}


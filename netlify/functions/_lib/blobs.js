import { getStore, connectLambda } from '@netlify/blobs';

export const STORE_NAME = 'messages';
export const CHAT_STORE_NAME = 'chat';
export const MESSAGES_KEY = 'messages';
export const CHAT_KEY = 'chat-messages';

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

/**
 * Returns the chat messages store using the same Blobs context resolution
 * as the messages store, but pointing at the dedicated "chat" store.
 */
export function getChatStore(req, context) {
  if (req && typeof req === 'object' && typeof req.blobs === 'string') {
    connectLambda(req);
  }

  const ctx = getContextFromProcessEnv();
  if (ctx && ctx.siteID && ctx.token) {
    return getStore({
      name: CHAT_STORE_NAME,
      siteID: ctx.siteID,
      token: ctx.token,
      apiURL: ctx.apiURL,
      edgeURL: ctx.edgeURL,
      uncachedEdgeURL: ctx.uncachedEdgeURL,
    });
  }

  return getStore({ name: CHAT_STORE_NAME });
}

/**
 * Safely read the messages array from the store.
 *
 * The store is read as raw text and parsed manually so that a corrupted
 * or legacy entry (e.g. the literal string `[object Object]` written by an
 * earlier `store.set(key, array)` bug) is handled gracefully: it is reset
 * to an empty array and treated as such, instead of throwing a JSON parse
 * error to the caller.
 */
export async function readMessages(store) {
  try {
    const raw = await store.get(MESSAGES_KEY);
    if (raw == null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // Corrupted or non-array legacy content — reset to a valid empty array.
    try {
      await store.setJSON(MESSAGES_KEY, []);
    } catch {
      // Ignore reset failures; the caller will just see an empty list.
    }
    return [];
  }
}

/**
 * Persist the messages array as a proper JSON string blob.
 */
export async function writeMessages(store, messages) {
  await store.setJSON(MESSAGES_KEY, messages);
}

/**
 * Safely read the chat messages array from the store.
 */
export async function readChatMessages(store) {
  try {
    const raw = await store.get(CHAT_KEY);
    if (raw == null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    try {
      await store.setJSON(CHAT_KEY, []);
    } catch {
      // Ignore reset failures; the caller will just see an empty list.
    }
    return [];
  }
}

/**
 * Persist the chat messages array as a JSON string blob.
 */
export async function writeChatMessages(store, messages) {
  await store.setJSON(CHAT_KEY, messages);
}


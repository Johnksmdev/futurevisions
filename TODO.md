# Live Chat Implementation TODO

## Goals
- [x] Add a **Live Chat** button next to the "Admin Content" button.
- [x] Ask for the person's name before entering the chat; show it in messages.
- [x] Real-time chat with WebSockets (local Express) + polling fallback (Netlify).
- [x] Persist chat messages permanently (never deleted).

## Steps
- [x] Backend: add chat storage helpers to `netlify/functions/_lib/blobs.js`
- [x] Backend: create `netlify/functions/chat.js` (GET/POST + persistent blobs)
- [x] Backend: add `/api/chat/messages` endpoints + WebSocket to `server.js`
- [x] Backend: add chat endpoints to `app.py`
- [x] Config: add chat redirect to `netlify.toml`
- [x] Data: add default `data/chat-messages.json`
- [x] Frontend: add "Live Chat" button + name prompt modal + widget to `index.html`
- [x] Frontend: add chat logic (WS + polling fallback) to `app.js`
- [x] Frontend: add chat UI styles to `styles.css`
- [x] Deploy dep: add `ws` to `package.json`
- [x] Validate syntax (JS/Python)
- [x] Run local server to test chat

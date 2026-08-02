# Future Visions Lab (jj-website)

A polished website with a strong backend API.

## Running locally (Express)

```bash
npm install
npm start
```

Open http://localhost:3000

## Python alternative

```bash
python app.py
```

## Deploying to Netlify

This repo is configured for Netlify:

- Static site published from `public/`
- Serverless functions in `netlify/functions/`
- Persistent message storage via **Netlify Blobs** (`@netlify/blobs`)

### Steps

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project** and select the repo.
3. Netlify auto-detects `netlify.toml`:
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
4. Go to **Site configuration → Environment variables** and add:
   - `DASHBOARD_PASSWORD` = your admin password (defaults to `johnkosmas77` if unset)
5. Deploy. Your site is live at `https://<your-site>.netlify.app`.

API endpoints (served under `/api/*`, rewritten to functions):

- `GET /api/health`
- `GET /api/stats`
- `GET / POST /api/messages`
- `POST /api/dashboard` (send `{ "password": "..." }` in JSON body)

### Local development with Netlify CLI

```bash
npm install -g netlify-cli
npm install
netlify dev
```

### Seeding existing messages

To upload the bundled `data/messages.json` into the live Blobs store once:

```bash
netlify login
NETLIFY_SITE_ID=<site-id> NETLIFY_ACCESS_TOKEN=<token> npm run seed:blobs
```

Otherwise, start fresh — the first message submission on Netlify creates the Blobs store automatically.


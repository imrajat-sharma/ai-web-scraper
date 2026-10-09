# AI Web Scraper

A simple full-stack app that takes any webpage URL, scrapes the main text content from it,
and uses a **free** AI API (Google Gemini by default) to generate a short summary.

```
Browser (React)  →  Express API  →  fetches the URL, extracts text (Cheerio)  →  Gemini free tier  →  summary
```

## Features

- Clean React UI: paste a URL, hit **Summarize**, watch a loading state, read the result
- Backend endpoint that visits the URL, strips navigation/ads/scripts, and keeps the readable text
- AI summarization via **Google Gemini's free tier** (Groq free tier works as an alternative)
- Shows page title, source link, chars scraped, provider/model, and total time
- Input validation, timeouts, and clear error messages (invalid URL, no API key, rate limits, etc.)

## Tech stack

| Layer    | Tech                                        |
| -------- | ------------------------------------------- |
| Frontend | React 18 + Vite (dev server on port 5173)   |
| Backend  | Node.js + Express (port 3001)               |
| Scraping | Built-in `fetch` + Cheerio (HTML → text)    |
| AI       | Google Gemini API (free tier), or Groq      |

## Prerequisites

- **Node.js 18 or newer** (uses the built-in `fetch`) — check with `node -v`
- A free AI API key (see below)

### Get a free AI API key

- **Google Gemini (recommended):** go to <https://aistudio.google.com/apikey> and click
  *Create API key*. Free tier, no credit card.
- **Groq (alternative):** go to <https://console.groq.com/keys>. If you use this one, put
  `GROQ_API_KEY` in the `.env` instead (and optionally set `AI_PROVIDER=groq`).

## Project structure

```
.
├── backend/
│   ├── .env.example      # template - copy this to backend/.env
│   ├── package.json
│   └── src/
│       ├── index.js      # Express app + /api routes
│       ├── scraper.js    # fetch a URL, extract main text
│       └── ai.js         # call the free AI API for the summary
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js    # dev server + /api proxy to the backend
│   └── src/
│       ├── App.jsx       # URL form, loading state, summary card
│       ├── main.jsx
│       └── styles.css
└── README.md
```

## How to run locally

Open two terminals — one for the backend, one for the frontend.

### 1. Backend (port 3001)

```bash
cd backend
npm install

# create your env file FROM THE TEMPLATE (same folder):
cp .env.example .env        # Windows (PowerShell): Copy-Item .env.example .env
```

Open **`backend/.env`** and paste your real key:

```env
GEMINI_API_KEY=your_real_key_here
```

Then start the API:

```bash
npm start           # or: npm run dev  (auto-restarts on changes)
```

You should see:

```
AI web-scraper API listening on http://localhost:3001
AI provider: gemini (gemini-2.5-flash)
```

> ⚠️ The `.env` file lives in the **`backend/`** folder — the backend is the only process
> that reads it. It is listed in `.gitignore`, so your key is never committed.

### 2. Frontend (port 5173)

In the second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser, paste a URL such as
`https://en.wikipedia.org/wiki/Web_scraping`, and click **Summarize**.

The Vite dev server proxies `/api/*` to the backend automatically, so no frontend
configuration is needed.

## Configuration reference

All settings go in `backend/.env`:

| Variable          | Required | Default                 | Description                              |
| ----------------- | -------- | ----------------------- | ---------------------------------------- |
| `GEMINI_API_KEY`  | yes\*    | —                       | Free key from aistudio.google.com        |
| `GEMINI_MODEL`    | no       | `gemini-2.5-flash`      | Any free-tier Gemini model id            |
| `PORT`            | no       | `3001`                  | Backend port                             |
| `GROQ_API_KEY`    | no       | —                       | Use Groq instead of Gemini               |
| `GROQ_MODEL`      | no       | `llama-3.3-70b-versatile` | Groq model id                          |
| `AI_PROVIDER`     | no       | auto                    | Force `gemini` or `groq`                 |

\*Required unless you configure `GROQ_API_KEY` instead. The provider is auto-detected:
Gemini is used when `GEMINI_API_KEY` is set, otherwise Groq.

## API reference

### `GET /api/health`

```json
{ "ok": true, "provider": "gemini", "model": "gemini-2.5-flash", "keyConfigured": true }
```

### `POST /api/summarize`

Request body: `{ "url": "https://example.com" }`

Success (200):

```json
{
  "url": "https://example.com/",
  "title": "Example Domain",
  "description": "",
  "summary": "The page is a placeholder domain used in documentation examples...",
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "scrapedChars": 156,
  "truncated": false,
  "elapsedMs": 2310
}
```

Errors use a JSON body `{ "error": "..." }` with a matching HTTP status:
`400` invalid/missing URL, `502` the site or the AI API failed, `503` no API key configured,
`429` AI rate limit hit.

## Troubleshooting

- **`503 No AI API key configured`** — you skipped step 1: create `backend/.env` from
  `.env.example` and paste your key, then restart the backend.
- **`400`/`404` from Gemini** — your key may be invalid, or `GEMINI_MODEL` names a model
  your key can't use. Remove `GEMINI_MODEL` to fall back to `gemini-2.5-flash`.
- **`ECONNREFUSED` / network error in the browser** — the backend isn't running on port 3001.
- **`No readable text found`** — the page needs heavy JavaScript rendering; this app
  intentionally scrapes plain HTML only.
- **429 rate limit** — the free tiers are rate-limited (Gemini: generous per-day quota).
  Wait a minute and retry.

## Notes & limitations

- Scraped text is capped at 12,000 characters before being sent to the AI.
- Pages that block non-browser requests or are fully client-side rendered may fail — by design.
- The summarizer is stateless; nothing is stored server-side.

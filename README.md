# AI Web Scraper

A full-stack app that scrapes a webpage, extracts readable text, and summarizes it with a free AI model.

Live demo: https://ai-web-scraper-1dkh.vercel.app/

## What it does

- Paste any URL and get a summary in the browser
- Scrapes article text from the page source
- Uses Google Gemini or Groq for AI summarization
- Shows metadata like page title, provider, and timing

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Scraping: fetch + Cheerio
- AI: Google Gemini (default), Groq alternative

## Run locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Add your key in `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
```

Start it:

```bash
npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173

## Notes

- The backend reads the key from `backend/.env`
- The app works best with plain HTML pages
- For a production deployment, set the same env vars in the hosting platform

## Project structure

```text
backend/
  src/
  .env.example
frontend/
  src/
README.md
```

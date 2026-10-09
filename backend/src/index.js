import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { scrapePage } from './scraper.js';
import { summarize, describeConfig } from './ai.js';

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));

app.get('/', (_req, res) => {
  res.json({ status: 'online', message: 'AI web-scraper API is running.'});
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ...describeConfig() });
});

app.post('/api/summarize', async (req, res, next) => {
  try {
    const { url } = req.body || {};
    if (typeof url !== 'string' || !url.trim()) {
      const err = new Error('Please provide a URL.');
      err.status = 400;
      throw err;
    }

    const startedAt = Date.now();
    const page = await scrapePage(url);
    const ai = await summarize(page);

    res.json({
      url: page.url,
      title: page.title,
      description: page.description,
      summary: ai.text,
      provider: ai.provider,
      model: ai.model,
      scrapedChars: page.charCount,
      truncated: page.truncated,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${status} ${err.message}`);
  res.status(status).json({ error: err.message || 'Something went wrong on the server.' });
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  const cfg = describeConfig();
  console.log(`AI web-scraper API listening on http://localhost:${port}`);
  console.log(
    cfg.keyConfigured
      ? `AI provider: ${cfg.provider} (${cfg.model})`
      : 'AI provider: NOT CONFIGURED - set GEMINI_API_KEY in backend/.env'
  );
});

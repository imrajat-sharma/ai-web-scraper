import { useState } from 'react';

const SAMPLE_URLS = [
  'https://en.wikipedia.org/wiki/Web_scraping',
  'https://example.com',
];

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export default function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const target = normalizeUrl(url);
    if (!target) {
      setError('Paste a webpage URL to summarize.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}.`);
      }
      setResult(data);
    } catch (err) {
      setError(
        err.message ||
          'Could not reach the backend. Make sure it is running on port 3001.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <span className="hero-badge">Full-stack demo</span>
        <h1>
          AI Web <span className="accent">Scraper</span>
        </h1>
        <p className="tagline">
          Paste any webpage URL. The backend scrapes the main text and a free
          AI model turns it into a short summary.
        </p>
      </header>

      <section className="card">
        <form onSubmit={handleSubmit} className="url-form">
          <input
            type="text"
            inputMode="url"
            className="url-input"
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            aria-label="Webpage URL"
          />
          <button type="submit" className="summarize-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Summarizing…
              </>
            ) : (
              'Summarize'
            )}
          </button>
        </form>

        <div className="samples">
          <span>Try:</span>
          {SAMPLE_URLS.map((sample) => (
            <button
              key={sample}
              type="button"
              className="sample-chip"
              disabled={loading}
              onClick={() => setUrl(sample)}
            >
              {sample.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <section className="card status-card" role="status" aria-live="polite">
          <div className="status-line">
            <span className="spinner" aria-hidden="true" />
            <div>
              <h2>Working on it…</h2>
              <p>Fetching the page, extracting text, and asking AI to summarize.</p>
            </div>
          </div>
          <div className="skeleton">
            <span />
            <span />
            <span style={{ width: '65%' }} />
          </div>
        </section>
      )}

      {error && !loading && (
        <section className="card error-card" role="alert">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </section>
      )}

      {result && !loading && (
        <section className="card result-card">
          <div className="result-head">
            <h2>{result.title || 'Untitled page'}</h2>
            <a href={result.url} target="_blank" rel="noreferrer" className="source-link">
              {result.url}
            </a>
          </div>

          <div className="meta-row">
            <span className="chip chip-ai">
              {result.provider} · {result.model}
            </span>
            <span className="chip">{result.scrapedChars.toLocaleString()} chars scraped</span>
            <span className="chip">{(result.elapsedMs / 1000).toFixed(1)}s</span>
            {result.truncated && <span className="chip chip-warn">text truncated</span>}
          </div>

          <p className="summary">{result.summary}</p>
        </section>
      )}

      <footer className="footer">
        Express + Cheerio scraping · Google Gemini (free tier) summarization · React (Vite)
      </footer>
    </div>
  );
}

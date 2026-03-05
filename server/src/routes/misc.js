import { Router } from 'express';
import { requireAuth } from '../auth/session.js';

const router = Router();

// Link preview proxy — fetches OG/meta tags from a URL
router.get('/api/link-preview', requireAuth, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'AtrixBot/1.0 (link preview)' },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    });
    if (!resp.ok) return res.status(422).json({ error: 'Could not fetch URL' });

    const html = await resp.text();

    function og(prop) {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
      return m?.[1] ?? null;
    }
    function meta(name) {
      const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
      return m?.[1] ?? null;
    }
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];

    res.json({
      uri: url,
      title: og('title') || titleTag || url,
      description: og('description') || meta('description') || '',
      image: og('image') || null,
    });
  } catch {
    res.status(422).json({ error: 'Could not fetch URL preview' });
  }
});

export default router;

import { getSession } from '../lib/session.js';
import { xfetch, errorText } from '../lib/x.js';

// POST /api/delete  { items: [{ id, kind: post|reply|repost|like, source? }] }
// Removes up to 20 items. Stops early when X rate-limits and tells the browser when to resume.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'signed_out' });

  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
  const done = [];
  const failed = [];

  try {
    for (const it of items) {
      const id = String(it.id || '').replace(/\D/g, '');
      const source = String(it.source || '').replace(/\D/g, '');
      if (!id) continue;
      let path;
      if (it.kind === 'like') path = `/users/${s.uid}/likes/${id}`;
      else if (it.kind === 'repost') path = `/users/${s.uid}/retweets/${source || id}`;
      else path = `/tweets/${id}`;

      const r = await xfetch(s, res, path, { method: 'DELETE' });
      if (r.status === 429) return res.json({ done, failed, retryAt: r.reset || Date.now() + 15 * 60_000 });
      if (r.status === 401) return res.status(401).json({ error: 'signed_out', done, failed });
      if (r.status === 402) return res.status(402).json({ error: errorText(r.body, 402), done, failed });
      if (r.status < 300 || r.status === 404) done.push(id);
      else failed.push({ id, error: errorText(r.body, r.status) });
    }
    res.json({ done, failed });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, done, failed });
  }
}

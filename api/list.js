import { getSession } from '../lib/session.js';
import { xfetch, errorText } from '../lib/x.js';

// GET /api/list?type=posts|likes&cursor=...
// Returns one page (up to 100) of the user's posts/replies/reposts, or their liked posts.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'signed_out' });

  const type = req.query.type === 'likes' ? 'likes' : 'posts';
  const q = new URLSearchParams({ max_results: '100', 'tweet.fields': 'created_at,referenced_tweets' });
  if (req.query.cursor) q.set('pagination_token', String(req.query.cursor));
  const path = type === 'likes' ? `/users/${s.uid}/liked_tweets?${q}` : `/users/${s.uid}/tweets?${q}`;

  try {
    const r = await xfetch(s, res, path);
    if (r.status === 429) return res.json({ items: [], next: req.query.cursor || null, retryAt: r.reset || Date.now() + 60_000 });
    if (r.status === 401) return res.status(401).json({ error: 'signed_out' });
    if (r.status >= 400) return res.status(502).json({ error: errorText(r.body, r.status) });

    const items = (r.body.data || []).map((t) => {
      const refs = t.referenced_tweets || [];
      const rt = refs.find((x) => x.type === 'retweeted');
      let kind = 'like';
      if (type === 'posts') kind = rt ? 'repost' : refs.some((x) => x.type === 'replied_to') ? 'reply' : 'post';
      return { id: t.id, kind, source: rt ? rt.id : undefined, text: t.text || '', date: t.created_at || '' };
    });
    res.json({ items, next: r.body.meta?.next_token || null });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
}

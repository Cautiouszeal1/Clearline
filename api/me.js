import { getSession, missingConfig } from '../lib/session.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const missing = missingConfig();
  if (missing.length) return res.status(503).json({ setup: missing });
  const s = getSession(req);
  if (!s) return res.status(401).json({ error: 'signed_out' });
  res.json({ user: { username: s.username, name: s.name, avatar: s.avatar, pinned: s.pinned } });
}

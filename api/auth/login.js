import crypto from 'node:crypto';
import { seal, setCookie, missingConfig, appUrl } from '../../lib/session.js';

export default function handler(req, res) {
  const missing = missingConfig();
  if (missing.length) {
    res
      .status(500)
      .send(`Clearline isn't set up yet. Add ${missing.join(', ')} in Vercel → Settings → Environment Variables, then redeploy.`);
    return;
  }
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  setCookie(res, 'cl_o', seal({ verifier, state }), 600);

  const q = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.X_CLIENT_ID,
    redirect_uri: `${appUrl()}/api/auth/callback`,
    scope: 'tweet.read tweet.write users.read like.read like.write offline.access',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  res.redirect(302, `https://x.com/i/oauth2/authorize?${q}`);
}

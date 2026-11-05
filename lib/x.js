import { saveSession } from './session.js';

export const API = 'https://api.x.com/2';

export async function token(params) {
  const basic = Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString('base64');
  const r = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ ...params, client_id: process.env.X_CLIENT_ID }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(j.error_description || j.error || 'Token request failed');
    e.status = 401;
    throw e;
  }
  return { access: j.access_token, refresh: j.refresh_token, exp: Date.now() + (j.expires_in || 7200) * 1000 };
}

// Calls the X API as the signed-in user, refreshing the access token when needed.
export async function xfetch(sess, res, path, opts = {}) {
  if (sess.exp - 60_000 < Date.now()) {
    if (!sess.refresh) {
      const e = new Error('Session expired');
      e.status = 401;
      throw e;
    }
    Object.assign(sess, await token({ grant_type: 'refresh_token', refresh_token: sess.refresh }));
    saveSession(res, sess);
  }
  const r = await fetch(API + path, {
    ...opts,
    headers: { Authorization: `Bearer ${sess.access}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body, reset: Number(r.headers.get('x-rate-limit-reset') || 0) * 1000 };
}

export function errorText(body, status) {
  return (
    body?.detail ||
    body?.title ||
    body?.errors?.[0]?.message ||
    (status === 402 ? 'X API credits have run out' : `X API error ${status}`)
  );
}

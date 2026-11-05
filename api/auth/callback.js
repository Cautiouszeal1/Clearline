import { cookies, unseal, setCookie, saveSession, appUrl } from '../../lib/session.js';
import { token, API } from '../../lib/x.js';

const back = (res, msg) => res.redirect(302, `/?error=${encodeURIComponent(msg)}`);

export default async function handler(req, res) {
  const { code, state, error } = req.query;
  if (error) return back(res, 'You cancelled the X sign-in.');

  const o = unseal(cookies(req).cl_o || '');
  setCookie(res, 'cl_o', '', 0);
  if (!o || !code || o.state !== state) return back(res, 'Sign-in expired. Please try again.');

  try {
    const t = await token({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl()}/api/auth/callback`,
      code_verifier: o.verifier,
    });
    const r = await fetch(`${API}/users/me?user.fields=profile_image_url,pinned_tweet_id`, {
      headers: { Authorization: `Bearer ${t.access}` },
    });
    const j = await r.json();
    if (!r.ok || !j.data) return back(res, 'Could not read your X profile.');
    const u = j.data;
    saveSession(res, {
      ...t,
      uid: u.id,
      username: u.username,
      name: u.name,
      avatar: u.profile_image_url || '',
      pinned: u.pinned_tweet_id || '',
    });
    res.redirect(302, '/');
  } catch (e) {
    back(res, e.message || 'Sign-in failed.');
  }
}

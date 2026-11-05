import crypto from 'node:crypto';

const key = () => crypto.createHash('sha256').update(process.env.SESSION_SECRET || '').digest();

export function seal(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}

export function unseal(s) {
  try {
    const b = Buffer.from(s, 'base64url');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

export function cookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export function setCookie(res, name, value, maxAge) {
  const c = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c);
}

export const getSession = (req) => {
  const v = cookies(req).cl_s;
  return v ? unseal(v) : null;
};
export const saveSession = (res, s) => setCookie(res, 'cl_s', seal(s), 60 * 60 * 24 * 30);
export const clearSession = (res) => setCookie(res, 'cl_s', '', 0);

export const appUrl = () => (process.env.APP_URL || '').replace(/\/+$/, '');

export function missingConfig() {
  return ['X_CLIENT_ID', 'X_CLIENT_SECRET', 'SESSION_SECRET', 'APP_URL'].filter((k) => !process.env[k]);
}

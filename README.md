# Clearline

**Sign in with X → press one button → your posts, replies, reposts and likes are gone.**

Clearline is a small web app built on X's official API. People who use it only sign in with X and click **Delete everything**. It handles X's rate limits by itself.

A free, no-API [bookmark version](bookmarklet.html) is included as a backup.

---

## One-time setup (site owner, about 5 minutes)

### 1. Create an X app
1. Go to **developer.x.com** → Developer Portal → create a Project and an App.
2. Open the app's **User authentication settings** → **Set up**:
   - App permissions: **Read and write**
   - Type of app: **Web App, Automated App or Bot**
   - Callback URI: `https://YOUR-SITE.vercel.app/api/auth/callback`
   - Website URL: `https://YOUR-SITE.vercel.app`
3. Save, then copy the **OAuth 2.0 Client ID** and **Client Secret**.
4. Add credits under **Billing**. The X API is pay-per-use: deleting a post, undoing a repost or removing a like is about $0.01 each, and reading posts to find them costs a little extra.

### 2. Deploy on Vercel
1. **vercel.com/new** → import this repo → Framework Preset **Other** → Deploy.
2. In the Vercel project, open **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `X_CLIENT_ID` | OAuth 2.0 Client ID from step 1 |
| `X_CLIENT_SECRET` | OAuth 2.0 Client Secret from step 1 |
| `SESSION_SECRET` | Any long random text (40+ characters) |
| `APP_URL` | Your site address, e.g. `https://clearline.vercel.app` |

3. **Deployments → ⋯ → Redeploy** so the settings take effect.
4. Make sure the callback URI in X exactly matches `APP_URL` + `/api/auth/callback`.

That's it. Visit the site, sign in with X, and press the button.

---

## How it works
- `api/auth/*`: X OAuth 2.0 sign-in (PKCE). Tokens are kept in an encrypted, HTTP-only cookie, so there's no database.
- `api/list`: reads your posts/replies/reposts (`/2/users/:id/tweets`) or likes (`/2/users/:id/liked_tweets`) 100 at a time.
- `api/delete`: deletes posts and replies (`DELETE /2/tweets/:id`), undoes reposts (`DELETE /2/users/:id/retweets/:id`) and removes likes (`DELETE /2/users/:id/likes/:id`).
- The page runs the loop and pauses automatically when X rate-limits. X allows about 50 deletions every 15 minutes per account, so large accounts take a few hours. The tab must stay open.

## Limits
- X only lists an account's newest ~3,200 posts at a time. Clearline repeats passes until nothing is left.
- X's API only returns a limited history of likes, so very old likes may not be reachable.
- If X changes API access or pricing, some actions may stop working. Check the X developer docs.

Not affiliated with X Corp. Deletions are permanent.

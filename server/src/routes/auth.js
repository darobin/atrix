import { Router } from 'express';
import { getAuthorizationUrl, handleCallback } from '../auth/atproto.js';
import { config } from '../config.js';
import { SESSION_COOKIE_NAME } from '../auth/session.js';
import { getUserAccessToken } from '../matrix/admin.js';

const router = Router();

// ATProto OAuth client metadata (required by spec)
router.get('/client-metadata.json', (req, res) => {
  res.json({
    client_id: `${config.publicUrl}/client-metadata.json`,
    client_name: 'Atrix',
    client_uri: config.publicUrl,
    redirect_uris: [`${config.publicUrl}/auth/callback`],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    application_type: 'web',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
  });
});

// Ngrok handoff: re-sets the session cookie on the local domain, then
// redirects to the original path so the auth callback runs on localhost.
router.get('/api/set-cookie', (req, res) => {
  const { path, cookie } = req.query;
  if (cookie) {
    res.cookie(SESSION_COOKIE_NAME, cookie, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  }
  res.redirect(path || '/');
});

// Initiate ATProto OAuth login
router.get('/auth/login', async (req, res) => {
  const { handle } = req.query;
  if (!handle) return res.status(400).json({ error: 'handle required' });

  try {
    const url = await getAuthorizationUrl(handle);
    res.redirect(url);
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Failed to initiate login' });
  }
});

// ATProto OAuth callback — runs on the ngrok URL; the catch-all middleware
// below then hands the session cookie off to the local client.
router.get('/auth/callback', async (req, res) => {
  try {
    const params = new URLSearchParams(req.originalUrl.split('?')[1]);
    const { did, handle, mxid } = await handleCallback(params);

    // Get Matrix access token (non-fatal — Synapse may not be running yet)
    let matrixAccessToken = null;
    if (mxid) {
      try {
        matrixAccessToken = await getUserAccessToken(mxid);
      } catch (err) {
        console.warn('Could not get Matrix access token:', err.message);
      }
    }

    // Store user in session
    req.session.user = { did, handle, mxid, matrixAccessToken };

    // Stay on same origin — if on ngrok, the catch-all middleware will hand
    // the session cookie off to the local client URL.
    res.redirect('/');
  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect('/?error=auth_failed');
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Current user info
router.get('/auth/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const { did, handle, mxid, matrixAccessToken } = req.session.user;
  res.json({ did, handle, mxid, matrixAccessToken });
});

export default router;

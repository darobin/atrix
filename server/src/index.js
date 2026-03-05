import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { initDB } from './db.js';
import { sessionMiddleware, SESSION_COOKIE_NAME } from './auth/session.js';
import { initOAuthClient } from './auth/atproto.js';
import authRouter from './routes/auth.js';
import roomsRouter from './routes/rooms.js';
import appserviceRouter from './routes/appservice.js';
import miscRouter from './routes/misc.js';
import { bootstrapAdminToken } from './matrix/admin.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

// Routes — registered first, so they run directly on any domain (including
// ngrok). This means /client-metadata.json and /auth/callback are served
// normally on the ngrok URL (Bluesky needs to reach them there).
app.use('/', authRouter);
app.use('/', roomsRouter);
app.use('/', appserviceRouter);
app.use('/', miscRouter);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// After all routes: intercept any remaining ngrok requests and bounce them
// to the local client with the session cookie in tow. This fires on the
// GET / redirect that happens after a successful auth callback, handing the
// ngrok-domain session cookie over to localhost so the user lands in the app
// fully authenticated — without ever needing to know about the ngrok URL.
app.use(cookieParser(), (req, res, next) => {
  if (req.hostname?.includes('ngrok-free.app') || req.hostname?.includes('ngrok.io')) {
    const params = new URLSearchParams([
      ['path', req.originalUrl || '/'],
      ['cookie', req.cookies?.[SESSION_COOKIE_NAME] || ''],
    ]);
    return res.redirect(`${config.clientUrl}/api/set-cookie?${params}`);
  }
  next();
});

async function start() {
  await initDB();

  try {
    await initOAuthClient();
  } catch (err) {
    console.warn('ATProto OAuth client init failed (needs https:// PUBLIC_URL):', err.message);
  }

  try {
    await bootstrapAdminToken();
  } catch (err) {
    console.warn('Synapse admin bootstrap failed (Matrix features unavailable):', err.message);
  }

  app.listen(config.port, () => {
    console.log(`Atrix server running on port ${config.port}`);
    console.log(`Public URL: ${config.publicUrl}`);
    console.log(`Client URL: ${config.clientUrl}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

let publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

if (!IS_PROD) {
  const tokenPath = join(__dirname, '../../ngrok.token');
  if (existsSync(tokenPath)) {
    const require = createRequire(import.meta.url);
    const ngrok = require('@ngrok/ngrok');
    const authtoken = (await readFile(tokenPath, 'utf-8')).replace(/\s+/g, '');
    const listener = await ngrok.forward({ addr: PORT, authtoken });
    publicUrl = listener.url();
    console.log(`ngrok tunnel: ${publicUrl}`);
  }
}

const localUrl = `http://localhost:${PORT}`;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

export const config = {
  port: PORT,
  publicUrl,   // ngrok HTTPS URL (used for ATProto OAuth client_id + redirect_uri)
  localUrl,    // http://localhost:3000 (where Express actually runs)
  clientUrl,   // http://localhost:5173 (where the Vite client runs)
  synapseUrl: process.env.SYNAPSE_URL || 'http://localhost:8008',
  synapseServerName: process.env.SYNAPSE_SERVER_NAME || 'localhost',
  synapseAdminToken: process.env.SYNAPSE_ADMIN_TOKEN || '',
  asToken: process.env.AS_TOKEN || 'CHANGE_ME_AS_TOKEN',
  hsToken: process.env.HS_TOKEN || 'CHANGE_ME_HS_TOKEN',
  sessionSecret: process.env.SESSION_SECRET || 'CHANGE_ME_SESSION_SECRET',
  dbPath: process.env.DB_PATH || './atrix.db',
};

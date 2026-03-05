import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { config } from '../config.js';
import { query, run } from '../db.js';
import { ensureUserExists } from '../matrix/client.js';

let oauthClient;

export async function initOAuthClient() {
  oauthClient = new NodeOAuthClient({
    clientMetadata: {
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
    },
    stateStore: {
      // In-memory state store (suitable for single instance; swap for Redis in prod)
      _store: new Map(),
      async set(key, value) { this._store.set(key, value); },
      async get(key) { return this._store.get(key); },
      async del(key) { this._store.delete(key); },
    },
    sessionStore: {
      _store: new Map(),
      async set(sub, value) { this._store.set(sub, value); },
      async get(sub) { return this._store.get(sub); },
      async del(sub) { this._store.delete(sub); },
    },
  });

  return oauthClient;
}

export function getOAuthClient() {
  if (!oauthClient) throw new Error('OAuth client not initialized');
  return oauthClient;
}

export async function getAuthorizationUrl(handle) {
  const client = getOAuthClient();
  const url = await client.authorize(handle, {
    scope: 'atproto transition:generic',
  });
  return url.toString();
}

export async function handleCallback(params) {
  const client = getOAuthClient();
  const { session } = await client.callback(params);
  const did = session.did;

  // Resolve handle from session info
  let handle = did;
  try {
    const agent = await session.getAgent?.();
    if (agent) {
      const profile = await agent.getProfile({ actor: did });
      handle = profile.data.handle || did;
    }
  } catch {
    // Non-fatal: use DID as handle fallback
  }

  // Ensure Matrix user exists (non-fatal — Synapse may not be running yet)
  let mxid = null;
  try {
    mxid = await ensureUserExists(did, handle);
  } catch (err) {
    console.warn(`Matrix user provisioning failed for ${did} (Synapse unavailable?):`, err.message);
  }

  // Upsert user record (mxid may be null if Synapse is down)
  if (mxid) {
    await run(
      `INSERT INTO users (atproto_did, atproto_handle, matrix_mxid)
       VALUES (?, ?, ?)
       ON CONFLICT (atproto_did) DO UPDATE SET atproto_handle = excluded.atproto_handle`,
      [did, handle, mxid]
    );
  }

  return { did, handle, mxid };
}

import { createHmac } from 'node:crypto';
import { config } from '../config.js';

const ADMIN_USERNAME = 'atrix_admin';
// Use a stable password derived from our secrets so we can re-login after restarts
const ADMIN_PASSWORD = `atrix-admin-${config.sessionSecret}`;

let _adminToken = null;

/**
 * Bootstrap: create (or login as) the atrix_admin user using the
 * registration shared secret, and return their access token.
 * This token is then used for all Synapse admin API calls.
 */
export async function bootstrapAdminToken() {
  // First try logging in (covers server-restart case where admin already exists)
  try {
    const resp = await fetch(`${config.synapseUrl}/_matrix/client/v3/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: { type: 'm.id.user', user: `@${ADMIN_USERNAME}:${config.synapseServerName}` },
        password: ADMIN_PASSWORD,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      _adminToken = data.access_token;
      console.log('Synapse admin token obtained via login');
      return _adminToken;
    }
  } catch { /* Synapse not ready yet or user doesn't exist */ }

  // Fall back to HMAC registration with the shared secret
  const nonceResp = await fetch(`${config.synapseUrl}/_synapse/admin/v1/register`);
  const { nonce } = await nonceResp.json();

  const mac = createHmac('sha1', config.synapseAdminToken)
    .update(nonce).update('\x00')
    .update(ADMIN_USERNAME).update('\x00')
    .update(ADMIN_PASSWORD).update('\x00')
    .update('admin')
    .digest('hex');

  const resp = await fetch(`${config.synapseUrl}/_synapse/admin/v1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce, username: ADMIN_USERNAME, password: ADMIN_PASSWORD, admin: true, mac }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`Admin bootstrap failed: ${resp.status} ${JSON.stringify(data)}`);
  }

  _adminToken = data.access_token;
  console.log('Synapse admin user created and token obtained');
  return _adminToken;
}

function adminHeaders() {
  if (!_adminToken) throw new Error('Admin token not bootstrapped');
  return {
    'Authorization': `Bearer ${_adminToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Register a Matrix user via the Application Service registration endpoint.
 * Returns the access token for the newly created user (null if already exists).
 */
export async function createUser(mxid, displayName) {
  const localpart = mxid.replace(/^@/, '').split(':')[0];

  const resp = await fetch(`${config.synapseUrl}/_matrix/client/v3/register`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.asToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'm.login.application_service', username: localpart }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    if (data.errcode === 'M_USER_IN_USE') return null; // already exists, that's fine
    throw new Error(`Failed to register user ${mxid}: ${resp.status} ${JSON.stringify(data)}`);
  }

  // Set display name via AS impersonation
  if (displayName) {
    await fetch(
      `${config.synapseUrl}/_matrix/client/v3/profile/${encodeURIComponent(mxid)}/displayname?user_id=${encodeURIComponent(mxid)}`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${config.asToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayname: displayName }),
      }
    ).catch(() => {}); // non-fatal
  }

  return data.access_token;
}

/**
 * Get an access token for any Matrix user via the Synapse admin login-as-user endpoint.
 */
export async function getUserAccessToken(mxid) {
  const resp = await fetch(
    `${config.synapseUrl}/_synapse/admin/v1/users/${encodeURIComponent(mxid)}/login`,
    {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({ valid_until_ms: Date.now() + 7 * 24 * 60 * 60 * 1000 }),
    }
  );

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to get access token for ${mxid}: ${resp.status} ${body}`);
  }

  const data = await resp.json();
  return data.access_token;
}

/**
 * Create a Matrix room, acting as the given user via AS impersonation.
 */
export async function createRoom(opts, creatorMxid) {
  const url = `${config.synapseUrl}/_matrix/client/v3/createRoom?user_id=${encodeURIComponent(creatorMxid)}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.asToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(opts),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to create room: ${resp.status} ${body}`);
  }

  return resp.json();
}

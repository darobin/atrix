import { config } from '../config.js';
import { query } from '../db.js';
import { createUser } from './admin.js';

function didToLocalpart(did) {
  return 'atproto_' + did.replace(/[^a-z0-9._\-]/gi, () => '_');
}

/**
 * Ensure a Matrix user exists for the given ATProto DID.
 * Returns the MXID, creating the user in Synapse if needed.
 */
export async function ensureUserExists(did, handle) {
  const mxid = `@${didToLocalpart(did)}:${config.synapseServerName}`;

  // Check if already in DB — still call createUser to ensure Synapse has the account
  // (handles the case where DB was wiped but Synapse data persists)
  await createUser(mxid, handle || did);

  return mxid;
}

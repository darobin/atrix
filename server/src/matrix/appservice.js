import { config } from '../config.js';
import { query } from '../db.js';
import { validateLexiconEvent } from '../lexicon/validator.js';

/**
 * Middleware to verify Synapse hs_token on AS requests.
 */
export function verifyHsToken(req, res, next) {
  const token = req.query.access_token || req.headers['authorization']?.replace('Bearer ', '');
  if (token !== config.hsToken) {
    return res.status(403).json({ errcode: 'M_FORBIDDEN', error: 'Invalid hs_token' });
  }
  next();
}

/**
 * Process a Matrix transaction (batch of events pushed by Synapse).
 */
export async function processTransaction(txnId, events) {
  console.log(`Processing transaction ${txnId} with ${events.length} events`);

  for (const event of events) {
    await processEvent(event).catch(err => {
      console.error(`Error processing event ${event.event_id}:`, err);
    });
  }
}

async function processEvent(event) {
  const { type, room_id, content } = event;

  if (type !== 'io.atrix.lexicon.event') return;

  // Check room has lexicon config
  const rows = await query('SELECT lexicon_prefixes FROM room_configs WHERE room_id = ?', [room_id]);
  if (!rows.length) return;

  const prefixes = rows[0].lexicon_prefixes || [];
  if (!prefixes.length) return;

  const nsid = content?.['$type'];
  if (!nsid) return;

  // Validate the event NSID matches an allowed prefix
  const allowed = prefixes.some(prefix => nsid.startsWith(prefix));
  if (!allowed) {
    console.warn(`Event with NSID ${nsid} rejected for room ${room_id} (allowed: ${prefixes})`);
    // In production you'd redact the event here via admin API
  }
}

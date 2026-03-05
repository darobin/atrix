import { config } from '../config.js';
import { query } from '../db.js';

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

  // Only validate ATProto repository operations
  if (type !== 'com.atproto.repo.createRecord' && type !== 'com.atproto.repo.deleteRecord') return;

  // Check room has a lexicon config
  const rows = await query('SELECT lexicon_prefixes FROM room_configs WHERE room_id = ?', [room_id]);
  if (!rows.length) return;

  const prefixes = JSON.parse(rows[0].lexicon_prefixes || '[]');
  if (!prefixes.length) return;

  const collection = content?.collection;
  if (!collection) return;

  // Validate the collection matches an allowed prefix
  const allowed = prefixes.some(prefix =>
    collection === prefix || collection.startsWith(prefix + '.')
  );
  if (!allowed) {
    console.warn(`Event with collection ${collection} rejected for room ${room_id} (allowed: ${prefixes})`);
    // In production you'd redact the event here via admin API
  }
}

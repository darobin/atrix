import { Router } from 'express';
import { requireAuth } from '../auth/session.js';
import { createRoom, getUserAccessToken } from '../matrix/admin.js';
import { ensureUserExists } from '../matrix/client.js';
import { query, run } from '../db.js';
import { isValidNsid } from '../lexicon/validator.js';
import { config } from '../config.js';

const router = Router();

// Create a new room
router.post('/api/rooms', requireAuth, async (req, res) => {
  const { name, topic, lexiconPrefixes = [], allowMatrixMessages = true } = req.body;
  let { mxid, did, handle } = req.session.user;

  if (!name) return res.status(400).json({ error: 'name required' });

  // Re-provision Matrix user if Synapse wasn't available at login time
  if (!mxid) {
    try {
      mxid = await ensureUserExists(did, handle);
      const matrixAccessToken = await getUserAccessToken(mxid);
      req.session.user = { ...req.session.user, mxid, matrixAccessToken };
      await run(
        `INSERT INTO users (atproto_did, atproto_handle, matrix_mxid)
         VALUES (?, ?, ?)
         ON CONFLICT (atproto_did) DO UPDATE SET atproto_handle = excluded.atproto_handle`,
        [did, handle, mxid]
      );
    } catch (err) {
      return res.status(503).json({ error: 'Matrix not available: ' + err.message });
    }
  }

  // Validate lexicon prefixes
  for (const prefix of lexiconPrefixes) {
    // Prefixes are like "app.bsky" — validate as partial NSID (min 2 parts)
    const parts = prefix.split('.');
    if (parts.length < 2) {
      return res.status(400).json({ error: `Invalid lexicon prefix: ${prefix}` });
    }
  }

  try {
    const roomOpts = {
      name,
      topic,
      preset: 'private_chat',
      visibility: 'private',
      initial_state: [],
    };

    if (lexiconPrefixes.length > 0) {
      roomOpts.initial_state.push({
        type: 'io.atrix.room.config',
        state_key: '',
        content: {
          lexicon_prefixes: lexiconPrefixes,
          allow_matrix_messages: allowMatrixMessages,
        },
      });
    }

    const { room_id } = await createRoom(roomOpts, mxid);

    // Store room config
    await run(
      `INSERT INTO room_configs (room_id, lexicon_prefixes, allow_matrix_messages, created_by)
       VALUES (?, ?, ?, ?)`,
      [room_id, JSON.stringify(lexiconPrefixes), allowMatrixMessages, req.session.user.did]
    );

    res.json({ room_id, name, lexiconPrefixes, allowMatrixMessages });
  } catch (err) {
    console.error('Create room error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to create room' });
  }
});

// Get room config
router.get('/api/rooms/:roomId/config', requireAuth, async (req, res) => {
  const { roomId } = req.params;
  const rows = await query('SELECT * FROM room_configs WHERE room_id = ?', [roomId]);
  if (!rows.length) {
    return res.json({ room_id: roomId, lexiconPrefixes: [], allowMatrixMessages: true });
  }
  const row = rows[0];
  res.json({
    room_id: row.room_id,
    lexiconPrefixes: JSON.parse(row.lexicon_prefixes || '[]'),
    allowMatrixMessages: row.allow_matrix_messages,
    createdBy: row.created_by,
  });
});

// List all room configs (for rooms the server knows about)
router.get('/api/rooms', requireAuth, async (req, res) => {
  const rows = await query('SELECT * FROM room_configs ORDER BY created_at DESC');
  res.json(rows.map(r => ({
    room_id: r.room_id,
    lexiconPrefixes: JSON.parse(r.lexicon_prefixes || '[]'),
    allowMatrixMessages: r.allow_matrix_messages,
  })));
});

export default router;

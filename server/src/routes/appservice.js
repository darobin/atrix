import { Router } from 'express';
import { verifyHsToken, processTransaction } from '../matrix/appservice.js';

const router = Router();

// Synapse calls this to check if a user should be created
router.get('/_matrix/app/v1/users/:userId', verifyHsToken, (req, res) => {
  const { userId } = req.params;
  // We handle all @atproto_* users; tell Synapse we know about this one
  if (userId.startsWith('@atproto_')) {
    return res.json({});
  }
  res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'User not found' });
});

// Synapse calls this to check if a room alias should be created
router.get('/_matrix/app/v1/rooms/:roomAlias', verifyHsToken, (req, res) => {
  res.status(404).json({ errcode: 'M_NOT_FOUND', error: 'Room alias not found' });
});

// Synapse pushes events here
router.put('/_matrix/app/v1/transactions/:txnId', verifyHsToken, async (req, res) => {
  const { txnId } = req.params;
  const { events = [] } = req.body;

  try {
    await processTransaction(txnId, events);
    res.json({});
  } catch (err) {
    console.error('Transaction error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

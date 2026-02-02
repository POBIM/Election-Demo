import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  void req;

  res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default router;

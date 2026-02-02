import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import electionsRouter from './elections.js';
import partiesRouter from './parties.js';
import candidatesRouter from './candidates.js';
import votesRouter from './votes.js';
import resultsRouter from './results.js';
import geoRouter from './geo.js';
import streamRouter from './stream.js';
import batchesRouter from './batches.js';

const router = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/elections', electionsRouter);
router.use('/parties', partiesRouter);
router.use('/candidates', candidatesRouter);
router.use('/votes', votesRouter);
router.use('/results', resultsRouter);
router.use('/geo', geoRouter);
router.use('/stream', streamRouter);
router.use('/batches', batchesRouter);

export default router;

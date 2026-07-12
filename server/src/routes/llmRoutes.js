const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { opsQuery, explainAnomaly } = require('../controllers/llmController');

/**
 * LLM routes — read-only, JWT-authenticated assistive endpoints.
 * Mounted at /api/llm.
 *
 * These routes NEVER write to the database or override business rules.
 */
router.use(authMiddleware);

router.post('/ops-query', opsQuery);
router.post('/explain-anomaly', explainAnomaly);

module.exports = router;
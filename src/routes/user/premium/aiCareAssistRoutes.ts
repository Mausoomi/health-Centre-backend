import { Router } from 'express';
import { optionalAuth } from '../../../middlewares/auth';
import { chatWithCareAssist } from '../../../controllers/user/premium/aiCareAssistController';

const router = Router();

// POST /api/v1/user/premium/ai-careassist/chat
router.post('/chat', optionalAuth, chatWithCareAssist);

export default router;

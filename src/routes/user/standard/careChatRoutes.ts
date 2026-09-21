import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getCareChatHistory,
  createCareChatShare,
  confirmCareChatShare,
} from '../../../controllers/user/standard/careChatController';

const router = Router();

router.use(requireAuth);

router.get('/history', getCareChatHistory);
router.post('/share', createCareChatShare);
router.post('/confirm/:shareId', confirmCareChatShare);

export default router;

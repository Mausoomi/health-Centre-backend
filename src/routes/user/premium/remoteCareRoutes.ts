import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getRemoteCarePlans,
  getRemoteCarePlanById,
  createRemoteCarePlan,
  updateRemoteCarePlan,
  deleteRemoteCarePlan,
} from '../../../controllers/user/premium/remoteCareController';

const router = Router();

router.use(requireAuth);

router.get('/', getRemoteCarePlans);
router.post('/', createRemoteCarePlan);
router.get('/:id', getRemoteCarePlanById);
router.put('/:id', updateRemoteCarePlan);
router.delete('/:id', deleteRemoteCarePlan);

export default router;

import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getChildProfiles,
  createChildProfile,
  getChildProfileById,
  updateChildProfile,
  deleteChildProfile,
  addGrowthMeasurement,
  addImmunisationRecord,
} from '../../../controllers/user/premium/childHealthController';

const router = Router();

router.use(requireAuth);

router.get('/', getChildProfiles);
router.post('/', createChildProfile);
router.get('/:id', getChildProfileById);
router.put('/:id', updateChildProfile);
router.delete('/:id', deleteChildProfile);
router.post('/:id/growth', addGrowthMeasurement);
router.post('/:id/immunisation', addImmunisationRecord);

export default router;

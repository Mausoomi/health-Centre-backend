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
  updateImmunisationRecord,
  deleteImmunisationRecord,
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
router.put('/:id/immunisation/:vaccineId', updateImmunisationRecord);
router.delete('/:id/immunisation/:vaccineId', deleteImmunisationRecord);

export default router;


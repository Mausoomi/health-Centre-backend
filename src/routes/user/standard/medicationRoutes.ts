import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  logDoseAction,
} from '../../../controllers/user/standard/medicationController';

const router = Router();

router.use(requireAuth);

router.get('/', getMedications);
router.post('/', createMedication);
router.get('/:id', getMedicationById);
router.put('/:id', updateMedication);
router.delete('/:id', deleteMedication);
router.post('/:id/dose-log', logDoseAction);

export default router;

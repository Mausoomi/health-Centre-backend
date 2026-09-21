import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getSymptomReports,
  getSymptomReportById,
  createSymptomReport,
  updateSymptomReport,
  deleteSymptomReport,
} from '../../../controllers/user/standard/symptomsController';

const router = Router();

router.use(requireAuth);

router.get('/', getSymptomReports);
router.post('/', createSymptomReport);
router.get('/:id', getSymptomReportById);
router.put('/:id', updateSymptomReport);
router.delete('/:id', deleteSymptomReport);

export default router;

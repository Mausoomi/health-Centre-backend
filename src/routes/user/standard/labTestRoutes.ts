import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getLabTests,
  getLabTestById,
  createLabTest,
  updateLabTest,
  deleteLabTest,
} from '../../../controllers/user/standard/labTestsController';

const router = Router();

router.use(requireAuth);

router.get('/', getLabTests);
router.post('/', createLabTest);
router.get('/:id', getLabTestById);
router.put('/:id', updateLabTest);
router.delete('/:id', deleteLabTest);

export default router;

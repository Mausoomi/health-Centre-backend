import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getMonitors,
  createMonitor,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
  addReading,
} from '../../../controllers/user/premium/careMonitorController';

const router = Router();

router.use(requireAuth);

router.get('/', getMonitors);
router.post('/', createMonitor);
router.get('/:id', getMonitorById);
router.put('/:id', updateMonitor);
router.delete('/:id', deleteMonitor);
router.post('/:id/readings', addReading);

export default router;

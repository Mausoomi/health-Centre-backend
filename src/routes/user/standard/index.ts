import { Router } from 'express';
import careRecordRoutes from './careRecordRoutes';
import symptomRoutes from './symptomRoutes';
import medicationRoutes from './medicationRoutes';
import labTestRoutes from './labTestRoutes';
import careChatRoutes from './careChatRoutes';
import careSecureRoutes from './careSecureRoutes';

const router = Router();

router.use('/carerecord', careRecordRoutes);
router.use('/symptoms', symptomRoutes);
router.use('/medications', medicationRoutes);
router.use('/labtests', labTestRoutes);
router.use('/carechat', careChatRoutes);
router.use('/caresecure', careSecureRoutes);

export default router;

import { Router } from 'express';
import childHealthRoutes from './childHealthRoutes';
import careMonitorRoutes from './careMonitorRoutes';
import referralRoutes from './referralRoutes';
import remoteCareRoutes from './remoteCareRoutes';
import cdhaRoutes from './cdhaRoutes';
import aiCareAssistRoutes from './aiCareAssistRoutes';

const router = Router();

// Premium ChildHealth routes (/api/v1/user/premium/child-health/*)
router.use('/child-health', childHealthRoutes);

// Premium CareMonitor routes (/api/v1/user/premium/care-monitor/*)
router.use('/care-monitor', careMonitorRoutes);

// Premium Referrals routes (/api/v1/user/premium/referrals/*)
router.use('/referrals', referralRoutes);

// Premium RemoteCare routes (/api/v1/user/premium/remote-care/*)
router.use('/remote-care', remoteCareRoutes);

// Premium CDHA routes (/api/v1/user/premium/cdha/*)
router.use('/cdha', cdhaRoutes);

// Premium AI CareAssist routes (/api/v1/user/premium/ai-careassist/*)
router.use('/ai-careassist', aiCareAssistRoutes);

export default router;

import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getCDHAStatus,
  submitCertification,
  getPDHOs,
  applyAffiliation,
  getPDHOPendingAffiliations,
  pdhoApproveAffiliation,
  pdhoRejectAffiliation,
  getCDHACitizens,
  addCitizenSupport,
} from '../../../controllers/user/premium/cdhaController';

const router = Router();

router.use(requireAuth);

router.get('/status', getCDHAStatus);
router.post('/certification', submitCertification);
router.get('/pdhos', getPDHOs);
router.post('/affiliation/apply', applyAffiliation);
router.get('/citizens', getCDHACitizens);
router.post('/support-request', addCitizenSupport);

// PDHO Manager routes
router.get('/pdho-manager/pending-affiliations', getPDHOPendingAffiliations);
router.post('/pdho-manager/approve-affiliation', pdhoApproveAffiliation);
router.post('/pdho-manager/reject-affiliation', pdhoRejectAffiliation);

export default router;

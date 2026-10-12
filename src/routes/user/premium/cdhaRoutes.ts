import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getCDHAStatus,
  completeTraining,
  activateCDHARole,
  getCDHACertificate,
  searchFacilities,
  inviteFacility,
  getFacilityInvites,
  requestAffiliation,
  endAffiliation,
  getCDHANotifications,
  markNotificationRead,
  getPDHOPendingAffiliations,
  respondToAffiliationRequest,
  getPDHOAffiliatedCDHAs,
  getCDHACitizens,
  addCitizenSupport,
  submitCertification,
  getPDHOs,
  applyAffiliation,
  pdhoApproveAffiliation,
  pdhoRejectAffiliation,
} from '../../../controllers/user/premium/cdhaController';

const router = Router();

router.use(requireAuth);

// 1. CDHA Status & Lifecycle
router.get('/status', getCDHAStatus);

// 2. CDHA Training & Certification
router.post('/training/complete', completeTraining);
router.get('/certificate', getCDHACertificate);
router.post('/activate', activateCDHARole);
router.post('/certification', submitCertification); // compatibility alias

// 3. Facility Discovery (Google Maps + HealthCentreApp DB) & Invites
router.get('/facilities/search', searchFacilities);
router.get('/pdhos', getPDHOs); // compatibility alias
router.post('/facilities/invite', inviteFacility);
router.get('/facilities/invites', getFacilityInvites);

// 4. Affiliation Management (Request, End)
router.post('/affiliation/request', requestAffiliation);
router.post('/affiliation/apply', applyAffiliation); // compatibility alias
router.post('/affiliation/end', endAffiliation);

// 5. In-App Notifications
router.get('/notifications', getCDHANotifications);
router.post('/notifications/:id/read', markNotificationRead);

// 6. Citizens & GTM Workspace
router.get('/citizens', getCDHACitizens);
router.post('/support-request', addCitizenSupport);

// 7. PDHO Manager Routes
router.get('/pdho-manager/affiliation-requests', getPDHOPendingAffiliations);
router.get('/pdho-manager/pending-affiliations', getPDHOPendingAffiliations); // compatibility alias
router.post('/pdho-manager/affiliation-requests/:id/respond', respondToAffiliationRequest);
router.post('/pdho-manager/approve-affiliation', pdhoApproveAffiliation); // compatibility alias
router.post('/pdho-manager/reject-affiliation', pdhoRejectAffiliation); // compatibility alias
router.get('/pdho-manager/affiliated-cdhas', getPDHOAffiliatedCDHAs);

export default router;

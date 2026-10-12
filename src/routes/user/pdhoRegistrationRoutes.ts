import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  sendPDHOLoginOTP,
  verifyPDHOLoginOTP,
  registerPDHO,
  updatePDHOProfile,
  getPDHOStatus,
  getPDHODashboard,
  getPDHOCitizens,
  registerPDHOCitizen,
  getPDHOIncome,
  getPDHOStaff,
  addPDHOStaff,
  updatePDHOStaff,
  deactivatePDHOStaff,
  getAllPDHOApplications,
  approvePDHOApplication,
  rejectPDHOApplication,
} from '../../controllers/user/pdhoRegistrationController';
import { requireAuth, requireAdmin } from '../../middlewares/auth';

const router = Router();

// Public / User PDHO Registration & OTP Routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/login/send-otp', sendPDHOLoginOTP);
router.post('/login/verify-otp', verifyPDHOLoginOTP);
router.post('/register', registerPDHO);
router.put('/profile', updatePDHOProfile);
router.post('/profile', updatePDHOProfile);
router.get('/status', getPDHOStatus);

// Real Dynamic PDHO Portal Data Routes
router.get('/dashboard', getPDHODashboard);
router.get('/citizens', getPDHOCitizens);
router.post('/citizens/register', registerPDHOCitizen);
router.get('/income', getPDHOIncome);

// Real Dynamic PDHO Staff Routes
router.get('/staff', getPDHOStaff);
router.post('/staff', addPDHOStaff);
router.put('/staff/:id', updatePDHOStaff);
router.patch('/staff/:id/deactivate', deactivatePDHOStaff);

// Admin PDHO Organisation Approval Routes
router.get('/applications', getAllPDHOApplications);
router.get('/admin/applications', getAllPDHOApplications);
router.post('/applications/:id/approve', approvePDHOApplication);
router.post('/admin/applications/:id/approve', approvePDHOApplication);
router.post('/applications/:id/reject', rejectPDHOApplication);
router.post('/admin/applications/:id/reject', rejectPDHOApplication);

export default router;

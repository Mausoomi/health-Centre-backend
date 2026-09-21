import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getCareRecord,
  updatePatientDetails,
  addSubsectionItem,
  updateSubsectionItem,
  deleteSubsectionItem,
  getCareRecordSummary,
} from '../../../controllers/user/standard/careRecordController';

const router = Router();

// Apply auth to all CareRecord routes
router.use(requireAuth);

// Base CareRecord & Patient Details
router.get('/', getCareRecord);
router.get('/patient-details', getCareRecord);
router.put('/patient-details', updatePatientDetails);
router.get('/summary', getCareRecordSummary);

// Conditions
router.post('/conditions', addSubsectionItem('conditions'));
router.put('/conditions/:itemId', updateSubsectionItem('conditions'));
router.delete('/conditions/:itemId', deleteSubsectionItem('conditions'));

// Family History
router.post('/family-history', addSubsectionItem('familyHistory'));
router.put('/family-history/:itemId', updateSubsectionItem('familyHistory'));
router.delete('/family-history/:itemId', deleteSubsectionItem('familyHistory'));

// Social Habits
router.post('/social-habits', addSubsectionItem('socialHabits'));
router.put('/social-habits/:itemId', updateSubsectionItem('socialHabits'));
router.delete('/social-habits/:itemId', deleteSubsectionItem('socialHabits'));

// Disabilities
router.post('/disabilities', addSubsectionItem('disabilities'));
router.put('/disabilities/:itemId', updateSubsectionItem('disabilities'));
router.delete('/disabilities/:itemId', deleteSubsectionItem('disabilities'));

// Allergies
router.post('/allergies', addSubsectionItem('allergies'));
router.put('/allergies/:itemId', updateSubsectionItem('allergies'));
router.delete('/allergies/:itemId', deleteSubsectionItem('allergies'));

// Immunisations
router.post('/immunisations', addSubsectionItem('immunisations'));
router.put('/immunisations/:itemId', updateSubsectionItem('immunisations'));
router.delete('/immunisations/:itemId', deleteSubsectionItem('immunisations'));

// Operations & Procedures
router.post('/operations', addSubsectionItem('operations'));
router.put('/operations/:itemId', updateSubsectionItem('operations'));
router.delete('/operations/:itemId', deleteSubsectionItem('operations'));

// Hospital Admissions
router.post('/hospital-admissions', addSubsectionItem('hospitalAdmissions'));
router.put('/hospital-admissions/:itemId', updateSubsectionItem('hospitalAdmissions'));
router.delete('/hospital-admissions/:itemId', deleteSubsectionItem('hospitalAdmissions'));

// Blood Pressure Logs
router.post('/blood-pressure', addSubsectionItem('bloodPressureLogs'));
router.put('/blood-pressure/:itemId', updateSubsectionItem('bloodPressureLogs'));
router.delete('/blood-pressure/:itemId', deleteSubsectionItem('bloodPressureLogs'));

// Weight & Height Logs
router.post('/weight-height', addSubsectionItem('weightHeightLogs'));
router.put('/weight-height/:itemId', updateSubsectionItem('weightHeightLogs'));
router.delete('/weight-height/:itemId', deleteSubsectionItem('weightHeightLogs'));

// Medical Documents
router.post('/documents', addSubsectionItem('documents'));
router.put('/documents/:itemId', updateSubsectionItem('documents'));
router.delete('/documents/:itemId', deleteSubsectionItem('documents'));

export default router;

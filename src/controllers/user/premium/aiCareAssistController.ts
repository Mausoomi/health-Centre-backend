import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { geminiService } from '../../../services/geminiService';
import { Medication } from '../../../models/standard/Medication';
import { SymptomReport } from '../../../models/standard/SymptomReport';
import { CareRecord } from '../../../models/standard/CareRecord';
import ChildProfile from '../../../models/premium/ChildHealth';

/**
 * Handle chat conversation with AI CareAssist powered by Gemini
 */
export const chatWithCareAssist = async (req: Request, res: Response) => {
  try {
    const { prompt, history, childName, patientContext, image } = req.body;

    const hasPrompt = prompt && typeof prompt === 'string' && prompt.trim().length > 0;
    const hasImage = image && typeof image === 'object' && image.data && image.mimeType;

    if (!hasPrompt && !hasImage) {
      return res.status(400).json({
        success: false,
        message: 'A message prompt or image attachment is required.',
      });
    }

    const effectivePrompt = hasPrompt
      ? prompt.trim()
      : 'I have shared a photo/image. Please inspect it and provide helpful clinical observations and guidance.';

    // Extract authenticated user ID
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id || authUser?._id || req.body?.userId;

    let userClinicalContext = '';
    if (userId) {
      try {
        const userQuery = mongoose.Types.ObjectId.isValid(userId)
          ? { $in: [new mongoose.Types.ObjectId(userId), String(userId)] }
          : userId;

        const [medications, symptoms, careRecord, childProfiles] = await Promise.all([
          Medication.find({ userId: userQuery }).sort({ createdAt: -1 }).limit(15).lean(),
          SymptomReport.find({ userId: userQuery }).sort({ createdAt: -1 }).limit(6).lean(),
          CareRecord.findOne({ userId: userQuery }).lean(),
          ChildProfile.find({ userId: userQuery }).sort({ createdAt: -1 }).limit(5).lean(),
        ]);

        const sections: string[] = [];

        // 1. Patient's Active Medications
        if (medications && medications.length > 0) {
          const medList = medications
            .map((m: any, idx: number) => {
              const parts = [
                `${idx + 1}. **${m.name}**${m.strength ? ' ' + m.strength : ''}${m.form ? ' (' + m.form + ')' : ''}`,
              ];
              if (m.dose) parts.push(`Dose: ${m.dose}`);
              if (m.frequency) parts.push(`Frequency: ${m.frequency}`);
              if (m.foodInstruction) parts.push(`Food instructions: ${m.foodInstruction}`);
              if (m.instructions && m.instructions !== m.foodInstruction) parts.push(`Instructions: ${m.instructions}`);
              if (m.reason) parts.push(`Reason/Condition: ${m.reason}`);
              if (m.prescriber) parts.push(`Prescriber: ${m.prescriber}`);
              if (m.status) parts.push(`Status: ${m.status}`);
              return parts.join(' | ');
            })
            .join('\n');
          sections.push(`[PATIENT'S ACTIVE MEDICATIONS (From HealthCentreApp Database)]:\n${medList}`);
        } else {
          sections.push(`[PATIENT'S ACTIVE MEDICATIONS]: None currently logged in user profile.`);
        }

        // 2. Patient's Recorded Symptoms
        if (symptoms && symptoms.length > 0) {
          const symList = symptoms
            .map((s: any, idx: number) => {
              const title = s.symptomName || s.title || 'Reported Symptom';
              const parts = [`${idx + 1}. **${title}** (Severity: ${s.severity || 'Moderate'})`];
              if (s.duration) parts.push(`Duration: ${s.duration}`);
              if (s.status) parts.push(`Status: ${s.status}`);
              if (s.description) parts.push(`Description: ${s.description}`);
              if (s.currentConditions) parts.push(`Conditions: ${s.currentConditions}`);
              if (s.allergies) parts.push(`Allergies: ${s.allergies}`);
              return parts.join(' | ');
            })
            .join('\n');
          sections.push(`[PATIENT'S RECENT MYSYMPTOMS REPORTS]:\n${symList}`);
        }

        // 3. Known Allergies & Health Records
        if (careRecord) {
          const recordItems: string[] = [];
          if (careRecord.allergies && careRecord.allergies.length > 0) {
            const allergyNames = careRecord.allergies
              .map((a: any) => `${a.name || a.allergen || ''}${a.severity ? ' (' + a.severity + ')' : ''}`)
              .filter(Boolean)
              .join(', ');
            if (allergyNames) recordItems.push(`- Known Allergies: ${allergyNames}`);
          }
          if (careRecord.conditions && careRecord.conditions.length > 0) {
            const condNames = careRecord.conditions
              .map((c: any) => `${c.name || ''}${c.status ? ' (' + c.status + ')' : ''}`)
              .filter(Boolean)
              .join(', ');
            if (condNames) recordItems.push(`- Diagnosed Medical Conditions: ${condNames}`);
          }
          if (recordItems.length > 0) {
            sections.push(`[PATIENT MEDICAL RECORD & ALLERGIES]:\n${recordItems.join('\n')}`);
          }
        }

        // 4. Registered Child Profiles
        if (childProfiles && childProfiles.length > 0) {
          const childList = childProfiles
            .map((c: any, idx: number) => {
              const parts = [`${idx + 1}. Child: ${c.firstName} ${c.surname} (${c.sex || 'Child'})`];
              if (c.dob) parts.push(`DOB: ${new Date(c.dob).toLocaleDateString('en-GB')}`);
              if (c.hospitalName || c.placeOfBirth) parts.push(`Hospital: ${c.hospitalName || c.placeOfBirth}`);
              if (c.birthTime || c.time) parts.push(`Birth Time: ${c.birthTime || c.time}`);
              if (c.growthStatus) parts.push(`Growth: ${c.growthStatus}`);
              return parts.join(' | ');
            })
            .join('\n');
          sections.push(`[REGISTERED CHILD HEALTH PROFILES]:\n${childList}`);
        }

        if (sections.length > 0) {
          userClinicalContext = sections.join('\n\n');
        }
      } catch (dbErr) {
        console.warn('[AiCareAssistController] Error querying user health records:', dbErr);
      }
    }

    const contextStr = [
      patientContext || (childName ? `Active Patient / Child Name: ${childName}` : ''),
      userClinicalContext,
    ]
      .filter(Boolean)
      .join('\n\n');

    const aiReply = await geminiService.generateCareAssistResponse(
      effectivePrompt,
      Array.isArray(history) ? history : [],
      contextStr,
      hasImage ? image : undefined
    );

    return res.status(200).json({
      success: true,
      data: {
        reply: aiReply,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[AiCareAssistController] Error generating AI response:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate AI CareAssist response.',
      fallbackReply:
        'Thank you for sharing. I encountered a temporary connection issue reaching our AI service. If your child is experiencing urgent or concerning symptoms such as high fever, vomiting, or lethargy, please visit the nearest healthcare center right away.',
    });
  }
};

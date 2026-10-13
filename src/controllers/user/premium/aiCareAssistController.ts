import { Request, Response } from 'express';
import { geminiService } from '../../../services/geminiService';

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

    const contextStr = patientContext || (childName ? `Patient child name: ${childName}` : undefined);

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
